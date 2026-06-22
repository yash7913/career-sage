from typing import Optional
from services.claude_client import create_message
import json
import os
import asyncio

COHORT_WEIGHTS = {
    "Technical PM":       {"technical": 0.25, "domain": 0.20, "impact": 0.25, "leadership": 0.15, "learning": 0.15},
    "Data-Oriented PM":   {"technical": 0.25, "domain": 0.20, "impact": 0.30, "leadership": 0.10, "learning": 0.15},
    "Growth PM":          {"technical": 0.15, "domain": 0.25, "impact": 0.35, "leadership": 0.15, "learning": 0.10},
    "Platform PM":        {"technical": 0.30, "domain": 0.20, "impact": 0.25, "leadership": 0.10, "learning": 0.15},
    "Consumer PM":        {"technical": 0.15, "domain": 0.25, "impact": 0.30, "leadership": 0.15, "learning": 0.15},
    "Enterprise PM":      {"technical": 0.15, "domain": 0.30, "impact": 0.25, "leadership": 0.20, "learning": 0.10},
    "AI/ML PM":           {"technical": 0.30, "domain": 0.20, "impact": 0.25, "leadership": 0.10, "learning": 0.15},
    "ML Engineer":        {"technical": 0.35, "domain": 0.20, "impact": 0.25, "leadership": 0.10, "learning": 0.10},
    "Data Engineer":      {"technical": 0.35, "domain": 0.20, "impact": 0.20, "leadership": 0.10, "learning": 0.15},
    "Full-Stack Engineer":{"technical": 0.35, "domain": 0.15, "impact": 0.25, "leadership": 0.10, "learning": 0.15},
    "Backend Engineer":   {"technical": 0.35, "domain": 0.15, "impact": 0.25, "leadership": 0.10, "learning": 0.15},
    "Analytics Engineer": {"technical": 0.30, "domain": 0.25, "impact": 0.25, "leadership": 0.10, "learning": 0.10},
    "Data Scientist":     {"technical": 0.30, "domain": 0.25, "impact": 0.25, "leadership": 0.10, "learning": 0.10},
    "Business Analyst":   {"technical": 0.20, "domain": 0.25, "impact": 0.25, "leadership": 0.15, "learning": 0.15},
    "Strategy Consultant":{"technical": 0.10, "domain": 0.25, "impact": 0.30, "leadership": 0.20, "learning": 0.15},
    "Operations Manager": {"technical": 0.15, "domain": 0.20, "impact": 0.25, "leadership": 0.25, "learning": 0.15},
    "Career Explorer":    {"technical": 0.20, "domain": 0.15, "impact": 0.20, "leadership": 0.20, "learning": 0.25},
}

DEFAULT_WEIGHTS = {"technical": 0.20, "domain": 0.20, "impact": 0.20, "leadership": 0.20, "learning": 0.20}

TIER1_COMPANIES = {
    "google", "meta", "apple", "microsoft", "amazon", "netflix",
    "stripe", "airbnb", "uber", "figma", "anthropic", "openai",
    "salesforce", "american express", "goldman sachs", "mckinsey",
    "bcg", "bain", "flipkart", "razorpay", "zepto", "cred", "swiggy",
    "meesho", "phonepe", "groww", "zomato", "nykaa",
}

HIGH_VALUE_SKILLS = {
    "python", "sql", "machine learning", "deep learning", "pytorch",
    "tensorflow", "spark", "kafka", "kubernetes", "system design",
    "product management", "product strategy", "data science",
    "analytics", "a/b testing", "statistics", "llm", "rag",
}

OWNERSHIP_WORDS = [
    "led", "owned", "defined", "directed", "drove", "spearheaded",
    "architected", "built", "launched", "founded", "established",
    "created", "designed", "pioneered", "championed",
]

LEADERSHIP_WORDS = [
    "managed", "mentored", "coached", "hired", "team of", "reports",
    "cross-functional", "stakeholder", "executive", "director", "vp",
    "head of", "leadership", "organization", "department",
]

LEARNING_WORDS = [
    "certification", "certified", "course", "learning", "bootcamp",
    "fellowship", "scholarship", "research", "publication", "patent",
    "conference", "speaker", "award",
]

METRIC_PATTERNS = [
    r'\d+%', r'\$\d+', r'₹\d+', r'\d+x', r'\d+k\b', r'\d+m\b',
    r'\d+\s*million', r'\d+\s*billion', r'\d+\s*lakh',
    r'\d+,\d{3}', r'\d+\+\s*users', r'\d+\+\s*engineers',
    r'\d+\+\s*customers', r'\d+\+\s*employees',
]


def compute_technical_depth(skills: list, raw_text: str, years_exp: int = 0) -> float:
    if not skills and not raw_text:
        return 0.0

    text_lower = (raw_text or "").lower()
    skill_names = [s.lower() if isinstance(s, str) else "" for s in (skills or [])]

    high_value_count = sum(1 for s in skill_names if any(hv in s for hv in HIGH_VALUE_SKILLS))
    total_skills = max(len(skill_names), 1)

    base_score = min(len(skill_names) * 3, 40)
    quality_bonus = min(high_value_count * 5, 30)
    depth_bonus = 0

    tier1_mentions = sum(1 for co in TIER1_COMPANIES if co in text_lower)
    depth_bonus += min(tier1_mentions * 5, 20)

    exp_bonus = min(years_exp * 1.5, 10)

    raw = base_score + quality_bonus + depth_bonus + exp_bonus
    return min(round(raw), 100)


def compute_domain_expertise(raw_text: str, work_history: list, years_exp: int = 0) -> float:
    if not raw_text:
        return 0.0

    text_lower = raw_text.lower()
    companies = []
    if work_history and isinstance(work_history, list):
        for role in work_history:
            if isinstance(role, dict):
                co = (role.get("company") or "").lower()
                if co:
                    companies.append(co)

    unique_companies = len(set(companies))
    tenure_score = 0
    if unique_companies > 0:
        avg_tenure = years_exp / unique_companies if unique_companies else 0
        tenure_score = min(avg_tenure * 8, 30)

    tier1_score = sum(10 for co in TIER1_COMPANIES if co in text_lower)
    tier1_score = min(tier1_score, 40)

    exp_score = min(years_exp * 3, 30)

    raw = tenure_score + tier1_score + exp_score
    return min(round(raw), 100)


def compute_impact_magnitude(raw_text: str) -> float:
    """Regex-based fallback score — fast, but brittle. Only counts explicit
    numeric metrics and keyword matches, so genuine impact described in
    narrative language (without a %/number) scores artificially low. Used as
    an instant fallback before the AI assessment completes, and as a safety
    net if the AI call fails."""
    if not raw_text:
        return 0.0
    import re
    text_lower = raw_text.lower()
    metric_count = 0
    for pattern in METRIC_PATTERNS:
        matches = re.findall(pattern, text_lower)
        metric_count += len(matches)
    scale_keywords = ["million", "billion", "lakh", "crore", "enterprise", "global", "nationwide"]
    scale_bonus = sum(3 for kw in scale_keywords if kw in text_lower)
    ownership_count = sum(1 for w in OWNERSHIP_WORDS if w in text_lower)
    raw = min(metric_count * 4, 50) + min(scale_bonus, 20) + min(ownership_count * 3, 30)
    return min(round(raw), 100)


async def compute_domain_expertise_ai(raw_text: str, cohort: str, fallback_score: float) -> float:
    """The regex fallback only credits a hard-coded list of 'tier 1' companies
    and crude tenure math — someone with genuine deep expertise at a company
    not on that list gets zero credit regardless of how real their expertise
    is. This reads the actual narrative for evidence of depth in a domain."""
    if not raw_text or len(raw_text.strip()) < 50:
        return fallback_score

    try:
        import anthropic
        import json
        import re as _re


        prompt = f"""You are assessing the DOMAIN EXPERTISE of a {cohort} based on their profile text. Domain expertise means: depth of knowledge in their specific industry/functional area, regardless of company brand recognition.

Profile text:
{raw_text[:3000]}

Score their domain expertise from 0-100, where:
- 0-25: Limited evidence of specialized domain knowledge, generalist signals only
- 26-50: Some domain focus evident, moderate depth
- 51-75: Clear, sustained focus in a specific domain with evident depth of understanding
- 76-100: Deep, demonstrated mastery of a specific domain with clear evidence of nuanced understanding

Be FAIR — expertise at a smaller or less famous company is just as real as expertise at a famous one. Judge based on depth and consistency of domain focus shown in the text, not company brand recognition.

Return ONLY valid JSON: {{"score": <int 0-100>, "reasoning": "one sentence why"}}"""

        message = create_message(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = _re.sub(r'^```json\s*', '', content)
        content = _re.sub(r'\s*```$', '', content)
        result = json.loads(content)
        score = result.get("score")

        if isinstance(score, (int, float)) and 0 <= score <= 100:
            return max(round(score), fallback_score)

        return fallback_score
    except Exception as e:
        try:
            from logger import get_logger
            get_logger(__name__).warning(f"AI domain expertise scoring failed, using fallback: {e}")
        except Exception:
            pass
        return fallback_score


async def compute_learning_velocity_ai(raw_text: str, cohort: str, fallback_score: float) -> float:
    """The regex fallback only credits formal degrees/certifications and a
    keyword list — someone who's clearly grown through projects, expanded
    scope, or picked up new skills on the job without formal credentials
    gets penalized for lacking paperwork rather than evidence of growth."""
    if not raw_text or len(raw_text.strip()) < 50:
        return fallback_score

    try:
        import anthropic
        import json
        import re as _re


        prompt = f"""You are assessing the LEARNING VELOCITY of a {cohort} based on their profile text. Learning velocity means: evidence of actively growing skills, taking on new challenges, and expanding capability over time — NOT just formal degrees or certifications.

Profile text:
{raw_text[:3000]}

Score their learning velocity from 0-100, where:
- 0-25: Little evidence of skill growth or expanding scope over time
- 26-50: Some evidence of growth, moderate skill expansion
- 51-75: Clear evidence of actively growing capability, taking on new types of work
- 76-100: Strong, consistent evidence of rapid growth — new skills, expanding scope, taking on progressively more complex challenges

Be FAIR — growth shown through expanding responsibilities, new project types, or skill application on the job is just as real as formal certifications. Do not penalize someone for lacking credentials if their actual work shows clear growth.

Return ONLY valid JSON: {{"score": <int 0-100>, "reasoning": "one sentence why"}}"""

        message = create_message(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = _re.sub(r'^```json\s*', '', content)
        content = _re.sub(r'\s*```$', '', content)
        result = json.loads(content)
        score = result.get("score")

        if isinstance(score, (int, float)) and 0 <= score <= 100:
            return max(round(score), fallback_score)

        return fallback_score
    except Exception as e:
        try:
            from logger import get_logger
            get_logger(__name__).warning(f"AI learning velocity scoring failed, using fallback: {e}")
        except Exception:
            pass
        return fallback_score

async def compute_leadership_signals_ai(raw_text: str, cohort: str, fallback_score: float) -> float:
    """The regex fallback only credits explicit leadership keywords, a
    'team of X' regex match, and formal seniority titles — someone who
    genuinely led through actions described in narrative language (without
    using the word 'led' or having a manager title) gets penalized unfairly."""
    if not raw_text or len(raw_text.strip()) < 50:
        return fallback_score

    try:
        import anthropic
        import json
        import re as _re


        prompt = f"""You are assessing the LEADERSHIP SIGNALS of a {cohort} based on their profile text. Leadership means: influencing outcomes, driving initiatives, building consensus, or guiding others — NOT just having a management title.

Profile text:
{raw_text[:3000]}

Score their leadership signals from 0-100, where:
- 0-25: Little evidence of influence beyond individual task execution
- 26-50: Some evidence of guiding work or coordinating with others
- 51-75: Clear evidence of driving initiatives, influencing decisions, or leading efforts (with or without formal authority)
- 76-100: Strong, consistent evidence of significant leadership — driving major initiatives, influencing strategy, or leading teams/efforts at scale

Be FAIR — leadership without a formal title (influencing peers, driving cross-functional work, taking ownership of ambiguous problems) is just as real as leadership with a manager title. Judge based on evidence of influence and initiative shown in the text.

Return ONLY valid JSON: {{"score": <int 0-100>, "reasoning": "one sentence why"}}"""

        message = create_message(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = _re.sub(r'^```json\s*', '', content)
        content = _re.sub(r'\s*```$', '', content)
        result = json.loads(content)
        score = result.get("score")

        if isinstance(score, (int, float)) and 0 <= score <= 100:
            return max(round(score), fallback_score)

        return fallback_score
    except Exception as e:
        try:
            from logger import get_logger
            get_logger(__name__).warning(f"AI leadership scoring failed, using fallback: {e}")
        except Exception:
            pass
        return fallback_score

async def compute_technical_depth_ai(raw_text: str, skills: list, cohort: str, fallback_score: float) -> float:
    """The regex fallback rewards skills matching a hardcoded 'high value'
    list and mentions of tier-1 companies — genuinely deep technical work
    using less-hyped technologies, or at a non-famous company, gets
    under-credited despite being just as real."""
    if not raw_text or len(raw_text.strip()) < 50:
        return fallback_score

    try:
        import anthropic
        import json
        import re as _re

        skills_str = ", ".join(skills[:30]) if skills else "Not listed"

        prompt = f"""You are assessing the TECHNICAL DEPTH of a {cohort} based on their profile text and skills. Technical depth means: genuine mastery and hands-on technical capability — NOT brand recognition of tools/companies used.

Skills listed: {skills_str}
Profile text:
{raw_text[:3000]}

Score their technical depth from 0-100, where:
- 0-25: Surface-level technical exposure, mostly non-technical work
- 26-50: Moderate technical involvement, some hands-on depth
- 51-75: Clear technical depth, hands-on ownership of technical work
- 76-100: Deep, demonstrated technical mastery with evidence of architecting, building, or solving genuinely complex technical problems

Be FAIR — deep expertise in less-hyped or niche technologies is just as real as expertise in trendy ones. Judge based on evidence of genuine hands-on depth and complexity of technical problems solved, not which specific tools or companies are name-dropped.

Return ONLY valid JSON: {{"score": <int 0-100>, "reasoning": "one sentence why"}}"""

        message = create_message(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = _re.sub(r'^```json\s*', '', content)
        content = _re.sub(r'\s*```$', '', content)
        result = json.loads(content)
        score = result.get("score")

        if isinstance(score, (int, float)) and 0 <= score <= 100:
            return max(round(score), fallback_score)

        return fallback_score
    except Exception as e:
        try:
            from logger import get_logger
            get_logger(__name__).warning(f"AI technical depth scoring failed, using fallback: {e}")
        except Exception:
            pass
        return fallback_score

async def compute_impact_magnitude_ai(raw_text: str, cohort: str, fallback_score: float) -> float:
    """Reads the user's actual career narrative and assesses impact
    holistically — scope of ownership, scale of outcomes, and evidence of
    real-world effect — rather than only counting regex-matched numbers.
    This catches genuine impact described in narrative language that the
    keyword-based fallback misses entirely, which was producing unfairly
    low, demoralizing scores for users with real accomplishments."""
    if not raw_text or len(raw_text.strip()) < 50:
        return fallback_score

    try:
        import anthropic
        import json
        import re as _re
        from logger import get_logger
        log = get_logger(__name__)


        prompt = f"""You are assessing the career IMPACT of a {cohort} based on their profile text. Impact means: scope of ownership, scale of outcomes, and evidence of real business or technical effect — NOT just whether numbers/percentages are explicitly written.

Profile text:
{raw_text[:3000]}

Score their impact magnitude from 0-100, where:
- 0-25: Minimal evidence of ownership or outcomes, mostly task-execution language
- 26-50: Some ownership of work, outcomes implied but not well-evidenced
- 51-75: Clear ownership of meaningful initiatives, outcomes are evident even if not always quantified
- 76-100: Strong, clear evidence of significant scope, scale, and measurable or clearly substantial outcomes

Be FAIR and GENEROUS in reading intent — if someone describes leading a platform serving thousands of users, or improving a process significantly, that IS impact even without an exact percentage. Do not penalize narrative phrasing just because it lacks a number. Conversely, do not inflate vague claims with no real substance.

Return ONLY valid JSON: {{"score": <int 0-100>, "reasoning": "one sentence why"}}"""

        message = create_message(
            model="claude-haiku-4-5-20251001",
            max_tokens=200,
            messages=[{"role": "user", "content": prompt}]
        )

        content = message.content[0].text.strip()
        content = _re.sub(r'^```json\s*', '', content)
        content = _re.sub(r'\s*```$', '', content)
        result = json.loads(content)
        score = result.get("score")

        if isinstance(score, (int, float)) and 0 <= score <= 100:
            # Take the higher of the two scores — the AI assessment corrects
            # for the regex method's blind spots, never makes things worse
            return max(round(score), fallback_score)

        return fallback_score
    except Exception as e:
        try:
            from logger import get_logger
            get_logger(__name__).warning(f"AI impact scoring failed, using fallback: {e}")
        except Exception:
            pass
        return fallback_score


def compute_leadership_signals(raw_text: str, work_history: list) -> float:
    if not raw_text:
        return 0.0

    text_lower = raw_text.lower()
    leadership_count = sum(1 for w in LEADERSHIP_WORDS if w in text_lower)

    import re
    team_size_match = re.search(r'team of (\d+)', text_lower)
    team_bonus = 0
    if team_size_match:
        size = int(team_size_match.group(1))
        team_bonus = min(size * 2, 20)

    seniority_keywords = ["director", "vp", "head of", "chief", "principal", "staff", "senior manager"]
    seniority_bonus = sum(8 for kw in seniority_keywords if kw in text_lower)
    seniority_bonus = min(seniority_bonus, 30)

    raw = min(leadership_count * 4, 40) + team_bonus + seniority_bonus
    return min(round(raw), 100)


def compute_learning_velocity(raw_text: str, education: list, skills: list) -> float:
    if not raw_text:
        return 0.0

    text_lower = raw_text.lower()
    learning_count = sum(1 for w in LEARNING_WORDS if w in text_lower)

    edu_score = 0
    if education and isinstance(education, list):
        for edu in education:
            if isinstance(edu, dict):
                degree = (edu.get("degree") or "").lower()
                if "m.tech" in degree or "master" in degree or "mba" in degree:
                    edu_score += 15
                elif "b.tech" in degree or "bachelor" in degree:
                    edu_score += 10
                elif "certification" in degree or "professional" in degree:
                    edu_score += 8

    skill_diversity = min(len(skills or []) * 2, 20)

    raw = min(learning_count * 5, 40) + min(edu_score, 30) + skill_diversity
    return min(round(raw), 100)


async def compute_pentagram(profile: dict) -> dict:
    skills = profile.get("extracted_skills") or []
    raw_text = profile.get("raw_profile_text") or ""
    education = profile.get("education_data") or []
    cohort = profile.get("cohort") or "Career Explorer"
    years_exp = profile.get("years_of_experience") or 0
    work_history = []
    if raw_text:
        import re
        roles = re.findall(r'ROLES?:\s*(.*?)(?:\n|SKILLS|EDUCATION|$)', raw_text, re.IGNORECASE | re.DOTALL)
        if roles:
            for role_str in roles[0].split(','):
                role_str = role_str.strip()
                if role_str:
                    work_history.append({"title": role_str, "company": ""})
    if isinstance(skills, list):
        skill_list = []
        for s in skills:
            if isinstance(s, str):
                skill_list.append(s)
            elif isinstance(s, dict):
                skill_list.extend(v for v in s.values() if isinstance(v, str))
        skills = skill_list

    technical_fallback = compute_technical_depth(skills, raw_text, years_exp)
    impact_fallback = compute_impact_magnitude(raw_text)
    domain_fallback = compute_domain_expertise(raw_text, work_history, years_exp)
    learning_fallback = compute_learning_velocity(raw_text, education, skills)
    leadership_fallback = compute_leadership_signals(raw_text, work_history)

    technical_score, impact_score, domain_score, learning_score, leadership_score = await asyncio.gather(
        compute_technical_depth_ai(raw_text, skills, cohort, technical_fallback),
        compute_impact_magnitude_ai(raw_text, cohort, impact_fallback),
        compute_domain_expertise_ai(raw_text, cohort, domain_fallback),
        compute_learning_velocity_ai(raw_text, cohort, learning_fallback),
        compute_leadership_signals_ai(raw_text, cohort, leadership_fallback),
    )

    scores = {
        "technical_depth": technical_score,
        "domain_expertise": domain_score,
        "impact_magnitude": impact_score,
        "leadership_signals": leadership_score,
        "learning_velocity": learning_score,
    }
    weights = COHORT_WEIGHTS.get(cohort, DEFAULT_WEIGHTS)
    weighted = sum(scores[k.replace(" ", "_").replace("-", "_")] * w for k, w in [
        ("technical_depth", weights["technical"]),
        ("domain_expertise", weights["domain"]),
        ("impact_magnitude", weights["impact"]),
        ("leadership_signals", weights["leadership"]),
        ("learning_velocity", weights["learning"]),
    ])
    scores["composite_score"] = min(round(weighted), 100)
    scores["cohort"] = cohort
    scores["weights"] = weights
    return scores


COHORT_AVERAGES = {
    "Technical PM":        {"technical_depth": 62, "domain_expertise": 58, "impact_magnitude": 65, "leadership_signals": 55, "learning_velocity": 60},
    "Data-Oriented PM":    {"technical_depth": 65, "domain_expertise": 60, "impact_magnitude": 68, "leadership_signals": 52, "learning_velocity": 58},
    "Data Scientist":      {"technical_depth": 70, "domain_expertise": 62, "impact_magnitude": 60, "leadership_signals": 45, "learning_velocity": 65},
    "Analytics Engineer":  {"technical_depth": 68, "domain_expertise": 60, "impact_magnitude": 58, "leadership_signals": 42, "learning_velocity": 62},
    "Full-Stack Engineer": {"technical_depth": 72, "domain_expertise": 55, "impact_magnitude": 55, "leadership_signals": 40, "learning_velocity": 60},
    "ML Engineer":         {"technical_depth": 75, "domain_expertise": 58, "impact_magnitude": 58, "leadership_signals": 38, "learning_velocity": 65},
    "Strategy Consultant": {"technical_depth": 40, "domain_expertise": 68, "impact_magnitude": 70, "leadership_signals": 65, "learning_velocity": 55},
    "Career Explorer":     {"technical_depth": 40, "domain_expertise": 38, "impact_magnitude": 35, "leadership_signals": 30, "learning_velocity": 50},
}

TOP_DECILE = {
    "Technical PM":        {"technical_depth": 88, "domain_expertise": 85, "impact_magnitude": 90, "leadership_signals": 82, "learning_velocity": 85},
    "Data-Oriented PM":    {"technical_depth": 88, "domain_expertise": 85, "impact_magnitude": 92, "leadership_signals": 78, "learning_velocity": 82},
    "Data Scientist":      {"technical_depth": 92, "domain_expertise": 85, "impact_magnitude": 85, "leadership_signals": 70, "learning_velocity": 88},
    "Analytics Engineer":  {"technical_depth": 90, "domain_expertise": 84, "impact_magnitude": 80, "leadership_signals": 65, "learning_velocity": 85},
    "Full-Stack Engineer": {"technical_depth": 92, "domain_expertise": 78, "impact_magnitude": 78, "leadership_signals": 65, "learning_velocity": 82},
    "ML Engineer":         {"technical_depth": 95, "domain_expertise": 80, "impact_magnitude": 80, "leadership_signals": 62, "learning_velocity": 88},
    "Strategy Consultant": {"technical_depth": 62, "domain_expertise": 88, "impact_magnitude": 90, "leadership_signals": 88, "learning_velocity": 78},
    "Career Explorer":     {"technical_depth": 65, "domain_expertise": 60, "impact_magnitude": 58, "leadership_signals": 55, "learning_velocity": 72},
}