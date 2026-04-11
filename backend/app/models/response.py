from datetime import datetime
from typing import Optional

from sqlalchemy import String, Text, Integer, Float, ForeignKey, DateTime, UniqueConstraint, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Response(Base):
    """一份完整的答卷提交。"""
    __tablename__ = "responses"
    __table_args__ = (
        UniqueConstraint("survey_id", "visitor_id", name="uq_survey_visitor"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    survey_id: Mapped[int] = mapped_column(ForeignKey("surveys.id", ondelete="CASCADE"), index=True)
    visitor_id: Mapped[str] = mapped_column(String(128), index=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    user_agent: Mapped[Optional[str]] = mapped_column(String(512), default=None)

    answers: Mapped[list["Answer"]] = relationship(
        back_populates="response",
        cascade="all, delete-orphan",
    )


class Answer(Base):
    """单个问题的回答。"""
    __tablename__ = "answers"

    id: Mapped[int] = mapped_column(primary_key=True)
    response_id: Mapped[int] = mapped_column(ForeignKey("responses.id", ondelete="CASCADE"), index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("questions.id", ondelete="CASCADE"), index=True)

    # 根据题型只填其中一个
    value_text: Mapped[Optional[str]] = mapped_column(Text, default=None)
    value_number: Mapped[Optional[float]] = mapped_column(Float, default=None)
    selected_option_ids: Mapped[Optional[list]] = mapped_column(JSON, default=None)  # list[int]

    response: Mapped["Response"] = relationship(back_populates="answers")
