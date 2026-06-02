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

VALID_STAGES = ["DRAFT", "APPLIED", "INTERVIEWING", "OFFER", "REJECTED"]

class CardCreateRequest(BaseModel):
    user_id: str
    job_id: str
    track_id: str
    company_name: str
    job_title: str
    match_score: Optional[int] = None
    resume_version_id: Optional[str] = None
    notes: Optional[str] = ""

class CardUpdateRequest(BaseModel):
    stage: Optional[str] = None
    notes: Optional[str] = None

@router.post("/card")
async def create_card(req: CardCreateRequest):
    try:
        existing = supabase.table("pipeline_tracker")\
            .select("card_id, stage")\
            .eq("user_id", req.user_id)\
            .eq("job_id", req.job_id)\
            .execute()

        if existing.data:
            return {
                "status": "exists",
                "card": existing.data[0],
                "message": "Card already exists for this job"
            }

        result = supabase.table("pipeline_tracker").insert({
            "user_id": req.user_id,
            "job_id": req.job_id,
            "track_id": req.track_id,
            "company_name": req.company_name,
            "job_title": req.job_title,
            "match_score": req.match_score,
            "resume_version_id": req.resume_version_id,
            "stage": "DRAFT",
            "notes": req.notes or "",
        }).execute()

        return {"status": "created", "card": result.data[0]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.patch("/card/{card_id}")
async def update_card(card_id: str, req: CardUpdateRequest):
    try:
        updates = {}
        if req.stage is not None:
            if req.stage not in VALID_STAGES:
                raise HTTPException(status_code=400, detail=f"Invalid stage. Must be one of {VALID_STAGES}")
            updates["stage"] = req.stage
        if req.notes is not None:
            updates["notes"] = req.notes

        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")

        result = supabase.table("pipeline_tracker")\
            .update(updates)\
            .eq("card_id", card_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Card not found")

        return {"status": "updated", "card": result.data[0]}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_cards(user_id: str):
    try:
        cards = supabase.table("pipeline_tracker")\
            .select("*, aggregated_jobs(job_title, company_name, location, skills_needed, estimated_interview_rounds, interview_breakdown_notes, source_link, identified_skill_gaps:user_job_rankings(identified_skill_gaps))")\
            .eq("user_id", user_id)\
            .eq("is_active", True)\
            .order("created_at", desc=True)\
            .execute()

        return cards.data or []

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/card/{card_id}")
async def delete_card(card_id: str):
    try:
        supabase.table("pipeline_tracker")\
            .update({"is_active": False})\
            .eq("card_id", card_id)\
            .execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))