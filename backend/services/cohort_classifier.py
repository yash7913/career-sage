from typing import Optional


COHORT_DEFINITIONS = {
    # Product Management
    "Technical PM": {
        "required": ["product management", "engineering", "system design", "api", "sql", "data"],
        "bonus": ["python", "architecture", "technical roadmap", "backend", "infrastructure"],
        "title_signals": ["technical pm", "product manager", "product lead"],
        "min_score": 3,
    },
    "Data-Oriented PM": {
        "required": ["product management", "analytics", "sql", "a/b testing", "data"],
        "bonus": ["tableau", "power bi", "experimentation", "funnel", "cohort", "metrics"],
        "title_signals": ["product manager", "product analyst", "growth analyst"],
        "min_score": 3,
    },
    "Growth PM": {
        "required": ["growth", "retention", "conversion", "funnel", "experimentation"],
        "bonus": ["cac", "ltv", "activation", "referral", "gtm", "product-led growth"],
        "title_signals": ["growth pm", "growth manager", "growth product"],
        "min_score": 3,
    },
    "Platform PM": {
        "required": ["platform", "api", "developer", "infrastructure", "ecosystem"],
        "bonus": ["sdk", "documentation", "developer relations", "integration"],
        "title_signals": ["platform pm", "platform product", "developer product"],
        "min_score": 3,
    },
    "Consumer PM": {
        "required": ["consumer", "mobile", "user research", "engagement", "retention"],
        "bonus": ["dau", "mau", "app store", "ux", "user journey", "nps"],
        "title_signals": ["consumer pm", "mobile pm", "product manager"],
        "min_score": 3,
    },
    "Enterprise PM": {
        "required": ["enterprise", "b2b", "stakeholder", "compliance", "procurement"],
        "bonus": ["rfp", "sla", "security compliance", "customer success"],
        "title_signals": ["enterprise pm", "b2b product", "product manager"],
        "min_score": 3,
    },
    "AI/ML PM": {
        "required": ["machine learning", "ai", "llm", "model", "data science"],
        "bonus": ["prompt engineering", "rag", "langchain", "mlops", "responsible ai"],
        "title_signals": ["ai pm", "ml product", "product manager ai"],
        "min_score": 3,
    },
    # Engineering
    "ML Engineer": {
        "required": ["machine learning", "deep learning", "pytorch", "tensorflow", "model training"],
        "bonus": ["mlops", "feature engineering", "model serving", "hugging face", "nlp"],
        "title_signals": ["ml engineer", "machine learning engineer", "ai engineer"],
        "min_score": 3,
    },
    "Data Engineer": {
        "required": ["spark", "kafka", "airflow", "dbt", "data pipelines", "etl"],
        "bonus": ["snowflake", "bigquery", "databricks", "data warehouse", "orchestration"],
        "title_signals": ["data engineer", "analytics engineer", "platform engineer"],
        "min_score": 3,
    },
    "Full-Stack Engineer": {
        "required": ["react", "node.js", "api", "database", "javascript"],
        "bonus": ["typescript", "next.js", "postgresql", "docker", "ci/cd"],
        "title_signals": ["full stack", "fullstack", "software engineer"],
        "min_score": 3,
    },
    "Backend Engineer": {
        "required": ["api", "database", "system design", "backend", "microservices"],
        "bonus": ["postgresql", "redis", "kafka", "python", "java", "go"],
        "title_signals": ["backend engineer", "software engineer", "platform engineer"],
        "min_score": 3,
    },
    "Platform / Infra Engineer": {
        "required": ["kubernetes", "terraform", "aws", "ci/cd", "docker"],
        "bonus": ["sre", "observability", "prometheus", "grafana", "datadog"],
        "title_signals": ["platform engineer", "devops", "sre", "infrastructure"],
        "min_score": 3,
    },
    # Data and Analytics
    "Analytics Engineer": {
        "required": ["dbt", "sql", "data modeling", "analytics", "warehouse"],
        "bonus": ["snowflake", "bigquery", "data contracts", "semantic layer", "spark"],
        "title_signals": ["analytics engineer", "data analyst", "bi developer"],
        "min_score": 3,
    },
    "Data Scientist": {
        "required": ["python", "machine learning", "statistics", "sql", "data science"],
        "bonus": ["scikit-learn", "r", "causal inference", "experimentation", "nlp"],
        "title_signals": ["data scientist", "research scientist", "applied scientist"],
        "min_score": 3,
    },
    "Business Analyst": {
        "required": ["sql", "excel", "requirements", "stakeholder", "analytics"],
        "bonus": ["tableau", "power bi", "process mapping", "business intelligence"],
        "title_signals": ["business analyst", "product analyst", "data analyst"],
        "min_score": 3,
    },
    # Strategy and Operations
    "Strategy Consultant": {
        "required": ["strategy", "consulting", "market research", "business case", "stakeholder"],
        "bonus": ["mckinsey", "bcg", "frameworks", "due diligence", "board presentations"],
        "title_signals": ["consultant", "strategy", "associate", "manager"],
        "min_score": 3,
    },
    "Operations Manager": {
        "required": ["operations", "process", "metrics", "cross-functional", "coordination"],
        "bonus": ["okrs", "sop", "vendor management", "six sigma", "lean"],
        "title_signals": ["operations", "program manager", "delivery manager"],
        "min_score": 2,
    },
    # GTM
    "Growth Marketer": {
        "required": ["seo", "sem", "paid acquisition", "cro", "analytics"],
        "bonus": ["google ads", "meta ads", "landing page", "email marketing"],
        "title_signals": ["growth", "marketing", "performance marketing"],
        "min_score": 2,
    },
    # Design
    "Product Designer": {
        "required": ["figma", "ux", "design", "prototyping", "user research"],
        "bonus": ["design systems", "accessibility", "usability testing", "sketch"],
        "title_signals": ["designer", "ux designer", "product designer"],
        "min_score": 3,
    },
    # Fresh grad fallback
    "Career Explorer": {
        "required": [],
        "bonus": [],
        "title_signals": [],
        "min_score": 0,
    },
}


def classify_cohort(
    extracted_skills: list,
    raw_profile_text: str,
    work_history: list = None,
    years_of_experience: int = 0,
) -> str:
    if not extracted_skills and not raw_profile_text:
        return "Career Explorer"

    flat_skills = []
    if isinstance(extracted_skills, list):
        for s in extracted_skills:
            if isinstance(s, str):
                flat_skills.append(s.lower())
            elif isinstance(s, dict):
                for v in s.values():
                    if isinstance(v, list):
                        flat_skills.extend([x.lower() for x in v if isinstance(x, str)])

    profile_text = (raw_profile_text or "").lower()
    all_text = profile_text + " " + " ".join(flat_skills)

    title_text = ""
    if work_history and isinstance(work_history, list):
        for role in work_history[:3]:
            if isinstance(role, dict):
                title_text += " " + (role.get("title") or "").lower()

    scores: dict[str, float] = {}

    for cohort_name, definition in COHORT_DEFINITIONS.items():
        if cohort_name == "Career Explorer":
            continue

        score = 0.0

        for req in definition["required"]:
            if req in all_text:
                score += 2.0

        for bonus in definition["bonus"]:
            if bonus in all_text:
                score += 1.0

        for signal in definition["title_signals"]:
            if signal in title_text:
                score += 3.0

        if score >= definition["min_score"]:
            scores[cohort_name] = score

    if not scores:
        return "Career Explorer"

    best = max(scores, key=lambda k: scores[k])
    return best


def get_cohort_color(cohort: str) -> str:
    colors = {
        "Technical PM": "#3B82F6",
        "Data-Oriented PM": "#10B981",
        "Growth PM": "#F59E0B",
        "Platform PM": "#06B6D4",
        "Consumer PM": "#EC4899",
        "Enterprise PM": "#8B5CF6",
        "AI/ML PM": "#F97316",
        "ML Engineer": "#EC4899",
        "Data Engineer": "#7F77DD",
        "Full-Stack Engineer": "#F97316",
        "Backend Engineer": "#3B82F6",
        "Platform / Infra Engineer": "#06B6D4",
        "Analytics Engineer": "#7F77DD",
        "Data Scientist": "#10B981",
        "Business Analyst": "#F59E0B",
        "Strategy Consultant": "#8B5CF6",
        "Operations Manager": "#6B7280",
        "Growth Marketer": "#F59E0B",
        "Product Designer": "#EC4899",
        "Career Explorer": "#6B7280",
    }
    return colors.get(cohort, "#10B981")