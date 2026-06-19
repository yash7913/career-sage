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
        .select("extracted_skills, raw_profile_text, extracted_summary, cohort, years_of_experience, impact_pattern")\
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
    track_embedding = generate_track_embedding(raw_profile, track_data, profile_data)

    if not track_embedding:
        raise ValueError("Failed to generate track embedding")

    supabase.table("career_track_profiles").update({
        "track_embedding": track_embedding
    }).eq("track_id", track_id).execute()

    from services.job_cohort_classifier import COHORT_ADJACENCY
    user_cohort = profile_data.get("cohort") or ""
    years_exp_filter = profile_data.get("years_of_experience") or 0

    relevant_cohorts = [user_cohort]
    adjacent = COHORT_ADJACENCY.get(user_cohort, [])
    relevant_cohorts.extend(adjacent)

    SENIORITY_EXCLUDE = []
    if years_exp_filter >= 7:
        SENIORITY_EXCLUDE = ["intern", "internship", "entry level", "junior", "associate", "fresher", "graduate trainee"]
    elif years_exp_filter >= 3:
        SENIORITY_EXCLUDE = ["intern", "internship", "entry level", "fresher", "graduate trainee"]

    HARD_EXCLUDE_TITLES = [
        "account executive", "sales", "recruiter", "talent acquisition",
        "customer success", "support engineer", "solutions engineer",
        "field engineer", "network engineer", "hardware engineer",
        "mechanical engineer", "civil engineer", "electrical engineer",
        "qa engineer", "test engineer", "security engineer",
        "compliance", "legal", "finance manager", "accounting",
        "hr manager", "office manager", "executive assistant",
    ]

    # Push cohort filtering into the DB query — only fetch jobs whose
    # target_cohorts overlaps relevant_cohorts, instead of pulling everything
    # and filtering in Python. Postgres' jsonb overlap operator (?|) does this
    # in one query instead of a full table scan client-side.
    filtered_jobs = []
    page = 0
    batch_size = 1000
    while True:
        batch_result = supabase.table("aggregated_jobs")\
            .select("id, job_title, company_name, location, skills_needed, job_description, source_link, estimated_salary_min, estimated_salary_max, estimated_interview_rounds, description_embedding, target_cohorts")\
            .eq("is_active", True)\
            .overlaps("target_cohorts", relevant_cohorts)\
            .range(page * batch_size, (page + 1) * batch_size - 1)\
            .execute()
        if not batch_result.data:
            break

        for j in batch_result.data:
            title_lower = (j.get("job_title") or "").lower()
            if any(excl in title_lower for excl in SENIORITY_EXCLUDE):
                continue
            if any(excl in title_lower for excl in HARD_EXCLUDE_TITLES):
                continue
            filtered_jobs.append(j)

        if len(batch_result.data) < batch_size:
            break
        page += 1

    print(f"Pre-filtered directly via DB query to {len(filtered_jobs)} relevant jobs for {user_cohort}")

    if not filtered_jobs:
        return {"matched": 0}

    years_exp = years_exp_filter or 3
    matched = 0
    batch = []

    for job in filtered_jobs:
        try:
            job_embedding = job.get("description_embedding")

            if job_embedding:
                if isinstance(job_embedding, str):
                    import json
                    job_embedding = json.loads(job_embedding)
                vector_sim = cosine_similarity(track_embedding, job_embedding)
            else:
                vector_sim = 0.0

            skill_sim = calculate_skill_overlap(
                profile_skills + (track_data.get("emphasized_skills") or []),
                job.get("skills_needed") or []
            )

            sen_score = seniority_score(years_exp, job["job_title"])

            from services.job_cohort_classifier import get_cohort_alignment, _get_domain
            user_cohort_local = profile_data.get("cohort") or ""
            job_cohorts = job.get("target_cohorts") or []
            cohort_alignment = get_cohort_alignment(user_cohort_local, job_cohorts)
            user_domain = _get_domain(user_cohort_local)

            if user_domain == "product":
                raw_score = (
                    vector_sim * 0.75 +
                    skill_sim * 0.10 +
                    sen_score * 0.15
                )
            elif user_domain == "data":
                raw_score = (
                    vector_sim * 0.50 +
                    skill_sim * 0.35 +
                    sen_score * 0.15
                )
            else:
                raw_score = (
                    vector_sim * 0.40 +
                    skill_sim * 0.40 +
                    sen_score * 0.20
                )

            weighted_score = raw_score * cohort_alignment
            match_pct = min(int(weighted_score * 100), 99)

            skill_gaps = identify_skill_gaps(
                profile_skills,
                job.get("skills_needed") or []
            )

            batch.append({
                "user_id": user_id,
                "track_id": track_id,
                "job_id": job["id"],
                "match_percentage_score": match_pct,
                "identified_skill_gaps": skill_gaps,
            })
            matched += 1

        except Exception as e:
            print(f"Matching error for {job.get('job_title')}: {e}")
            continue

    if batch:
        import asyncio
        upsert_batch_size = 200  # larger batches = fewer round trips
        chunks = [batch[i:i + upsert_batch_size] for i in range(0, len(batch), upsert_batch_size)]

        async def upsert_chunk(chunk, idx, total):
            await asyncio.to_thread(
                lambda: supabase.table("user_job_rankings").upsert(
                    chunk, on_conflict="user_id,track_id,job_id"
                ).execute()
            )
            print(f"Saved batch {idx + 1}/{total}")

        # Run upserts concurrently instead of sequentially — Supabase/Postgres
        # handles concurrent writes fine for independent batches
        await asyncio.gather(*[
            upsert_chunk(chunk, i, len(chunks)) for i, chunk in enumerate(chunks)
        ])

    print(f"Matched {matched} jobs for track {track_data['track_name']}")
    return {"matched": matched, "track": track_data["track_name"]}


async def run_matching_for_user(user_id: str):
    try:
        tracks = supabase.table("career_track_profiles")\
            .select("*").eq("user_id", user_id).execute()

        if not tracks.data:
            print(f"No tracks for user {user_id}")
            return

        for track in tracks.data:
            print(f"Running matching for track {track['track_name']}")
            await match_jobs_for_track(user_id, track["track_id"])

        print(f"Background matching complete for user {user_id}")
    except Exception as e:
        print(f"Background matching error: {e}")