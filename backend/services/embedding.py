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


def generate_track_embedding(master_profile: str, track: dict) -> list[float]:
    emphasized = ", ".join(track.get("emphasized_skills") or [])
    target_roles = ", ".join(track.get("target_roles") or [])
    aspiration = ", ".join(track.get("aspiration_skills") or [])
    seniority = track.get("target_seniority") or ""
    track_summary = track.get("track_summary") or ""
    personal_notes = track.get("personal_notes") or ""

    blended_text = f"""
Experience and skills: {master_profile}
Target roles: {target_roles}
Seniority level: {seniority}
Skills to emphasize: {emphasized}
Growing toward: {aspiration}
Track direction: {track_summary}
Additional context: {personal_notes}
""".strip()

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