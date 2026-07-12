from fastapi import APIRouter, HTTPException, Depends, Query, status
from supabase import create_client, Client
from typing import List, Optional
import random
from app.config import settings
from app.schemas.question import QuestionResponse, PaginatedQuestions

router = APIRouter(prefix="/questions", tags=["Questions"])

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

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
    query = db.table("questions").select("*", count="exact")
    
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

@router.get("/random-test", response_model=List[QuestionResponse])
async def get_random_test(db: Client = Depends(get_supabase)):
    # Efficient: Fetch all IDs, select 180 randomly, then load details
    id_res = db.table("questions").select("id").execute()
    if not id_res.data or len(id_res.data) < 180:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Insufficient questions in database to generate a full 180-question mock test"
        )
        
    all_ids = [record["id"] for record in id_res.data]
    selected_ids = random.sample(all_ids, 180)
    
    questions_res = db.table("questions").select("*").in_("id", selected_ids).execute()
    shuffled_questions = questions_res.data
    random.shuffle(shuffled_questions)
    
    return shuffled_questions

@router.get("/subjects", response_model=List[str])
async def get_subjects(db: Client = Depends(get_supabase)):
    try:
        # Call custom RPC helper if defined
        res = db.rpc("get_unique_subjects", {}).execute()
        return res.data
    except Exception:
        # Fallback raw list query
        res = db.table("questions").select("subject").execute()
        return list(set([record["subject"] for record in res.data if record.get("subject")]))

@router.get("/chapters", response_model=List[str])
async def get_chapters(subject: Optional[str] = Query(None), db: Client = Depends(get_supabase)):
    query = db.table("questions").select("chapter")
    if subject:
        query = query.eq("subject", subject)
    res = query.execute()
    return list(set([record["chapter"] for record in res.data if record.get("chapter")]))

@router.get("/{year}", response_model=List[QuestionResponse])
async def get_year_questions(year: int, db: Client = Depends(get_supabase)):
    if year < 2020 or year > 2025:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid year. Papers are only available for 2020-2025"
        )
    res = db.table("questions").select("*").eq("year", year).order("question_number", desc=False).execute()
    return res.data

@router.get("/question/{id}", response_model=QuestionResponse)
async def get_single_question(id: str, db: Client = Depends(get_supabase)):
    res = db.table("questions").select("*").eq("id", id).maybe_single().execute()
    if not res.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Question not found"
        )
    return res.data
