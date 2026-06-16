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
    preferred_work_mode: Optional[str] = None
    location: Optional[str] = None

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
        if req.preferred_work_mode is not None:
            updates["preferred_work_mode"] = req.preferred_work_mode
        if req.location is not None:
            updates["location"] = req.location

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
    }},
    {{
      "theme": "Behavioural",
      "title": "...",
      "situation": "...",
      "task": "...",
      "action": "...",
      "result": "...",
      "keywords": ["behaviour", "values", "culture"]
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

class OfferAnalysisRequest(BaseModel):
    user_id: str
    job_title: str
    company: str
    base_salary_lpa: float
    bonus_lpa: Optional[float] = None
    equity_percent: Optional[float] = None
    joining_bonus_lpa: Optional[float] = None
    notes: Optional[str] = None

@router.post("/analyse-offer")
async def analyse_offer(req: OfferAnalysisRequest):
    try:
        import anthropic
        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        p = profile.data[0] if profile.data else {}

        cohort = p.get("cohort") or ""
        years_exp = p.get("years_of_experience") or 0
        salary_target = p.get("salary_target_lpa") or 0
        location = p.get("location") or "India"

        total_comp = req.base_salary_lpa
        if req.bonus_lpa:
            total_comp += req.bonus_lpa
        if req.joining_bonus_lpa:
            total_comp += req.joining_bonus_lpa / 3

        prompt = f"""You are an expert compensation analyst and negotiation coach for the Indian tech market.

Analyse this job offer and provide negotiation guidance.

Candidate profile:
- Cohort: {cohort}
- Years of experience: {years_exp}
- Salary target: ₹{salary_target} LPA
- Location: {location}

Offer details:
- Role: {req.job_title} at {req.company}
- Base salary: ₹{req.base_salary_lpa} LPA
- Bonus: ₹{req.bonus_lpa or 0} LPA
- Equity: {req.equity_percent or 0}%
- Joining bonus: ₹{req.joining_bonus_lpa or 0} LPA
- Total comp (approx): ₹{total_comp:.1f} LPA
- Additional notes: {req.notes or 'None'}

Provide analysis in this exact JSON format:
{{
  "verdict": "Strong Offer|Fair Offer|Below Market|Lowball",
  "verdict_reason": "One sentence explaining the verdict",
  "market_range": {{
    "low": 0,
    "mid": 0,
    "high": 0
  }},
  "counter_offer": {{
    "base_salary_lpa": 0,
    "bonus_lpa": 0,
    "joining_bonus_lpa": 0,
    "reasoning": "2-3 sentences explaining the counter-offer logic"
  }},
  "negotiation_script": "A 150-word script the candidate can use to negotiate. Natural, professional, specific. Starts with appreciation then pivots to counter.",
  "negotiation_tips": [
    "Specific tip 1 for this offer",
    "Specific tip 2 for this offer",
    "Specific tip 3 for this offer"
  ],
  "red_flags": [],
  "green_flags": []
}}

Base market range on {cohort} roles with {years_exp} years experience in Indian tech market in 2026.
Return only JSON, no markdown."""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        import json, re
        content = message.content[0].text.strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        return json.loads(content)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/inferred-skills/{user_id}")
async def get_inferred_skills(user_id: str):
    try:
        import anthropic
        import json
        profile = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]
        raw_text = p.get("raw_profile_text") or ""
        existing_skills = p.get("extracted_skills") or []
        cohort = p.get("cohort") or ""

        if not raw_text:
            return {"inferred_skills": []}

        existing_lower = {s.lower() for s in existing_skills}

        prompt = f"""You are an expert career analyst. Infer implicit professional skills from this work history that aren't explicitly listed.

Candidate cohort: {cohort}
Existing listed skills: {', '.join(existing_skills[:20])}

Work history:
{raw_text[:2000]}

Rules:
For the candidate's profession, seniority, and scope:
- Infer skills using two mechanisms:
	1. Explicit Evidence - Directly supported by achievements, responsibilities, or outcomes.
	2. Profession-Standard Inference   - Skills commonly required to perform the described role successfully.
	3. Only infer when the role seniority, scope, and context make the skill highly probable.
	4. Infer foundational skills that are typically required to perform the described responsibilities.
	5. Only infer skills that a recruiter would reasonably expect this candidate to possess.
- Do NOT infer niche technical skills unless directly evidenced.
- Do NOT infer skills already in the existing skills list
- Never infer aspirational skills.
- Never infer specialist skills unless explicitly evidenced.
- Focus on: technical skills, domain expertise, leadership skills, methodologies
- Each skill must have a specific evidence snippet from the text
- Maximum 20 inferred skills
- Return ONLY valid JSON

Return format:
[
  {{
    "skill": "Skill Name",
    "confidence": "High|Medium",
    "inference_type": "Explicit|RoleBased",
    "evidence": "specific quote or paraphrase from work history that proves this skill",
    "category": "Technical|Domain|Leadership|Methodology"
  }}
]"""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        import re
        content = message.content[0].text.strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        inferred = json.loads(content)

        inferred = [
            s for s in inferred
            if isinstance(s, dict)
            and s.get("skill")
            and s.get("skill", "").lower() not in existing_lower
        ]

        return {"inferred_skills": inferred}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AcceptSkillsRequest(BaseModel):
    user_id: str
    skills: list

@router.post("/accept-inferred-skills")
async def accept_inferred_skills(req: AcceptSkillsRequest):
    try:
        profile = supabase.table("user_profiles").select("extracted_skills").eq("user_id", req.user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        existing = profile.data[0].get("extracted_skills") or []
        existing_lower = {s.lower() for s in existing}
        new_skills = [s for s in req.skills if s.lower() not in existing_lower]
        updated = existing + new_skills

        supabase.table("user_profiles").update({
            "extracted_skills": updated
        }).eq("user_id", req.user_id).execute()

        return {"status": "ok", "added": len(new_skills), "total": len(updated)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class LinkedInImportRequest(BaseModel):
    user_id: str
    linkedin_url: str

@router.post("/import-linkedin")
async def import_linkedin_profile(req: LinkedInImportRequest):
    try:
        import httpx
        import json

        apify_token = os.getenv("APIFY_API_TOKEN")
        if not apify_token:
            raise HTTPException(status_code=500, detail="Apify token not configured")

        # Call Apify LinkedIn profile scraper
        actor_id = "M2FMdjRVeF1HPGFcc"
        run_url = f"https://api.apify.com/v2/acts/{actor_id}/run-sync-get-dataset-items?token={apify_token}&timeout=60"

        async with httpx.AsyncClient(timeout=90) as client:
            run_res = await client.post(run_url, json={
                "urls": [req.linkedin_url]
            })
        if not run_res.status_code == 200:
            raise HTTPException(status_code=500, detail=f"Apify error: {run_res.text}")

        items = run_res.json()
        if not items or len(items) == 0:
            raise HTTPException(status_code=404, detail="No profile data returned from LinkedIn")

        li = items[0]

        # Extract work history
        experience = li.get("experience") or []
        work_history = []
        all_text_parts = []

        for exp in experience:
            company = exp.get("companyName") or ""
            position = exp.get("position") or ""
            description = exp.get("description") or ""
            start = exp.get("startDate", {})
            end = exp.get("endDate", {})

            start_date = f"{start.get('year', '')}-01" if start.get('year') else None
            end_date = f"{end.get('year', '')}-01" if end.get('year') and end.get('text') != 'Present' else None
            is_current = end.get('text') == 'Present'

            work_history.append({
                "title": position,
                "company": company,
                "start_date": start_date,
                "end_date": end_date,
                "is_current": is_current,
                "employment_type": (exp.get("employmentType") or "full-time").lower(),
            })

            if description:
                all_text_parts.append(f"{position} at {company}: {description}")

        # Extract skills
        li_skills = li.get("skills") or []
        extracted_skills = [s.get("name") for s in li_skills if s.get("name") and len(s.get("name", "")) < 40]

        # Extract education
        education = li.get("education") or []
        education_data = []
        for edu in education:
            education_data.append({
                "institution": edu.get("schoolName"),
                "degree": edu.get("degree"),
                "field_of_study": edu.get("fieldOfStudy"),
                "graduation_year": (edu.get("endDate") or {}).get("year"),
                "source_confidence": "explicit",
            })

        # Build raw profile text
        about = li.get("about") or ""
        headline = li.get("headline") or ""
        location_data = li.get("location") or {}
        location_text = location_data.get("linkedinText") or ""

        raw_profile_text = f"HEADLINE: {headline}\n\nABOUT: {about}\n\nROLES: " + \
            ", ".join([f"{w['title']} at {w['company']}" for w in work_history[:5]]) + \
            "\n\nSKILLS: " + ", ".join(extracted_skills[:30]) + \
            "\n\nEDUCATION: " + ", ".join([f"{e.get('degree')} in {e.get('field_of_study')} at {e.get('institution')}" for e in education_data[:3]]) + \
            "\n\nEXPERIENCE DETAILS:\n" + "\n\n".join(all_text_parts[:5])

        # Build summary
        full_name = f"{li.get('firstName', '')} {li.get('lastName', '')}".strip()
        current_pos = (li.get("currentPosition") or [{}])[0]
        current_company = current_pos.get("companyName") or ""
        summary = f"{full_name} — {headline}. Currently at {current_company}. {about[:200] if about else ''}"

        # Calculate years of experience
        years_exp = 0
        if work_history:
            import datetime
            earliest = None
            for w in work_history:
                if w.get("start_date"):
                    try:
                        yr = int(w["start_date"].split("-")[0])
                        if earliest is None or yr < earliest:
                            earliest = yr
                    except:
                        pass
            if earliest:
                years_exp = datetime.datetime.now().year - earliest

        # Save to profile
        updates = {
            "linkedin_url": req.linkedin_url,
            "extracted_skills": extracted_skills,
            "education_data": education_data,
            "work_history": work_history,
            "raw_profile_text": raw_profile_text[:3000],
            "extracted_summary": summary[:500],
            "years_of_experience": years_exp,
        }
        if full_name:
            updates["full_name"] = full_name
        if location_text:
            updates["location"] = location_text

        supabase.table("user_profiles").update(updates).eq("user_id", req.user_id).execute()

        return {
            "status": "ok",
            "name": full_name,
            "headline": headline,
            "skills_count": len(extracted_skills),
            "roles_count": len(work_history),
            "education_count": len(education_data),
            "location": location_text,
            "preview": {
                "skills": extracted_skills[:10],
                "roles": [f"{w['title']} at {w['company']}" for w in work_history[:3]],
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Career DNA ───────────────────────────────────────────────

NEXT_ROLE_MAP: dict[str, dict[str, str]] = {
    "Technical PM": {
        "intern":             "Associate Product Manager",
        "junior":             "Product Manager",
        "mid":                "Senior Product Manager",
        "senior":             "Senior Product Manager II",
        "lead":               "Lead Product Manager",
        "staff":              "Staff Product Manager",
        "principal":          "Principal Product Manager",
        "manager":            "Group Product Manager",
        "senior_manager":     "Senior Group PM / Principal PM",
        "associate_director": "Director of Product",
        "director":           "Senior Director of Product",
        "senior_director":    "VP of Product",
        "vp":                 "SVP of Product",
        "svp":                "EVP / Chief Product Officer",
        "evp":                "Chief Product Officer",
    },
    "Data-Oriented PM": {
        "intern":             "Associate PM, Data",
        "junior":             "Product Manager, Data",
        "mid":                "Senior PM, Data Products",
        "senior":             "Senior PM II, Data Products",
        "lead":               "Lead PM, Data Platform",
        "staff":              "Staff PM, Data",
        "principal":          "Principal PM, Data",
        "manager":            "Group PM, Data",
        "senior_manager":     "Senior Group PM, Data",
        "associate_director": "Director of Product, Data",
        "director":           "Senior Director, Data Products",
        "senior_director":    "VP Product, Data Platform",
        "vp":                 "SVP Product",
        "svp":                "EVP / Chief Product Officer",
        "evp":                "Chief Product Officer",
    },
    "Growth PM": {
        "intern":             "Associate Growth PM",
        "junior":             "Growth PM",
        "mid":                "Senior Growth PM",
        "senior":             "Senior Growth PM II",
        "lead":               "Lead Growth PM",
        "staff":              "Staff Growth PM",
        "principal":          "Principal Growth PM",
        "manager":            "Group PM, Growth",
        "senior_manager":     "Head of Growth",
        "associate_director": "Director of Growth",
        "director":           "Senior Director of Growth",
        "senior_director":    "VP Growth",
        "vp":                 "SVP Growth",
        "svp":                "EVP / Chief Growth Officer",
        "evp":                "Chief Growth Officer",
    },
    "Data Scientist": {
        "intern":             "Junior Data Scientist",
        "junior":             "Data Scientist",
        "mid":                "Senior Data Scientist",
        "senior":             "Senior Data Scientist II",
        "lead":               "Lead Data Scientist",
        "staff":              "Staff Data Scientist",
        "principal":          "Principal Data Scientist",
        "manager":            "Manager, Data Science",
        "senior_manager":     "Senior Manager, Data Science",
        "associate_director": "Associate Director, Data Science",
        "director":           "Director of Data Science",
        "senior_director":    "Senior Director, Data Science",
        "vp":                 "VP Data Science",
        "svp":                "SVP Data & Analytics",
        "evp":                "Chief Data Officer",
    },
    "Analytics Engineer": {
        "intern":             "Junior Analytics Engineer",
        "junior":             "Analytics Engineer",
        "mid":                "Senior Analytics Engineer",
        "senior":             "Senior Analytics Engineer II",
        "lead":               "Lead Analytics Engineer",
        "staff":              "Staff Analytics Engineer",
        "principal":          "Principal Analytics Engineer",
        "manager":            "Manager, Analytics Engineering",
        "senior_manager":     "Senior Manager, Analytics Engineering",
        "associate_director": "Associate Director, Data",
        "director":           "Director of Analytics Engineering",
        "senior_director":    "Senior Director, Data Platform",
        "vp":                 "VP Data",
        "svp":                "SVP Data & Analytics",
        "evp":                "Chief Data Officer",
    },
    "ML Engineer": {
        "intern":             "Junior ML Engineer",
        "junior":             "ML Engineer",
        "mid":                "Senior ML Engineer",
        "senior":             "Senior ML Engineer II",
        "lead":               "Lead ML Engineer",
        "staff":              "Staff ML Engineer",
        "principal":          "Principal ML Engineer",
        "manager":            "Manager, ML Engineering",
        "senior_manager":     "Senior Manager, ML",
        "associate_director": "Associate Director, AI/ML",
        "director":           "Director of ML Engineering",
        "senior_director":    "Senior Director, AI/ML",
        "vp":                 "VP AI/ML",
        "svp":                "SVP Artificial Intelligence",
        "evp":                "Chief AI Officer",
    },
    "Full-Stack Engineer": {
        "intern":             "Junior Software Engineer",
        "junior":             "Software Engineer",
        "mid":                "Senior Software Engineer",
        "senior":             "Senior Software Engineer II",
        "lead":               "Lead Engineer",
        "staff":              "Staff Engineer",
        "principal":          "Principal Engineer",
        "manager":            "Engineering Manager",
        "senior_manager":     "Senior Engineering Manager",
        "associate_director": "Associate Director, Engineering",
        "director":           "Director of Engineering",
        "senior_director":    "Senior Director, Engineering",
        "vp":                 "VP Engineering",
        "svp":                "SVP Engineering",
        "evp":                "EVP Engineering / CTO",
    },
    "Backend Engineer": {
        "intern":             "Junior Backend Engineer",
        "junior":             "Backend Engineer",
        "mid":                "Senior Backend Engineer",
        "senior":             "Senior Backend Engineer II",
        "lead":               "Lead Backend Engineer",
        "staff":              "Staff Engineer",
        "principal":          "Principal Engineer",
        "manager":            "Engineering Manager",
        "senior_manager":     "Senior Engineering Manager",
        "associate_director": "Associate Director, Engineering",
        "director":           "Director of Engineering",
        "senior_director":    "Senior Director, Engineering",
        "vp":                 "VP Engineering",
        "svp":                "SVP Engineering",
        "evp":                "EVP Engineering / CTO",
    },
    "Engineering Manager": {
        "intern":             "Associate Engineering Manager",
        "junior":             "Engineering Manager",
        "mid":                "Engineering Manager",
        "senior":             "Senior Engineering Manager",
        "lead":               "Senior Engineering Manager",
        "staff":              "Senior Engineering Manager",
        "principal":          "Senior Engineering Manager",
        "manager":            "Senior Engineering Manager",
        "senior_manager":     "Associate Director, Engineering",
        "associate_director": "Director of Engineering",
        "director":           "Senior Director of Engineering",
        "senior_director":    "VP Engineering",
        "vp":                 "SVP Engineering",
        "svp":                "EVP Engineering",
        "evp":                "CTO",
    },
}

SENIORITY_ORDER = [
    "intern",
    "junior",
    "mid",
    "senior",
    "lead",
    "staff",
    "principal",
    "manager",
    "senior_manager",
    "associate_director",
    "director",
    "senior_director",
    "vp",
    "svp",
    "evp",
    "c-suite",
]

def _next_seniority(current: str) -> str:
    try:
        idx = SENIORITY_ORDER.index(current)
        return SENIORITY_ORDER[min(idx + 1, len(SENIORITY_ORDER) - 1)]
    except ValueError:
        return "senior"


def _compute_promotion_readiness(
    pentagram_scores: dict,
    cohort: str,
    trajectory: str,
    years_exp: int,
    seniority_level: str,
) -> dict:
    from services.pentagram import COHORT_AVERAGES, TOP_DECILE

    axes = ["technical_depth", "domain_expertise", "impact_magnitude", "leadership_signals", "learning_velocity"]
    cohort_avg = COHORT_AVERAGES.get(cohort, COHORT_AVERAGES["Career Explorer"])
    top_dec    = TOP_DECILE.get(cohort, TOP_DECILE["Career Explorer"])

    axis_scores = []
    gaps = []
    for ax in axes:
        user_val = pentagram_scores.get(ax, 0)
        avg_val  = cohort_avg.get(ax, 50)
        top_val  = top_dec.get(ax, 85)
        if top_val > avg_val:
            norm = (user_val - avg_val) / (top_val - avg_val) * 100
        else:
            norm = 50
        norm = max(0, min(100, norm))
        axis_scores.append(norm)
        if norm < 60:
            label = ax.replace("_", " ").title()
            gaps.append({
                "axis": label,
                "gap": round(top_val - user_val),
                "user": user_val,
                "top_decile": top_val,
            })

    base_score = round(sum(axis_scores) / len(axis_scores))
    trajectory_bonus = {
        "Accelerating": 10,
        "On-track": 0,
        "Plateauing": -10,
        "Pivoting": -5,
    }.get(trajectory, 0)

    seniority_idx = SENIORITY_ORDER.index(seniority_level) if seniority_level in SENIORITY_ORDER else 2
    expected_min_years = [0, 1, 3, 5, 7, 9, 11, 8, 11, 13, 14, 17, 18, 22, 26, 30]
    years_bonus = 5 if years_exp >= expected_min_years[seniority_idx] else -5

    readiness = max(0, min(99, base_score + trajectory_bonus + years_bonus))

    if readiness >= 75:
        verdict, verdict_color, timeline = "Ready now", "#10B981", "0–6 months"
    elif readiness >= 55:
        verdict, verdict_color, timeline = "Almost there", "#F59E0B", "6–12 months"
    elif readiness >= 35:
        verdict, verdict_color, timeline = "Building toward it", "#3B82F6", "12–24 months"
    else:
        verdict, verdict_color, timeline = "Early stage", "#7F77DD", "24+ months"

    return {
        "score": readiness,
        "verdict": verdict,
        "verdict_color": verdict_color,
        "timeline": timeline,
        "top_gaps": sorted(gaps, key=lambda x: x["gap"], reverse=True)[:3],
        "axis_scores": {ax: round(axis_scores[i]) for i, ax in enumerate(axes)},
    }


def _compute_market_position(pentagram_scores: dict, cohort: str) -> dict:
    from services.pentagram import COHORT_AVERAGES, TOP_DECILE

    axes = ["technical_depth", "domain_expertise", "impact_magnitude", "leadership_signals", "learning_velocity"]
    cohort_avg = COHORT_AVERAGES.get(cohort, COHORT_AVERAGES["Career Explorer"])

    axes_above_avg = sum(
        1 for ax in axes
        if pentagram_scores.get(ax, 0) >= cohort_avg.get(ax, 50)
    )
    composite = pentagram_scores.get("composite_score", 50)

    if composite >= 80:
        percentile = 90 + min(9, (composite - 80) // 2)
    elif composite >= 65:
        percentile = round(70 + (composite - 65) * 1.3)
    elif composite >= 50:
        percentile = round(45 + (composite - 50) * 1.7)
    elif composite >= 35:
        percentile = round(20 + (composite - 35) * 1.7)
    else:
        percentile = max(5, composite // 2)

    percentile = min(99, max(1, percentile))

    if percentile >= 80:
        label = f"Top {100 - percentile}% of {cohort}s"
    elif percentile >= 50:
        label = f"Above average {cohort}"
    elif percentile >= 30:
        label = f"Average {cohort}"
    else:
        label = f"Building toward {cohort} average"

    return {
        "percentile": percentile,
        "label": label,
        "axes_above_avg": axes_above_avg,
        "total_axes": len(axes),
        "composite_score": composite,
    }


@router.get("/career-dna/{user_id}")
async def get_career_dna(user_id: str):
    try:
        from services.pentagram import compute_pentagram, COHORT_AVERAGES, TOP_DECILE
        from services.trajectory import classify_trajectory

        profile = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]
        cohort           = p.get("cohort") or "Career Explorer"
        impact_pattern   = p.get("impact_pattern") or ""
        seniority        = p.get("seniority_level") or "mid"
        years_exp        = p.get("years_of_experience") or 0
        raw_text         = p.get("raw_profile_text") or ""
        work_history     = p.get("work_history") or []
        full_name        = p.get("full_name") or ""
        extracted_skills = p.get("extracted_skills") or []

        if isinstance(extracted_skills, list):
            extracted_skills = [s for s in extracted_skills if isinstance(s, str)]

        # Pentagram — use cache if available
        cached_penta = p.get("pentagram_scores")
        if cached_penta and isinstance(cached_penta, dict) and cached_penta.get("composite_score"):
            penta = cached_penta
        else:
            penta = compute_pentagram(p)
            supabase.table("user_profiles").update({"pentagram_scores": penta}).eq("user_id", user_id).execute()

        # Trajectory
        trajectory_data = classify_trajectory(raw_text, work_history, years_exp, cohort)
        trajectory      = trajectory_data.get("trajectory", "On-track")

        # Promotion readiness
        readiness = _compute_promotion_readiness(penta, cohort, trajectory, years_exp, seniority)

        # Market position
        market = _compute_market_position(penta, cohort)

        # Next role
        cohort_roles = NEXT_ROLE_MAP.get(cohort, {})
        next_role = (
            cohort_roles.get(seniority)
            or cohort_roles.get(_next_seniority(seniority))
            or f"Senior {cohort}"
        )

        # Top 3 strengths
        cohort_avg = COHORT_AVERAGES.get(cohort, COHORT_AVERAGES["Career Explorer"])
        AXIS_LABELS = {
            "technical_depth":    "Technical Depth",
            "domain_expertise":   "Domain Expertise",
            "impact_magnitude":   "Impact Magnitude",
            "leadership_signals": "Leadership",
            "learning_velocity":  "Learning Velocity",
        }
        strengths = sorted(
            [
                {
                    "axis":   AXIS_LABELS[ax],
                    "score":  penta.get(ax, 0),
                    "vs_avg": penta.get(ax, 0) - cohort_avg.get(ax, 50),
                }
                for ax in AXIS_LABELS
            ],
            key=lambda x: x["vs_avg"],
            reverse=True,
        )[:3]

        # Share text
        share_text = (
            f"Just got my Career DNA on Career Sage 🧬\n\n"
            f"Cohort: {cohort}\n"
            f"Impact Pattern: {impact_pattern}\n"
            f"Market Position: {market['label']}\n"
            f"Promotion Readiness: {readiness['verdict']} ({readiness['score']}%)\n"
            f"Most Likely Next Role: {next_role}\n\n"
            f"Find out yours → career-sage-sigma.vercel.app"
        )

        return {
            "user_id":             user_id,
            "full_name":           full_name,
            "cohort":              cohort,
            "impact_pattern":      impact_pattern,
            "seniority_level":     seniority,
            "years_of_experience": years_exp,
            "trajectory":          trajectory_data,
            "pentagram": {
                "scores": {
                    ax: penta.get(ax, 0)
                    for ax in ["technical_depth", "domain_expertise", "impact_magnitude", "leadership_signals", "learning_velocity"]
                },
                "composite":  penta.get("composite_score", 0),
                "cohort_avg": cohort_avg,
                "top_decile": TOP_DECILE.get(cohort, TOP_DECILE["Career Explorer"]),
            },
            "promotion_readiness": readiness,
            "market_position":     market,
            "next_role":           next_role,
            "top_strengths":       strengths,
            "share_text":          share_text,
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))