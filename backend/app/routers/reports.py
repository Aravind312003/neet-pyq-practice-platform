from fastapi import APIRouter, HTTPException, Depends, Query, status
from pydantic import BaseModel
from typing import Optional, Union
from supabase import create_client, Client
from app.config import settings

router = APIRouter(prefix="/reports", tags=["Reports"])

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

class ReportCreate(BaseModel):
    questionId: Optional[Union[str, int]] = None
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
        report_data = {
            "question_id": str(report.questionId) if report.questionId is not None else None,
            "question_number": report.questionNumber,
            "year": report.year,
            "subject": report.subject,
            "chapter": report.chapter,
            "issue_type": report.issueType,
            "description": report.description,
            "user_email": report.userEmail
        }
        res = db.table("reports").insert(report_data).execute()
        return {"status": "success", "message": "Report submitted successfully", "data": res.data}
    except Exception as e:
        print(f"Error inserting report to Supabase: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while saving report: {str(e)}"
        )

@router.get("")
async def get_reports(
    userEmail: Optional[str] = Query(None),
    db: Client = Depends(get_supabase)
):
    try:
        query = db.table("reports").select("*")
        
        # Match specific user email OR fallback "User" entry so no report is hidden
        if userEmail and userEmail not in ["undefined", "null", ""]:
            query = query.or_(f"user_email.eq.{userEmail},user_email.eq.User,user_email.is.null")
        
        res = query.order("created_at", desc=True).execute()
        return {"reports": res.data if res.data else []}
    except Exception as e:
        print(f"Error fetching reports: {e}")
        return {"reports": []}

@router.delete("/{report_id}")
async def delete_report(
    report_id: str,
    db: Client = Depends(get_supabase)
):
    try:
        res = db.table("reports").delete().eq("id", report_id).execute()
        return {"status": "success", "message": "Report deleted successfully", "data": res.data}
    except Exception as e:
        print(f"Error deleting report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete report: {str(e)}"
        )