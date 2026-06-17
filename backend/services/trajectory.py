import re
from typing import Optional

SENIORITY_LEVELS = {
    "intern": 0, "internship": 0, "trainee": 0,
    "junior": 1, "associate": 1, "analyst": 1, "entry": 1,
    "mid": 2, "engineer": 2, "developer": 2, "specialist": 2,
    "senior": 3, "lead": 3, "staff": 3, "principal": 3,
    "manager": 4, "director": 4, "head": 4, "architect": 4,
    "vp": 5, "vice president": 5, "chief": 5, "cto": 5, "cpo": 5,
}

def extract_seniority(title: str) -> int:
    title_lower = title.lower()
    max_level = 2
    for keyword, level in SENIORITY_LEVELS.items():
        if keyword in title_lower:
            max_level = max(max_level, level)
    return max_level

def classify_trajectory(
    raw_profile_text: str,
    work_history: list,
    years_of_experience: int = 0,
    cohort: str = "",
) -> dict:
    text_lower = (raw_profile_text or "").lower()

    roles = []
    if work_history and isinstance(work_history, list):
        for role in work_history:
            if isinstance(role, dict):
                title = role.get("title") or role.get("job_title") or ""
                company = role.get("company") or role.get("company_name") or ""
                if title:
                    roles.append({
                        "title": title,
                        "company": company,
                        "seniority": extract_seniority(title),
                    })

    if not roles and raw_profile_text:
        role_matches = re.findall(
            r'(?:^|\n)([A-Z][^\n,|]+?)(?:\s+at\s+|\s+\|\s+|\s+-\s+)([A-Z][^\n,|]+)',
            raw_profile_text
        )
        for match in role_matches[:6]:
            title = match[0].strip()
            company = match[1].strip()
            roles.append({
                "title": title,
                "company": company,
                "seniority": extract_seniority(title),
            })

    pivot_signals = [
        "transition", "switch", "pivot", "career change", "new direction",
        "different domain", "from engineering to", "from consulting to",
        "from finance to", "moved into", "shifted to",
    ]
    is_pivoting = any(s in text_lower for s in pivot_signals)

    domain_keywords = {
        "fintech": ["fintech", "finance", "banking", "payments", "lending"],
        "saas": ["saas", "enterprise software", "b2b software", "cloud"],
        "consumer": ["consumer", "b2c", "marketplace", "e-commerce"],
        "data": ["data science", "analytics", "machine learning", "ai"],
        "security": ["security", "cybersecurity", "infosec", "risk"],
    }

    domain_counts: dict[str, int] = {}
    for domain, keywords in domain_keywords.items():
        count = sum(1 for kw in keywords if kw in text_lower)
        if count > 0:
            domain_counts[domain] = count

    dominant_domain = max(domain_counts, key=lambda k: domain_counts[k]) if domain_counts else None
    domain_consistency = len(domain_counts) <= 2

    seniority_levels = [r["seniority"] for r in roles]
    if len(seniority_levels) >= 2:
        seniority_growth = seniority_levels[0] - seniority_levels[-1]
    else:
        seniority_growth = 0

    promotion_words = ["promoted", "promotion", "elevated", "advanced to", "progressed"]
    has_promotions = any(w in text_lower for w in promotion_words)

    plateau_signals = [
        "same role", "continued", "ongoing", "maintained",
    ]
    plateau_count = sum(1 for s in plateau_signals if s in text_lower)

    # Strong accelerating signals
    current_seniority = seniority_levels[0] if seniority_levels else 0
    is_accelerating = (
        seniority_growth >= 2
        or has_promotions
        or current_seniority >= 3  # Currently at senior/lead/staff/principal level
        or (years_of_experience >= 8 and current_seniority >= 2)  # 8+ years and mid+ = accelerating
        or len(set(seniority_levels)) >= 2  # Multiple seniority levels = growth
    )

    # Plateauing signals — only trigger if NOT accelerating
    is_plateauing = (
        not is_accelerating
        and (plateau_count >= 2 or (years_of_experience >= 5 and seniority_growth <= 0))
    )

    if is_pivoting or (domain_counts and len(domain_counts) >= 3):
        trajectory = "Pivoting"
        description = "Your career shows significant domain or function changes. Career Sage will help translate your transferable skills into your target role's language."
        color = "#F59E0B"
        icon = "🔄"
    elif is_accelerating:
        trajectory = "Accelerating"
        description = "Strong upward trajectory — your seniority progression and scope of impact are above average for your cohort. Focus on expanding your leadership footprint."
        color = "#10B981"
        icon = "🚀"
    elif is_plateauing:
        trajectory = "Plateauing"
        description = "Your career shows signs of levelling out. This is common after 5+ years in one domain. Consider a new challenge, domain expansion, or leadership move."
        color = "#EF4444"
        icon = "📊"
    else:
        trajectory = "On-track"
        description = "Steady progression in your domain. Your experience and skills are building well. Focus on deepening impact metrics and cross-functional exposure."
        color = "#3B82F6"
        icon = "📈"

    return {
        "trajectory": trajectory,
        "description": description,
        "color": color,
        "icon": icon,
        "dominant_domain": dominant_domain,
        "domain_consistency": domain_consistency,
        "roles_detected": len(roles),
        "seniority_growth": seniority_growth,
    }


CONFIDENCE_THRESHOLDS = {
    "Core": {"min_mentions": 3, "recency_required": False},
    "Proficient": {"min_mentions": 2, "recency_required": False},
    "Familiar": {"min_mentions": 1, "recency_required": False},
    "Dated": {"min_mentions": 1, "recency_required": False},
}

def score_skill_confidence(skill: str, raw_profile_text: str) -> str:
    if not raw_profile_text or not skill:
        return "Familiar"

    text_lower = raw_profile_text.lower()
    skill_lower = skill.lower()

    mentions = text_lower.count(skill_lower)

    recent_sections = text_lower[:len(text_lower) // 2]
    is_recent = skill_lower in recent_sections

    dated_signals = ["previously", "formerly", "used to", "earlier in my career", "legacy"]
    is_dated = any(s in text_lower for s in dated_signals) and not is_recent

    if mentions >= 4 and is_recent:
        return "Core"
    elif mentions >= 3 or (mentions >= 2 and is_recent):
        return "Proficient"
    elif is_dated:
        return "Dated"
    else:
        return "Familiar"


def enrich_skills_with_confidence(skills: list, raw_profile_text: str) -> list:
    if not skills:
        return []

    enriched = []
    for skill in skills:
        if isinstance(skill, str):
            confidence = score_skill_confidence(skill, raw_profile_text)
            enriched.append({"name": skill, "confidence": confidence})
        elif isinstance(skill, dict):
            name = skill.get("name") or skill.get("skill") or ""
            confidence = score_skill_confidence(name, raw_profile_text)
            enriched.append({"name": name, "confidence": confidence})

    order = {"Core": 0, "Proficient": 1, "Familiar": 2, "Dated": 3}
    enriched.sort(key=lambda s: order.get(s["confidence"], 2))
    return enriched