from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Query
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

@router.post("/match")
async def match_jobs(user_id: str, track_id: str):
    try:
        from services.matching import match_jobs_for_track
        result = await match_jobs_for_track(user_id, track_id)
        return {"status": "ok", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/feed")
async def get_feed(
    user_id: str,
    track_id: str,
    limit: int = Query(default=20, le=50),
    offset: int = Query(default=0)
):
    try:
        rankings = supabase.table("user_job_rankings")\
            .select("*, aggregated_jobs(*)")\
            .eq("user_id", user_id)\
            .eq("track_id", track_id)\
            .order("match_percentage_score", desc=True)\
            .range(offset, offset + limit - 1)\
            .execute()

        if not rankings.data:
            return {"jobs": [], "total": 0}

        jobs = []
        for r in rankings.data:
            job = r.get("aggregated_jobs") or {}
            jobs.append({
                "ranking_id": r["ranking_id"],
                "match_percentage_score": r["match_percentage_score"],
                "identified_skill_gaps": r.get("identified_skill_gaps") or [],
                "is_starred": r.get("is_starred") or False,
                "job_id": job.get("id"),
                "company_name": job.get("company_name"),
                "job_title": job.get("job_title"),
                "location": job.get("location"),
                "skills_needed": job.get("skills_needed") or [],
                "source_link": job.get("source_link"),
                "job_description": (job.get("job_description") or "")[:500],
                "estimated_salary_min": job.get("estimated_salary_min"),
                "estimated_salary_max": job.get("estimated_salary_max"),
                "estimated_interview_rounds": job.get("estimated_interview_rounds"),
                "interview_breakdown_notes": job.get("interview_breakdown_notes"),
            })

        return {"jobs": jobs, "total": len(jobs)}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/rankings/{ranking_id}/star")
async def toggle_star(ranking_id: str):
    try:
        current = supabase.table("user_job_rankings")\
            .select("is_starred")\
            .eq("ranking_id", ranking_id)\
            .execute()

        if not current.data:
            raise HTTPException(status_code=404, detail="Ranking not found")

        new_val = not current.data[0]["is_starred"]
        supabase.table("user_job_rankings")\
            .update({"is_starred": new_val})\
            .eq("ranking_id", ranking_id)\
            .execute()

        return {"status": "ok", "is_starred": new_val}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
class ManualJobRequest(BaseModel):
    user_id: str
    track_id: str
    text_or_url: str

@router.post("/manual")
async def add_manual_job(req: ManualJobRequest):
    try:
        from services.job_parser import parse_job_input
        from services.scraper_service import make_job_id, dedup_and_save
        from services.matching import match_jobs_for_track

        parsed = await parse_job_input(req.text_or_url)

        job_id = make_job_id(
            parsed.get("company_name", ""),
            parsed.get("job_title", ""),
            parsed.get("source_link", req.text_or_url)
        )

        job = {
            "job_id": job_id,
            "company_name": parsed.get("company_name", "Unknown"),
            "job_title": parsed.get("job_title", "Unknown"),
            "location": parsed.get("location", "Not specified"),
            "job_description": parsed.get("job_description", ""),
            "skills_needed": parsed.get("skills_needed", []),
            "source_link": parsed.get("source_link", ""),
        }

        result = dedup_and_save([job])
        print(f"Manual job saved: {result}")

        saved_job = supabase.table("aggregated_jobs")\
            .select("id")\
            .eq("job_id", job_id)\
            .execute()

        if saved_job.data:
            actual_job_id = saved_job.data[0]["id"]
            await match_jobs_for_track(req.user_id, req.track_id)
            return {
                "status": "ok",
                "job": {**job, "id": actual_job_id},
                "message": f"Added {parsed.get('job_title')} at {parsed.get('company_name')} to your feed"
            }

        return {"status": "ok", "job": job}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/rankings/{ranking_id}/dismiss")
async def dismiss_job(ranking_id: str):
    try:
        supabase.table("user_job_rankings")\
            .update({"is_dismissed": True})\
            .eq("ranking_id", ranking_id)\
            .execute()
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/adjacent")
async def get_adjacent_roles(user_id: str, track_id: str, limit: int = 5):
    try:
        ranked = supabase.table("user_job_rankings")\
            .select("job_id, match_percentage_score")\
            .eq("user_id", user_id)\
            .eq("track_id", track_id)\
            .order("match_percentage_score", desc=True)\
            .execute()

        if not ranked.data:
            return {"adjacent": []}

        ranked_job_ids = {r["job_id"] for r in ranked.data}
        top_scores = [r["match_percentage_score"] for r in ranked.data[:10]]
        avg_top_score = sum(top_scores) / len(top_scores) if top_scores else 0

        all_jobs = supabase.table("aggregated_jobs")\
            .select("id, job_title, company_name, location, skills_needed, source_link, job_description")\
            .eq("is_active", True)\
            .execute()

        profile = supabase.table("user_profiles")\
            .select("extracted_skills, cohort")\
            .eq("user_id", user_id)\
            .execute()

        if not profile.data:
            return {"adjacent": []}

        profile_skills = set(s.lower() for s in (profile.data[0].get("extracted_skills") or []))
        cohort = profile.data[0].get("cohort") or ""

        ADJACENT_ROLE_MAP = {
            "Technical PM": [
                "product manager", "program manager", "technical program", "tpm",
                "engineering manager", "platform", "product lead", "product owner",
                "data scientist", "analytics", "data analyst", "business analyst",
            ],
            "Data-Oriented PM": [
                "product manager", "analytics", "data scientist", "business analyst",
                "growth", "product analyst", "data analyst", "insights",
            ],
            "Growth PM": [
                "product manager", "growth", "marketing", "product marketing",
                "analytics", "growth analyst", "revenue", "monetisation",
            ],
            "Data Scientist": [
                "machine learning", "ml engineer", "analytics engineer", "data analyst",
                "research scientist", "ai engineer", "data engineer", "business analyst",
            ],
            "Analytics Engineer": [
                "data engineer", "data scientist", "business analyst", "bi developer",
                "data analyst", "analytics", "platform engineer",
            ],
            "Full-Stack Engineer": [
                "backend engineer", "frontend engineer", "software engineer",
                "platform engineer", "devops", "mobile engineer",
            ],
            "ML Engineer": [
                "data scientist", "research engineer", "ai engineer",
                "platform engineer", "backend engineer", "data engineer",
            ],
        }

        adjacent_keywords = ADJACENT_ROLE_MAP.get(cohort, [])

        adjacent = []
        for job in (all_jobs.data or []):
            if job["id"] in ranked_job_ids:
                continue

            title_lower = job["job_title"].lower()
            is_adjacent = any(kw.lower() in title_lower for kw in adjacent_keywords)
            if not is_adjacent:
                continue

            job_skills = set(s.lower() for s in (job.get("skills_needed") or []))
            overlap = len(profile_skills.intersection(job_skills))
            skill_score = overlap / max(len(job_skills), 1) if job_skills else 0

            if skill_score >= 0.1 or overlap >= 1:
                adjacent.append({
                    "job_id": job["id"],
                    "job_title": job["job_title"],
                    "company_name": job["company_name"],
                    "location": job["location"],
                    "skills_needed": job.get("skills_needed") or [],
                    "source_link": job.get("source_link") or "",
                    "skill_overlap_score": round(skill_score * 100),
                })

        adjacent.sort(key=lambda x: x["skill_overlap_score"], reverse=True)
        return {"adjacent": adjacent[:limit], "cohort": cohort}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/regenerate-embedding")
async def regenerate_track_embedding(user_id: str, track_id: str):
    try:
        from services.embedding import generate_track_embedding
        profile = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        track = supabase.table("career_track_profiles").select("*").eq("track_id", track_id).execute()
        if not profile.data or not track.data:
            raise HTTPException(status_code=404, detail="Profile or track not found")
        p = profile.data[0]
        t = track.data[0]
        raw_profile = p.get("raw_profile_text") or p.get("extracted_summary") or ""
        embedding = generate_track_embedding(raw_profile, t, p)
        supabase.table("career_track_profiles").update({
            "track_embedding": embedding
        }).eq("track_id", track_id).execute()
        return {"status": "ok", "embedding_length": len(embedding)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class InterviewQuestionsRequest(BaseModel):
    user_id: str
    job_id: str

@router.post("/interview-questions")
async def generate_interview_questions(req: InterviewQuestionsRequest):
    try:
        import anthropic
        job = supabase.table("aggregated_jobs").select("*").eq("id", req.job_id).execute()
        if not job.data:
            raise HTTPException(status_code=404, detail="Job not found")
        j = job.data[0]

        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        p = profile.data[0] if profile.data else {}

        job_title = j.get("job_title") or ""
        company = j.get("company_name") or ""
        jd = (j.get("job_description") or "")[:2000]
        skills_needed = j.get("skills_needed") or []
        cohort = p.get("cohort") or ""
        years_exp = p.get("years_of_experience") or 0

        prompt = f"""You are an expert interview coach. Predict the most likely interview questions for this role.

Role: {job_title} at {company}
Candidate cohort: {cohort} with {years_exp} years experience
Job description excerpt: {jd[:1500]}
Required skills: {', '.join(skills_needed[:10])}

Generate interview questions for each round. Return ONLY valid JSON in this exact format:
{{
  "rounds": [
    {{
      "round": "Screening",
      "description": "30-min recruiter call",
      "questions": [
        {{"question": "...", "why": "...", "tip": "..."}},
        {{"question": "...", "why": "...", "tip": "..."}},
        {{"question": "...", "why": "...", "tip": "..."}}
      ]
    }},
    {{
      "round": "Technical",
      "description": "60-min technical assessment",
      "questions": [3 questions with same format]
    }},
    {{
      "round": "Product/Case",
      "description": "45-min product sense or case study",
      "questions": [3 questions with same format]
    }},
    {{
      "round": "Leadership",
      "description": "45-min behavioural and leadership",
      "questions": [3 questions with same format]
    }},
    {{
      "round": "Final",
      "description": "Culture fit and motivation",
      "questions": [3 questions with same format]
    }}
  ]
}}

For each question:
- "question": the actual interview question
- "why": why interviewers ask this for this specific role
- "tip": one specific tip for answering it well

Return only the JSON object, no markdown, no explanation."""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        import json
        import re
        content = message.content[0].text.strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        data = json.loads(content)

        supabase.table("aggregated_jobs").update({
            "interview_questions": json.dumps(data)
        }).eq("id", req.job_id).execute()

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))