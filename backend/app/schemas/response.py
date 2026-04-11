from typing import Optional, Union
from pydantic import BaseModel, Field


class AnswerIn(BaseModel):
    question_id: int
    # 根据题型填其中之一
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    selected_option_ids: Optional[list[int]] = None


class ResponseIn(BaseModel):
    visitor_id: str = Field(min_length=4, max_length=128)
    answers: list[AnswerIn]


class ResponseOut(BaseModel):
    id: int
    message: str = "提交成功"
