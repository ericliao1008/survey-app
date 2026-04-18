"""把问卷答卷导出为 CSV。

扩展题型的导出策略：
- matrix_single / matrix_likert：每行展开成一列
- cbc_task：展开为 choice + 每个候选方案的各属性值
- pipe_from（循环追问）：对源题的每个选项各出一列
"""
import csv
import io
from sqlalchemy.orm import Session

from app.models.survey import Survey, Question
from app.models.response import Response


def _pipe_source_options(q: Question, survey: Survey):
    """返回该 pipe 题对应源题的选项列表；无 pipe 返回 None。"""
    cfg = q.config or {}
    pf = cfg.get("pipe_from")
    if not pf:
        return None
    src_order = pf.get("question_order")
    if src_order is None:
        return None
    for sq in survey.questions:
        if sq.order == src_order:
            return sq.options
    return None


def _answer_to_text(a, q: Question, option_map: dict[int, str]) -> str:
    """把单个 Answer 格式化成 CSV 的一格文本（非展开类题型用）。
    若 value_json.option_texts 存在，把用户填写的文本附加到对应选项后。"""
    if a is None:
        return ""
    if a.selected_option_ids:
        # option_id -> option.value 映射（通过 q 提供）
        id_to_value: dict[int, str] = {}
        if q is not None:
            for opt in q.options:
                id_to_value[opt.id] = opt.value
        option_texts: dict = {}
        if a.value_json and isinstance(a.value_json, dict):
            ot = a.value_json.get("option_texts")
            if isinstance(ot, dict):
                option_texts = ot
        parts = []
        for oid in a.selected_option_ids:
            label = option_map.get(oid, str(oid))
            ov = id_to_value.get(oid)
            extra = option_texts.get(ov) if ov else None
            if extra:
                parts.append(f"{label}（{extra}）")
            else:
                parts.append(label)
        return " / ".join(parts)
    if a.value_text is not None and a.value_text != "":
        return a.value_text
    if a.value_number is not None:
        return a.value_number if isinstance(a.value_number, str) else a.value_number
    return ""


def _matrix_row_value(a, row_value: str) -> str:
    if a is None or not a.value_json:
        return ""
    v = a.value_json.get(row_value)
    if v is None:
        return ""
    # matrix_multi 情况：v 是列 value 的数组
    if isinstance(v, list):
        return " / ".join(str(x) for x in v)
    return str(v)


def _cbc_cell(a, col: str) -> str:
    """col 形如 'choice' / 'A.origin' / 'B.price' 等。"""
    if a is None or not a.value_json:
        return ""
    if col == "choice":
        return str(a.value_json.get("choice", ""))
    # 'A.origin' -> profiles[0]["origin"]
    try:
        letter, attr = col.split(".", 1)
        idx = ord(letter) - ord("A")
        profiles = a.value_json.get("profiles") or []
        if 0 <= idx < len(profiles):
            return str(profiles[idx].get(attr, ""))
    except Exception:
        pass
    return ""


def export_responses_csv(db: Session, survey: Survey) -> str:
    """返回 CSV 字符串（UTF-8-BOM，Excel 可直接打开）。"""
    questions = sorted(survey.questions, key=lambda q: q.order)
    option_map: dict[int, str] = {}
    for q in questions:
        for o in q.options:
            option_map[o.id] = o.text

    # 构建表头和每题的提取器
    # extractors: list[(header, extractor_fn(answer_map) -> str)]
    extractors: list = []

    for q in questions:
        cfg = q.config or {}
        qidx = q.order + 1
        pipe_opts = _pipe_source_options(q, survey)

        # 该题在答案表里可能有多条（pipe 时每个选项一条），用 (q_id, pipe_option_id) 索引
        def _finder(answer_map, qid=q.id, pipe_opt_id=None):
            return answer_map.get((qid, pipe_opt_id))

        if q.type in ("matrix_likert", "matrix_single", "matrix_multi"):
            rows = cfg.get("matrix_rows", [])
            pipe_list = pipe_opts if pipe_opts else [None]
            for po in pipe_list:
                po_id = po.id if po else None
                po_label = f" [{po.text}]" if po else ""
                for r in rows:
                    header = f"Q{qidx}. {q.text}{po_label} — {r['text']}"
                    extractors.append(
                        (
                            header,
                            (lambda am, qid=q.id, pid=po_id, rv=r["value"]:
                                _matrix_row_value(am.get((qid, pid)), rv)),
                        )
                    )
            continue

        if q.type == "cbc_task":
            attrs = cfg.get("cbc_attributes", [])
            # 生成：choice + 每个方案的每个属性
            pipe_list = pipe_opts if pipe_opts else [None]
            for po in pipe_list:
                po_id = po.id if po else None
                po_label = f" [{po.text}]" if po else ""
                extractors.append((
                    f"Q{qidx}. {q.text}{po_label} — 选择",
                    (lambda am, qid=q.id, pid=po_id:
                        _cbc_cell(am.get((qid, pid)), "choice")),
                ))
                for letter in ("A", "B", "C"):
                    for attr in attrs:
                        ak = attr.get("key") or attr.get("label", "?")
                        header = f"Q{qidx}{po_label} — 方案{letter}.{attr.get('label', ak)}"
                        extractors.append(
                            (
                                header,
                                (lambda am, qid=q.id, pid=po_id, col=f"{letter}.{ak}":
                                    _cbc_cell(am.get((qid, pid)), col)),
                            )
                        )
            continue

        # 常规题型（含 pipe 的单列情况）
        if pipe_opts:
            for po in pipe_opts:
                header = f"Q{qidx}. {q.text} [{po.text}]"
                extractors.append(
                    (
                        header,
                        (lambda am, qid=q.id, pid=po.id, qq=q:
                            _answer_to_text(am.get((qid, pid)), qq, option_map)),
                    )
                )
        else:
            header = f"Q{qidx}. {q.text}"
            extractors.append(
                (
                    header,
                    (lambda am, qid=q.id, qq=q:
                        _answer_to_text(am.get((qid, None)), qq, option_map)),
                )
            )

    header_row = ["response_id", "visitor_id", "submitted_at"] + [h for h, _ in extractors]

    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM
    writer = csv.writer(buf)
    writer.writerow(header_row)

    responses = (
        db.query(Response)
        .filter(Response.survey_id == survey.id)
        .order_by(Response.submitted_at.asc())
        .all()
    )

    for resp in responses:
        # (question_id, pipe_option_id) -> Answer
        am: dict[tuple[int, int | None], object] = {}
        for a in resp.answers:
            am[(a.question_id, a.pipe_option_id)] = a

        row = [
            resp.id,
            resp.visitor_id,
            resp.submitted_at.strftime("%Y-%m-%d %H:%M:%S"),
        ]
        for _, fn in extractors:
            row.append(fn(am))
        writer.writerow(row)

    return buf.getvalue()


def compute_basic_stats(db: Session, survey: Survey) -> dict:
    """返回基础统计：总回复数 + 每题的简单聚合。
    复杂题型（matrix/cbc/pipe）只汇报 answered 数量，详细分析请导出 CSV。"""
    responses = (
        db.query(Response)
        .filter(Response.survey_id == survey.id)
        .all()
    )
    total = len(responses)

    questions = sorted(survey.questions, key=lambda q: q.order)
    question_stats = []
    for q in questions:
        stat: dict = {
            "question_id": q.id,
            "order": q.order,
            "text": q.text,
            "type": q.type,
            "answered": 0,
        }

        if q.type in ("single_choice", "multiple_choice"):
            counts: dict[int, int] = {o.id: 0 for o in q.options}
            for r in responses:
                for a in r.answers:
                    if a.question_id == q.id and a.selected_option_ids:
                        stat["answered"] += 1
                        for oid in a.selected_option_ids:
                            if oid in counts:
                                counts[oid] += 1
            stat["options"] = [
                {"text": o.text, "value": o.value, "count": counts[o.id]}
                for o in q.options
            ]

        elif q.type in ("likert_5", "rating_10", "number"):
            values = []
            for r in responses:
                for a in r.answers:
                    if a.question_id == q.id and a.value_number is not None:
                        values.append(a.value_number)
                        stat["answered"] += 1
            if values:
                stat["mean"] = round(sum(values) / len(values), 2)
                stat["min"] = min(values)
                stat["max"] = max(values)

        elif q.type in ("text_short", "text_long", "date"):
            for r in responses:
                for a in r.answers:
                    if a.question_id == q.id and a.value_text:
                        stat["answered"] += 1

        elif q.type in ("matrix_single", "matrix_likert", "matrix_multi", "cbc_task"):
            for r in responses:
                for a in r.answers:
                    if a.question_id == q.id and a.value_json:
                        stat["answered"] += 1

        question_stats.append(stat)

    return {
        "survey_slug": survey.slug,
        "survey_title": survey.title,
        "total_responses": total,
        "questions": question_stats,
    }
