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

        from services.profile_intelligence import identify_hidden_strengths, generate_experience_translation
        hidden_strengths = identify_hidden_strengths(raw_text, skills)
        translations = generate_experience_translation(
            raw_text, cohort,
            "Product Management",
            trajectory.get("trajectory") or ""
        )

        return {
            "trajectory": trajectory,
            "enriched_skills": enriched_skills,
            "skill_gaps": gaps,
            "hidden_strengths": hidden_strengths,
            "experience_translations": translations,
            "years_of_experience": years_exp,
            "cohort": cohort,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateAssetRequest(BaseModel):
    user_id: str
    asset_type: str
    tone: Optional[str] = "professional"

@router.post("/generate-asset")
async def generate_profile_asset(req: GenerateAssetRequest):
    try:
        import anthropic
        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]
        name = p.get("full_name") or "the candidate"
        summary = p.get("extracted_summary") or ""
        raw_text = p.get("raw_profile_text") or ""
        cohort = p.get("cohort") or ""
        skills = p.get("extracted_skills") or []
        years_exp = p.get("years_of_experience") or 0
        impact_pattern = p.get("impact_pattern") or ""

        if isinstance(skills, list):
            skills = [s for s in skills if isinstance(s, str)]

        skill_str = ", ".join(skills[:12])

        PROMPTS = {
            "linkedin_summary": f"""Write a compelling LinkedIn About section for {name}.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Impact pattern: {impact_pattern}
- Summary: {summary}
- Key skills: {skill_str}
- Work history context: {raw_text[:1000]}

Requirements:
- 3 paragraphs, ~200 words total
- First person, conversational but professional
- First paragraph: who you are and what you do
- Second paragraph: biggest achievements with specific metrics
- Third paragraph: what you are looking for next
- No buzzwords like "passionate", "rockstar", "ninja"
- End with a clear call to action
- Optimised for recruiter search on LinkedIn

Return only the LinkedIn summary text, no headers or labels.""",

            "elevator_pitch_60": f"""Write a 60-second elevator pitch for {name}.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Impact pattern: {impact_pattern}
- Summary: {summary}
- Key skills: {skill_str}

Requirements:
- Exactly 150 words
- Natural spoken rhythm — use contractions, short sentences
- Structure: Who you are → What you have built → Specific impact → What you are targeting → Why it matters
- No buzzwords or jargon
- Ends with an engaging question or transition

Return only the pitch text, no headers or labels.""",

            "elevator_pitch_30": f"""Write a 30-second elevator pitch for {name}.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Summary: {summary}
- Key skills: {skill_str}

Requirements:
- Exactly 75 words
- Punchy, memorable, specific
- Structure: Role + company type → Biggest impact → What you want next
- No buzzwords

Return only the pitch text, no headers or labels.""",

            "bio_short": f"""Write a 50-word professional bio for {name} in third person.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Summary: {summary}
- Key skills: {skill_str}

Use for: Twitter bio, Slack profile, conference badge.
Requirements: Third person, specific not generic, one memorable detail, no buzzwords.

Return only the bio text, no headers or labels.""",

            "bio_medium": f"""Write a 150-word professional bio for {name} in third person.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Impact pattern: {impact_pattern}
- Summary: {summary}
- Key skills: {skill_str}
- Work history: {raw_text[:600]}

Use for: speaker bio, portfolio site.
Requirements: Third person, 2 paragraphs, specific achievements with metrics, current focus, no buzzwords.

Return only the bio text, no headers or labels.""",

            "bio_long": f"""Write a 400-word professional bio for {name} in third person.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Impact pattern: {impact_pattern}
- Summary: {summary}
- Key skills: {skill_str}
- Work history: {raw_text[:1500]}

Use for: personal website About page.
Requirements: Third person, 3-4 paragraphs, career narrative arc, specific achievements, current mission, personal element, no buzzwords.

Return only the bio text, no headers or labels.""",

            "brand_statements": f"""Generate 3 personal brand statements for {name}.

Profile context:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Impact pattern: {impact_pattern}
- Summary: {summary}
- Key skills: {skill_str}

Requirements:
- Each statement is ONE sentence, under 20 words
- Specific, memorable, non-generic
- Format: [Role identity] who [distinctive approach/superpower] to [specific outcome]
- Example: "Data-oriented PM who turns security telemetry into product decisions at enterprise scale"
- Three different angles: technical, impact, vision

Return exactly 3 statements, one per line, no numbering or labels.""",
        }

        prompt = PROMPTS.get(req.asset_type)
        if not prompt:
            raise HTTPException(status_code=400, detail=f"Unknown asset type: {req.asset_type}")

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()

        asset_key = f"generated_{req.asset_type}"
        supabase.table("user_profiles").update({
            asset_key: content
        }).eq("user_id", req.user_id).execute()

        return {"content": content, "asset_type": req.asset_type}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class GenerateStarRequest(BaseModel):
    user_id: str
    force_regenerate: bool = False
    user_tweak: Optional[str] = None

@router.post("/generate-star-stories")
async def generate_star_stories(req: GenerateStarRequest):
    try:
        import anthropic
        import json
        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]

        if not req.force_regenerate:
            cached = p.get("generated_star_stories")
            if cached:
                if isinstance(cached, str):
                    cached = json.loads(cached)
                if isinstance(cached, dict) and cached.get("stories"):
                    return cached

        name = p.get("full_name") or "the candidate"
        raw_text = p.get("raw_profile_text") or ""
        cohort = p.get("cohort") or ""
        years_exp = p.get("years_of_experience") or 0

        tweak_instruction = ""
        if req.user_tweak:
            tweak_instruction = f"\n\nSpecial instruction from candidate: {req.user_tweak}"

        prompt = f"""You are an expert interview coach. Generate 5 STAR stories from this candidate's work history.

Candidate: {name}
Cohort: {cohort}
Years of experience: {years_exp}
Work history: {raw_text[:2000]}{tweak_instruction}

Generate exactly 5 STAR stories, one for each theme. Return ONLY valid JSON:
{{
  "stories": [
    {{
      "theme": "Leadership",
      "title": "One line title summarising the story",
      "situation": "2-3 sentences setting the context and challenge",
      "task": "1-2 sentences describing your specific responsibility",
      "action": "3-4 sentences describing the specific steps you took",
      "result": "2-3 sentences with specific measurable outcomes",
      "keywords": ["leadership", "team", "stakeholder"]
    }},
    {{
      "theme": "Problem Solving",
      "title": "...",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "...",
      "keywords": ["analysis", "data", "solution"]
    }},
    {{
      "theme": "Data-Driven Decision",
      "title": "...",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "...",
      "keywords": ["data", "metrics", "insight"]
    }},
    {{
      "theme": "Conflict Resolution",
      "title": "...",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "...",
      "keywords": ["conflict", "alignment", "communication"]
    }},
    {{
      "theme": "Failure and Learning",
      "title": "...",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "...",
      "keywords": ["failure", "learning", "growth"]
    }}
  ]
}}

Base each story on real evidence from the work history. Use specific metrics, company names, and outcomes where available.
Return only the JSON object, no markdown."""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=3000,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        import re
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        data = json.loads(content)

        supabase.table("user_profiles").update({
            "generated_star_stories": json.dumps(data)
        }).eq("user_id", req.user_id).execute()

        return data

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))