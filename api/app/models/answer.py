from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class AnswerSortOption(str, Enum):
    newest = "newest"
    top = "top"


class AnswerCreateRequest(BaseModel):
    body: str = Field(..., min_length=1, max_length=50000)


class AnswerPublic(BaseModel):
    id: str
    body: str
    question_id: str
    author_id: str
    author_username: str
    status: str = "active"
    upvote_count: int = 0
    downvote_count: int = 0
    score: int = 0
    created_at: datetime
    user_vote: str | None = None


class AnswerListResponse(BaseModel):
    answers: list[AnswerPublic]
    page: int
    total_pages: int
