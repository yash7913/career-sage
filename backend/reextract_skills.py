import os
import json
import asyncio
import anthropic
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

DOMAIN_SKILLS = {
    "product": """Focus on: product management tools and methodologies (Agile, Scrum, JIRA, Confluence, Notion), 
product strategy skills (roadmapping, OKRs, KPIs, PRD writing, user research, A/B testing, go-to-market),
technical skills relevant to PM (SQL, Python, analytics, API design, system design),
domain expertise (fintech, SaaS, B2B, marketplace, payments, lending, enterprise),
leadership skills (stakeholder management, cross-functional leadership, executive communication)""",

    "data": """Focus on: programming languages (Python, R, SQL, Scala, Julia),
ML/AI frameworks (PyTorch, TensorFlow, Scikit-learn, XGBoost, Hugging Face, LangChain, RAG, LLM),
data engineering tools (Spark, Kafka, Airflow, dbt, Hadoop, Flink),
databases (PostgreSQL, MySQL, MongoDB, Redis, Snowflake, BigQuery, Databricks, Pinecone),
cloud platforms (AWS, GCP, Azure, Docker, Kubernetes),
analytics tools (Tableau, Power BI, Looker, Mixpanel),
statistical skills (A/B testing, statistical modeling, forecasting, causal inference)""",

    "engineering": """Focus on: programming languages (Python, Java, JavaScript, TypeScript, Go, Rust, C++),
frameworks (React, Node.js, FastAPI, Django, Spring Boot, Next.js),
infrastructure (AWS, GCP, Azure, Docker, Kubernetes, Terraform, CI/CD),
databases (PostgreSQL, MongoDB, Redis, Elasticsearch),
architecture skills (system design, microservices, API design, distributed systems)""",

    "design": """Focus on: design tools (Figma, Sketch, Adobe XD),
design skills (UX design, UI design, design systems, prototyping, wireframing, user research),
accessibility, usability testing, information architecture""",

    "general": """Focus on: any technical skills, tools, frameworks, platforms, methodologies,
domain expertise, and professional skills that are explicitly mentioned in the JD"""
}

def get_domain(title: str, jd: str) -> str:
    text = f"{title} {jd}".lower()
    if any(w in text for w in ["product manager", "product owner", "pm ", "product lead", "program manager", "tpm"]):
        return "product"
    if any(w in text for w in ["data scientist", "machine learning", "ml engineer", "data engineer", "analytics engineer", "data analyst"]):
        return "data"
    if any(w in text for w in ["software engineer", "backend", "frontend", "full stack", "devops", "sre", "platform engineer"]):
        return "engineering"
    if any(w in text for w in ["designer", "ux ", "ui ", "product design"]):
        return "design"
    return "general"

SKILL_PROMPT = """Extract only professional skills from this job description.

Job role type: {domain}
{domain_guidance}

Rules:
- Only include real recognised skills that appear on resumes and LinkedIn profiles
- Only skills relevant to the job role type above
- Exclude: company names, city names, country names
- Exclude: generic words (strong, proven, solid, hands, comfortable, familiar, exposure, ability)
- Exclude: action verbs used standalone (define, ship, build, develop, ensure, manage, identify)
- Exclude: sentence fragments, partial phrases, section headers
- Exclude: anything not a concrete skill a person lists on their CV
- Maximum 15 skills
- Return ONLY a JSON array of strings

Job title: {title}
Job description: {jd}

Return format: ["Skill 1", "Skill 2", ...]"""

async def reextract_batch(jobs):
    results = []
    for job in jobs:
        try:
            jd = (job.get("job_description") or "")[:1500]
            title = job.get("job_title") or ""
            if not jd and not title:
                results.append((job["id"], []))
                continue

            domain = get_domain(title, jd)
            domain_guidance = DOMAIN_SKILLS[domain]

            msg = client.messages.create(
                model="claude-haiku-4-5-20251001",
                max_tokens=300,
                messages=[{"role": "user", "content": SKILL_PROMPT.format(
                    domain=domain,
                    domain_guidance=domain_guidance,
                    title=title,
                    jd=jd[:1200]
                )}]
            )
            content = msg.content[0].text.strip()
            content = content.replace("```json", "").replace("```", "").strip()
            skills = json.loads(content)
            if isinstance(skills, list):
                skills = [s for s in skills if isinstance(s, str) and 2 < len(s) < 35][:15]
            else:
                skills = []
            results.append((job["id"], skills))
            print(f"  [{domain}] {title[:50]} → {skills[:5]}")
        except Exception as e:
            print(f"Error for {job.get('job_title')}: {e}")
            results.append((job["id"], []))
    return results

async def main():
    page = 0
    batch = 50
    total = 0

    while True:
        jobs = sb.table("aggregated_jobs")\
            .select("id, job_title, job_description")\
            .range(page * batch, (page + 1) * batch - 1)\
            .execute()

        if not jobs.data:
            break

        print(f"Processing batch {page + 1} ({len(jobs.data)} jobs)...")
        results = await reextract_batch(jobs.data)

        for job_id, skills in results:
            sb.table("aggregated_jobs")\
                .update({"skills_needed": skills})\
                .eq("id", job_id)\
                .execute()

        total += len(results)
        print(f"Updated {total} jobs so far...")
        page += 1

        await asyncio.sleep(0.5)

    print(f"Done. Total jobs re-extracted: {total}")

asyncio.run(main())