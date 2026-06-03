from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional
import os
import json
import asyncio
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


class GenerateRequest(BaseModel):
    user_id: str
    track_id: str
    job_id: str
    user_tweak: Optional[str] = ""
    tone: Optional[str] = "confident"


def check_generation_limit(user_id: str) -> dict:
    from datetime import datetime, timezone, timedelta

    profile = supabase.table("user_profiles")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()

    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")

    p = profile.data[0]
    full_name = p.get("full_name") or "Your Name"
    phone = p.get("phone") or "[Phone]"
    location = p.get("location") or "[City, State]"
    linkedin_url = p.get("linkedin_url") or "[LinkedIn]"
    email_val = ""
    user_data = supabase.table("user_profiles").select("user_id").eq("user_id", user_id).execute()

    tier = p["tier_status"]

    if tier in ("STUDENT_VERIFIED", "PREMIUM_PRO"):
        return {"allowed": True, "tier": tier}

    count = p.get("generation_count") or 0
    reset_at = p.get("generation_reset_at")

    if reset_at:
        reset_dt = datetime.fromisoformat(reset_at.replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > reset_dt + timedelta(days=30):
            supabase.table("user_profiles").update({
                "generation_count": 0,
                "generation_reset_at": datetime.now(timezone.utc).isoformat()
            }).eq("user_id", user_id).execute()
            count = 0

    if count >= 2:
        return {"allowed": False, "tier": tier, "count": count}

    return {"allowed": True, "tier": tier, "count": count}


def increment_generation_count(user_id: str):
    profile = supabase.table("user_profiles")\
        .select("generation_count")\
        .eq("user_id", user_id)\
        .execute()

    if profile.data:
        current = profile.data[0].get("generation_count") or 0
        supabase.table("user_profiles").update({
            "generation_count": current + 1
        }).eq("user_id", user_id).execute()


def save_version(user_id: str, track_id: str, job_id: str,
                 resume_content: str = "", cover_letter_content: str = "",
                 user_tweak: str = "", prompt_snapshot: str = "") -> str:
    existing = supabase.table("resume_versions")\
        .select("version_number")\
        .eq("user_id", user_id)\
        .eq("track_id", track_id)\
        .eq("job_id", job_id)\
        .order("version_number", desc=True)\
        .limit(1)\
        .execute()

    next_version = 1
    if existing.data:
        next_version = existing.data[0]["version_number"] + 1

    result = supabase.table("resume_versions").insert({
        "user_id": user_id,
        "track_id": track_id,
        "job_id": job_id,
        "version_number": next_version,
        "resume_content": resume_content,
        "cover_letter_content": cover_letter_content,
        "user_tweak": user_tweak,
        "prompt_snapshot": prompt_snapshot[:500],
    }).execute()

    return result.data[0]["version_id"] if result.data else ""


def build_context(user_id: str, track_id: str, job_id: str) -> dict:
    profile = supabase.table("user_profiles")\
        .select("*")\
        .eq("user_id", user_id)\
        .execute()

    track = supabase.table("career_track_profiles")\
        .select("*")\
        .eq("track_id", track_id)\
        .execute()

    job = supabase.table("aggregated_jobs")\
        .select("*")\
        .eq("id", job_id)\
        .execute()

    ranking = supabase.table("user_job_rankings")\
        .select("identified_skill_gaps")\
        .eq("user_id", user_id)\
        .eq("track_id", track_id)\
        .eq("job_id", job_id)\
        .execute()

    if not profile.data or not track.data or not job.data:
        raise HTTPException(status_code=404, detail="Profile, track or job not found")

    p = profile.data[0]
    t = track.data[0]
    j = job.data[0]
    gaps = ranking.data[0].get("identified_skill_gaps", []) if ranking.data else []

    skills = p.get("extracted_skills") or []
    skill_list = ", ".join(skills) if isinstance(skills, list) else str(skills)

    full_name = p.get("full_name") or "Your Name"
    phone = p.get("phone") or "[Phone]"
    location_city = p.get("location") or "[City, State]"
    linkedin_url = p.get("linkedin_url") or "[LinkedIn]"

    try:
        auth_user = supabase.auth.admin.get_user_by_id(user_id)
        email = auth_user.user.email or "[Email]"
    except Exception:
        email = "[Email]"

    return {
        "full_name": full_name,
        "phone": phone,
        "location_city": location_city,
        "linkedin_url": linkedin_url,
	"email": email,
        "master_summary": p.get("extracted_summary") or "",
        "all_extracted_skills": skill_list,
        "education_data": json.dumps(p.get("education_data") or []),
        "raw_profile_text": p.get("raw_profile_text") or "",
        "track_name": t.get("track_name") or "",
        "track_summary": t.get("track_summary") or t.get("personal_notes") or "",
        "emphasized_skills": ", ".join(t.get("emphasized_skills") or []),
        "deemphasized_skills": ", ".join(t.get("deemphasized_skills") or []),
        "aspiration_skills": ", ".join(t.get("aspiration_skills") or []),
        "target_roles": ", ".join(t.get("target_roles") or []),
        "target_seniority": t.get("target_seniority") or "",
        "personal_notes": t.get("personal_notes") or "",
        "company_name": j.get("company_name") or "",
        "job_title": j.get("job_title") or "",
        "job_description": (j.get("job_description") or "")[:4000],
        "skill_gaps": ", ".join(gaps),
    }


async def stream_sectional_resume(ctx: dict, user_id: str, track_id: str, job_id: str, user_tweak: str):
    import json
    from services.sectional_generator import generate_resume_sectional

    try:
        yield f"data: {json.dumps({'status': 'starting', 'text': ''})}\n\n"

        sections_done = {"summary": False, "experience": False, "skills": False, "education": False}

        async def run_with_progress():
            result = await generate_resume_sectional(ctx)
            return result

        result = await run_with_progress()

        full_name = ctx.get("full_name", "Your Name")
        phone = ctx.get("phone", "[Phone]")
        location_city = ctx.get("location_city", "[City, State]")
        linkedin_url = ctx.get("linkedin_url", "[LinkedIn]")
        email = ctx.get("email", "[Email]")

        header = f"# {full_name}\n{location_city} | {phone} | {email} | {linkedin_url}\n\n---\n\n"
        yield f"data: {json.dumps({'text': header})}\n\n"
        await asyncio.sleep(0.1)

        yield f"data: {json.dumps({'text': '## SUMMARY\n'})}\n\n"
        summary_lines = result['resume'].split('## SUMMARY\n')[1].split('\n\n---\n\n')[0] if '## SUMMARY\n' in result['resume'] else ''
        for char in summary_lines:
            yield f"data: {json.dumps({'text': char})}\n\n"
        yield f"data: {json.dumps({'text': '\n\n---\n\n'})}\n\n"

        yield f"data: {json.dumps({'text': '## EXPERIENCE\n'})}\n\n"
        exp_part = result['resume'].split('## EXPERIENCE\n')[1].split('\n\n---\n\n')[0] if '## EXPERIENCE\n' in result['resume'] else ''
        for char in exp_part:
            yield f"data: {json.dumps({'text': char})}\n\n"
        yield f"data: {json.dumps({'text': '\n\n---\n\n'})}\n\n"

        yield f"data: {json.dumps({'text': '## SKILLS\n'})}\n\n"
        skills_part = result['resume'].split('## SKILLS\n')[1].split('\n\n---\n\n')[0] if '## SKILLS\n' in result['resume'] else ''
        for char in skills_part:
            yield f"data: {json.dumps({'text': char})}\n\n"
        yield f"data: {json.dumps({'text': '\n\n---\n\n'})}\n\n"

        yield f"data: {json.dumps({'text': '## EDUCATION\n'})}\n\n"
        edu_part = result['resume'].split('## EDUCATION\n')[1] if '## EDUCATION\n' in result['resume'] else ''
        for char in edu_part:
            yield f"data: {json.dumps({'text': char})}\n\n"

        full_output = f"### A. ATS-OPTIMISED RESUME\n{result['resume']}\n\n### B. ATS KEYWORD COVERAGE REPORT\n{result['ats_report']}\n\n### C. RECRUITER NOTES\n{result['recruiter_notes']}"

        increment_generation_count(user_id)
        save_version(
            user_id, track_id, job_id,
            resume_content=full_output,
            user_tweak=user_tweak,
            prompt_snapshot=f"Sectional generation for {ctx.get('job_title')} at {ctx.get('company_name')}"
        )

        yield f"data: {json.dumps({'done': True, 'full_output': full_output})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


async def stream_sectional_cover_letter(ctx: dict, user_id: str, track_id: str, job_id: str, user_tweak: str):
    import json
    from services.sectional_generator import generate_cover_letter_sectional

    try:
        yield f"data: {json.dumps({'text': ''})}\n\n"

        result = await generate_cover_letter_sectional(ctx)

        for char in result['cover_letter']:
            yield f"data: {json.dumps({'text': char})}\n\n"

        increment_generation_count(user_id)
        save_version(
            user_id, track_id, job_id,
            cover_letter_content=result['cover_letter'],
            user_tweak=user_tweak,
            prompt_snapshot=f"Cover letter for {ctx.get('job_title')} at {ctx.get('company_name')}"
        )

        yield f"data: {json.dumps({'done': True})}\n\n"

    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"


@router.post("/resume")
async def generate_resume(req: GenerateRequest):
    limit = check_generation_limit(req.user_id)
    if not limit["allowed"]:
        raise HTTPException(
            status_code=402,
            detail="Generation limit reached. Upgrade to Pro for unlimited access."
        )

    context = build_context(req.user_id, req.track_id, req.job_id)
    context["user_tweak"] = req.user_tweak or "No specific direction provided."

    return StreamingResponse(
        stream_sectional_resume(context, req.user_id, req.track_id, req.job_id, req.user_tweak or ""),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.post("/cover-letter")
async def generate_cover_letter(req: GenerateRequest):
    limit = check_generation_limit(req.user_id)
    if not limit["allowed"]:
        raise HTTPException(
            status_code=402,
            detail="Generation limit reached. Upgrade to Pro for unlimited access."
        )

    context = build_context(req.user_id, req.track_id, req.job_id)
    context["user_tweak"] = req.user_tweak or "No specific direction provided."
    context["tone"] = req.tone or "confident"

    return StreamingResponse(
        stream_sectional_cover_letter(context, req.user_id, req.track_id, req.job_id, req.user_tweak or ""),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/versions")
async def get_versions(user_id: str, track_id: str, job_id: str):
    try:
        result = supabase.table("resume_versions")\
            .select("version_id, version_number, created_at, user_tweak")\
            .eq("user_id", user_id)\
            .eq("track_id", track_id)\
            .eq("job_id", job_id)\
            .order("version_number", desc=True)\
            .execute()
        return result.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/versions/{version_id}")
async def get_version(version_id: str):
    try:
        result = supabase.table("resume_versions")\
            .select("*")\
            .eq("version_id", version_id)\
            .execute()
        if not result.data:
            raise HTTPException(status_code=404, detail="Version not found")
        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/limit/{user_id}")
async def get_limit(user_id: str):
    try:
        profile = supabase.table("user_profiles")\
            .select("tier_status, generation_count")\
            .eq("user_id", user_id)\
            .execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")
        p = profile.data[0]
        tier = p["tier_status"]
        count = p.get("generation_count") or 0
        max_gen = 999 if tier in ("STUDENT_VERIFIED", "PREMIUM_PRO") else 2
        return {
            "tier": tier,
            "generation_count": count,
            "max_generations": max_gen,
            "can_generate": tier in ("STUDENT_VERIFIED", "PREMIUM_PRO") or count < 2,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class IncrementRequest(BaseModel):
    user_id: str

@router.post("/increment")
async def increment_count(req: IncrementRequest):
    try:
        increment_generation_count(req.user_id)
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))