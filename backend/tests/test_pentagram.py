"""
Tests for pentagram scoring — guards against the Day 24 regression where
all five axes used brittle regex/keyword matching that systematically
under-credited genuine career achievements not phrased in exact pattern-
matched language (e.g. impact described narratively without a %, or
expertise/leadership not tied to a hardcoded company/keyword list).

These tests use real profile text with genuine signals of impact, domain
depth, leadership, and learning that deliberately AVOID the regex
fallback's exact trigger patterns, to confirm the AI-assisted scoring
actually corrects for what the regex method misses — not just that the
function runs without crashing.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
import asyncio
from dotenv import load_dotenv
load_dotenv()

from services.pentagram import (
    compute_pentagram,
    compute_impact_magnitude,
    compute_domain_expertise,
    compute_leadership_signals,
    compute_learning_velocity,
    compute_technical_depth,
)


# A profile with genuine, substantial impact/leadership/expertise, but
# deliberately written in narrative language that avoids regex trigger
# words and patterns (no explicit %, no "led a team of X", no tier-1
# company names, no formal degree keywords).
NARRATIVE_PROFILE_TEXT = """
ROLES: Senior Product Manager at Meridian Health Analytics (2021-Present), Product Manager at Meridian Health Analytics (2019-2021)
SKILLS: SQL, Python, Stakeholder Management, Product Strategy, A/B Testing, Data Analysis

I own the end-to-end strategy for our care coordination platform, which
clinical teams across several regional hospital networks now rely on daily
to manage patient handoffs. When I joined, handoff errors were a recurring
source of clinician frustration and patient risk; I redesigned the
workflow from the ground up, working closely with nursing staff to
understand the real failure points rather than assuming I knew the
answer. The result has fundamentally changed how shifts transition
patients, and clinical leadership now cites the platform as a model for
other initiatives.

I also took it upon myself to mentor two newer product managers who
joined the team, walking them through how to run effective discovery
sessions and how to push back constructively when engineering estimates
felt off. Neither of them reported to me formally, but both have told me
it shaped how they approach their own work now.

Outside of my core role, I noticed our internal data infrastructure was
becoming a bottleneck for every team, not just mine, so I spent several
months self-teaching myself enough about our data pipeline architecture
to propose and prototype a restructuring that the platform team
eventually adopted company-wide.
"""

WEAK_PROFILE_TEXT = """
ROLES: Junior Analyst at Local Retail Co (2024-Present)
SKILLS: Excel

Responsible for data entry and basic reporting tasks. Attend team
meetings and update spreadsheets as needed.
"""


def test_regex_fallback_undercredits_narrative_impact():
    """Confirms the OLD regex-only method really does score this kind of
    narrative low — this is the documented bug, not a fix. If this test
    ever fails, it means the regex fallback itself changed behavior,
    which is fine, but the AI correction tests below are what actually
    matter for user-facing correctness."""
    score = compute_impact_magnitude(NARRATIVE_PROFILE_TEXT)
    assert score < 50, (
        f"Expected the regex fallback to under-score genuine narrative "
        f"impact (this documents the known limitation), got {score}"
    )


@pytest.mark.asyncio
async def test_ai_assisted_scoring_corrects_narrative_impact():
    """The actual regression guard: compute_pentagram (which uses the
    AI-assisted path) must score genuine narrative impact meaningfully
    higher than the regex-only fallback would, for a profile with real,
    substantial signals of impact/leadership/domain depth."""
    profile = {
        "extracted_skills": ["SQL", "Python", "Stakeholder Management", "Product Strategy", "A/B Testing", "Data Analysis"],
        "raw_profile_text": NARRATIVE_PROFILE_TEXT,
        "education_data": [],
        "cohort": "Data-Oriented PM",
        "years_of_experience": 6,
    }

    scores = await compute_pentagram(profile)

    regex_impact = compute_impact_magnitude(NARRATIVE_PROFILE_TEXT)
    regex_leadership = compute_leadership_signals(NARRATIVE_PROFILE_TEXT, [])
    regex_domain = compute_domain_expertise(NARRATIVE_PROFILE_TEXT, [], 6)

    assert scores["impact_magnitude"] >= regex_impact, (
        f"AI-assisted impact score ({scores['impact_magnitude']}) should never "
        f"be lower than the regex fallback ({regex_impact})"
    )
    assert scores["leadership_signals"] >= regex_leadership, (
        f"AI-assisted leadership score ({scores['leadership_signals']}) should never "
        f"be lower than the regex fallback ({regex_leadership})"
    )
    assert scores["domain_expertise"] >= regex_domain, (
        f"AI-assisted domain score ({scores['domain_expertise']}) should never "
        f"be lower than the regex fallback ({regex_domain})"
    )

    # This is the real regression check — genuine narrative impact should
    # score reasonably, not near-zero like the Day 24 bug produced
    assert scores["impact_magnitude"] >= 40, (
        f"Genuine narrative impact (clear ownership, real outcomes, "
        f"cross-functional influence) scored too low: {scores['impact_magnitude']}. "
        f"This is the exact failure mode the Day 24 fix was meant to correct."
    )
    assert scores["leadership_signals"] >= 40, (
        f"Genuine informal leadership (mentoring without formal authority) "
        f"scored too low: {scores['leadership_signals']}"
    )


@pytest.mark.asyncio
async def test_ai_scoring_never_inflates_genuinely_weak_profiles():
    """The fix should correct for the regex method's blind spots, but
    should NOT inflate profiles that genuinely lack substance — confirms
    we didn't overcorrect into giving everyone artificially high scores."""
    profile = {
        "extracted_skills": ["Excel"],
        "raw_profile_text": WEAK_PROFILE_TEXT,
        "education_data": [],
        "cohort": "Analytics Engineer",
        "years_of_experience": 0,
    }

    scores = await compute_pentagram(profile)

    assert scores["impact_magnitude"] < 50, (
        f"A genuinely thin profile (data entry, no ownership, no outcomes) "
        f"scored too high on impact: {scores['impact_magnitude']} — "
        f"suggests the AI correction is overcorrecting rather than being fair"
    )
    assert scores["leadership_signals"] < 50, (
        f"A genuinely thin profile with no leadership evidence scored too "
        f"high: {scores['leadership_signals']}"
    )


@pytest.mark.asyncio
async def test_pentagram_returns_all_five_axes():
    """Basic structural guard — every axis must always be present, even
    if individual AI calls fail and fall back to the regex score."""
    profile = {
        "extracted_skills": ["Python", "SQL"],
        "raw_profile_text": NARRATIVE_PROFILE_TEXT,
        "education_data": [],
        "cohort": "Data-Oriented PM",
        "years_of_experience": 6,
    }

    scores = await compute_pentagram(profile)

    for axis in ["technical_depth", "domain_expertise", "impact_magnitude", "leadership_signals", "learning_velocity"]:
        assert axis in scores, f"Missing axis: {axis}"
        assert 0 <= scores[axis] <= 100, f"{axis} score out of range: {scores[axis]}"

    assert "composite_score" in scores
    assert 0 <= scores["composite_score"] <= 100


def test_empty_profile_returns_zero_scores():
    """Empty profile should return 0s immediately without attempting any
    AI calls — pure fallback path, no async needed."""
    score = compute_impact_magnitude("")
    assert score == 0.0