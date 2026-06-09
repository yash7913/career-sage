from typing import List

JOB_COHORT_SIGNALS = {
    "Technical PM": {
        "title": ["product manager", "product lead", "pm", "product owner"],
        "required": ["product", "roadmap", "technical", "engineering"],
        "bonus": ["api", "system design", "sql", "data", "analytics"],
    },
    "Data-Oriented PM": {
        "title": ["product manager", "product analyst", "growth analyst"],
        "required": ["product", "analytics", "data", "metrics"],
        "bonus": ["sql", "a/b testing", "experimentation", "funnel", "cohort"],
    },
    "Growth PM": {
        "title": ["growth product", "growth manager", "product marketing"],
        "required": ["growth", "retention", "conversion", "acquisition"],
        "bonus": ["ltv", "cac", "funnel", "activation", "revenue"],
    },
    "AI/ML PM": {
        "title": ["ai product", "ml product", "product manager ai"],
        "required": ["machine learning", "ai", "llm", "model"],
        "bonus": ["prompt", "rag", "mlops", "responsible ai"],
    },
    "Platform PM": {
        "title": ["platform product", "developer product", "api product"],
        "required": ["platform", "api", "developer", "infrastructure"],
        "bonus": ["sdk", "integration", "ecosystem", "developer experience"],
    },
    "Enterprise PM": {
        "title": ["enterprise product", "b2b product"],
        "required": ["enterprise", "b2b", "saas", "customer"],
        "bonus": ["compliance", "security", "procurement", "rfp"],
    },
    "Consumer PM": {
        "title": ["consumer product", "mobile product"],
        "required": ["consumer", "mobile", "user", "engagement"],
        "bonus": ["dau", "mau", "app", "ux", "retention"],
    },
    "Technical Program Manager": {
        "title": ["technical program", "tpm", "engineering program", "program manager"],
        "required": ["program", "cross-functional", "delivery", "engineering"],
        "bonus": ["roadmap", "dependency", "release", "agile"],
    },
    "Data Scientist": {
        "title": ["data scientist", "research scientist", "applied scientist", "decision scientist"],
        "required": ["data science", "machine learning", "python", "statistics"],
        "bonus": ["sklearn", "pytorch", "tensorflow", "sql", "experimentation"],
    },
    "ML Engineer": {
        "title": ["ml engineer", "machine learning engineer", "ai engineer"],
        "required": ["machine learning", "python", "model", "training"],
        "bonus": ["pytorch", "tensorflow", "mlops", "kubernetes", "serving"],
    },
    "Analytics Engineer": {
        "title": ["analytics engineer", "data analyst", "bi developer", "business analyst"],
        "required": ["sql", "analytics", "data", "reporting"],
        "bonus": ["dbt", "snowflake", "tableau", "looker", "power bi"],
    },
    "Data Engineer": {
        "title": ["data engineer", "platform engineer data", "etl engineer"],
        "required": ["data pipeline", "etl", "spark", "sql"],
        "bonus": ["kafka", "airflow", "dbt", "snowflake", "databricks"],
    },
    "Full-Stack Engineer": {
        "title": ["full stack", "fullstack", "software engineer", "software developer"],
        "required": ["javascript", "react", "node", "api"],
        "bonus": ["typescript", "next.js", "postgresql", "docker"],
    },
    "Backend Engineer": {
        "title": ["backend engineer", "software engineer", "server side"],
        "required": ["backend", "api", "database", "python", "java", "go"],
        "bonus": ["microservices", "redis", "kafka", "system design"],
    },
    "Frontend Engineer": {
        "title": ["frontend engineer", "ui engineer", "react developer"],
        "required": ["frontend", "react", "javascript", "css", "html"],
        "bonus": ["typescript", "next.js", "vue", "angular"],
    },
    "Platform / Infra Engineer": {
        "title": ["devops", "sre", "platform engineer", "infrastructure engineer"],
        "required": ["kubernetes", "docker", "aws", "terraform", "ci/cd"],
        "bonus": ["prometheus", "grafana", "ansible", "linux"],
    },
    "Product Designer": {
        "title": ["product designer", "ux designer", "ui designer", "interaction designer"],
        "required": ["figma", "ux", "design", "prototype", "user research"],
        "bonus": ["design system", "accessibility", "usability", "sketch"],
    },
    "Strategy Consultant": {
        "title": ["consultant", "strategy", "associate", "business analyst"],
        "required": ["strategy", "consulting", "analysis", "stakeholder"],
        "bonus": ["market research", "business case", "frameworks", "presentation"],
    },
    "Operations Manager": {
        "title": ["operations", "program manager", "delivery manager", "project manager"],
        "required": ["operations", "process", "coordination", "delivery"],
        "bonus": ["okrs", "metrics", "vendor", "sop", "agile"],
    },
    "Growth Marketer": {
        "title": ["growth", "marketing", "performance marketing", "demand generation"],
        "required": ["marketing", "growth", "acquisition", "campaigns"],
        "bonus": ["seo", "sem", "google ads", "analytics", "cro"],
    },
}

COHORT_ADJACENCY = {
    "Technical PM": ["Data-Oriented PM", "Platform PM", "AI/ML PM", "Technical Program Manager", "Growth PM", "Consumer PM", "Enterprise PM"],
    "Data-Oriented PM": ["Technical PM", "Growth PM", "Analytics Engineer", "Data Scientist"],
    "Growth PM": ["Data-Oriented PM", "Consumer PM", "Growth Marketer", "Technical PM"],
    "Data Scientist": ["ML Engineer", "Analytics Engineer", "Data Engineer", "Data-Oriented PM"],
    "ML Engineer": ["Data Scientist", "Analytics Engineer"],
    "Analytics Engineer": ["Data Scientist", "Data Engineer", "Data-Oriented PM"],
    "Full-Stack Engineer": ["Backend Engineer", "Frontend Engineer"],
    "Backend Engineer": ["Full-Stack Engineer", "Platform / Infra Engineer"],
    "Technical Program Manager": ["Technical PM", "Operations Manager"],
    "Strategy Consultant": ["Operations Manager", "Enterprise PM"],
}


def classify_job_cohorts(job_title: str, job_description: str) -> List[str]:
    title_lower = (job_title or "").lower()
    desc_lower = (job_description or "").lower()[:3000]
    combined = f"{title_lower} {desc_lower}"

    scores: dict[str, float] = {}

    for cohort, signals in JOB_COHORT_SIGNALS.items():
        score = 0.0

        for title_signal in signals["title"]:
            if title_signal in title_lower:
                score += 4.0

        for req in signals["required"]:
            if req in combined:
                score += 2.0

        for bonus in signals["bonus"]:
            if bonus in combined:
                score += 1.0

        if score >= 3.0:
            scores[cohort] = score

    if not scores:
        if any(kw in title_lower for kw in ["engineer", "developer", "programmer"]):
            return ["Full-Stack Engineer", "Backend Engineer"]
        if any(kw in title_lower for kw in ["analyst", "analysis"]):
            return ["Analytics Engineer", "Data Scientist"]
        if any(kw in title_lower for kw in ["manager", "lead", "director"]):
            return ["Operations Manager", "Technical PM"]
        return ["Technical PM"]

    sorted_cohorts = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_score = sorted_cohorts[0][1]
    return [c for c, s in sorted_cohorts if s >= top_score * 0.6][:3]

def get_cohort_alignment(user_cohort: str, job_cohorts: List[str]) -> float:
    if not user_cohort or not job_cohorts:
        return 0.85

    if user_cohort in job_cohorts:
        return 1.0

    adjacent = COHORT_ADJACENCY.get(user_cohort, [])
    if any(jc in adjacent for jc in job_cohorts):
        return 0.85

    user_domain = _get_domain(user_cohort)
    job_domains = [_get_domain(jc) for jc in job_cohorts]
    if user_domain in job_domains:
        return 0.65

    return 0.3


def _get_domain(cohort: str) -> str:
    if any(kw in cohort for kw in ["PM", "Product Manager", "Program"]):
        return "product"
    if any(kw in cohort for kw in ["Engineer", "Developer"]):
        return "engineering"
    if any(kw in cohort for kw in ["Data", "Analytics", "Scientist", "ML"]):
        return "data"
    if any(kw in cohort for kw in ["Designer"]):
        return "design"
    if any(kw in cohort for kw in ["Strategy", "Consultant", "Operations"]):
        return "strategy"
    return "other"