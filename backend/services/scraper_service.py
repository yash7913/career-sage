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
APIFY_TOKEN = os.getenv("APIFY_API_TOKEN") or os.getenv("APIFY_TOKEN") or ""

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
                "company_name": (job.get("company_name") or "")[:100],
                "job_title": (job.get("job_title") or "")[:150],
                "job_id": job_id,
                "location": (job.get("location") or "")[:150],
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


async def scrape_linkedin(keywords: list[str], location: str = "India") -> list[dict]:
    if not APIFY_TOKEN:
        print("No Apify token configured")
        return []

    jobs = []
    try:
        for keyword in keywords[:5]:
            print(f"Scraping LinkedIn for: {keyword}")
            run_url = f"https://api.apify.com/v2/acts/cheap_scraper~linkedin-job-scraper/runs"
            payload = {
                "keyword": [keyword],
                "location": location,
                "publishedAt": "r604800",
                "jobType": ["full-time"],
            }
            async with httpx.AsyncClient(timeout=120) as client:
                run_res = await client.post(
                    run_url,
                    json=payload,
                    headers={"Authorization": f"Bearer {APIFY_TOKEN}"},
                )
                if not run_res.is_success:
                    print(f"LinkedIn scraper start failed: {run_res.status_code} {run_res.text}")
                    continue

                run_data = run_res.json()
                run_id = run_data.get("data", {}).get("id")
                if not run_id:
                    print("No run ID returned")
                    continue

                print(f"LinkedIn run started: {run_id}")

                for attempt in range(24):
                    await asyncio.sleep(10)
                    status_res = await client.get(
                        f"https://api.apify.com/v2/actor-runs/{run_id}",
                        headers={"Authorization": f"Bearer {APIFY_TOKEN}"},
                    )
                    status = status_res.json().get("data", {}).get("status")
                    print(f"LinkedIn run status: {status} (attempt {attempt + 1})")
                    if status == "SUCCEEDED":
                        break
                    if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                        print(f"LinkedIn run failed with status: {status}")
                        break

                dataset_res = await client.get(
                    f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
                    headers={"Authorization": f"Bearer {APIFY_TOKEN}"},
                )
                items = dataset_res.json() if dataset_res.is_success else []
                print(f"LinkedIn returned {len(items)} items for {keyword}")

                if items:
                    print(f"LinkedIn item sample keys: {list(items[0].keys())}")
                    print(f"LinkedIn item sample: {items[0]}")

                for item in items:
                    title = (item.get("jobTitle") or "")[:150]
                    company = (item.get("companyName") or "")[:100]
                    location_val = (item.get("location") or location)[:150]
                    description = item.get("jobDescription") or ""
                    url = item.get("jobUrl") or item.get("applyUrl") or ""

                    if not title or not company:
                        continue

                    skills = extract_skills_from_text(f"{title} {description}")
                    salary_min, salary_max = extract_salary(description)
                    interview_rounds = extract_interview_rounds(description)

                    job_id = hashlib.md5(f"{title}{company}{url}".encode()).hexdigest()

                    jobs.append({
                        "id": job_id,
                        "company_name": company,
                        "job_title": title,
                        "location": location_val,
                        "job_description": clean_html(description),
                        "skills_needed": skills,
                        "source_link": url,
                        "source": "linkedin",
                        "is_active": True,
                        "estimated_salary_min": salary_min,
                        "estimated_salary_max": salary_max,
                        "estimated_interview_rounds": interview_rounds,
                    })

    except Exception as e:
        print(f"LinkedIn scraper error: {e}")

    return jobs

async def scrape_indeed(keywords: list[str], location: str = "India") -> list[dict]:
    if not APIFY_TOKEN:
        return []

    jobs = []
    try:
        print(f"Scraping Indeed for: {keywords} in {location}")
        run_url = "https://api.apify.com/v2/acts/nlZZi3lZre4fM9IET/runs"
        payload = {
                "country": "India",
                "keywords": keywords[:5],
                "location": location,
                "datePosted": "7",
                "deepSearch": False,
                "includeNoSalaryJob": True,
                "saveOnlyUniqueItems": True,
                "maxItems": 100,
            }
        async with httpx.AsyncClient(timeout=180) as client:
            run_res = await client.post(
                run_url,
                json=payload,
                headers={"Authorization": f"Bearer {APIFY_TOKEN}"},
            )
            if not run_res.is_success:
                print(f"Indeed scraper start failed: {run_res.status_code} {run_res.text}")
                return []

            run_id = run_res.json().get("data", {}).get("id")
            if not run_id:
                print("Indeed: No run ID returned")
                return []

            print(f"Indeed run started: {run_id}")

            for attempt in range(30):
                await asyncio.sleep(10)
                status_res = await client.get(
                    f"https://api.apify.com/v2/actor-runs/{run_id}",
                    headers={"Authorization": f"Bearer {APIFY_TOKEN}"},
                )
                status = status_res.json().get("data", {}).get("status")
                print(f"Indeed run status: {status} (attempt {attempt + 1})")
                if status == "SUCCEEDED":
                    break
                if status in ("FAILED", "ABORTED", "TIMED-OUT"):
                    print(f"Indeed run ended with status: {status}")
                    break

            dataset_res = await client.get(
                f"https://api.apify.com/v2/actor-runs/{run_id}/dataset/items",
                headers={"Authorization": f"Bearer {APIFY_TOKEN}"},
            )
            items = dataset_res.json() if dataset_res.is_success else []
            print(f"Indeed returned {len(items)} items")

            for item in items:
                title = (item.get("title") or "")[:150]
                company_obj = item.get("company") or {}
                company = (company_obj.get("companyName") or company_obj.get("companyShortName") or "")[:100]
                loc_obj = item.get("location") or {}
                location_val = f"{loc_obj.get('city', '')}, {loc_obj.get('state', '')}".strip(", ") or location
                description = item.get("description_text") or item.get("description_html") or ""
                url = item.get("jobUrl") or item.get("applyUrl") or ""
                salary_min = item.get("baseSalary_min")
                salary_max = item.get("baseSalary_max")

                if not title or not company:
                    continue

                description_clean = clean_html(description)
                skills = extract_skills_from_text(f"{title} {description_clean}")
                interview_rounds = extract_interview_rounds(description_clean)

                job_id = hashlib.md5(f"{title}{company}{url}".encode()).hexdigest()

                jobs.append({
                    "id": job_id,
                    "company_name": company,
                    "job_title": title,
                    "location": location_val,
                    "job_description": description_clean[:3000],
                    "skills_needed": skills,
                    "source_link": url,
                    "source": "indeed",
                    "is_active": True,
                    "estimated_salary_min": salary_min,
                    "estimated_salary_max": salary_max,
                    "estimated_interview_rounds": interview_rounds,
                })

    except Exception as e:
        print(f"Indeed scraper error: {e}")

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
            for job in data.get("jobs", []):
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
            for job in data:
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

def clean_html(text: str) -> str:
    if not text:
        return ""
    import re
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'&nbsp;', ' ', text)
    text = re.sub(r'&amp;', '&', text)
    text = re.sub(r'&lt;', '<', text)
    text = re.sub(r'&gt;', '>', text)
    text = re.sub(r'&quot;', '"', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip()


def extract_salary(text: str) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    import re
    text_lower = text.lower()

    lpa_match = re.search(r'(\d+(?:\.\d+)?)\s*(?:to|-)\s*(\d+(?:\.\d+)?)\s*(?:lpa|lacs|lakhs)', text_lower)
    if lpa_match:
        return int(float(lpa_match.group(1))), int(float(lpa_match.group(2)))

    lpa_single = re.search(r'(\d+(?:\.\d+)?)\s*(?:lpa|lacs|lakhs)', text_lower)
    if lpa_single:
        val = int(float(lpa_single.group(1)))
        return val, val

    usd_match = re.search(r'\$(\d+(?:,\d+)?(?:\.\d+)?)[kK]?\s*(?:to|-)\s*\$(\d+(?:,\d+)?(?:\.\d+)?)[kK]?', text)
    if usd_match:
        def parse_usd(s):
            s = s.replace(',', '')
            val = float(s)
            if val < 1000:
                val *= 1000
            return int(val / 83000 * 100) // 100
        return parse_usd(usd_match.group(1)), parse_usd(usd_match.group(2))

    return None, None


def extract_interview_rounds(text: str) -> int | None:
    if not text:
        return None
    import re
    match = re.search(r'(\d+)\s*(?:round|stage|interview)', text.lower())
    if match:
        val = int(match.group(1))
        if 1 <= val <= 10:
            return val
    return None

def extract_skills_from_text(text: str) -> list[str]:
    if not text:
        return []

    KNOWN_SKILLS = [
        # Languages
        "Python", "SQL", "Java", "JavaScript", "TypeScript", "Go", "Rust", "C++", "C#", "R",
        "Scala", "Swift", "Kotlin", "Ruby", "PHP", "MATLAB", "SAS", "SPSS", "Julia",
        # Frontend
        "React", "Next.js", "Vue.js", "Angular", "HTML", "CSS", "Tailwind", "Redux",
        "GraphQL", "REST API", "WebSockets", "gRPC",
        # Backend
        "Node.js", "FastAPI", "Django", "Flask", "Spring Boot", "Express", "Rails",
        "Microservices", "System Design", "API Design",
        # Data and ML
        "Machine Learning", "Deep Learning", "NLP", "LLM", "RAG", "PyTorch", "TensorFlow",
        "Scikit-learn", "XGBoost", "LightGBM", "Hugging Face", "OpenAI", "Langchain",
        "Computer Vision", "Reinforcement Learning", "Feature Engineering", "MLOps",
        "Statistical Modeling", "Time Series", "Forecasting", "Causal Inference",
        "A/B Testing", "Experimentation", "Hypothesis Testing", "Regression Analysis",
        # Data Engineering
        "Spark", "Kafka", "Airflow", "dbt", "Hadoop", "Flink", "Hive", "Presto", "Athena",
        "ETL", "Data Pipelines", "Data Warehousing", "Data Modeling", "Data Governance",
        "Data Quality", "Data Contracts", "Databricks", "Snowflake", "Redshift", "BigQuery",
        # Databases
        "PostgreSQL", "MySQL", "MongoDB", "Redis", "Elasticsearch", "Cassandra", "DynamoDB",
        "Neo4j", "ClickHouse", "Pinecone",
        # Cloud and Infra
        "AWS", "GCP", "Azure", "Docker", "Kubernetes", "Terraform", "CI/CD",
        "Jenkins", "GitHub Actions", "Linux", "Bash", "Shell Scripting",
        "Observability", "Prometheus", "Grafana", "DataDog", "SRE",
        # Analytics and BI
        "Tableau", "Power BI", "Looker", "Metabase", "Mixpanel", "Amplitude",
        "Google Analytics", "Segment", "Data Studio", "Excel", "Google Sheets",
        "Business Intelligence", "Data Storytelling", "Dashboard Design",
        # Product Management
        "Product Management", "Product Strategy", "Product Roadmap", "Product Analytics",
        "User Research", "Customer Discovery", "Market Research", "Competitive Analysis",
        "Go-to-Market", "Product Launch", "Product-Led Growth", "OKRs", "KPIs",
        "Stakeholder Management", "Requirements Gathering", "PRD Writing",
        "Wireframing", "Prototyping", "User Stories", "Acceptance Criteria",
        "Pricing Strategy", "Monetisation", "Revenue Modelling",
        # Program and Project Management
        "Program Management", "Project Management", "PMP", "Agile", "Scrum", "Kanban",
        "JIRA", "Confluence", "Asana", "Notion", "Monday.com", "Risk Management",
        "Stakeholder Communication", "Cross-functional Leadership",
        # TPM
        "Technical Program Management", "Engineering Program Management",
        "Release Management", "Dependency Management", "Technical Roadmap",
        "System Integration", "API Integration",
        # Design
        "Figma", "Sketch", "Adobe XD", "UX Design", "UI Design", "Design Systems",
        "Accessibility", "Usability Testing", "Information Architecture",
        # Growth and Marketing
        "Growth Hacking", "SEO", "SEM", "Paid Acquisition", "CRO", "Email Marketing",
        "Content Strategy", "Brand Strategy", "Performance Marketing",
        "Customer Acquisition", "Retention", "Engagement", "Activation",
        "Funnel Analysis", "Cohort Analysis", "LTV", "CAC",
        # Sales and BD
        "Sales", "Business Development", "CRM", "Salesforce", "HubSpot",
        "Enterprise Sales", "SaaS Sales", "Solution Selling", "Pipeline Management",
        # Operations
        "Operations", "Process Design", "Process Improvement", "Six Sigma", "Lean",
        "Supply Chain", "Logistics", "Vendor Management", "Contract Management",
        # Finance
        "Financial Modeling", "Valuation", "DCF", "FP&A", "Budgeting", "Forecasting",
        "P&L Management", "Unit Economics", "Excel Modeling",
        # Strategy and Consulting
        "Strategy", "Management Consulting", "Business Analysis", "Market Analysis",
        "Competitive Intelligence", "Due Diligence", "Business Case Development",
        # Leadership and Soft Skills
        "Leadership", "Mentoring", "Team Building", "Hiring", "Performance Management",
        "Executive Communication", "Presentation Skills", "Negotiation",
        "Conflict Resolution", "Decision Making",
        # Security
        "Cybersecurity", "Penetration Testing", "SOC", "SIEM", "OWASP",
        "ISO 27001", "Threat Modeling", "Incident Response",
        # Domain specific
        "Fintech", "Payments", "Lending", "Credit Risk", "Fraud Detection",
        "Healthcare", "EdTech", "E-commerce", "Marketplace", "SaaS", "B2B", "B2C",
        "Mobile", "iOS", "Android", "React Native", "Flutter",
        "Blockchain", "Smart Contracts",
    ]

    text_lower = text.lower()
    found = []
    for skill in KNOWN_SKILLS:
        if skill.lower() in text_lower and skill not in found:
            found.append(skill)

    import re
    patterns = [
        r'\b[A-Z][a-zA-Z+#.]+(?:\s[A-Z][a-zA-Z+#.]+){0,2}\b',
    ]
    common_exclude = {
        "the", "and", "for", "with", "that", "this", "have", "will", "from",
        "they", "been", "were", "your", "our", "their", "you", "are", "not",
        "all", "can", "may", "who", "what", "how", "when", "where", "which",
        "work", "team", "role", "able", "help", "good", "new", "use", "make",
        "join", "build", "lead", "drive", "own", "run", "set", "get",
    }
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for word in matches:
            if (len(word) > 2 and
                word.lower() not in common_exclude and
                word not in found and
                not word.isdigit()):
                found.append(word)

    return list(dict.fromkeys(found))

async def run_full_scrape(keywords: list[str] = None, location: str = "India") -> dict:
    if keywords is None:
        keywords = [
            # Product
            "Product Manager", "Senior Product Manager", "Lead Product Manager",
            "Group Product Manager", "Director of Product", "VP Product",
            "Product Owner", "Associate Product Manager",
            # Program and TPM
            "Program Manager", "Technical Program Manager", "TPM",
            "Engineering Program Manager", "Senior Program Manager",
            "Release Manager", "Delivery Manager",
            # Data
            "Data Analyst", "Senior Data Analyst", "Business Analyst",
            "Data Scientist", "Senior Data Scientist", "ML Engineer",
            "Analytics Engineer", "Data Engineer", "Senior Data Engineer",
            "BI Developer", "Business Intelligence",
            # Engineering
            "Software Engineer", "Senior Software Engineer", "Staff Engineer",
            "Backend Engineer", "Frontend Engineer", "Full Stack Engineer",
            "Platform Engineer", "Site Reliability Engineer", "DevOps Engineer",
            # Design
            "Product Designer", "UX Designer", "Senior Designer",
            # Growth and GTM
            "Growth Manager", "Growth Product Manager", "Product Marketing Manager",
        ]

    all_jobs = []

    greenhouse_jobs = await scrape_greenhouse(keywords, location)
    print(f"Greenhouse scraped: {len(greenhouse_jobs)} jobs")
    all_jobs.extend(greenhouse_jobs)

    lever_jobs = await scrape_lever(keywords, location)
    print(f"Lever scraped: {len(lever_jobs)} jobs")
    all_jobs.extend(lever_jobs)

    linkedin_jobs = await scrape_linkedin(keywords[:5], location)
    print(f"LinkedIn scraped: {len(linkedin_jobs)} jobs")
    all_jobs.extend(linkedin_jobs)

    indeed_jobs = await scrape_indeed(keywords[:5], location)
    print(f"Indeed scraped: {len(indeed_jobs)} jobs")
    all_jobs.extend(indeed_jobs)

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