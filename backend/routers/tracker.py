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

class RejectionAnalysisRequest(BaseModel):
    user_id: str
    job_id: str
    stage_reached: str
    notes: Optional[str] = None

@router.post("/rejection-analysis")
async def rejection_analysis(req: RejectionAnalysisRequest):
    try:
        import anthropic
        import json
        import re

        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        p = profile.data[0] if profile.data else {}

        job = supabase.table("aggregated_jobs").select("*").eq("id", req.job_id).execute()
        j = job.data[0] if job.data else {}

        cohort = p.get("cohort") or ""
        years_exp = p.get("years_of_experience") or 0
        skills = p.get("extracted_skills") or []
        if isinstance(skills, list):
            skills = [s for s in skills if isinstance(s, str)]

        job_title = j.get("job_title") or ""
        company = j.get("company_name") or ""
        jd = (j.get("job_description") or "")[:1500]
        skills_needed = j.get("skills_needed") or []

        skill_gaps = [s for s in skills_needed if s.lower() not in {sk.lower() for sk in skills}]

        prompt = f"""You are an expert career coach. Analyse why this job application was likely rejected and provide actionable guidance.

Candidate profile:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Skills: {', '.join(skills[:15])}

Role applied for: {job_title} at {company}
Stage reached before rejection: {req.stage_reached}
Skills required but missing: {', '.join(skill_gaps[:8])}
Candidate notes: {req.notes or 'None provided'}
JD excerpt: {jd[:800]}

Return ONLY valid JSON:
{{
  "likely_reasons": [
    "Specific reason 1 based on the profile vs JD gap",
    "Specific reason 2",
    "Specific reason 3"
  ],
  "stage_analysis": "2-3 sentences explaining what rejection at the {req.stage_reached} stage typically means",
  "skill_gaps_to_close": [
    {{"skill": "skill name", "priority": "High|Medium|Low", "how_to_close": "specific action"}}
  ],
  "reapply_recommendation": "Yes in 6 months|Yes in 12 months|No — wrong fit|Yes — immediately after fixing X",
  "reapply_reasoning": "2 sentences explaining the reapply recommendation",
  "next_steps": [
    "Specific actionable step 1",
    "Specific actionable step 2",
    "Specific actionable step 3"
  ],
  "similar_roles_to_target": [
    "Role title 1 that would be a better fit right now",
    "Role title 2"
  ]
}}

Return only JSON, no markdown."""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1500,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        return json.loads(content)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))