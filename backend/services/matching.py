import os
import math
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
from services.embedding import generate_track_embedding, generate_embedding

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


def cosine_similarity(a: list[float], b: list[float]) -> float:
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    mag_a = math.sqrt(sum(x * x for x in a))
    mag_b = math.sqrt(sum(x * x for x in b))
    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


def calculate_skill_overlap(profile_skills: list, job_skills: list) -> float:
    if not profile_skills or not job_skills:
        return 0.0
    profile_lower = {s.lower() for s in profile_skills}
    job_lower = {s.lower() for s in job_skills}
    overlap = profile_lower.intersection(job_lower)
    return len(overlap) / max(len(job_lower), 1)


def seniority_score(profile_years: int, job_title: str) -> float:
    title_lower = job_title.lower()
    if any(w in title_lower for w in ["director", "vp", "head", "chief"]):
        needed_years = 10
    elif any(w in title_lower for w in ["senior", "lead", "principal", "staff"]):
        needed_years = 5
    elif any(w in title_lower for w in ["junior", "associate", "intern"]):
        needed_years = 0
    else:
        needed_years = 2

    diff = abs(profile_years - needed_years)
    if diff == 0:
        return 1.0
    elif diff <= 2:
        return 0.75
    elif diff <= 4:
        return 0.5
    else:
        return 0.25


def identify_skill_gaps(profile_skills: list, job_skills: list) -> list[str]:
    if not job_skills:
        return []
    profile_lower = {s.lower() for s in profile_skills}
    gaps = [s for s in job_skills if s.lower() not in profile_lower]
    return gaps[:5]


async def match_jobs_for_track(user_id: str, track_id: str) -> dict:
    profile = supabase.table("user_profiles")\
        .select("extracted_skills, raw_profile_text, extracted_summary")\
        .eq("user_id", user_id)\
        .execute()

    if not profile.data:
        raise ValueError("Profile not found")

    profile_data = profile.data[0]
    profile_skills = profile_data.get("extracted_skills") or []
    raw_profile = profile_data.get("raw_profile_text") or profile_data.get("extracted_summary") or ""

    track = supabase.table("career_track_profiles")\
        .select("*")\
        .eq("track_id", track_id)\
        .execute()

    if not track.data:
        raise ValueError("Track not found")

    track_data = track.data[0]

    print(f"Generating track embedding for: {track_data['track_name']}")
    track_embedding = generate_track_embedding(raw_profile, track_data)

    if not track_embedding:
        raise ValueError("Failed to generate track embedding")

    supabase.table("career_track_profiles").update({
        "track_embedding": track_embedding
    }).eq("track_id", track_id).execute()

    jobs = supabase.table("aggregated_jobs")\
        .select("*")\
        .eq("is_active", True)\
        .execute()

    if not jobs.data:
        return {"matched": 0}

    years_exp = 3
    matched = 0

    for job in jobs.data:
        try:
            job_embedding = job.get("description_embedding")

            if job_embedding:
                vector_sim = cosine_similarity(track_embedding, job_embedding)
            else:
                job_text = f"{job['job_title']} at {job['company_name']}\n{job['job_description']}"
                job_emb = generate_embedding(job_text)
                vector_sim = cosine_similarity(track_embedding, job_emb)

                supabase.table("aggregated_jobs").update({
                    "description_embedding": job_emb
                }).eq("id", job["id"]).execute()

            skill_sim = calculate_skill_overlap(
                profile_skills + (track_data.get("emphasized_skills") or []),
                job.get("skills_needed") or []
            )

            sen_score = seniority_score(years_exp, job["job_title"])

            weighted_score = (
                vector_sim * 0.40 +
                skill_sim * 0.40 +
                sen_score * 0.20
            )
            match_pct = min(int(weighted_score * 100), 99)

            skill_gaps = identify_skill_gaps(
                profile_skills,
                job.get("skills_needed") or []
            )

            existing = supabase.table("user_job_rankings")\
                .select("ranking_id")\
                .eq("user_id", user_id)\
                .eq("track_id", track_id)\
                .eq("job_id", job["id"])\
                .execute()

            if existing.data:
                supabase.table("user_job_rankings").update({
                    "match_percentage_score": match_pct,
                    "identified_skill_gaps": skill_gaps,
                }).eq("ranking_id", existing.data[0]["ranking_id"]).execute()
            else:
                supabase.table("user_job_rankings").insert({
                    "user_id": user_id,
                    "track_id": track_id,
                    "job_id": job["id"],
                    "match_percentage_score": match_pct,
                    "identified_skill_gaps": skill_gaps,
                }).execute()

            matched += 1
            print(f"{match_pct}% — {job['job_title']} at {job['company_name']}")

        except Exception as e:
            print(f"Matching error for {job.get('job_title')}: {e}")
            continue

    print(f"Matched {matched} jobs for track {track_data['track_name']}")
    return {"matched": matched, "track": track_data["track_name"]}