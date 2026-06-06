STAGE_SIGNALS = {
    "seed": [
        "seed", "pre-seed", "stealth", "early stage", "founding",
        "series a", "series-a", "just raised", "recently funded"
    ],
    "growth": [
        "series b", "series-b", "series c", "series-c", "series d",
        "growth stage", "scaling", "hypergrowth", "series e"
    ],
    "late": [
        "series f", "series g", "pre-ipo", "ipo", "unicorn",
        "late stage", "public company", "nasdaq", "nyse", "bse", "nse"
    ],
    "enterprise": [
        "fortune 500", "fortune500", "enterprise", "global company",
        "multinational", "established", "publicly traded"
    ],
}

KNOWN_COMPANIES = {
    # Enterprise / Public
    "salesforce": "enterprise", "american express": "enterprise",
    "google": "enterprise", "microsoft": "enterprise", "amazon": "enterprise",
    "meta": "enterprise", "apple": "enterprise", "netflix": "enterprise",
    "stripe": "late", "airbnb": "late", "uber": "late", "lyft": "late",
    # Growth stage India
    "cred": "growth", "zepto": "growth", "swiggy": "growth",
    "razorpay": "growth", "meesho": "growth", "groww": "growth",
    "phonepe": "growth", "slice": "growth", "jupiter": "growth",
    # Late / Enterprise India
    "flipkart": "late", "paytm": "late", "zomato": "late", "nykaa": "late",
    "infosys": "enterprise", "wipro": "enterprise", "tcs": "enterprise",
    "hcl": "enterprise", "cognizant": "enterprise",
    # Known seed/early
    "anthropic": "growth", "figma": "late",
}

IMPACT_PATTERN_MAP = {
    "Builder": ["seed", "growth"],
    "Scaler": ["growth", "late"],
    "Optimizer": ["late", "enterprise"],
    "Strategist": ["late", "enterprise"],
    "Fixer": ["growth", "late"],
}

def classify_company_stage(company_name: str, job_description: str = "") -> str:
    name_lower = company_name.lower().strip()
    for known, stage in KNOWN_COMPANIES.items():
        if known in name_lower:
            return stage

    desc_lower = (job_description or "").lower()
    for stage, signals in STAGE_SIGNALS.items():
        if any(s in desc_lower for s in signals):
            return stage

    return "growth"


def get_impact_pattern(raw_profile_text: str) -> str:
    text = (raw_profile_text or "").lower()
    scores = {
        "Builder": sum(1 for w in ["built", "launched", "created", "founded", "started", "greenfield", "0 to 1"] if w in text),
        "Scaler": sum(1 for w in ["scaled", "grew", "expanded", "10x", "hypergrowth", "series b", "series c"] if w in text),
        "Optimizer": sum(1 for w in ["optimised", "improved", "reduced", "efficiency", "cost", "streamlined"] if w in text),
        "Fixer": sum(1 for w in ["turnaround", "restructured", "transformed", "overhauled", "rescued"] if w in text),
        "Strategist": sum(1 for w in ["strategy", "roadmap", "vision", "direction", "led", "drove"] if w in text),
    }
    return max(scores, key=lambda k: scores[k])


def stage_fit_score(company_stage: str, impact_pattern: str) -> float:
    preferred_stages = IMPACT_PATTERN_MAP.get(impact_pattern, ["growth"])
    if company_stage in preferred_stages:
        return 1.0
    stage_order = ["seed", "growth", "late", "enterprise"]
    try:
        company_idx = stage_order.index(company_stage)
        preferred_idxs = [stage_order.index(s) for s in preferred_stages if s in stage_order]
        min_dist = min(abs(company_idx - idx) for idx in preferred_idxs)
        return max(0.5, 1.0 - (min_dist * 0.25))
    except ValueError:
        return 0.75