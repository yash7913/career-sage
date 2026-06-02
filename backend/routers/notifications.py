from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

class NotificationCreateRequest(BaseModel):
    user_id: str
    title: str
    message: str
    type: Optional[str] = "info"

@router.get("/{user_id}")
async def get_notifications(user_id: str):
    try:
        result = supabase.table("notifications")\
            .select("*")\
            .eq("user_id", user_id)\
            .order("created_at", desc=True)\
            .limit(20)\
            .execute()
        return result.data or []
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{notification_id}/read")
async def mark_read(notification_id: str):
    try:
        supabase.table("notifications")\
            .update({"is_read": True})\
            .eq("notification_id", notification_id)\
            .execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/{user_id}/read-all")
async def mark_all_read(user_id: str):
    try:
        supabase.table("notifications")\
            .update({"is_read": True})\
            .eq("user_id", user_id)\
            .execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/")
async def create_notification(req: NotificationCreateRequest):
    try:
        result = supabase.table("notifications").insert({
            "user_id": req.user_id,
            "title": req.title,
            "message": req.message,
            "type": req.type,
        }).execute()
        return {"status": "created", "notification": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))