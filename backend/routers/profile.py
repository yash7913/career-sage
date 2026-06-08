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

# ── Request models ──────────────────────────────────────────

class ProfileCreateRequest(BaseModel):
    user_id: str
    email: str
    full_name: str = ""

class DocumentSaveRequest(BaseModel):
    user_id: str
    file_name: str
    file_hash: str
    storage_path: str
    doc_tag: str = "RESUME"

class ExtractionRequest(BaseModel):
    user_id: str

# ── Helpers ─────────────────────────────────────────────────

STUDENT_DOMAINS = [".edu", ".ac.in", ".ac.uk", ".edu.au", ".org"]

def detect_tier(email: str) -> str:
    email_lower = email.lower()
    for domain in STUDENT_DOMAINS:
        if email_lower.endswith(domain):
            return "STUDENT_VERIFIED"
    return "GENERAL_FREE"

def get_max_tracks(tier: str) -> int:
    return 999 if tier in ("STUDENT_VERIFIED", "PREMIUM_PRO") else 1

# ── Routes ───────────────────────────────────────────────────

@router.post("/create")
async def create_profile(req: ProfileCreateRequest):
    try:
        existing = supabase.table("user_profiles")\
            .select("user_id")\
            .eq("user_id", req.user_id)\
            .execute()

        if existing.data:
            return {"status": "exists", "profile": existing.data[0]}

        tier = detect_tier(req.email)
        max_tracks = get_max_tracks(tier)

        result = supabase.table("user_profiles").insert({
            "user_id": req.user_id,
            "email": req.email,
            "full_name": req.full_name,
            "tier_status": tier,
            "max_tracks": max_tracks,
        }).execute()

        return {"status": "created", "profile": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document")
async def save_document(req: DocumentSaveRequest):
    try:
        existing = supabase.table("user_documents")\
            .select("doc_id")\
            .eq("user_id", req.user_id)\
            .eq("file_hash", req.file_hash)\
            .execute()

        if existing.data:
            return {"status": "exists", "doc_id": existing.data[0]["doc_id"]}

        result = supabase.table("user_documents").insert({
            "user_id": req.user_id,
            "file_name": req.file_name,
            "file_hash": req.file_hash,
            "storage_path": req.storage_path,
            "doc_tag": req.doc_tag,
        }).execute()

        return {"status": "saved", "doc_id": result.data[0]["doc_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract")
async def extract_profile(req: ExtractionRequest):
    try:
        from services.profile_extractor import extract_and_save_profile
        result = await extract_and_save_profile(req.user_id)
        return {"status": "ok", "profile": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_profile(user_id: str):
    try:
        result = supabase.table("user_profiles")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class StatusUpdateRequest(BaseModel):
    user_id: str
    search_status: str

@router.patch("/status")
async def update_search_status(req: StatusUpdateRequest):
    valid = ["ACTIVE", "OPEN", "PAUSED"]
    if req.search_status not in valid:
        raise HTTPException(status_code=400, detail=f"Status must be one of {valid}")
    try:
        result = supabase.table("user_profiles")\
            .update({"search_status": req.search_status})\
            .eq("user_id", req.user_id)\
            .execute()
        return {"status": "ok", "search_status": req.search_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class ContactUpdateRequest(BaseModel):
    user_id: str
    full_name: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None

@router.patch("/contact")
async def update_contact(req: ContactUpdateRequest):
    try:
        updates = {}
        if req.full_name is not None: updates["full_name"] = req.full_name
        if req.phone is not None: updates["phone"] = req.phone
        if req.location is not None: updates["location"] = req.location
        if req.linkedin_url is not None: updates["linkedin_url"] = req.linkedin_url
        if updates:
            supabase.table("user_profiles").update(updates).eq("user_id", req.user_id).execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class PreferencesUpdateRequest(BaseModel):
    user_id: str
    salary_target_lpa: Optional[int] = None
    preferred_company_stage: Optional[str] = None

@router.patch("/preferences")
async def update_preferences(req: PreferencesUpdateRequest):
    try:
        from services.company_stage import get_impact_pattern
        profile = supabase.table("user_profiles").select("raw_profile_text").eq("user_id", req.user_id).execute()
        raw_text = profile.data[0].get("raw_profile_text", "") if profile.data else ""
        impact_pattern = get_impact_pattern(raw_text)

        updates = {"impact_pattern": impact_pattern}
        if req.salary_target_lpa is not None:
            updates["salary_target_lpa"] = req.salary_target_lpa
        if req.preferred_company_stage is not None:
            updates["preferred_company_stage"] = req.preferred_company_stage

        supabase.table("user_profiles").update(updates).eq("user_id", req.user_id).execute()
        return {"status": "ok", "impact_pattern": impact_pattern}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/pentagram/{user_id}")
async def get_pentagram(user_id: str):
    try:
        from services.pentagram import compute_pentagram, COHORT_AVERAGES, TOP_DECILE
        profile = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]
        scores = compute_pentagram(p)
        cohort = scores.get("cohort", "Career Explorer")

        cohort_avg = COHORT_AVERAGES.get(cohort, COHORT_AVERAGES["Career Explorer"])
        top_decile = TOP_DECILE.get(cohort, TOP_DECILE["Career Explorer"])

        axes = ["technical_depth", "domain_expertise", "impact_magnitude", "leadership_signals", "learning_velocity"]
        user_percentile = 0
        for ax in axes:
            avg = cohort_avg.get(ax, 50)
            user_score = scores.get(ax, 0)
            if user_score > avg:
                user_percentile += 20

        supabase.table("user_profiles").update({
            "pentagram_scores": scores
        }).eq("user_id", user_id).execute()

        return {
            "user_scores": {ax: scores.get(ax, 0) for ax in axes},
            "cohort_average": cohort_avg,
            "top_decile": top_decile,
            "composite_score": scores.get("composite_score", 0),
            "cohort": cohort,
            "user_percentile": user_percentile,
            "weights": scores.get("weights", {}),
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/intelligence/{user_id}")
async def get_profile_intelligence(user_id: str):
    try:
        from services.trajectory import classify_trajectory, enrich_skills_with_confidence
        profile = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]
        raw_text = p.get("raw_profile_text") or ""
        skills = p.get("extracted_skills") or []
        education = p.get("education_data") or []
        cohort = p.get("cohort") or ""
        years_exp = p.get("years_of_experience") or 0

        if isinstance(skills, list):
            skill_list = []
            for s in skills:
                if isinstance(s, str):
                    skill_list.append(s)
                elif isinstance(s, dict):
                    skill_list.extend(v for v in s.values() if isinstance(v, str))
            skills = skill_list

        trajectory = classify_trajectory(raw_text, [], years_exp, cohort)
        enriched_skills = enrich_skills_with_confidence(skills, raw_text)

        gaps = []
        cohort_skill_map = {
            "Technical PM": ["SQL", "Python", "A/B Testing", "System Design", "Analytics"],
            "Data-Oriented PM": ["SQL", "Python", "Statistics", "A/B Testing", "Tableau"],
            "Data Scientist": ["Python", "Machine Learning", "Statistics", "SQL", "Deep Learning"],
            "Analytics Engineer": ["dbt", "SQL", "Python", "Spark", "Data Modeling"],
            "Full-Stack Engineer": ["React", "Node.js", "PostgreSQL", "Docker", "TypeScript"],
            "ML Engineer": ["PyTorch", "Python", "MLOps", "Kubernetes", "TensorFlow"],
        }

        expected_skills = cohort_skill_map.get(cohort, [])
        user_skill_names = {s.lower() for s in skills}
        gaps = [s for s in expected_skills if s.lower() not in user_skill_names][:5]

        return {
            "trajectory": trajectory,
            "enriched_skills": enriched_skills,
            "skill_gaps": gaps,
            "years_of_experience": years_exp,
            "cohort": cohort,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))