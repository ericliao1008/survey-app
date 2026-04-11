from typing import Optional
from pydantic import BaseModel, ConfigDict


class OptionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    text: str
    value: str


class QuestionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    order: int
    type: str
    text: str
    required: bool
    config: Optional[dict] = None
    options: list[OptionOut] = []


class SurveyOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    slug: str
    title: str
    description: Optional[str] = None
    is_active: bool
    questions: list[QuestionOut] = []
