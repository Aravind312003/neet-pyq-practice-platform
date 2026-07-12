from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from typing import List, Dict, Any
from app.config import settings
from app.security.auth_handler import verify_access_token

router = APIRouter(prefix="/bookmarks", tags=["Bookmarks"])

def get_supabase() -> Client:
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

@router.get("", response_model=List[str])
async def get_user_bookmarks(
    current_user: Dict[str, Any] = Depends(verify_access_token),
    db: Client = Depends(get_supabase)
):
    res = db.table("bookmarks").select("question_id").eq("user_id", current_user["id"]).execute()
    return [str(record["question_id"]) for record in res.data]

@router.post("/{question_id}")
async def add_bookmark(
    question_id: str,
    current_user: Dict[str, Any] = Depends(verify_access_token),
    db: Client = Depends(get_supabase)
):
    try:
        new_bookmark = {
            "user_id": current_user["id"],
            "question_id": question_id
        }
        db.table("bookmarks").insert(new_bookmark).execute()
        return {"success": True, "message": "Bookmark saved successfully"}
    except Exception as e:
        # Ignore unique constraint violations (already bookmarked)
        return {"success": True, "message": "Bookmark saved successfully"}

@router.delete("/{question_id}")
async def remove_bookmark(
    question_id: str,
    current_user: Dict[str, Any] = Depends(verify_access_token),
    db: Client = Depends(get_supabase)
):
    try:
        db.table("bookmarks").delete().eq("user_id", current_user["id"]).eq("question_id", question_id).execute()
        return {"success": True, "message": "Bookmark removed successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to remove bookmark"
        )
