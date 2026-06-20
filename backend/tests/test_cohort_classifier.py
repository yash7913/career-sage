"""
Tests for cohort classification — specifically guarding against the
"Business Analyst" misclassification bug found on Day 21, where the
classifier was weighting all career history equally instead of prioritizing
the user's current/most recent role title.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from services.cohort_classifier import classify_cohort


def test_current_role_weighted_over_history():
    """A user whose CURRENT role is Lead PM but whose career started as a
    Business Data Analyst should classify based on the current role, not
    get dragged toward 'Business Analyst' by older history."""
    work_history = [
        {"title": "Lead, Product Management - Data Platform", "company": "Salesforce"},
        {"title": "Data Product Manager", "company": "Salesforce"},
        {"title": "Business Data Analyst", "company": "Salesforce"},
    ]
    raw_text = (
        "ROLES: Lead, Product Management - Data Platform at Salesforce (2023-Present), "
        "Data Product Manager at Salesforce (2021-2023), "
        "Business Data Analyst at Salesforce (2019-2021)\n"
        "SKILLS: SQL, Python, Tableau, Product Strategy, Stakeholder Management, "
        "Roadmap Planning, A/B Testing, Analytics"
    )
    skills = ["SQL", "Python", "Tableau", "Product Strategy", "A/B Testing", "Analytics"]

    cohort = classify_cohort(
        extracted_skills=skills,
        raw_profile_text=raw_text,
        work_history=work_history,
        years_of_experience=7,
    )

    assert cohort != "Business Analyst", (
        f"Regression: classifier returned 'Business Analyst' for a user whose "
        f"CURRENT role is a PM title. Got: {cohort}"
    )
    assert "PM" in cohort or "Product" in cohort, (
        f"Expected a Product Management cohort given current title, got: {cohort}"
    )


def test_current_role_weighted_via_raw_text_fallback():
    """Same scenario but without work_history passed (falls back to parsing
    the ROLES line in raw_profile_text) — this is the path that's actually
    used during LinkedIn PDF import."""
    raw_text = (
        "ROLES: Lead Product Manager at Salesforce, Data Product Manager at Salesforce, "
        "Business Data Analyst at Salesforce\n"
        "SKILLS: SQL, Python, Tableau, Product Strategy, A/B Testing, Analytics, Data"
    )
    skills = ["SQL", "Python", "Tableau", "Product Strategy", "A/B Testing", "Analytics"]

    cohort = classify_cohort(
        extracted_skills=skills,
        raw_profile_text=raw_text,
        work_history=[],
        years_of_experience=7,
    )

    assert cohort != "Business Analyst", (
        f"Regression: classifier fell back to 'Business Analyst' when work_history "
        f"was empty, even though raw_profile_text's first ROLES entry is a PM title. "
        f"Got: {cohort}"
    )


def test_genuine_business_analyst_still_classifies_correctly():
    """A user who genuinely IS a Business Analyst (current role, not historical)
    should still classify as Business Analyst — the fix shouldn't break the
    correct case while fixing the regression case."""
    work_history = [
        {"title": "Business Analyst", "company": "TCS"},
        {"title": "Junior Analyst", "company": "TCS"},
    ]
    raw_text = (
        "ROLES: Business Analyst at TCS, Junior Analyst at TCS\n"
        "SKILLS: SQL, Excel, Requirements Gathering, Stakeholder Management, "
        "Business Intelligence, Process Mapping"
    )
    skills = ["SQL", "Excel", "Requirements Gathering", "Stakeholder Management", "Business Intelligence"]

    cohort = classify_cohort(
        extracted_skills=skills,
        raw_profile_text=raw_text,
        work_history=work_history,
        years_of_experience=3,
    )

    assert cohort == "Business Analyst", (
        f"Expected genuine Business Analyst to classify correctly, got: {cohort}"
    )


def test_empty_profile_returns_career_explorer():
    """No skills, no text — should gracefully return the fallback cohort,
    not crash or return None."""
    cohort = classify_cohort(
        extracted_skills=[],
        raw_profile_text="",
        work_history=[],
        years_of_experience=0,
    )
    assert cohort == "Career Explorer"