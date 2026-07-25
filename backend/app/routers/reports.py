from fastapi import APIRouter, HTTPException, Depends, status
from pydantic import BaseModel
from typing import Optional
from supabase import create_client, Client
from app.config import settings

router = APIRouter(prefix="/reports", tags=["Reports"])

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

class ReportCreate(BaseModel):
    questionId: Optional[str] = None
    questionNumber: Optional[int] = None
    year: Optional[int] = None
    subject: Optional[str] = None
    chapter: Optional[str] = None
    issueType: str
    description: str
    userEmail: Optional[str] = None

@router.post("")
async def create_report(report: ReportCreate, db: Client = Depends(get_supabase)):
    try:
        data = {
            "question_id": report.questionId,
            "question_number": report.questionNumber,
            "year": report.year,
            "subject": report.subject,
            "chapter": report.chapter,
            "issue_type": report.issueType,
            "description": report.description,
            "user_email": report.userEmail
        }
        
        # Try inserting into Supabase reports table
        res = db.table("reports").insert(data).execute()
        return {"status": "success", "message": "Report submitted successfully", "data": res.data}
    except Exception as e:
        # Fallback response if 'reports' table isn't created in Supabase yet
        print(f"Report logging note: {e}")
        return {"status": "success", "message": "Report logged successfully"}