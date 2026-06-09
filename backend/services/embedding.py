import os
from dotenv import load_dotenv
load_dotenv()

from openai import OpenAI
from supabase import create_client

openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


def generate_embedding(text: str) -> list[float]:
    text = text.replace("\n", " ").strip()
    if not text:
        return []
    response = openai_client.embeddings.create(
        model="text-embedding-3-small",
        input=text[:8000]
    )
    return response.data[0].embedding

def generate_track_embedding(master_profile: str, track: dict, profile: dict = None) -> list[float]:
    parts = []

    if profile:
        cohort = profile.get("cohort") or ""
        if cohort:
            parts.append(f"Professional cohort: {cohort}")

        years_exp = profile.get("years_of_experience") or 0
        if years_exp:
            parts.append(f"Years of experience: {years_exp}")

        impact = profile.get("impact_pattern") or ""
        if impact:
            parts.append(f"Impact pattern: {impact}")

        summary = profile.get("extracted_summary") or ""
        if summary:
            parts.append(f"Professional summary: {summary}")

        raw_text = profile.get("raw_profile_text") or ""
        if raw_text:
            parts.append(f"Work history: {raw_text[:1500]}")

        skills = profile.get("extracted_skills") or []
        if isinstance(skills, list):
            skill_names = [s for s in skills if isinstance(s, str)]
            if skill_names:
                parts.append(f"Skills: {', '.join(skill_names)}")
    else:
        parts.append(f"Experience and skills: {master_profile}")

    track_name = track.get("track_name") or ""
    if track_name:
        parts.append(f"Target track: {track_name}")
        parts.append(f"Role type: {track_name}")
        parts.append(f"Seeking: {track_name} position")

    target_roles = ", ".join(track.get("target_roles") or [])
    if target_roles:
        parts.append(f"Target roles: {target_roles}")
        parts.append(f"Job titles sought: {target_roles}")
        parts.append(f"Applying for: {target_roles}")

    seniority = track.get("target_seniority") or ""
    if seniority:
        parts.append(f"Seniority level: {seniority}")

    emphasized = ", ".join(track.get("emphasized_skills") or [])
    if emphasized:
        parts.append(f"Skills to emphasize: {emphasized}")

    aspiration = ", ".join(track.get("aspiration_skills") or [])
    if aspiration:
        parts.append(f"Growing toward: {aspiration}")

    track_summary = track.get("track_summary") or track.get("personal_notes") or ""
    if track_summary:
        parts.append(f"Track direction: {track_summary}")

    if track_name and any(pm in track_name.lower() for pm in ["product", "program", "tpm"]):
        pm_context = [
            "Product management product strategy roadmap prioritization",
            "Stakeholder management cross-functional leadership",
            "User research customer discovery product vision",
            "Go-to-market product launch OKRs metrics KPIs",
            "Agile scrum sprint planning backlog product owner",
            "PRD requirements gathering user stories acceptance criteria",
            "Product analytics A/B testing experimentation",
            "B2B SaaS platform product growth retention",
        ]
        parts.extend(pm_context)

    blended_text = "\n".join(parts)
    return generate_embedding(blended_text)


def embed_all_jobs() -> dict:
    jobs = supabase.table("aggregated_jobs")\
        .select("id, job_title, job_description, company_name, skills_needed")\
        .eq("is_active", True)\
        .is_("description_embedding", "null")\
        .execute()

    if not jobs.data:
        print("No jobs need embedding")
        return {"embedded": 0}

    embedded = 0
    for job in jobs.data:
        try:
            text = f"{job['job_title']} at {job['company_name']}\n{job['job_description']}"
            embedding = generate_embedding(text)
            if not embedding:
                continue

            supabase.table("aggregated_jobs").update({
                "description_embedding": embedding
            }).eq("id", job["id"]).execute()

            embedded += 1
            print(f"Embedded: {job['job_title']} at {job['company_name']}")
        except Exception as e:
            print(f"Embedding error for {job.get('job_title')}: {e}")
            continue

    print(f"Embedded {embedded} jobs")
    return {"embedded": embedded}