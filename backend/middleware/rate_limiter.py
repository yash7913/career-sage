from fastapi import HTTPException
from supabase import create_client
import os
import time
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)
FREE_TIER_LIMITS = {
    "resume_generation": 3,
    "star_stories": 2,
    "offer_analysis": 3,
    "career_decision": 6,
    "ask_career_sage": 15,
    "synthesize_project": 10,
    "generate_asset": 10,
}

# In-memory spam guard — caps rapid-fire calls within a short window,
# independent of tier or monthly quota. Resets on backend restart, which
# is acceptable since this guards against burst abuse, not long-term quota.
_recent_calls: dict[str, list[float]] = {}
SPAM_WINDOW_SECONDS = 60
SPAM_MAX_CALLS_PER_WINDOW = 8


def check_spam_guard(user_id: str, action: str):
    """Blocks rapid-fire calls regardless of tier — even Pro users shouldn't
    be able to hammer an AI endpoint 50 times in a minute."""
    key = f"{user_id}:{action}"
    now = time.time()
    calls = _recent_calls.get(key, [])
    calls = [t for t in calls if now - t < SPAM_WINDOW_SECONDS]

    if len(calls) >= SPAM_MAX_CALLS_PER_WINDOW:
        raise HTTPException(
            status_code=429,
            detail={
                "error": "rate_limited",
                "message": "You're sending requests too quickly. Please wait a moment and try again.",
            }
        )

    calls.append(now)
    _recent_calls[key] = calls

async def check_generation_limit(user_id: str, action: str = "resume_generation"):
    """
    Check if a free tier user has exceeded their monthly generation limit.
    Pro and Academic users are unlimited on quota, but everyone is subject
    to the spam guard regardless of tier.
    """
    check_spam_guard(user_id, action)
    try:
        profile = supabase.table("user_profiles").select(
            "tier_status, generation_count"
        ).eq("user_id", user_id).execute()

        if not profile.data:
            return  # No profile — let it through, will fail later

        p       = profile.data[0]
        tier    = p.get("tier_status", "GENERAL_FREE")
        count   = p.get("generation_count") or 0
        limit   = FREE_TIER_LIMITS.get(action, 3)

        # Pro and Academic users — no limit
        if tier in ("PREMIUM_PRO", "STUDENT_VERIFIED"):
            return

        if count >= limit:
            raise HTTPException(
                status_code=429,
                detail={
                    "error": "generation_limit_reached",
                    "message": f"You've used all {limit} free {action.replace('_', ' ')}s this month.",
                    "limit": limit,
                    "used": count,
                    "upgrade_prompt": "Upgrade to Pro for unlimited access.",
                }
            )
    except HTTPException:
        raise
    except Exception:
        return  # Don't block on errors — fail open


async def increment_generation_count(user_id: str):
    """
    Increment the generation count for a user after a successful generation.
    """
    try:
        profile = supabase.table("user_profiles").select(
            "generation_count"
        ).eq("user_id", user_id).execute()

        current = profile.data[0].get("generation_count") or 0 if profile.data else 0

        supabase.table("user_profiles").update({
            "generation_count": current + 1
        }).eq("user_id", user_id).execute()
    except Exception:
        pass  # Don't fail the request if count increment fails