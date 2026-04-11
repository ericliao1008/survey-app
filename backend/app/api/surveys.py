from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.limiter import limiter
from app.db.session import get_db
from app.models.survey import Survey, Question
from app.models.response import Response, Answer
from app.schemas.survey import SurveyOut
from app.schemas.response import ResponseIn, ResponseOut


router = APIRouter(prefix="/api/surveys", tags=["surveys"])


@router.get("/{slug}", response_model=SurveyOut)
def get_survey(slug: str, db: Session = Depends(get_db)):
    survey = db.query(Survey).filter(Survey.slug == slug, Survey.is_active == True).first()
    if not survey:
        raise HTTPException(status_code=404, detail="问卷不存在或已关闭")
    return survey


@router.post("/{slug}/responses", response_model=ResponseOut)
@limiter.limit("5/minute")
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

    # 校验必答题是否都有回答
    question_map: dict[int, Question] = {q.id: q for q in survey.questions}
    answered_qids = {a.question_id for a in payload.answers}
    for q in survey.questions:
        if q.required and q.id not in answered_qids:
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
        )
        db.add(answer)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=409, detail="您已提交过此问卷")

    return ResponseOut(id=response.id)
