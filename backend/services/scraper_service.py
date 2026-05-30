import os
import hashlib
import asyncio
import httpx
from datetime import datetime, timezone
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
from apify_client import ApifyClient

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)
apify = ApifyClient(os.getenv("APIFY_API_TOKEN"))


def make_job_id(company: str, title: str, source_link: str) -> str:
    raw = f"{company}_{title}_{source_link}"
    return hashlib.md5(raw.encode()).hexdigest()[:16]


def dedup_and_save(jobs: list[dict]) -> dict:
    saved = 0
    skipped = 0

    for job in jobs:
        try:
            job_id = job.get("job_id") or make_job_id(
                job.get("company_name", ""),
                job.get("job_title", ""),
                job.get("source_link", "")
            )

            existing = supabase.table("aggregated_jobs")\
                .select("id")\
                .eq("job_id", job_id)\
                .execute()

            if existing.data:
                supabase.table("aggregated_jobs")\
                    .update({"last_verified_at": datetime.now(timezone.utc).isoformat()})\
                    .eq("job_id", job_id)\
                    .execute()
                skipped += 1
                continue

            supabase.table("aggregated_jobs").insert({
                "company_name": job.get("company_name", "Unknown"),
                "job_title": job.get("job_title", "Unknown"),
                "job_id": job_id,
                "location": job.get("location", "Not specified"),
                "skills_needed": job.get("skills_needed", []),
                "source_link": job.get("source_link", ""),
                "job_description": job.get("job_description", ""),
                "estimated_salary_min": job.get("estimated_salary_min"),
                "estimated_salary_max": job.get("estimated_salary_max"),
                "estimated_interview_rounds": job.get("estimated_interview_rounds", 4),
                "interview_breakdown_notes": job.get("interview_breakdown_notes"),
                "last_verified_at": datetime.now(timezone.utc).isoformat(),
            }).execute()
            saved += 1

        except Exception as e:
            print(f"Error saving job {job.get('job_title')}: {e}")
            continue

    return {"saved": saved, "skipped": skipped}


def scrape_linkedin(keywords: list[str], location: str = "India") -> list[dict]:
    print(f"Scraping LinkedIn for: {keywords} in {location}")
    jobs = []
    try:
        run_input = {
            "searchKeywords": " ".join(keywords),
            "location": location,
            "maxItems": 25,
            "proxy": {"useApifyProxy": True},
        }
        run = apify.actor("curious_coder/linkedin-jobs-scraper").call(run_input=run_input)
        for item in apify.dataset(run["defaultDatasetId"]).iterate_items():
            jobs.append({
                "company_name": item.get("companyName", ""),
                "job_title": item.get("title", ""),
                "location": item.get("location", ""),
                "source_link": item.get("jobUrl", ""),
                "job_description": item.get("description", ""),
                "skills_needed": extract_skills_from_text(item.get("description", "")),
                "job_id": make_job_id(
                    item.get("companyName", ""),
                    item.get("title", ""),
                    item.get("jobUrl", "")
                ),
            })
        print(f"LinkedIn: scraped {len(jobs)} jobs")
    except Exception as e:
        print(f"LinkedIn scraper error: {e}")
    return jobs


def scrape_naukri(keywords: list[str], location: str = "India") -> list[dict]:
    print(f"Scraping Naukri for: {keywords} in {location}")
    jobs = []
    try:
        run_input = {
            "keyword": " ".join(keywords),
            "location": location,
            "maxItems": 25,
            "proxy": {"useApifyProxy": True},
        }
        run = apify.actor("curious_coder/naukri-scraper").call(run_input=run_input)
        for item in apify.dataset(run["defaultDatasetId"]).iterate_items():
            jobs.append({
                "company_name": item.get("company", ""),
                "job_title": item.get("title", ""),
                "location": item.get("location", ""),
                "source_link": item.get("jdURL", ""),
                "job_description": item.get("jobDescription", ""),
                "skills_needed": item.get("keySkills", []),
                "job_id": make_job_id(
                    item.get("company", ""),
                    item.get("title", ""),
                    item.get("jdURL", "")
                ),
            })
        print(f"Naukri: scraped {len(jobs)} jobs")
    except Exception as e:
        print(f"Naukri scraper error: {e}")
    return jobs


async def scrape_greenhouse(company_name: str, board_token: str) -> list[dict]:
    jobs = []
    url = f"https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return jobs
            data = res.json()
            for job in data.get("jobs", [])[:10]:
                jobs.append({
                    "company_name": company_name,
                    "job_title": job.get("title", ""),
                    "location": job.get("location", {}).get("name", "Remote"),
                    "source_link": job.get("absolute_url", ""),
                    "job_description": job.get("content", "")[:3000],
                    "skills_needed": extract_skills_from_text(job.get("content", "")),
                    "job_id": str(job.get("id", "")),
                })
        print(f"Greenhouse {company_name}: {len(jobs)} jobs")
    except Exception as e:
        print(f"Greenhouse error for {company_name}: {e}")
    return jobs


async def scrape_lever(company_name: str, lever_slug: str) -> list[dict]:
    jobs = []
    url = f"https://api.lever.co/v0/postings/{lever_slug}?mode=json"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            res = await client.get(url)
            if res.status_code != 200:
                return jobs
            data = res.json()
            for job in data[:10]:
                description = ""
                for section in job.get("lists", []):
                    description += section.get("content", "") + "\n"
                jobs.append({
                    "company_name": company_name,
                    "job_title": job.get("text", ""),
                    "location": job.get("categories", {}).get("location", "Remote"),
                    "source_link": job.get("hostedUrl", ""),
                    "job_description": description[:3000],
                    "skills_needed": extract_skills_from_text(description),
                    "job_id": job.get("id", ""),
                })
        print(f"Lever {company_name}: {len(jobs)} jobs")
    except Exception as e:
        print(f"Lever error for {company_name}: {e}")
    return jobs


def extract_skills_from_text(text: str) -> list[str]:
    if not text:
        return []
    KNOWN_SKILLS = [
        "Python", "SQL", "Java", "JavaScript", "TypeScript", "Go", "Rust", "C++",
        "React", "Next.js", "Node.js", "FastAPI", "Django", "Flask", "Spring",
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch",
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform",
        "Machine Learning", "Deep Learning", "NLP", "LLM", "RAG", "PyTorch", "TensorFlow",
        "Data Science", "Analytics", "Tableau", "Power BI", "dbt", "Spark", "Kafka",
        "Product Management", "Agile", "Scrum", "Roadmap", "A/B Testing",
        "System Design", "Microservices", "REST API", "GraphQL",
        "Figma", "UX", "Leadership", "Stakeholder Management",
    ]
    text_lower = text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        if skill.lower() in text_lower and skill not in found:
            found.append(skill)
    return found[:15]


async def run_full_scrape(keywords: list[str] = None, location: str = "India") -> dict:
    if keywords is None:
        keywords = ["Product Manager", "Data Analyst", "Software Engineer", "ML Engineer"]

    all_jobs = []

    linkedin_jobs = scrape_linkedin(keywords, location)
    all_jobs.extend(linkedin_jobs)

    naukri_jobs = scrape_naukri(keywords, location)
    all_jobs.extend(naukri_jobs)

    greenhouse_companies = [
        ("Stripe", "stripe"),
        ("Notion", "notion"),
        ("Figma", "figma"),
        ("Anthropic", "anthropic"),
        ("Razorpay", "razorpay"),
    ]
    for company_name, board_token in greenhouse_companies:
        jobs = await scrape_greenhouse(company_name, board_token)
        all_jobs.extend(jobs)
        await asyncio.sleep(0.5)

    lever_companies = [
        ("Swiggy", "swiggy"),
        ("CRED", "cred"),
        ("Zepto", "zepto"),
    ]
    for company_name, lever_slug in lever_companies:
        jobs = await scrape_lever(company_name, lever_slug)
        all_jobs.extend(jobs)
        await asyncio.sleep(0.5)

    print(f"Total jobs collected: {len(all_jobs)}")
    result = dedup_and_save(all_jobs)
    print(f"Saved: {result['saved']} | Skipped (existing): {result['skipped']}")
    return result


async def soft_delete_stale_jobs():
    try:
        from datetime import timedelta
        cutoff = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        result = supabase.table("aggregated_jobs")\
            .update({"is_active": False})\
            .lt("last_verified_at", cutoff)\
            .eq("is_active", True)\
            .execute()
        print(f"Soft deleted stale jobs")
        return result
    except Exception as e:
        print(f"Stale job cleanup error: {e}")