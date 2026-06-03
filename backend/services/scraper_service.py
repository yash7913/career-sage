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