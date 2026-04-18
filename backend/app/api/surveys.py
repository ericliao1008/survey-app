from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db.session import get_db
from app.models.survey import Survey, Question
from app.models.response import Response, Answer
from app.schemas.response import AnswerIn
from app.schemas.survey import SurveyOut
from app.schemas.response import ResponseIn, ResponseOut


router = APIRouter(prefix="/api/surveys", tags=["surveys"])


def _question_is_visible(
    q: Question,
    questions_by_order: dict[int, Question],
    answers_by_qid: dict[int, list[AnswerIn]],
) -> bool:
    """后端复刻前端 show_if 逻辑，用于跳过被隐藏题目的必答校验。
    不识别的条件默认视为可见（与前端一致，避免误拒）。"""
    cfg = q.config or {}
    si = cfg.get("show_if")
    if not si or not isinstance(si, dict):
        return True
    ref_order = si.get("question_order")
    op = si.get("operator")
    expected = si.get("value")
    if ref_order is None or op is None:
        return True
    ref_q = questions_by_order.get(ref_order)
    if ref_q is None:
        return True
    ans_list = answers_by_qid.get(ref_q.id) or []
    if not ans_list:
        return False

    def _single_value(a: AnswerIn) -> str | None:
        """返回单选题选中的 option value。"""
        if a.selected_option_ids and len(a.selected_option_ids) == 1:
            oid = a.selected_option_ids[0]
            for o in ref_q.options:
                if o.id == oid:
                    return o.value
        return None

    def _multi_values(a: AnswerIn) -> set[str]:
        out: set[str] = set()
        if a.selected_option_ids:
            for oid in a.selected_option_ids:
                for o in ref_q.options:
                    if o.id == oid:
                        out.add(o.value)
        return out

    a = ans_list[0]
    if op in ("equals", "not_equals"):
        if ref_q.type == "single_choice":
            v = _single_value(a)
            matched = v == str(expected)
        elif ref_q.type in ("likert_5", "rating_10", "number"):
            matched = a.value_number is not None and float(a.value_number) == float(expected)
        elif ref_q.type in ("text_short", "text_long"):
            matched = (a.value_text or "").strip() == str(expected)
        elif ref_q.type == "date":
            matched = (a.value_text or "") == str(expected)
        else:
            matched = False
        return matched if op == "equals" else not matched
    if op in ("includes", "not_includes"):
        if ref_q.type == "multiple_choice":
            matched = str(expected) in _multi_values(a)
        elif ref_q.type in ("text_short", "text_long"):
            matched = str(expected) in (a.value_text or "")
        else:
            matched = False
        return matched if op == "includes" else not matched
    if op == "gte":
        return a.value_number is not None and float(a.value_number) >= float(expected)
    if op == "lte":
        return a.value_number is not None and float(a.value_number) <= float(expected)
    return True


@router.get("/{slug}", response_model=SurveyOut)
def get_survey(slug: str, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.slug == slug, Survey.is_active == True).first()
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在或已关闭")
    return survey


@router.post("/{slug}/responses", response_model=ResponseOut)
@limiter.limit("30/minute")
def submit_response(
    request: Request,
    slug: str,
    payload: ResponseIn,
    db: Session = Depends(get_db),
):
    survey = db.query(Survey).filter(Survey.slug == slug, Survey.is_active == True).first()
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在或已关闭")

    # 检查是否已提交
    existing = (
        db.query(Response)
        .filter(Response.survey_id == survey.id, Response.visitor_id == payload.visitor_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="您已提交过此问卷")

    # 校验必答题是否都有回答（只校验 show_if 评估为可见的题目）
    question_map: dict[int, Question] = {q.id: q for q in survey.questions}
    questions_by_order: dict[int, Question] = {q.order: q for q in survey.questions}
    answers_by_qid: dict[int, list] = {}
    for a in payload.answers:
        answers_by_qid.setdefault(a.question_id, []).append(a)
    answered_qids = set(answers_by_qid.keys())

    for q in survey.questions:
        if not q.required:
            continue
        if q.id in answered_qids:
            continue
        if not _question_is_visible(q, questions_by_order, answers_by_qid):
            continue
        # 对 pipe 题：visible 但未答通常是因为源题没选中任何选项（frontend 已过滤），宽松放过
        cfg = q.config or {}
        if cfg.get("pipe_from"):
            continue
        raise HTTPException(status_code=400, detail=f"第 {q.order + 1} 题为必答题")

    # 创建 Response
    response = Response(
        survey_id=survey.id,
        visitor_id=payload.visitor_id,
        user_agent=request.headers.get("user-agent", "")[:500],
    )
    db.add(response)
    db.flush()

    # 创建 Answer
    for ans in payload.answers:
        q = question_map.get(ans.question_id)
        if not q:
            raise HTTPException(status_code=400, detail=f"题目 {ans.question_id} 不属于此问卷")

        answer = Answer(
            response_id=response.id,
            question_id=q.id,
            value_text=ans.value_text,
            value_number=ans.value_number,
            selected_option_ids=ans.selected_option_ids,
            value_json=ans.value_json,
            pipe_option_id=ans.pipe_option_id,
        )
        db.add(answer)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="您已提交过此问卷")

    return ResponseOut(id=response.id)
