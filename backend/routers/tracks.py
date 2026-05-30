from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

class TrackCreateRequest(BaseModel):
    user_id: str
    track_name: str
    track_color: str = "teal"
    target_roles: List[str] = []
    target_seniority: Optional[str] = None
    salary_min_lpa: Optional[int] = None
    salary_target_lpa: Optional[int] = None
    work_mode_preference: List[str] = []
    aspiration_skills: List[str] = []
    personal_notes: Optional[str] = None
    is_default: bool = False

class TrackUpdateRequest(BaseModel):
    track_name: Optional[str] = None
    track_color: Optional[str] = None
    target_roles: Optional[List[str]] = None
    target_seniority: Optional[str] = None
    salary_min_lpa: Optional[int] = None
    salary_target_lpa: Optional[int] = None
    work_mode_preference: Optional[List[str]] = None
    aspiration_skills: Optional[List[str]] = None
    personal_notes: Optional[str] = None

@router.post("/create")
async def create_track(req: TrackCreateRequest):
    try:
        profile = supabase.table("user_profiles")\
            .select("max_tracks, tier_status")\
            .eq("user_id", req.user_id)\
            .execute()

        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        max_tracks = profile.data[0]["max_tracks"]

        existing = supabase.table("career_track_profiles")\
            .select("track_id")\
            .eq("user_id", req.user_id)\
            .eq("is_active", True)\
            .execute()

        if len(existing.data) >= max_tracks:
            raise HTTPException(
                status_code=403,
                detail=f"Track limit reached ({max_tracks}). Upgrade to Pro for unlimited tracks."
            )

        if req.is_default:
            supabase.table("career_track_profiles")\
                .update({"is_default": False})\
                .eq("user_id", req.user_id)\
                .execute()

        result = supabase.table("career_track_profiles").insert({
            "user_id": req.user_id,
            "track_name": req.track_name,
            "track_color": req.track_color,
            "target_roles": req.target_roles,
            "target_seniority": req.target_seniority,
            "salary_min_lpa": req.salary_min_lpa,
            "salary_target_lpa": req.salary_target_lpa,
            "work_mode_preference": req.work_mode_preference,
            "aspiration_skills": req.aspiration_skills,
            "personal_notes": req.personal_notes,
            "is_default": req.is_default,
        }).execute()

        return {"status": "created", "track": result.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_tracks(user_id: str):
    try:
        result = supabase.table("career_track_profiles")\
            .select("*")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .order("created_at")\
            .execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/{track_id}")
async def update_track(track_id: str, req: TrackUpdateRequest):
    try:
        updates = {k: v for k, v in req.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("career_track_profiles")\
            .update(updates)\
            .eq("track_id", track_id)\
            .execute()

        return {"status": "updated", "track": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{track_id}")
async def delete_track(track_id: str):
    try:
        supabase.table("career_track_profiles")\
            .update({"is_active": False})\
            .eq("track_id", track_id)\
            .execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))