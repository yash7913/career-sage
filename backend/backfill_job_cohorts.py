import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
from services.job_cohort_classifier import classify_job_cohorts

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

page = 0
batch = 100
total_updated = 0

while True:
    jobs = sb.table("aggregated_jobs")\
        .select("id, job_title, job_description")\
        .range(page * batch, (page + 1) * batch - 1)\
        .execute()

    if not jobs.data:
        break

    for job in jobs.data:
        cohorts = classify_job_cohorts(
            job.get("job_title") or "",
            job.get("job_description") or ""
        )
        sb.table("aggregated_jobs")\
            .update({"target_cohorts": cohorts})\
            .eq("id", job["id"])\
            .execute()
        total_updated += 1

    print(f"Updated {total_updated} jobs...")
    page += 1

print(f"Done. Total: {total_updated} jobs classified.")