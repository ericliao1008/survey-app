from typing import Any, Optional
from pydantic import BaseModel, Field


class AnswerIn(BaseModel):
    question_id: int
    # 根据题型填其中之一
    value_text: Optional[str] = None
    value_number: Optional[float] = None
    selected_option_ids: Optional[list[int]] = None
    value_json: Optional[dict[str, Any]] = None
    # 循环追问：该答案绑定到 pipe 源题的哪个选项 id（允许未命中时为 null）
    pipe_option_id: Optional[int] = None


class ResponseIn(BaseModel):
    visitor_id: str = Field(min_length=4, max_length=128)
    answers: list[AnswerIn]


class ResponseOut(BaseModel):
    id: int
    message: str = "提交成功"
    terminated: bool = False
