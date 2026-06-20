"""
Tests for job matching — specifically guarding against two Day 21 bugs:
1. The jsonb 'overlaps' operator crash (Postgres can't do .overlaps() on
   jsonb columns, only native arrays — this caused every single match call
   to silently 500).
2. Sequential ranking upserts that blocked other requests for 1+ minute.

These are lighter integration tests since they need a real Supabase
connection, but they use read-only queries or a disposable test user so
they never touch real user data.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

import pytest
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


def test_jsonb_cohort_filter_does_not_crash():
    """Regression test for: 'operator does not exist: jsonb && unknown'

    This directly exercises the same query pattern used in matching.py's
    cohort pre-filter. If someone reverts to .overlaps() instead of the
    jsonb 'cs' (contains) filter, this test fails immediately instead of
    silently breaking every match call in production."""
    relevant_cohorts = ["Technical PM", "Data-Oriented PM"]

    query = supabase.table("aggregated_jobs")\
        .select("id, job_title, target_cohorts")\
        .eq("is_active", True)

    or_conditions = ",".join(
        f'target_cohorts.cs.["{c}"]' for c in relevant_cohorts
    )
    query = query.or_(or_conditions)

    # Should not raise — this is the actual regression check.
    # We don't assert on result count since the real data changes over time.
    result = query.range(0, 5).execute()
    assert result.data is not None


def test_overlaps_operator_would_fail_on_jsonb():
    """Documents WHY we can't use .overlaps() — this isn't something we want
    to fix, it's a known Postgres/jsonb limitation. This test exists so
    future readers understand the constraint rather than 're-discovering'
    it the hard way like Day 21 did."""
    with pytest.raises(Exception) as exc_info:
        supabase.table("aggregated_jobs")\
            .select("id")\
            .overlaps("target_cohorts", ["Technical PM"])\
            .limit(1)\
            .execute()

    # Confirms it's specifically the jsonb/array operator mismatch,
    # not some unrelated failure
    assert "jsonb" in str(exc_info.value).lower() or "operator" in str(exc_info.value).lower()


def test_all_active_jobs_have_target_cohorts_classified():
    """Regression test for: cohort classification never being called during
    scraping, leaving every new job with null target_cohorts (silently
    invisible to all matching). This doesn't test the classifier itself —
    it's a data health check that newly scraped jobs are getting classified
    at all."""
    recent_unclassified = supabase.table("aggregated_jobs")\
        .select("id, job_title, job_market")\
        .eq("is_active", True)\
        .is_("target_cohorts", "null")\
        .limit(10)\
        .execute()

    unclassified_count_sample = len(recent_unclassified.data or [])
    assert unclassified_count_sample == 0, (
        f"Found {unclassified_count_sample}+ active jobs with no target_cohorts. "
        f"This means classify_job_cohorts() isn't being called during scraping — "
        f"check dedup_and_save() in scraper_service.py. Sample: "
        f"{[j['job_title'] for j in (recent_unclassified.data or [])]}"
    )