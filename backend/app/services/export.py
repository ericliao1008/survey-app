"""把问卷答卷导出为 CSV。"""
import csv
import io
from sqlalchemy.orm import Session

from app.models.survey import Survey
from app.models.response import Response


def export_responses_csv(db: Session, survey: Survey) -> str:
    """返回 CSV 字符串（UTF-8-BOM，Excel 可直接打开）。"""
    # 收集所有题目按 order 排序
    questions = sorted(survey.questions, key=lambda q: q.order)
    question_headers = [f"Q{q.order + 1}. {q.text}" for q in questions]

    # 建立 option_id -> text 的映射，便于把选择题 id 还原成文本
    option_map: dict[int, str] = {}
    for q in questions:
        for o in q.options:
            option_map[o.id] = o.text

    header = ["response_id", "visitor_id", "submitted_at"] + question_headers

    buf = io.StringIO()
    buf.write("\ufeff")  # UTF-8 BOM
    writer = csv.writer(buf)
    writer.writerow(header)

    responses = (
        db.query(Response)
        .filter(Response.survey_id == survey.id)
        .order_by(Response.submitted_at.asc())
        .all()
    )

    for resp in responses:
        # answer by question_id
        answer_map = {a.question_id: a for a in resp.answers}
        row = [
            resp.id,
            resp.visitor_id,
            resp.submitted_at.strftime("%Y-%m-%d %H:%M:%S"),
        ]
        for q in questions:
            a = answer_map.get(q.id)
            if a is None:
                row.append("")
                continue
            if a.selected_option_ids:
                texts = [option_map.get(oid, str(oid)) for oid in a.selected_option_ids]
                row.append(" / ".join(texts))
            elif a.value_text is not None:
                row.append(a.value_text)
            elif a.value_number is not None:
                row.append(a.value_number)
            else:
                row.append("")
        writer.writerow(row)

    return buf.getvalue()


def compute_basic_stats(db: Session, survey: Survey) -> dict:
    """返回基础统计：总回复数 + 每题的简单聚合。"""
    responses = (
        db.query(Response)
        .filter(Response.survey_id == survey.id)
        .all()
    )
    total = len(responses)

    # 每题统计
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

        question_stats.append(stat)

    return {
        "survey_slug": survey.slug,
        "survey_title": survey.title,
        "total_responses": total,
        "questions": question_stats,
    }
