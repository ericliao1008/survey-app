from sqlalchemy.orm import Session

from app.db.base import Base
from app.db.session import engine, SessionLocal
from app.core.config import settings
from app.services.survey_loader import load_all_surveys
import app.models  # noqa: F401  确保模型被注册


def init_db() -> None:
    """创建表结构并从 surveys/ 目录加载所有 JSON 问卷。"""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()
    try:
        loaded = load_all_surveys(db, settings.surveys_dir)
        if loaded:
            print(f"[init_db] 已加载问卷: {', '.join(loaded)}")
        else:
            print(f"[init_db] 未发现 JSON 问卷文件 (目录: {settings.surveys_dir})")
    finally:
        db.close()
