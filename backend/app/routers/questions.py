from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel
from typing import List, Optional, Union
import random
from supabase import create_client, Client
from app.config import settings
from app.schemas.question import (
    QuestionResponse, 
    PaginatedQuestions, 
    SubjectsResponse, 
    ChaptersResponse, 
    TestQuestionsResponse
)

router = APIRouter(prefix="/questions", tags=["Questions"])

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

class BulkQuestionsRequest(BaseModel):
    ids: List[Union[str, int]]

@router.post("/bulk")
async def get_questions_bulk(payload: BulkQuestionsRequest, db: Client = Depends(get_supabase)):
    try:
        if not payload.ids:
            return {"questions": []}
        
        string_ids = [str(qid) for qid in payload.ids]
        res = db.table("neet_questions").select("*").in_("id", string_ids).execute()
        return {"questions": res.data if res.data else []}
    except Exception as e:
        print(f"Error fetching bulk questions: {e}")
        return {"questions": []}

@router.get("", response_model=PaginatedQuestions)
async def get_questions(
    year: Optional[int] = Query(None),
    subject: Optional[str] = Query(None),
    chapter: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    pageSize: int = Query(10, ge=1, le=100),
    db: Client = Depends(get_supabase)
):
    query = db.table("neet_questions").select("*", count="exact")
   
    if year:
        query = query.eq("year", year)
    if subject:
        query = query.eq("subject", subject)
    if chapter:
        query = query.eq("chapter", chapter)
    if search:
        query = query.or_(f"question.ilike.%{search}%,chapter.ilike.%{search}%")
        
    start = (page - 1) * pageSize
    end = start + pageSize - 1
    
    res = query.range(start, end).order("year", desc=True).order("question_number", desc=False).execute()
    
    total = res.count if res.count is not None else len(res.data)
    total_pages = (total + pageSize - 1) // pageSize
    
    return {
        "questions": res.data,
        "total": total,
        "page": page,
        "pageSize": pageSize,
        "totalPages": total_pages
    }

@router.get("/random-test", response_model=TestQuestionsResponse)
async def get_random_test(db: Client = Depends(get_supabase)):
    id_res = db.table("neet_questions").select("id").execute()
    if not id_res.data or len(id_res.data) < 180:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insufficient questions in database to generate a full 180-question mock test"
        )
        
    all_ids = [record["id"] for record in id_res.data]
    selected_ids = random.sample(all_ids, 180)
    
    questions_res = db.table("neet_questions").select("*").in_("id", selected_ids).execute()
    shuffled_questions = questions_res.data
    random.shuffle(shuffled_questions)
    
    return {"questions": shuffled_questions}

@router.get("/subjects", response_model=SubjectsResponse)
async def get_subjects(db: Client = Depends(get_supabase)):
    try:
        res = db.rpc("get_unique_subjects", {}).execute()
        return {"subjects": res.data}
    except Exception:
        res = db.table("neet_questions").select("subject").execute()
        unique_subs = list(set([record["subject"] for record in res.data if record.get("subject")]))
        return {"subjects": unique_subs}

@router.get("/chapters", response_model=ChaptersResponse)
async def get_chapters(subject: Optional[str] = Query(None), db: Client = Depends(get_supabase)):
    query = db.table("neet_questions").select("chapter")
    if subject:
        query = query.eq("subject", subject)
    res = query.execute()
    unique_chaps = list(set([record["chapter"] for record in res.data if record.get("chapter")]))
    return {"chapters": unique_chaps}

@router.get("/{year}", response_model=TestQuestionsResponse)
async def get_year_questions(year: int, db: Client = Depends(get_supabase)):
    if year < 2020 or year > 2025:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid year. Papers are only available for 2020-2025"
        )
    res = db.table("neet_questions").select("*").eq("year", year).order("question_number", desc=False).execute()
    return {"questions": res.data}

@router.get("/question/{id}", response_model=QuestionResponse)
async def get_single_question(id: str, db: Client = Depends(get_supabase)):
    res = db.table("neet_questions").select("*").eq("id", id).maybe_single().execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return res.data