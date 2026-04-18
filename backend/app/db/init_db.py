from sqlalchemy import inspect, text
from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.config import settings
from app.services.survey_loader import load_all_surveys
import app.models  # noqa: F401  确保模型被注册


def _migrate_schema() -> None:
    """轻量级前向迁移：补齐新字段，保护老数据库。"""
    inspector = inspect(engine)
    tables = inspector.get_table_names()

    if "surveys" in tables:
        cols = {c["name"] for c in inspector.get_columns("surveys")}
        if "content_hash" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE surveys ADD COLUMN content_hash VARCHAR(64)"))
            print("[init_db] 已为旧数据库补齐 surveys.content_hash 列")

    if "answers" in tables:
        cols = {c["name"] for c in inspector.get_columns("answers")}
        if "value_json" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE answers ADD COLUMN value_json JSON"))
            print("[init_db] 已为旧数据库补齐 answers.value_json 列")
        if "pipe_option_id" not in cols:
            with engine.begin() as conn:
                conn.execute(text("ALTER TABLE answers ADD COLUMN pipe_option_id INTEGER"))
                conn.execute(text(
                    "CREATE INDEX IF NOT EXISTS ix_answers_pipe_option_id "
                    "ON answers (pipe_option_id)"
                ))
            print("[init_db] 已为旧数据库补齐 answers.pipe_option_id 列")


def init_db() -> None:
    """创建表结构并从 surveys/ 目录加载所有 JSON 问卷。"""
    Base.metadata.create_all(bind=engine)
    _migrate_schema()
    db: Session = SessionLocal()
    try:
        result = load_all_surveys(
            db,
            settings.surveys_dir,
            force=settings.force_reload_surveys,
        )
        parts = []
        for action in ("created", "rebuilt", "skipped", "blocked", "failed"):
            slugs = result.get(action, [])
            if slugs:
                parts.append(f"{action}={','.join(slugs)}")
        if parts:
            print(f"[init_db] 问卷加载结果: " + " | ".join(parts))
        else:
            print(f"[init_db] 未发现 JSON 问卷文件 (目录: {settings.surveys_dir})")
    finally:
        db.close()
