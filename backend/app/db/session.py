from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

from app.core.config import settings


engine = create_engine(
    settings.database_url,
    echo=settings.debug,
    connect_args={"check_same_thread": False},  # SQLite 多线程
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    """FastAPI 依赖注入：提供数据库 session，请求结束自动关闭。"""
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
