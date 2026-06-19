from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from middleware.rate_limiter import check_generation_limit, increment_generation_count
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
        import traceback
        traceback.print_exc()
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
        import traceback
        traceback.print_exc()
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
    current_company: Optional[str] = None
    current_level: Optional[str] = None
    career_status: Optional[str] = None
    onboarding_complete: Optional[bool] = None

@router.patch("/contact")
async def update_contact(req: ContactUpdateRequest):
    try:
        updates = {}
        if req.full_name is not None: updates["full_name"] = req.full_name
        if req.phone is not None: updates["phone"] = req.phone
        if req.location is not None: updates["location"] = req.location
        if req.linkedin_url is not None: updates["linkedin_url"] = req.linkedin_url
        if req.current_company is not None: updates["current_company"] = req.current_company
        if req.current_level is not None: updates["current_level"] = req.current_level
        if req.career_status is not None: updates["career_status"] = req.career_status
        if req.onboarding_complete is not None: updates["onboarding_complete"] = req.onboarding_complete
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
    current_base_lpa: Optional[float] = None
    current_equity_usd: Optional[float] = None
    current_variable_pct: Optional[float] = None
    preferred_currency: Optional[str] = None
    current_comp_currency: Optional[str] = None
    target_market: Optional[list] = None

@router.patch("/preferences")
async def update_preferences(req: PreferencesUpdateRequest):
    try:
        updates = {}
        if req.salary_target_lpa is not None:
            updates["salary_target_lpa"] = req.salary_target_lpa
        if req.preferred_company_stage is not None:
            updates["preferred_company_stage"] = req.preferred_company_stage
        if req.preferred_work_mode is not None:
            updates["preferred_work_mode"] = req.preferred_work_mode
        if req.location is not None:
            updates["location"] = req.location
        if req.current_base_lpa is not None:
            updates["current_base_lpa"] = req.current_base_lpa
        if req.current_equity_usd is not None:
            updates["current_equity_usd"] = req.current_equity_usd
        if req.current_variable_pct is not None:
            updates["current_variable_pct"] = req.current_variable_pct
        if req.preferred_currency is not None:
            updates["preferred_currency"] = req.preferred_currency
        if req.current_comp_currency is not None:
            updates["current_comp_currency"] = req.current_comp_currency
        if req.target_market is not None:
            updates["target_market"] = req.target_market

        supabase.table("user_profiles").update(updates).eq("user_id", req.user_id).execute()
        return {"status": "ok"}
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
        await check_generation_limit(req.user_id, "star_stories")
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
        await increment_generation_count(req.user_id)

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
        await check_generation_limit(req.user_id, "offer_analysis")
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
        await increment_generation_count(req.user_id)
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

# ── Document management ──────────────────────────────────────

@router.get("/documents/{user_id}")
async def get_user_documents(user_id: str):
    try:
        result = supabase.table("user_documents").select(
            "doc_id, file_name, doc_tag, is_active, created_at"
        ).eq("user_id", user_id).order("created_at", desc=True).execute()
        return {"documents": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ToggleDocumentRequest(BaseModel):
    user_id: str
    doc_id: str
    is_active: bool

@router.patch("/documents/toggle")
async def toggle_document(req: ToggleDocumentRequest):
    try:
        # Verify doc belongs to user
        doc = supabase.table("user_documents").select("doc_id").eq(
            "doc_id", req.doc_id
        ).eq("user_id", req.user_id).execute()

        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")

        supabase.table("user_documents").update({
            "is_active": req.is_active
        }).eq("doc_id", req.doc_id).execute()

        return {"status": "ok", "is_active": req.is_active}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class DeleteDocumentRequest(BaseModel):
    user_id: str
    doc_id: str

@router.delete("/documents/delete")
async def delete_document(req: DeleteDocumentRequest):
    try:
        # Verify doc belongs to user
        doc = supabase.table("user_documents").select("doc_id, storage_path").eq(
            "doc_id", req.doc_id
        ).eq("user_id", req.user_id).execute()

        if not doc.data:
            raise HTTPException(status_code=404, detail="Document not found")

        storage_path = doc.data[0]["storage_path"]

        # Delete from Supabase Storage
        try:
            supabase.storage.from_("user-documents").remove([storage_path])
        except Exception as storage_err:
            print(f"Storage delete failed: {storage_err}")

        # Delete from user_documents table
        supabase.table("user_documents").delete().eq("doc_id", req.doc_id).execute()

        return {"status": "deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── User Projects ────────────────────────────────────────────

class ProjectCreateRequest(BaseModel):
    user_id: str
    title: str
    description: Optional[str] = None
    outcomes: Optional[str] = None
    tech_stack: Optional[list] = []
    doc_ids: Optional[list] = []
    links: Optional[list] = []

class ProjectUpdateRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    outcomes: Optional[str] = None
    tech_stack: Optional[list] = None
    doc_ids: Optional[list] = None
    links: Optional[list] = None

@router.post("/projects")
async def create_project(req: ProjectCreateRequest):
    try:
        result = supabase.table("user_projects").insert({
            "user_id":     req.user_id,
            "title":       req.title,
            "description": req.description,
            "outcomes":    req.outcomes,
            "tech_stack":  req.tech_stack or [],
            "doc_ids":     req.doc_ids or [],
            "links":       req.links or [],
        }).execute()
        return {"status": "created", "project": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/projects/{user_id}")
async def get_projects(user_id: str):
    try:
        result = supabase.table("user_projects").select("*").eq(
            "user_id", user_id
        ).order("created_at", desc=True).execute()
        return {"projects": result.data or []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/projects/{project_id}")
async def update_project(project_id: str, req: ProjectUpdateRequest):
    try:
        updates = {k: v for k, v in req.dict().items() if v is not None}
        if not updates:
            raise HTTPException(status_code=400, detail="No fields to update")
        result = supabase.table("user_projects").update(updates).eq(
            "project_id", project_id
        ).execute()
        return {"status": "updated", "project": result.data[0]}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    try:
        supabase.table("user_projects").delete().eq("project_id", project_id).execute()
        return {"status": "deleted"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

class SynthesizeProjectRequest(BaseModel):
    user_id: str
    project_id: str

@router.post("/projects/{project_id}/synthesize")
async def synthesize_project(project_id: str, req: SynthesizeProjectRequest):
    try:
        import anthropic
        import json

        # Get project
        project = supabase.table("user_projects").select("*").eq(
            "project_id", project_id
        ).eq("user_id", req.user_id).execute()

        if not project.data:
            raise HTTPException(status_code=404, detail="Project not found")

        p = project.data[0]

        # Get attached documents
        doc_ids = p.get("doc_ids") or []
        doc_text = ""

        if doc_ids:
            docs = supabase.table("user_documents").select("*").in_(
                "doc_id", doc_ids
            ).execute()
            for doc in (docs.data or []):
                try:
                    file_bytes = supabase.storage.from_("user-documents").download(
                        doc["storage_path"]
                    )
                    from services.profile_extractor import extract_text_from_bytes
                    text = extract_text_from_bytes(file_bytes, doc["file_name"])
                    if text:
                        doc_text += f"\n\n--- {doc['file_name']} ---\n{text[:3000]}"
                except:
                    continue

        # Build context from existing fields
        context = f"""Project: {p.get('title', '')}
Description: {p.get('description', '') or 'Not provided'}
Outcomes: {p.get('outcomes', '') or 'Not provided'}
Tech stack: {', '.join(p.get('tech_stack') or [])}
{f'Documents:{doc_text}' if doc_text else ''}"""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=300,
            messages=[{"role": "user", "content": f"""Synthesize this project into a concise professional summary for a resume/portfolio.

{context}

Return a JSON object:
{{
  "summary": "2-3 sentence professional summary of what was built, why, and the impact",
  "key_outcomes": ["outcome 1", "outcome 2", "outcome 3"],
  "tech_stack": ["tech1", "tech2"],
  "impact_score": 1-10
}}

Return ONLY valid JSON."""}]
        )

        raw = message.content[0].text.strip()
        raw = raw.replace('```json', '').replace('```', '').strip()
        result = json.loads(raw)

        # Save synthesized summary
        supabase.table("user_projects").update({
            "synthesized_summary": result.get("summary"),
            "tech_stack": result.get("tech_stack") or p.get("tech_stack") or [],
        }).eq("project_id", project_id).execute()

        return {"status": "ok", "result": result}

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


class LinkedInImportRequest(BaseModel):
    user_id: str
    linkedin_url: str

class ClassifyDocumentRequest(BaseModel):
    user_id: str
    file_name: str
    text_preview: str  # First 800 chars of extracted text

@router.post("/documents/classify")
async def classify_document(req: ClassifyDocumentRequest):
    try:
        import anthropic
        import re

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        prompt = f"""You are classifying a professional document. Based on the filename and text preview, classify it into exactly one category.

Filename: {req.file_name}
Text preview: {req.text_preview[:800]}

Categories:
- RESUME: CV, resume, work history document
- LINKEDIN_EXPORT: LinkedIn profile export PDF
- PROJECT_DETAIL: Project documentation, case study, portfolio piece, PRD, product requirements
- CERTIFICATION: Certificate, diploma, credential, course completion
- SLIDES: Presentation, slide deck, pitch deck
- OTHER: Anything that doesn't fit the above

Rules:
- If the text mentions "LinkedIn" prominently or looks like a LinkedIn profile export, classify as LINKEDIN_EXPORT
- If the text has job titles, work history, education section — it's a RESUME
- If the text describes a product, feature, requirements, user stories, or project outcomes — it's PROJECT_DETAIL
- If the text is a certificate or mentions "certificate of completion" — it's CERTIFICATION
- If the filename ends in .pptx or text suggests slides — it's SLIDES

Return ONLY the category name, nothing else. Example: RESUME"""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=20,
            messages=[{"role": "user", "content": prompt}]
        )

        tag = message.content[0].text.strip().upper()
        valid_tags = ["RESUME", "LINKEDIN_EXPORT", "PROJECT_DETAIL", "CERTIFICATION", "SLIDES", "OTHER"]
        if tag not in valid_tags:
            tag = "OTHER"

        return {"tag": tag}

    except Exception as e:
        return {"tag": "RESUME"}  # Fallback — never break upload flow

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

class LinkedInTextImportRequest(BaseModel):
    user_id: str
    linkedin_text: str
    linkedin_url: Optional[str] = None

@router.post("/import-linkedin-text")
async def import_linkedin_text(req: LinkedInTextImportRequest):
    try:
        import anthropic
        import json
        import re

        if not req.linkedin_text or len(req.linkedin_text.strip()) < 100:
            raise HTTPException(status_code=400, detail="Pasted text too short. Please paste your full LinkedIn profile.")

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        prompt = f"""You are extracting structured career data from a LinkedIn profile that has been copy-pasted as plain text.

LinkedIn profile text:
{req.linkedin_text[:6000]}

Extract and return ONLY valid JSON:
{{
  "full_name": "extracted name or null",
  "headline": "job title/headline or null",
  "location": "location or null",
  "about": "about section text or null",
  "skills": ["skill1", "skill2"],
  "work_history": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "is_current": false,
      "description": "role description or null"
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Degree",
      "field_of_study": "Field",
      "graduation_year": 2020
    }}
  ]
}}

Rules:
- Extract only what is present in the text — never fabricate
- Skills: extract all explicitly listed skills, max 40
- Work history: extract all roles in order, most recent first
- Dates: use YYYY-MM format, null if not found
- Return ONLY the JSON object, no markdown"""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'^```\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Could not parse LinkedIn profile text")

        data = json.loads(match.group())

        # Get existing profile
        profile = supabase.table("user_profiles").select("extracted_skills").eq("user_id", req.user_id).execute()
        existing_skills = profile.data[0].get("extracted_skills") or [] if profile.data else []
        existing_lower  = {s.lower() for s in existing_skills}

        # Merge skills
        new_skills = [s for s in (data.get("skills") or []) if s.lower() not in existing_lower and len(s) < 50]
        all_skills = existing_skills + new_skills

        # Build updates
        updates: dict = {"extracted_skills": all_skills}
        if data.get("education"):
            updates["education_data"] = data["education"]
        if data.get("full_name"):
            updates["full_name"] = data["full_name"]
        if data.get("location"):
            updates["location"] = data["location"]
        if data.get("about"):
            updates["extracted_summary"] = data["about"][:500]
        if req.linkedin_url and "linkedin.com/in/" in req.linkedin_url:
            updates["linkedin_url"] = req.linkedin_url

        # Rebuild raw_profile_text
        roles_text = ", ".join([
            f"{w.get('title')} at {w.get('company')}"
            for w in (data.get("work_history") or [])[:5]
        ])
        skills_text = ", ".join(all_skills[:30])
        raw_text = f"ROLES: {roles_text}\nSKILLS: {skills_text}\nABOUT: {(data.get('about') or '')[:300]}"
        updates["raw_profile_text"] = raw_text[:3000]

        # Invalidate skill categories cache so it regenerates
        updates["skill_categories"] = None

        supabase.table("user_profiles").update(updates).eq("user_id", req.user_id).execute()

        return {
            "status": "ok",
            "skills_added": len(new_skills),
            "roles_found": len(data.get("work_history") or []),
            "education_found": len(data.get("education") or []),
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/import-linkedin-pdf")
async def import_linkedin_pdf(
    user_id: str = Form(...),
    linkedin_url: Optional[str] = Form(None),
    file: UploadFile = File(...),
):
    try:
        import anthropic
        import json
        import re
        from services.profile_extractor import extract_text_from_bytes

        if not file.filename.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")

        file_bytes = await file.read()
        if len(file_bytes) < 1000:
            raise HTTPException(status_code=400, detail="PDF too small — please upload your full LinkedIn profile export")

        # Extract text from PDF
        text = extract_text_from_bytes(file_bytes, file.filename)
        if not text or len(text.strip()) < 100:
            raise HTTPException(status_code=400, detail="Could not extract text from PDF. Make sure it's a LinkedIn profile export.")

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

        prompt = f"""You are extracting structured career data from a LinkedIn profile PDF export.

LinkedIn profile text:
{text[:6000]}

Extract and return ONLY valid JSON:
{{
  "full_name": "extracted name or null",
  "headline": "job title/headline or null",
  "location": "location or null",
  "about": "summary/about section text or null",
  "skills": ["skill1", "skill2"],
  "work_history": [
    {{
      "title": "Job Title",
      "company": "Company Name",
      "start_date": "YYYY-MM or null",
      "end_date": "YYYY-MM or null",
      "is_current": false,
      "description": "role description or null"
    }}
  ],
  "education": [
    {{
      "institution": "University Name",
      "degree": "Degree",
      "field_of_study": "Field",
      "graduation_year": 2020
    }}
  ],
  "certifications": ["cert1", "cert2"]
}}

Rules:
- Extract only what is present in the text — never fabricate
- Skills: extract all explicitly listed skills and infer from job descriptions, max 40
- Work history: extract all roles, most recent first
- Job titles: extract CORE title only — remove team names, project names, suffixes after ' - ' or ','
  Examples: "Lead, Product Management - Productivity Insights" → "Lead Product Manager"
            "Senior SWE - Payments" → "Senior Software Engineer"
- Dates: use YYYY-MM format, estimate month as 01 if only year given
- Return ONLY the JSON object, no markdown"""

        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'^```\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Could not parse LinkedIn PDF")

        data = json.loads(match.group())
        

        # Get existing profile
        profile = supabase.table("user_profiles").select("extracted_skills").eq("user_id", user_id).execute()
        existing_skills = profile.data[0].get("extracted_skills") or [] if profile.data else []
        existing_lower  = {s.lower() for s in existing_skills}

        # Merge skills
        new_skills = [s for s in (data.get("skills") or []) if s.lower() not in existing_lower and len(s) < 50]
        all_skills = existing_skills + new_skills

        # Build updates — only columns that exist in user_profiles
        updates: dict = {
            "extracted_skills": all_skills,
            "skill_categories": None,
        }
        if data.get("education"):
            updates["education_data"] = data["education"]
        if data.get("full_name"):
            updates["full_name"] = data["full_name"]
        if data.get("location"):
            updates["location"] = data["location"]
        if data.get("about"):
            updates["extracted_summary"] = data["about"][:500]
        if linkedin_url and "linkedin.com/in/" in linkedin_url:
            updates["linkedin_url"] = linkedin_url

        # Store structured work history
        if data.get("work_history"):
            updates["work_history"] = data["work_history"]

        # Rebuild rich raw_profile_text with full timeline
        work_hist = data.get("work_history") or []
        roles_list = []
        for w in work_hist[:8]:
            title   = w.get("title") or ""
            company = w.get("company") or ""
            start   = (w.get("start_date") or "")[:4]
            end     = "Present" if w.get("is_current") else (w.get("end_date") or "")[:4]
            if title and company:
                roles_list.append(f"{title} at {company} ({start}–{end})")

        skills_text = ", ".join(all_skills[:30])
        about_text  = (data.get("about") or "")[:400]
        rich_raw    = (
            f"ROLES: {', '.join(roles_list)}\n"
            f"SKILLS: {skills_text}\n"
            f"ABOUT: {about_text}"
        )
        updates["raw_profile_text"] = rich_raw[:3000]

        # Re-run cohort classification with richer data
        try:
            from services.cohort_classifier import classify_cohort
            import datetime
            cohort = classify_cohort(
                extracted_skills=all_skills,
                raw_profile_text=rich_raw,
                work_history=work_hist,
                years_of_experience=0,
            )
            updates["cohort"] = cohort

            # Recalculate years of experience from work history
            earliest = None
            for w in work_hist:
                sd = w.get("start_date") or ""
                if sd:
                    try:
                        yr = int(sd[:4])
                        if yr > 1990 and (earliest is None or yr < earliest):
                            earliest = yr
                    except:
                        pass
            if earliest:
                updates["years_of_experience"] = max(0, datetime.datetime.now().year - earliest)

            # Derive seniority from most recent role
            if work_hist:
                from services.trajectory import extract_seniority
                most_recent_title = work_hist[0].get("title") or ""
                seniority_level = extract_seniority(most_recent_title)
                seniority_map = {0: "junior", 1: "mid", 2: "mid", 3: "senior", 4: "manager", 5: "vp"}
                updates["seniority_level"] = seniority_map.get(seniority_level, "senior")

            # Invalidate pentagram cache so it regenerates with new data
            updates["pentagram_scores"] = None

        except Exception as enrich_err:
            print(f"Post-import enrichment failed: {enrich_err}")

        # Rebuild raw_profile_text
        roles_text  = ", ".join([f"{w.get('title')} at {w.get('company')}" for w in (data.get("work_history") or [])[:5]])
        skills_text = ", ".join(all_skills[:30])
        about_text  = (data.get("about") or "")[:400]
        raw_text    = f"ROLES: {roles_text}\nSKILLS: {skills_text}\nABOUT: {about_text}"
        updates["raw_profile_text"] = raw_text[:3000]

        result = supabase.table("user_profiles").update(updates).eq("user_id", user_id).execute()

        # Re-run cohort classification and seniority detection with new data
        try:
            from services.cohort_classifier import classify_cohort
            import datetime

            all_skills_for_cohort = all_skills
            cohort = classify_cohort(
                extracted_skills=all_skills_for_cohort,
                raw_profile_text=raw_text,
                work_history=data.get("work_history") or [],
                years_of_experience=0,
            )

            # Calculate years of experience from work history
            years_exp = 0
            work_hist = data.get("work_history") or []
            if work_hist:
                earliest = None
                for w in work_hist:
                    sd = w.get("start_date") or ""
                    if sd:
                        try:
                            yr = int(sd[:4])
                            if earliest is None or yr < earliest:
                                earliest = yr
                        except:
                            pass
                if earliest:
                    years_exp = datetime.datetime.now().year - earliest

            # Derive seniority from years
            if years_exp >= 15:
                seniority = "director"
            elif years_exp >= 12:
                seniority = "senior_manager"
            elif years_exp >= 9:
                seniority = "senior"
            elif years_exp >= 6:
                seniority = "senior"
            elif years_exp >= 3:
                seniority = "mid"
            elif years_exp >= 1:
                seniority = "junior"
            else:
                seniority = "mid"

            # Build a richer raw_profile_text
            roles_list = [
                f"{w.get('title')} at {w.get('company')} ({(w.get('start_date') or '')[:4]}–{(w.get('end_date') or 'Present')[:4] if not w.get('is_current') else 'Present'})"
                for w in work_hist[:6]
            ]
            about_text  = (data.get("about") or "")[:400]
            skills_text = ", ".join(all_skills[:30])
            rich_raw_text = (
                f"ROLES: {', '.join(roles_list)}\n"
                f"SKILLS: {skills_text}\n"
                f"ABOUT: {about_text}\n"
                f"ACHIEVEMENTS: Extracted from LinkedIn profile"
            )

            supabase.table("user_profiles").update({
                "cohort":              cohort,
                "years_of_experience": years_exp,
                "seniority_level":     seniority,
                "raw_profile_text":    rich_raw_text[:3000],
                "skill_categories":    None,
            }).eq("user_id", user_id).execute()

        except Exception as enrich_err:
            print(f"Post-import enrichment failed: {enrich_err}")

        return {
            "status": "ok",
            "skills_added":    len(new_skills),
            "roles_found":     len(data.get("work_history") or []),
            "education_found": len(data.get("education") or []),
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


# ── Career DNA helpers ───────────────────────────────────────

RECOMMENDED_ACTIONS: dict[str, list[dict]] = {
    "impact_magnitude": [
        {"action": "Document business outcomes with metrics from your current role", "points": 14, "effort": "Low"},
        {"action": "Lead a product initiative with measurable revenue or user impact", "points": 12, "effort": "Medium"},
        {"action": "Write a case study on a shipped product with quantified results", "points": 8, "effort": "Low"},
    ],
    "leadership_signals": [
        {"action": "Lead an org-wide or cross-functional initiative", "points": 12, "effort": "High"},
        {"action": "Mentor 1–2 junior PMs formally", "points": 7, "effort": "Medium"},
        {"action": "Present a product strategy to executive stakeholders", "points": 9, "effort": "Medium"},
    ],
    "technical_depth": [
        {"action": "Get hands-on with a technical project alongside engineering", "points": 10, "effort": "High"},
        {"action": "Complete a SQL or system design course and apply it at work", "points": 7, "effort": "Medium"},
        {"action": "Write a technical spec or architecture doc for a feature", "points": 6, "effort": "Low"},
    ],
    "domain_expertise": [
        {"action": "Deepen expertise in your primary industry domain", "points": 9, "effort": "Medium"},
        {"action": "Publish a point of view on your domain on LinkedIn", "points": 6, "effort": "Low"},
        {"action": "Take ownership of a domain-specific product area end to end", "points": 11, "effort": "High"},
    ],
    "learning_velocity": [
        {"action": "Complete a relevant certification in your target skill area", "points": 7, "effort": "Medium"},
        {"action": "Attend a product or industry conference and share learnings", "points": 5, "effort": "Low"},
        {"action": "Start a structured learning sprint — one new skill per quarter", "points": 8, "effort": "Medium"},
    ],
}

CAREER_PATHS: dict[str, list[dict]] = {
    "Technical PM": [
        {"path": "Principal PM", "probability": 72, "timeline": "18–24 months", "key_requirement": "Demonstrated org-wide impact"},
        {"path": "Group PM / Head of Product", "probability": 58, "timeline": "24–36 months", "key_requirement": "People management experience"},
        {"path": "Staff Engineer → Technical PM", "probability": 41, "timeline": "12–18 months", "key_requirement": "Deep technical execution"},
    ],
    "Data-Oriented PM": [
        {"path": "Head of Data Products", "probability": 68, "timeline": "18–24 months", "key_requirement": "Full data platform ownership"},
        {"path": "Principal PM, Analytics", "probability": 61, "timeline": "12–18 months", "key_requirement": "Cross-functional data leadership"},
        {"path": "Director of Product, Data", "probability": 44, "timeline": "30–42 months", "key_requirement": "P&L or business ownership"},
    ],
    "Growth PM": [
        {"path": "Head of Growth", "probability": 74, "timeline": "12–18 months", "key_requirement": "Proven revenue growth ownership"},
        {"path": "VP Growth", "probability": 49, "timeline": "36–48 months", "key_requirement": "Multi-channel growth leadership"},
        {"path": "Founder / CPO", "probability": 38, "timeline": "48+ months", "key_requirement": "Full business ownership experience"},
    ],
    "Data Scientist": [
        {"path": "Staff Data Scientist", "probability": 70, "timeline": "12–24 months", "key_requirement": "Technical depth + mentorship"},
        {"path": "ML Engineer / Applied Scientist", "probability": 55, "timeline": "12–18 months", "key_requirement": "Production ML deployment"},
        {"path": "Head of Data Science", "probability": 42, "timeline": "30–42 months", "key_requirement": "Team leadership + business impact"},
    ],
    "ML Engineer": [
        {"path": "Staff ML Engineer", "probability": 73, "timeline": "12–24 months", "key_requirement": "Large-scale ML systems"},
        {"path": "Principal ML Engineer", "probability": 52, "timeline": "24–36 months", "key_requirement": "Org-wide technical influence"},
        {"path": "Head of AI/ML", "probability": 40, "timeline": "36–48 months", "key_requirement": "Team + business ownership"},
    ],
    "Analytics Engineer": [
        {"path": "Staff Analytics Engineer", "probability": 69, "timeline": "12–24 months", "key_requirement": "Platform-level data ownership"},
        {"path": "Head of Analytics Engineering", "probability": 51, "timeline": "24–36 months", "key_requirement": "Team leadership + strategy"},
        {"path": "Director of Data", "probability": 38, "timeline": "36–48 months", "key_requirement": "Business + technical ownership"},
    ],
    "Full-Stack Engineer": [
        {"path": "Staff Engineer", "probability": 71, "timeline": "12–24 months", "key_requirement": "System design + org influence"},
        {"path": "Engineering Manager", "probability": 60, "timeline": "18–30 months", "key_requirement": "People leadership"},
        {"path": "Principal Engineer", "probability": 45, "timeline": "24–36 months", "key_requirement": "Architectural leadership"},
    ],
    "Backend Engineer": [
        {"path": "Staff Engineer", "probability": 70, "timeline": "12–24 months", "key_requirement": "Distributed systems expertise"},
        {"path": "Engineering Manager", "probability": 58, "timeline": "18–30 months", "key_requirement": "Team leadership"},
        {"path": "Principal Engineer", "probability": 44, "timeline": "24–36 months", "key_requirement": "Technical strategy"},
    ],
    "Engineering Manager": [
        {"path": "Senior Engineering Manager", "probability": 75, "timeline": "12–18 months", "key_requirement": "Multi-team leadership"},
        {"path": "Director of Engineering", "probability": 58, "timeline": "24–36 months", "key_requirement": "Org design + strategy"},
        {"path": "VP Engineering", "probability": 38, "timeline": "42–60 months", "key_requirement": "Business + people ownership"},
    ],
}

COMPENSATION_RANGES: dict[str, dict[str, dict[str, int]]] = {
    "Technical PM": {
        "junior":          {"low": 12, "mid": 18, "high": 25},
        "mid":             {"low": 20, "mid": 30, "high": 42},
        "senior":          {"low": 35, "mid": 50, "high": 70},
        "senior_manager":  {"low": 50, "mid": 70, "high": 95},
        "director":        {"low": 70, "mid": 95, "high": 130},
        "vp":              {"low": 100, "mid": 140, "high": 200},
    },
    "Data Scientist": {
        "junior":          {"low": 10, "mid": 16, "high": 22},
        "mid":             {"low": 18, "mid": 28, "high": 40},
        "senior":          {"low": 30, "mid": 45, "high": 65},
        "senior_manager":  {"low": 45, "mid": 65, "high": 90},
        "director":        {"low": 65, "mid": 90, "high": 125},
        "vp":              {"low": 90, "mid": 130, "high": 180},
    },
    "ML Engineer": {
        "junior":          {"low": 12, "mid": 18, "high": 26},
        "mid":             {"low": 22, "mid": 32, "high": 46},
        "senior":          {"low": 38, "mid": 55, "high": 80},
        "senior_manager":  {"low": 55, "mid": 78, "high": 110},
        "director":        {"low": 80, "mid": 110, "high": 150},
        "vp":              {"low": 110, "mid": 155, "high": 220},
    },
    "Analytics Engineer": {
        "junior":          {"low": 10, "mid": 15, "high": 20},
        "mid":             {"low": 16, "mid": 24, "high": 35},
        "senior":          {"low": 28, "mid": 40, "high": 58},
        "senior_manager":  {"low": 40, "mid": 58, "high": 80},
        "director":        {"low": 58, "mid": 80, "high": 110},
        "vp":              {"low": 80, "mid": 115, "high": 160},
    },
    "Full-Stack Engineer": {
        "junior":          {"low": 8, "mid": 14, "high": 20},
        "mid":             {"low": 16, "mid": 24, "high": 35},
        "senior":          {"low": 28, "mid": 42, "high": 60},
        "senior_manager":  {"low": 42, "mid": 60, "high": 85},
        "director":        {"low": 60, "mid": 85, "high": 120},
        "vp":              {"low": 85, "mid": 120, "high": 170},
    },
}

AXIS_LABELS = {
    "technical_depth":    "Technical Depth",
    "domain_expertise":   "Domain Expertise",
    "impact_magnitude":   "Impact Magnitude",
    "leadership_signals": "Leadership",
    "learning_velocity":  "Learning Velocity",
}

def _get_recommended_actions(top_gaps: list[dict]) -> list[dict]:
    actions = []
    for gap in top_gaps[:3]:
        axis_raw = gap["axis"].lower().replace(" ", "_")
        pool = RECOMMENDED_ACTIONS.get(axis_raw, [])
        if pool:
            best = pool[0]
            actions.append({
                "action":      best["action"],
                "points":      best["points"],
                "effort":      best["effort"],
                "gap_axis":    gap["axis"],
            })
    # Pad to 3 if fewer gaps
    while len(actions) < 3:
        actions.append({
            "action": "Take on a stretch assignment outside your current scope",
            "points": 5,
            "effort": "Medium",
            "gap_axis": "General",
        })
    return actions[:3]


def _get_career_paths(cohort: str, impact_pattern: str, trajectory: str) -> list[dict]:
    paths = CAREER_PATHS.get(cohort, [
        {"path": f"Senior {cohort}", "probability": 65, "timeline": "12–24 months", "key_requirement": "Consistent high performance"},
        {"path": f"Lead {cohort}", "probability": 48, "timeline": "24–36 months", "key_requirement": "Team or domain leadership"},
        {"path": "People Manager", "probability": 35, "timeline": "18–30 months", "key_requirement": "Mentorship + org impact"},
    ])
    # Boost top path if accelerating
    if trajectory == "Accelerating" and paths:
        paths[0] = {**paths[0], "probability": min(95, paths[0]["probability"] + 10)}
    # Builder pattern boosts founding/startup paths
    if impact_pattern == "Builder":
        paths = [{**p, "probability": min(95, p["probability"] + 8)} for p in paths]
    return paths


def _get_compensation_estimate(
    cohort: str,
    seniority: str,
    years_exp: int,
    current_base: float = None,
    current_equity_usd: float = None,
    current_variable_pct: float = None,
    preferred_currency: str = "INR",
    current_comp_currency: str = "INR",
    market: str = "India",
) -> dict:
    from services.currency import (
        get_market_comp, compute_actual_comp_usd,
        convert, CURRENCY_SYMBOLS, CURRENCY_UNIT, MARKET_COMP_RANGES
    )

    # Get market comp range
    market_comp = get_market_comp(cohort, seniority, market)

    # Fallback to India if market not found
    if not market_comp:
        market_comp = get_market_comp(cohort, seniority, "India") or {
            "currency": "INR",
            "current_range": {"low": 20, "high": 45},
            "current_mid": 30,
            "next_level_range": {"low": 35, "high": 70},
            "market": "India",
            "unit": "lakhs",
        }

    comp_currency = market_comp["currency"]
    symbol        = CURRENCY_SYMBOLS.get(comp_currency, "$")

    # Calculate actual total comp if provided
    actual_total_usd  = None
    actual_breakdown  = None
    market_position   = None
    position_color    = None

    if current_base is not None:
        comp_data = compute_actual_comp_usd(
            base=current_base,
            currency=current_comp_currency,
            equity_usd=current_equity_usd or 0,
            variable_pct=current_variable_pct or 0,
        )
        actual_total_usd = comp_data["total_usd"]

        # Convert components to display currency
        from services.currency import from_usd, to_usd
        display_curr   = preferred_currency or comp_currency
        disp_symbol    = CURRENCY_SYMBOLS.get(display_curr, "$")
        disp_unit      = CURRENCY_UNIT.get(display_curr, "thousands")

        base_display   = round(convert(current_base, current_comp_currency, display_curr), 1)
        # Equity is in USD — convert to local currency, then to same unit as base
        equity_raw     = from_usd(current_equity_usd or 0, display_curr)
        # If display currency is INR (stored in lakhs), divide by 100000
        # If display currency is others (stored in thousands), divide by 1000
        equity_divisor = 100000 if display_curr == "INR" else 1000
        equity_display = round(equity_raw / equity_divisor, 2)
        var_display    = round(convert(current_base * ((current_variable_pct or 0) / 100), current_comp_currency, display_curr), 1)
        total_display  = round(base_display + equity_display + var_display, 1)

        actual_breakdown = {
            "base":     base_display,
            "equity":   equity_display,
            "variable": var_display,
            "total":    total_display,
            "currency": display_curr,
            "symbol":   disp_symbol,
            "unit":     disp_unit,
        }

        # Market positioning — compare total USD to market mid in USD
        market_mid_local = market_comp["current_mid"]
        market_mid_usd   = to_usd(market_mid_local, comp_currency) * (1000 if CURRENCY_UNIT.get(comp_currency) == "thousands" else 100000)

        # Normalise actual total to same unit
        actual_normalised = actual_total_usd

        if actual_normalised >= market_comp["current_range"]["high"] * (1000 if CURRENCY_UNIT.get(comp_currency) == "thousands" else 100000) * RATES_TO_USD_APPROX.get(comp_currency, 1):
            market_position = "Above market"
            position_color  = "#10B981"
        elif actual_normalised >= market_mid_usd:
            market_position = "At market"
            position_color  = "#3B82F6"
        else:
            market_position = "Below market"
            position_color  = "#F59E0B"

    return {
        "market":          market,
        "currency":        comp_currency,
        "symbol":          symbol,
        "current_range":   market_comp["current_range"],
        "current_mid":     market_comp["current_mid"],
        "next_level_range": market_comp["next_level_range"],
        "actual_total_usd": actual_total_usd,
        "actual_breakdown": actual_breakdown,
        "market_position":  market_position,
        "position_color":   position_color,
        "note": f"Based on {market} tech market 2026. Actuals vary by company tier and location.",
    }

# Approximate rates for market positioning calculation
RATES_TO_USD_APPROX = {
    "INR": 1/83.5/100000,   # LPA to USD
    "USD": 1/1000,           # K to USD
    "GBP": 1.27/1000,
    "SGD": 0.74/1000,
    "CAD": 0.73/1000,
    "AUD": 0.65/1000,
    "AED": 0.27/1000,
    "EUR": 1.08/1000,
}

def _get_cross_market_comparison(
    cohort: str,
    seniority: str,
    current_base: float = None,
    current_equity_usd: float = None,
    current_variable_pct: float = None,
    current_comp_currency: str = "INR",
    target_markets: list = None,
) -> list[dict]:
    """Show how the user's actual comp compares across all their target markets."""
    from services.currency import (
        get_market_comp, compute_actual_comp_usd, CURRENCY_SYMBOLS
    )

    if not target_markets or current_base is None:
        return []

    comp_data = compute_actual_comp_usd(
        base=current_base,
        currency=current_comp_currency,
        equity_usd=current_equity_usd or 0,
        variable_pct=current_variable_pct or 0,
    )
    actual_total_usd = comp_data["total_usd"]

    comparisons = []
    for market in target_markets[:4]:  # cap at 4 markets to keep response light
        market_comp = get_market_comp(cohort, seniority, market)
        if not market_comp:
            continue

        comp_currency = market_comp["currency"]
        symbol = CURRENCY_SYMBOLS.get(comp_currency, "$")
        unit_divisor = 100000 if comp_currency == "INR" else 1000

        # Convert market range to USD for percentile comparison
        rate_to_usd = RATES_TO_USD_APPROX.get(comp_currency, 1/1000)
        range_low_usd = market_comp["current_range"]["low"] / unit_divisor * unit_divisor * rate_to_usd if False else market_comp["current_range"]["low"] * unit_divisor * rate_to_usd
        range_high_usd = market_comp["current_range"]["high"] * unit_divisor * rate_to_usd
        mid_usd = market_comp["current_mid"] * unit_divisor * rate_to_usd

        if actual_total_usd >= range_high_usd:
            percentile_label = "Top 20%"
            position_color = "#10B981"
        elif actual_total_usd >= mid_usd:
            percentile_label = "Above average"
            position_color = "#3B82F6"
        elif actual_total_usd >= range_low_usd:
            percentile_label = "Below average"
            position_color = "#F59E0B"
        else:
            percentile_label = "Bottom 20%"
            position_color = "#EF4444"

        comparisons.append({
            "market": market,
            "currency": comp_currency,
            "symbol": symbol,
            "market_range": market_comp["current_range"],
            "market_mid": market_comp["current_mid"],
            "your_comp_in_market_currency": round(actual_total_usd / rate_to_usd / unit_divisor, 1) if rate_to_usd else None,
            "position_label": percentile_label,
            "position_color": position_color,
        })

    return comparisons


AXIS_CONTEXT: dict[str, dict[str, str]] = {
    "technical_depth": {
        "above": "Your technical depth is a strong differentiator. This gives you credibility with engineering teams and makes you a stronger candidate for technical PM roles.",
        "average": "Your technical depth is on par with your cohort. Consider deepening expertise in a specific area — system design, data infrastructure, or AI/ML — to stand out.",
        "below": "Technical depth is below your cohort average. This may limit your candidacy for roles requiring close engineering collaboration. Focus on SQL, APIs, or system design fundamentals.",
    },
    "domain_expertise": {
        "above": "You have strong domain expertise relative to your cohort. This is a significant asset when targeting roles in your industry vertical.",
        "average": "Your domain expertise is average for your cohort. Publishing insights, taking on domain-specific ownership, or deepening in one vertical will move this.",
        "below": "Domain expertise is below average. This often happens when professionals move across industries frequently. Consider anchoring in one domain for 2–3 years.",
    },
    "impact_magnitude": {
        "above": "Your impact scores are strong — you have clear evidence of business outcomes in your profile. This is one of the most important signals for senior roles.",
        "average": "Your impact is average for your cohort. Strengthen this by quantifying outcomes in your profile — revenue generated, cost saved, users impacted, efficiency gains.",
        "below": "Impact Magnitude is the score most affected by how your profile is written, not necessarily how you actually performed. Your move from Software Engineer → Analyst → PM with salary growth from ₹9L to ₹50L+ is itself significant impact — it just needs to be documented with metrics. Add 2–3 quantified outcomes from your Salesforce work to move this score significantly.",
    },
    "leadership_signals": {
        "above": "Your leadership signals are strong. You show clear evidence of influencing teams, driving decisions, and operating above your title.",
        "average": "Leadership signals are average. To improve: take on cross-functional initiatives, mentor junior team members, or document times you influenced without authority.",
        "below": "Leadership signals are below average for your cohort. This is common for strong individual contributors who haven't yet had formal leadership opportunities. Leading an org-wide initiative or mentoring 1–2 people will move this quickly.",
    },
    "learning_velocity": {
        "above": "Your learning velocity is strong — you show evidence of consistently acquiring new skills and adapting to new domains.",
        "average": "Learning velocity is average. Consider adding recent certifications, courses, or new skills adopted in the last 12 months to your profile.",
        "below": "Learning velocity appears below average. This may reflect that your profile doesn't mention recent upskilling, not that you haven't been learning. Add any new tools, frameworks, or domains you've picked up recently.",
    },
}

def _get_market_benchmarks(pentagram_scores: dict, cohort: str) -> list[dict]:
    from services.pentagram import COHORT_AVERAGES, TOP_DECILE

    cohort_avg = COHORT_AVERAGES.get(cohort, COHORT_AVERAGES["Career Explorer"])
    top_dec    = TOP_DECILE.get(cohort, TOP_DECILE["Career Explorer"])
    benchmarks = []

    for ax, label in AXIS_LABELS.items():
        user_val = pentagram_scores.get(ax, 0)
        avg_val  = cohort_avg.get(ax, 50)
        top_val  = top_dec.get(ax, 85)

        # How far above or below the cohort average, scaled to cohort spread
        spread = max(top_val - avg_val, 1)
        delta  = user_val - avg_val

        if delta >= 0:
            # Above average — scale 0-100 within avg→top range
            pct_above = min(100, round((delta / spread) * 100))
            if pct_above >= 75:
                position = "Top 5%"
                color    = "#10B981"
                bracket  = "above"
            elif pct_above >= 40:
                position = "Top 20%"
                color    = "#10B981"
                bracket  = "above"
            else:
                position = "Above average"
                color    = "#3B82F6"
                bracket  = "average"
        else:
            # Below average — scale 0-100 within 0→avg range
            pct_below = min(100, round((abs(delta) / max(avg_val, 1)) * 100))
            if pct_below >= 60:
                position = "Well below average"
                color    = "#EF4444"
                bracket  = "below"
            elif pct_below >= 30:
                position = "Below average"
                color    = "#F59E0B"
                bracket  = "below"
            else:
                position = "Slightly below average"
                color    = "#F59E0B"
                bracket  = "average"

        context = AXIS_CONTEXT.get(ax, {}).get(bracket, "")

        benchmarks.append({
            "axis":     label,
            "user":     user_val,
            "avg":      avg_val,
            "top":      top_val,
            "delta":    round(delta),
            "position": position,
            "color":    color,
            "context":  context,
        })

    return sorted(benchmarks, key=lambda x: x["delta"], reverse=True)

async def _categorise_skills_ai(skills: list[str], cohort: str, user_id: str) -> dict[str, list[str]]:
    import anthropic
    import json
    import re

    if not skills:
        return {}

    # Check cache first
    cached = supabase.table("user_profiles").select("skill_categories").eq("user_id", user_id).execute()
    if cached.data and cached.data[0].get("skill_categories"):
        existing = cached.data[0]["skill_categories"]
        if isinstance(existing, str):
            return json.loads(existing)
        if isinstance(existing, dict) and existing:
            return existing

    client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    prompt = f"""You are categorising a professional's skills for display on their career profile.

Cohort: {cohort}
Skills: {json.dumps(skills)}

Group these skills into 3-5 meaningful categories that make sense for a {cohort}.

Guidelines by cohort type:
- Product Manager: use "Product & Strategy", "Data & Analytics", "Leadership & Influence", "Domain Expertise", "Tools & Methods"
- Engineer: use "Languages", "Frameworks & Libraries", "Infrastructure & Cloud", "Architecture", "Tools"
- Data Scientist / ML Engineer: use "Machine Learning", "Data Engineering", "Programming", "Statistics & Modelling", "Tools & Platforms"
- Analytics Engineer: use "Data Modelling", "Orchestration", "Warehousing", "BI & Visualisation", "Programming"
- Designer: use "UX Research", "Visual Design", "Prototyping", "Design Systems", "Tools"
- General: use whatever categories best fit the actual skills

Rules:
- Every skill must appear in exactly one category
- Do not create a category with only 1 skill unless there are very few skills total
- If a skill does not fit any main category, put it in "Other"
- Category names should be concise — maximum 4 words
- Return ONLY valid JSON, no explanation

Format:
{{
  "Category Name": ["skill1", "skill2", "skill3"],
  "Category Name 2": ["skill4", "skill5"]
}}"""

    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=600,
        messages=[{"role": "user", "content": prompt}]
    )

    content = message.content[0].text.strip()
    content = re.sub(r'^```json\s*', '', content)
    content = re.sub(r'^```\s*', '', content)
    content = re.sub(r'\s*```$', '', content)
    match = re.search(r'\{.*\}', content, re.DOTALL)
    if not match:
        return {"Skills": skills}

    result = json.loads(match.group())

    # Cache it
    supabase.table("user_profiles").update({
        "skill_categories": json.dumps(result)
    }).eq("user_id", user_id).execute()

    return result

@router.get("/career-dna/{user_id}")
async def get_career_dna(user_id: str):
    try:
        from services.pentagram import compute_pentagram, COHORT_AVERAGES, TOP_DECILE
        from services.trajectory import classify_trajectory

        profile = supabase.table("user_profiles").select("*").eq("user_id", user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]
        cohort         = p.get("cohort") or "Career Explorer"
        impact_pattern = p.get("impact_pattern") or ""
        seniority      = p.get("seniority_level") or "mid"
        years_exp      = p.get("years_of_experience") or 0
        raw_text       = p.get("raw_profile_text") or ""

        
        full_name      = p.get("full_name") or ""

        # work_history column doesn't exist — parse roles from raw_profile_text
        work_history = []
        if raw_text:
            for line in raw_text.split("\n"):
                if line.startswith("ROLES:"):
                    roles_line = line.replace("ROLES:", "").strip()
                    for role in roles_line.split(","):
                        role = role.strip()
                        if " at " in role:
                            parts = role.split(" at ")
                            work_history.append({
                                "title":   parts[0].strip(),
                                "company": parts[1].split("(")[0].strip(),
                            })
                    break
        extracted_skills = p.get("extracted_skills") or []
        if isinstance(extracted_skills, list):
            extracted_skills = [s for s in extracted_skills if isinstance(s, str)]

        # Categorise skills — cached after first run
        skill_categories = await _categorise_skills_ai(extracted_skills, cohort, user_id)

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

        # Recommended actions from top gaps
        actions = _get_recommended_actions(readiness["top_gaps"])

        # Market position
        market = _compute_market_position(penta, cohort)

        # Per-axis market benchmarks
        benchmarks = _get_market_benchmarks(penta, cohort)

        # Career paths
        paths = _get_career_paths(cohort, impact_pattern, trajectory)

        # Compensation estimate — use actual comp if provided
        current_base          = p.get("current_base_lpa")
        current_equity        = p.get("current_equity_usd")
        current_variable      = p.get("current_variable_pct")
        preferred_currency    = p.get("preferred_currency") or "INR"
        current_comp_currency = p.get("current_comp_currency") or "INR"
        target_markets        = p.get("target_market") or ["India"]
        primary_market        = target_markets[0] if target_markets else "India"

        compensation = _get_compensation_estimate(
            cohort, seniority, years_exp,
            current_base=current_base,
            current_equity_usd=current_equity,
            current_variable_pct=current_variable,
            preferred_currency=preferred_currency,
            current_comp_currency=current_comp_currency,
            market=primary_market,
        )

        cross_market_comparison = _get_cross_market_comparison(
            cohort, seniority,
            current_base=current_base,
            current_equity_usd=current_equity,
            current_variable_pct=current_variable,
            current_comp_currency=current_comp_currency,
            target_markets=target_markets,
        )

        # Next role — based on current seniority, boosted by trajectory
        cohort_roles = NEXT_ROLE_MAP.get(cohort, {})
        next_seniority = _next_seniority(seniority)
        next_role = (
            cohort_roles.get(next_seniority)
            or cohort_roles.get(seniority)
            or f"Senior {cohort}"
        )

        # Top 3 strengths
        cohort_avg = COHORT_AVERAGES.get(cohort, COHORT_AVERAGES["Career Explorer"])
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
                "scores":     {ax: penta.get(ax, 0) for ax in AXIS_LABELS},
                "composite":  penta.get("composite_score", 0),
                "cohort_avg": cohort_avg,
                "top_decile": TOP_DECILE.get(cohort, TOP_DECILE["Career Explorer"]),
            },
            "promotion_readiness":  readiness,
            "recommended_actions":  actions,
            "market_position":      market,
            "market_benchmarks":    benchmarks,
            "career_paths":         paths,
            "compensation":           compensation,
            "cross_market_comparison": cross_market_comparison,
            "next_role":            next_role,
            "top_strengths":        strengths,
            "share_text":           share_text,
            "skill_categories":    skill_categories,
            "work_history":        p.get("work_history") or [],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class AskCareerSageRequest(BaseModel):
    user_id: str
    question: str

@router.post("/ask-career-sage")
async def ask_career_sage(req: AskCareerSageRequest):
    try:
        import anthropic
        import json
        import hashlib

        if not req.question or len(req.question.strip()) < 5:
            raise HTTPException(status_code=400, detail="Question too short")

        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]

        # Check cache — hash of question + user_id
        q_hash = hashlib.md5(f"{req.user_id}:{req.question.strip().lower()}".encode()).hexdigest()
        cached_answers = p.get("career_decisions") or {}
        if isinstance(cached_answers, str):
            cached_answers = json.loads(cached_answers)

        cache_key = f"ask_{q_hash}"
        if cache_key in cached_answers:
            return {"answer": cached_answers[cache_key], "cached": True}

        # Build profile context
        cohort         = p.get("cohort") or "Tech Professional"
        seniority      = p.get("seniority_level") or "senior"
        years_exp      = p.get("years_of_experience") or 0
        impact_pattern = p.get("impact_pattern") or ""
        raw_text       = p.get("raw_profile_text") or ""
        location       = p.get("location") or "India"
        current_base   = p.get("current_base_lpa")
        work_history   = p.get("work_history") or []

        # Build work history summary
        wh_summary = ""
        if work_history:
            roles = [f"{w.get('title')} at {w.get('company')} ({(w.get('start_date') or '')[:4]}–{(w.get('end_date') or 'Present')[:4] if not w.get('is_current') else 'Present'})" for w in work_history[:5]]
            wh_summary = " → ".join(roles)

        prompt = f"""You are Career Sage, an expert career advisor for tech professionals. Answer this career question with specific, actionable advice personalised to this professional's profile.

Professional profile:
- Cohort: {cohort}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Impact pattern: {impact_pattern}
- Location: {location}
- Current base: {'₹' + str(current_base) + ' LPA' if current_base else 'Not provided'}
- Career arc: {wh_summary or raw_text[:400]}

Question: {req.question}

Guidelines:
- Be direct and specific — no generic advice
- Reference their actual profile details in your answer
- Give a clear recommendation, not just "it depends"
- Keep it under 200 words
- Use a warm, coach-like tone
- If you need information they haven't provided, say what would change your answer"""

        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=400,
            messages=[{"role": "user", "content": prompt}]
        )

        answer = message.content[0].text.strip()

        # Cache the answer
        cached_answers[cache_key] = answer
        supabase.table("user_profiles").update({
            "career_decisions": json.dumps(cached_answers)
        }).eq("user_id", req.user_id).execute()

        return {"answer": answer, "cached": False}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ── Career Decision Engine ───────────────────────────────────

DECISION_TYPES = ["mba", "startup_vs_enterprise", "management_path", "ic_path", "move_abroad", "job_change", "ai_replacement"]

class CareerDecisionRequest(BaseModel):
    user_id: str
    decision_type: str
    force_regenerate: bool = False

@router.post("/career-decision")
async def career_decision(req: CareerDecisionRequest):
    try:
        import anthropic
        import json
        import re

        if req.decision_type not in DECISION_TYPES:
            raise HTTPException(status_code=400, detail=f"decision_type must be one of {DECISION_TYPES}")

        profile = supabase.table("user_profiles").select("*").eq("user_id", req.user_id).execute()
        if not profile.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        p = profile.data[0]

        # Check cache
        cache_key = f"decision_{req.decision_type}"
        cached = p.get(cache_key)
        if cached and not req.force_regenerate:
            return json.loads(cached) if isinstance(cached, str) else cached

        cohort         = p.get("cohort") or "Career Explorer"
        impact_pattern = p.get("impact_pattern") or ""
        seniority      = p.get("seniority_level") or "mid"
        years_exp      = p.get("years_of_experience") or 0
        trajectory     = p.get("pentagram_scores", {})
        salary_target  = p.get("salary_target_lpa") or 0
        raw_text       = p.get("raw_profile_text") or ""
        location       = p.get("location") or "India"

        DECISION_PROMPTS = {
            "mba": f"""You are a senior career advisor for tech professionals in India.

Analyse whether this professional should pursue an MBA.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Location: {location}
- Salary target: ₹{salary_target} LPA
- Work history summary: {raw_text[:800]}

Consider: career trajectory, opportunity cost, ROI, alternative paths.
MBA costs ₹25–40L for top Indian schools, ₹80L–1.5Cr for international.

Return ONLY valid JSON:
{{
  "recommendation": "Yes" | "No" | "Maybe",
  "confidence": 0-100,
  "summary": "2 sentence summary of recommendation",
  "reasons_for": ["reason1", "reason2"],
  "reasons_against": ["reason1", "reason2"],
  "opportunity_cost": "What they give up",
  "expected_roi": "Low" | "Medium" | "High",
  "alternative": "Better alternative path if No/Maybe",
  "timeline": "When to reconsider if Maybe"
}}""",

            "startup_vs_enterprise": f"""You are a senior career advisor for tech professionals in India.

Analyse whether this professional is better suited for a startup or enterprise right now.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Work history: {raw_text[:800]}

Return ONLY valid JSON:
{{
  "recommendation": "Startup" | "Enterprise" | "Either",
  "confidence": 0-100,
  "summary": "2 sentence summary",
  "startup_fit_score": 0-100,
  "enterprise_fit_score": 0-100,
  "startup_pros": ["pro1", "pro2"],
  "startup_cons": ["con1", "con2"],
  "enterprise_pros": ["pro1", "pro2"],
  "enterprise_cons": ["con1", "con2"],
  "ideal_stage": "Seed" | "Series A" | "Series B" | "Late Stage" | "Public"
}}""",

            "management_path": f"""You are a senior career advisor for tech professionals in India.

Analyse whether this professional should move into people management or stay IC.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Work history: {raw_text[:800]}

Return ONLY valid JSON:
{{
  "recommendation": "Management" | "IC" | "Either",
  "confidence": 0-100,
  "summary": "2 sentence summary",
  "management_readiness": 0-100,
  "ic_ceiling": "How far they can go as IC",
  "management_pros": ["pro1", "pro2"],
  "management_cons": ["con1", "con2"],
  "first_step": "Specific next step toward chosen path"
}}""",

            "move_abroad": f"""You are a senior career advisor for tech professionals in India.

Analyse whether this professional should consider moving abroad for their career.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Location: {location}
- Work history: {raw_text[:800]}

Return ONLY valid JSON:
{{
  "recommendation": "Yes" | "No" | "Maybe",
  "confidence": 0-100,
  "summary": "2 sentence summary",
  "best_markets": ["market1", "market2"],
  "compensation_uplift": "Expected % increase",
  "career_impact": "How it affects career trajectory",
  "visa_difficulty": "Easy" | "Medium" | "Hard",
  "best_timing": "When is the right time",
  "alternative": "Alternative if staying in India"
}}""",

            "ic_path": f"""You are a senior career advisor for tech professionals in India.

Analyse this professional's individual contributor career path and ceiling.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Work history: {raw_text[:800]}

Return ONLY valid JSON:
{{
  "ic_ceiling": "Highest realistic IC level",
  "confidence": 0-100,
  "summary": "2 sentence summary",
  "years_to_ceiling": "Estimated years",
  "key_skills_needed": ["skill1", "skill2", "skill3"],
  "biggest_risk": "Main risk on IC path",
  "compensation_ceiling": "Max realistic total compensation as IC in India e.g. 120 LPA or 95 LPA — return only the number range, not a decimal like 2.8"
}}""",

            "job_change": f"""You are a senior career advisor for tech professionals in India.

Analyse whether this professional should change jobs now or stay.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Salary target: ₹{salary_target} LPA
- Work history: {raw_text[:800]}

Return ONLY valid JSON:
{{
  "recommendation": "Change now" | "Stay 6 months" | "Stay 12+ months",
  "confidence": 0-100,
  "summary": "2 sentence summary",
  "reasons_to_change": ["reason1", "reason2"],
  "reasons_to_stay": ["reason1", "reason2"],
  "expected_salary_jump": "% increase on job change",
  "best_target_companies": ["company1", "company2", "company3"],
  "best_timing": "Optimal timing for move"
}}""",

"ai_replacement": f"""You are a senior career advisor for tech professionals in 2026, specialising in AI's impact on careers.

This professional's actual skills: {', '.join((p.get('extracted_skills') or [])[:25])}

Analyse which of their SPECIFIC listed skills are AI-resistant versus at-risk, and give a concrete development plan.

Profile:
- Cohort: {cohort}
- Impact Pattern: {impact_pattern}
- Seniority: {seniority}
- Years of experience: {years_exp}
- Work history: {raw_text[:800]}

AI-resistant skills typically involve: judgment under ambiguity, cross-functional trust-building, navigating organisational politics, taking accountability for outcomes, synthesising conflicting stakeholder needs, and original strategic framing.
At-risk skills typically involve: routine data synthesis, templated documentation, status reporting, and well-defined analytical tasks with clear inputs/outputs.

From their ACTUAL skill list above, classify each relevant skill into resistant or at-risk — do not invent skills they don't have.

Return ONLY valid JSON:
{{
  "vulnerability": "Low" | "Medium" | "High",
  "confidence": 0-100,
  "summary": "2 sentence honest assessment referencing their specific role and skills",
  "at_risk_skills": ["skill from their list", "skill from their list"],
  "resistant_skills": ["skill from their list", "skill from their list"],
  "why_resistant": "1-2 sentences on why these specific skills are hard to automate for this person",
  "development_plan": [
    "Specific action 1 to deepen an AI-resistant skill in next 90 days",
    "Specific action 2",
    "Specific action 3"
  ],
  "timeline": "How long before significant disruption at current trajectory if no action taken",
  "opportunity": "How this person can use AI tools to amplify their AI-resistant strengths rather than compete with AI on the at-risk parts"
}}""",
        }

        prompt = DECISION_PROMPTS[req.decision_type]
        client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        message = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        # Strip markdown code fences
        content = re.sub(r'^```json\s*', '', content)
        content = re.sub(r'^```\s*', '', content)
        content = re.sub(r'\s*```$', '', content)
        # Extract JSON object if there's surrounding text
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if not match:
            raise HTTPException(status_code=500, detail="Could not parse decision analysis response")
        result = json.loads(match.group())
        result["decision_type"] = req.decision_type

        # Cache in user_profiles — store up to 6 decision types
        # Using a jsonb column approach: store all decisions in one field
        existing_decisions = p.get("career_decisions") or {}
        if isinstance(existing_decisions, str):
            existing_decisions = json.loads(existing_decisions)
        existing_decisions[req.decision_type] = result

        supabase.table("user_profiles").update({
            "career_decisions": json.dumps(existing_decisions)
        }).eq("user_id", req.user_id).execute()

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))