from pydantic import BaseModel
from typing import List, Optional

class QuestionResponse(BaseModel):
    id: str
    year: int
    question_number: int
    subject: str
    chapter: str
    question: str
    option_a: str
    option_b: str
    option_c: str
    option_d: str
    correct_answer: str
    explanation: Optional[str] = None

class PaginatedQuestions(BaseModel):
    questions: List[QuestionResponse]
    total: int
    page: int
    pageSize: int
    totalPages: int

# New schema wrappers to align perfectly with frontend object keys
class SubjectsResponse(BaseModel):
    subjects: List[str]

class ChaptersResponse(BaseModel):
    chapters: List[str]

class TestQuestionsResponse(BaseModel):
    questions: List[QuestionResponse]