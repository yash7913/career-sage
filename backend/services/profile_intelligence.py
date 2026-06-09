from typing import List, Dict

HIDDEN_STRENGTH_PATTERNS = [
    {
        "strength": "People Leadership",
        "evidence_keywords": ["team of", "managed", "mentored", "coached", "hired", "reports to", "direct reports", "built a team"],
        "suggested_skill": "Team Leadership",
        "description": "Your work history shows evidence of leading and managing people.",
    },
    {
        "strength": "Executive Communication",
        "evidence_keywords": ["vp", "director", "executive", "c-suite", "board", "stakeholder", "presented to", "briefed"],
        "suggested_skill": "Executive Stakeholder Management",
        "description": "You have demonstrated experience communicating with senior leadership.",
    },
    {
        "strength": "Large Scale Systems",
        "evidence_keywords": ["million", "billion", "lakh", "crore", "enterprise", "18,000", "85,000", "100,000", "global"],
        "suggested_skill": "Enterprise Scale Operations",
        "description": "Your impact has operated at enterprise or large-scale levels.",
    },
    {
        "strength": "Data-Driven Decision Making",
        "evidence_keywords": ["hypothesis", "experiment", "a/b test", "cohort", "funnel", "metric", "kpi", "okr", "dashboard"],
        "suggested_skill": "Data-Driven Product Management",
        "description": "You consistently use data to inform decisions and measure outcomes.",
    },
    {
        "strength": "Cross-functional Influence",
        "evidence_keywords": ["cross-functional", "partnered with", "collaborated with", "aligned", "engineering", "design", "marketing", "sales"],
        "suggested_skill": "Cross-functional Leadership",
        "description": "Your work history shows consistent cross-functional collaboration and influence.",
    },
    {
        "strength": "Risk & Compliance Domain",
        "evidence_keywords": ["risk", "compliance", "audit", "regulatory", "security", "fraud", "anomaly", "threat"],
        "suggested_skill": "Risk Management",
        "description": "You have deep domain expertise in risk, security, or compliance contexts.",
    },
    {
        "strength": "Process Improvement",
        "evidence_keywords": ["improved", "reduced", "optimised", "streamlined", "automated", "efficiency", "time saving", "cost reduction"],
        "suggested_skill": "Process Optimization",
        "description": "You have a strong track record of measurably improving processes and systems.",
    },
    {
        "strength": "Product Analytics",
        "evidence_keywords": ["funnel", "retention", "engagement", "conversion", "cohort analysis", "user behavior", "segmentation"],
        "suggested_skill": "Product Analytics",
        "description": "Your work shows deep product analytics and user behavior analysis skills.",
    },
    {
        "strength": "Technical Depth",
        "evidence_keywords": ["python", "sql", "spark", "hive", "distributed", "infrastructure", "architecture", "api", "pipeline"],
        "suggested_skill": "Technical Product Management",
        "description": "You have hands-on technical skills that enable deeper engineering partnerships.",
    },
    {
        "strength": "Mentorship & Talent Development",
        "evidence_keywords": ["mentored", "coached", "trained", "onboarded", "developed", "grew", "upskilled"],
        "suggested_skill": "Talent Development",
        "description": "You have demonstrated experience developing and mentoring others.",
    },
]


def identify_hidden_strengths(
    raw_profile_text: str,
    extracted_skills: List[str],
) -> List[Dict]:
    if not raw_profile_text:
        return []

    text_lower = raw_profile_text.lower()
    skill_lower = {s.lower() for s in (extracted_skills or [])}
    found = []

    for pattern in HIDDEN_STRENGTH_PATTERNS:
        evidence_count = sum(
            1 for kw in pattern["evidence_keywords"]
            if kw in text_lower
        )

        if evidence_count < 2:
            continue

        already_listed = pattern["suggested_skill"].lower() in skill_lower
        if already_listed:
            continue

        evidence_snippets = []
        for kw in pattern["evidence_keywords"]:
            idx = text_lower.find(kw)
            if idx != -1:
                start = max(0, idx - 40)
                end = min(len(raw_profile_text), idx + 80)
                snippet = raw_profile_text[start:end].strip()
                if snippet:
                    evidence_snippets.append(f"...{snippet}...")
                    break

        found.append({
            "strength": pattern["strength"],
            "suggested_skill": pattern["suggested_skill"],
            "description": pattern["description"],
            "evidence": evidence_snippets[0] if evidence_snippets else "",
            "evidence_count": evidence_count,
        })

    found.sort(key=lambda x: x["evidence_count"], reverse=True)
    return found[:5]


def generate_experience_translation(
    raw_profile_text: str,
    cohort: str,
    target_track: str,
    trajectory: str,
) -> List[str]:
    translations = []

    if not raw_profile_text:
        return translations

    text_lower = raw_profile_text.lower()

    DOMAIN_BRIDGES = {
        "security_to_pm": {
            "trigger": ["security", "risk", "threat", "vulnerability", "incident"],
            "target": ["product manager", "pm"],
            "bridges": [
                "Security analytics experience maps directly to risk product management — you've built the systems that PMs now need to understand.",
                "Incident response and threat modeling translates to crisis product management and reliability engineering partnerships.",
                "Your security stakeholder work (briefing VPs, executives) is identical to the stakeholder management PMs do daily.",
            ]
        },
        "data_to_pm": {
            "trigger": ["data scientist", "analyst", "machine learning", "model"],
            "target": ["product manager", "pm", "growth"],
            "bridges": [
                "Data science experience is a superpower for PM roles — you can write your own success metrics, design your own experiments, and validate your own hypotheses.",
                "Building ML models gives you credibility with engineering teams that most PMs lack — you understand the technical debt and build vs buy tradeoffs.",
                "Your analytics background means you can be the PM who never needs to wait for a data analyst — you are the data analyst.",
            ]
        },
        "consulting_to_pm": {
            "trigger": ["consultant", "consulting", "strategy", "mckinsey", "bcg", "bain"],
            "target": ["product manager", "pm"],
            "bridges": [
                "Consulting storytelling and slide-writing is exactly the skill needed for PM executive presentations and product reviews.",
                "Client management in consulting is stakeholder management in product — same skill, different context.",
                "Strategy frameworks from consulting (market sizing, competitive analysis, business case) are directly applicable to product strategy.",
            ]
        },
    }

    for bridge_key, bridge_data in DOMAIN_BRIDGES.items():
        has_trigger = any(t in text_lower for t in bridge_data["trigger"])
        has_target = any(t in (cohort or "").lower() or t in (target_track or "").lower()
                        for t in bridge_data["target"])

        if has_trigger and has_target:
            translations.extend(bridge_data["bridges"][:2])

    if trajectory == "Pivoting" and not translations:
        translations = [
            f"Your {cohort} background gives you a unique perspective that most {target_track} candidates lack.",
            "Career switchers often outperform specialists because they bring cross-domain pattern recognition.",
            "Focus your narrative on the transferable skills: leadership, stakeholder management, data-driven decisions.",
        ]

    return translations[:3]