"""从 JSON 文件加载问卷到数据库。

JSON 格式示例：
{
  "slug": "example",
  "title": "问卷标题",
  "description": "问卷描述",
  "questions": [
    {
      "type": "single_choice",
      "text": "题目",
      "required": true,
      "options": [{"text": "选项1", "value": "a"}, ...]
    },
    ...
  ]
}
"""
import json
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.survey import Survey, Question, Option


VALID_TYPES = {
    "single_choice",
    "multiple_choice",
    "text_short",
    "text_long",
    "likert_5",
    "rating_10",
    "number",
    "date",
}


def load_survey_from_json(db: Session, json_path: Path) -> Survey:
    """从 JSON 文件加载问卷。若同 slug 已存在则先删除再重建（幂等）。"""
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    slug = data["slug"]
    # 删除旧数据
    existing = db.query(Survey).filter(Survey.slug == slug).first()
    if existing:
        db.delete(existing)
        db.flush()

    survey = Survey(
        slug=slug,
        title=data["title"],
        description=data.get("description"),
        is_active=data.get("is_active", True),
    )
    db.add(survey)
    db.flush()

    for q_order, q_data in enumerate(data["questions"]):
        q_type = q_data["type"]
        if q_type not in VALID_TYPES:
            raise ValueError(f"未知题型: {q_type}")

        question = Question(
            survey_id=survey.id,
            order=q_order,
            type=q_type,
            text=q_data["text"],
            required=q_data.get("required", True),
            config=q_data.get("config"),
        )
        db.add(question)
        db.flush()

        for o_order, o_data in enumerate(q_data.get("options", []) or []):
            option = Option(
                question_id=question.id,
                order=o_order,
                text=o_data["text"],
                value=o_data["value"],
            )
            db.add(option)

    db.commit()
    db.refresh(survey)
    return survey


def load_all_surveys(db: Session, surveys_dir: Path) -> list[str]:
    """加载目录下所有 *.json 问卷文件。"""
    loaded = []
    if not surveys_dir.exists():
        return loaded
    for json_file in sorted(surveys_dir.glob("*.json")):
        try:
            survey = load_survey_from_json(db, json_file)
            loaded.append(survey.slug)
        except Exception as e:
            print(f"[survey_loader] 加载 {json_file.name} 失败: {e}")
    return loaded
