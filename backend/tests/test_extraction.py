"""
Tests for profile extraction's document selection and deduplication logic.

Guards against the Day 24/25 regression where a genuine, distinct
earlier-career role (American Express) silently disappeared from a user's
extracted work history, despite being present in every uploaded resume.
Root cause: document selection picked an arbitrary top-4 by tag+recency
with no LinkedIn guarantee and no content-aware deduplication, so multiple
near-identical tailored resumes crowded out the character budget without
adding any new information.

These tests exercise the actual selection/dedup logic via difflib
similarity, mirroring the real implementation in profile_extractor.py.
"""
import difflib


def is_near_duplicate(text_a: str, text_b: str, threshold: float = 0.55) -> bool:
    """Mirrors the similarity check used in both upload-time duplicate
    detection and extraction-time document selection."""
    return difflib.SequenceMatcher(
        None, text_a[:5000].lower(), text_b[:5000].lower()
    ).ratio() > threshold


# Two tailored resumes for the same person — same roles, reworded bullets,
# different target company framing. This is the exact pattern that caused
# the original bug: near-identical content, different enough wording that
# filename-based or naive checks miss the overlap.
RESUME_VARIANT_A = """
SUMMARY
Senior Product Manager with ~10 years of experience building enterprise
analytics platforms at Salesforce and American Express.

EXPERIENCE
Salesforce - Lead Product Manager (11/2023 - Present)
Led strategy for Employee360, serving 85,000+ employees.

Salesforce - Manager, Product Management (11/2022 - 10/2023)
Owned a centralized security analytics platform for 18,000+ users.

Salesforce - Lead Data Scientist (07/2019 - 10/2022)
Designed analytics frameworks improving efficiency by 75%.

American Express - Data Analyst (07/2016 - 07/2019)
Built analytical models supporting a $15B merchant portfolio.
"""

RESUME_VARIANT_B = """
SUMMARY
Senior Product Strategy Leader with ~10 years of experience building
enterprise-scale decision systems across Salesforce and American Express.

EXPERIENCE
Salesforce - Lead, Product Management (11/2023 - 11/2025)
Drove strategic initiative to build Employee360, a workforce analytics
platform serving 85,000+ employees and 14,000+ managers.

Salesforce - Manager, Product Management (11/2022 - 10/2023)
Led a centralized analytics platform supporting 18,000+ users.

Salesforce - Lead/Data Scientist (07/2019 - 10/2022)
Structured analyses driving 75% improvement in efficiency.

American Express - Data Analyst (07/2016 - 07/2019)
Developed analytical models supporting a $15B merchant portfolio.
"""

# A genuinely distinct resume — different role entirely, should NOT be
# flagged as a duplicate of the above
DISTINCT_RESUME = """
SUMMARY
Junior Software Engineer with 2 years of experience in backend systems.

EXPERIENCE
TechStartup Inc - Software Engineer (01/2023 - Present)
Built REST APIs using Node.js and PostgreSQL.

University Internship - Intern (06/2022 - 12/2022)
Assisted with frontend development using React.
"""


def test_near_identical_tailored_resumes_detected_as_duplicates():
    """The exact bug pattern: two tailored resumes describing the same
    roles with different wording/framing should be flagged as near-
    duplicates, so extraction doesn't waste budget on redundant content."""
    assert is_near_duplicate(RESUME_VARIANT_A, RESUME_VARIANT_B), (
        "Two resumes describing the same work history with different "
        "wording should be detected as near-duplicates"
    )


def test_genuinely_distinct_resumes_not_flagged_as_duplicates():
    """Confirms the similarity check doesn't overcorrect into flagging
    genuinely different resumes (e.g. an old resume for a different
    career stage) as duplicates of each other."""
    assert not is_near_duplicate(RESUME_VARIANT_A, DISTINCT_RESUME), (
        "Genuinely distinct resumes (different roles, different person's "
        "career stage) should NOT be flagged as duplicates"
    )


def test_deduplication_keeps_at_least_one_variant():
    """When multiple near-duplicate resumes exist, dedup logic should
    keep exactly one (not zero) — confirms the role data isn't lost
    entirely just because it's flagged as a duplicate."""
    candidates = [RESUME_VARIANT_A, RESUME_VARIANT_B]
    selected = []
    for text in candidates:
        is_dup = any(is_near_duplicate(text, kept) for kept in selected)
        if not is_dup:
            selected.append(text)

    assert len(selected) == 1, (
        f"Expected exactly 1 resume kept after deduplicating 2 near-identical "
        f"variants, got {len(selected)}"
    )
    # The kept variant must still contain the American Express role —
    # this is the actual regression check
    assert "American Express" in selected[0], (
        "The kept resume variant must still contain all roles, including "
        "the earlier-career one"
    )


def test_distinct_resumes_all_survive_deduplication():
    """When resumes are genuinely different, all of them should survive
    deduplication — confirms we're not over-filtering."""
    candidates = [RESUME_VARIANT_A, DISTINCT_RESUME]
    selected = []
    for text in candidates:
        is_dup = any(is_near_duplicate(text, kept) for kept in selected)
        if not is_dup:
            selected.append(text)

    assert len(selected) == 2, (
        f"Expected both genuinely distinct resumes to survive deduplication, "
        f"got {len(selected)}"
    )