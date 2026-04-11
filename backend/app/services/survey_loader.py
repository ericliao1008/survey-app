"""从 JSON 文件加载问卷到数据库。

幂等加载策略（重要 —— 防止重启时丢失答卷数据）：

  1. 计算 JSON 文件内容的 sha256
  2. 若同 slug 的 survey 不存在 → 创建
  3. 若已存在且 hash 相同 → 跳过
  4. 若已存在且 hash 不同：
       - 无答卷 → 安全重建
       - 有答卷 → 拒绝重建并打印 WARN（除非显式设置 force_reload_surveys=True）

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
import hashlib
import json
from pathlib import Path
from typing import Optional

from sqlalchemy.orm import Session

from app.models.response import Response
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


def _hash_file(json_path: Path) -> str:
    """计算 JSON 文件的 sha256（直接对原始字节，避免格式化差异问题）。"""
    h = hashlib.sha256()
    with open(json_path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()


def _create_survey(db: Session, data: dict, content_hash: str) -> Survey:
    """根据 JSON 数据创建一份新的 survey（含 questions / options）。"""
    survey = Survey(
        slug=data["slug"],
        title=data["title"],
        description=data.get("description"),
        is_active=data.get("is_active", True),
        content_hash=content_hash,
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

    return survey


def load_survey_from_json(
    db: Session,
    json_path: Path,
    force: bool = False,
) -> tuple[Optional[Survey], str]:
    """加载单份问卷 JSON。

    返回 (survey_or_none, action)，action ∈ {"created", "skipped", "rebuilt", "blocked"}。
    """
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    slug = data["slug"]
    new_hash = _hash_file(json_path)
    existing = db.query(Survey).filter(Survey.slug == slug).first()

    # 情况 1：首次创建
    if existing is None:
        survey = _create_survey(db, data, new_hash)
        db.commit()
        db.refresh(survey)
        return survey, "created"

    # 情况 2：内容未变 —— 直接跳过
    if existing.content_hash == new_hash and not force:
        return existing, "skipped"

    # 情况 2.5：老数据库迁移而来（content_hash 还是 NULL）
    # 我们无法证明 JSON 变了，把当前 hash 当作 baseline 写回去，
    # 避免每次启动都误报 blocked
    if existing.content_hash is None and not force:
        existing.content_hash = new_hash
        db.commit()
        return existing, "skipped"

    # 情况 3：内容有变（或强制重建）—— 检查是否已有答卷
    response_count = (
        db.query(Response).filter(Response.survey_id == existing.id).count()
    )

    if response_count > 0 and not force:
        # 情况 3a：有答卷且未强制 —— 拒绝重建以保护数据
        print(
            f"[survey_loader] WARN: {json_path.name} 内容已变，但 survey '{slug}' "
            f"已有 {response_count} 份答卷，跳过重建以防数据丢失。"
            f"如需更新结构请先在后台导出 CSV，再设置环境变量 "
            f"FORCE_RELOAD_SURVEYS=true 重启服务。"
        )
        return existing, "blocked"

    # 情况 3b：无答卷 或 强制模式 —— 安全重建
    if response_count > 0 and force:
        print(
            f"[survey_loader] WARN: 强制模式（FORCE_RELOAD_SURVEYS=true）下重建 "
            f"'{slug}'，将丢失 {response_count} 份答卷。"
        )

    db.delete(existing)
    db.flush()
    survey = _create_survey(db, data, new_hash)
    db.commit()
    db.refresh(survey)
    return survey, "rebuilt"


def load_all_surveys(
    db: Session,
    surveys_dir: Path,
    force: bool = False,
) -> dict[str, list[str]]:
    """加载目录下所有 *.json 问卷文件。

    返回 {action: [slug, ...]} 的统计字典，便于启动日志展示。
    """
    result: dict[str, list[str]] = {
        "created": [],
        "skipped": [],
        "rebuilt": [],
        "blocked": [],
        "failed": [],
    }
    if not surveys_dir.exists():
        return result
    for json_file in sorted(surveys_dir.glob("*.json")):
        try:
            survey, action = load_survey_from_json(db, json_file, force=force)
            slug = survey.slug if survey else json_file.stem
            result[action].append(slug)
        except Exception as e:
            print(f"[survey_loader] 加载 {json_file.name} 失败: {e}")
            result["failed"].append(json_file.stem)
    return result
