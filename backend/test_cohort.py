import os
from dotenv import load_dotenv
load_dotenv()
from supabase import create_client
from services.cohort_classifier import classify_cohort

sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))

profile = sb.table("user_profiles").select("*").eq("user_id", "6c839014-f58a-42a0-810d-0a8a5c267ac1").execute()
p = profile.data[0]

cohort = classify_cohort(
    extracted_skills=p.get("extracted_skills", []),
    raw_profile_text=p.get("raw_profile_text", ""),
    work_history=[],
    years_of_experience=9,
)
print(f"Cohort: {cohort}")

sb.table("user_profiles").update({"cohort": cohort}).eq("user_id", "6c839014-f58a-42a0-810d-0a8a5c267ac1").execute()
print("Saved to Supabase")