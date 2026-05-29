from dotenv import load_dotenv
load_dotenv()

import os
from supabase import create_client

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

STUDENT_DOMAINS = [".edu", ".ac.in", ".ac.uk", ".edu.au"]

def detect_tier(email: str) -> str:
    email_lower = email.lower()
    for domain in STUDENT_DOMAINS:
        if email_lower.endswith(domain):
            return "STUDENT_VERIFIED"
    return "GENERAL_FREE"

def get_max_tracks(tier: str) -> int:
    return 999 if tier in ("STUDENT_VERIFIED", "PREMIUM_PRO") else 1

async def create_user_profile(user_id: str, email: str, full_name: str):
    existing = supabase.table("user_profiles")\
        .select("user_id")\
        .eq("user_id", user_id)\
        .execute()

    if existing.data:
        return existing.data[0]

    tier = detect_tier(email)
    max_tracks = get_max_tracks(tier)

    result = supabase.table("user_profiles").insert({
        "user_id": user_id,
        "email": email,
        "full_name": full_name,
        "tier_status": tier,
        "max_tracks": max_tracks,
    }).execute()

    return result.data[0] if result.data else None