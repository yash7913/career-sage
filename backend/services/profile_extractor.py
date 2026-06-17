import os
import json
import io
import re
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
import anthropic
from services.prompt_loader import load_prompt

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


def extract_text_from_bytes(file_bytes: bytes, file_name: str) -> str:
    if file_name.endswith(".pdf"):
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as e:
            print(f"PDF error: {e}")
            return ""
    if file_name.endswith(".docx"):
        try:
            from docx import Document
            doc = Document(io.BytesIO(file_bytes))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip()).strip()
        except Exception as e:
            print(f"DOCX error: {e}")
            return ""
    try:
        return file_bytes.decode("utf-8", errors="ignore").strip()
    except Exception:
        return ""

def flatten_skills(skills_data) -> list:
    if isinstance(skills_data, list):
        flat = skills_data
    elif isinstance(skills_data, dict):
        flat = []
        for v in skills_data.values():
            if isinstance(v, list):
                flat.extend(v)
    else:
        return []

    seen = set()
    deduped = []
    for skill in flat:
        if isinstance(skill, str) and skill.strip():
            key = skill.lower().strip()
            if key not in seen:
                seen.add(key)
                deduped.append(skill.strip())
    return deduped


def calculate_completeness(extracted: dict, doc_count: int) -> int:
    score = 0
    flat_skills = flatten_skills(extracted.get("extracted_skills", {}))
    if len(flat_skills) >= 5:
        score += 30
    if extracted.get("education_data") and len(extracted["education_data"]) > 0:
        score += 20
    if extracted.get("extracted_summary") and len(extracted["extracted_summary"]) > 50:
        score += 20
    if extracted.get("years_of_experience") and extracted["years_of_experience"] > 0:
        score += 15
    if extracted.get("raw_profile_text") and len(extracted["raw_profile_text"]) > 100:
        score += 5
    if doc_count >= 2:
        score += 10
    return min(score, 100)


async def extract_and_save_profile(user_id: str) -> dict:
    docs = supabase.table("user_documents").select("*").eq("user_id", user_id).eq("is_active", True).execute()

    if not docs.data:
        raise ValueError("No documents found for this user")

    all_text = ""
    for doc in docs.data:
        try:
            file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            if text:
                all_text += f"\n\n--- {doc['file_name']} ({doc['doc_tag']}) ---\n{text}"
                print(f"Extracted {len(text)} chars from {doc['file_name']}")
        except Exception as e:
            print(f"Failed to process {doc['file_name']}: {e}")
            continue

    if not all_text.strip():
        raise ValueError("Could not extract text from any uploaded documents")

    prompt = load_prompt("profile_extraction.txt", documents_text=all_text[:14000])
    print(f"Sending {len(prompt)} chars to Claude...")

    message = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    print(f"Claude response preview: {raw[:200]}")

    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
    raw = raw.strip()

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)

    try:
        extracted = json.loads(raw)
        print(f"Parsed JSON keys: {list(extracted.keys())}")
    except json.JSONDecodeError as e:
        print(f"JSON error: {e} | Raw: {raw[:300]}")
        raise ValueError(f"Claude returned invalid JSON: {e}")

    flat_skills = flatten_skills(extracted.get("extracted_skills", {}))
    completeness = calculate_completeness(extracted, len(docs.data))
    print(f"Skills found: {len(flat_skills)} | Completeness: {completeness}%")

    from services.cohort_classifier import classify_cohort
    cohort = classify_cohort(
        extracted_skills=flat_skills,
        raw_profile_text=extracted.get("raw_profile_text", ""),
        work_history=extracted.get("work_history", []),
        years_of_experience=extracted.get("years_of_experience", 0),
    )
    print(f"Cohort classified as: {cohort}")

    import datetime
    current_year = datetime.datetime.now().year
    years_of_experience = 0
    if extracted.get("education_data"):
        earliest_grad = min(
            (e.get("graduation_year") or current_year
             for e in extracted.get("education_data", [])
             if isinstance(e, dict) and e.get("graduation_year")),
            default=current_year
        )
        years_of_experience = max(0, current_year - earliest_grad)

    update_data = {
        "extracted_skills": flat_skills,
        "education_data": extracted.get("education_data", []),
        "extracted_summary": extracted.get("extracted_summary", ""),
        "raw_profile_text": extracted.get("raw_profile_text", ""),
        "profile_completeness_score": completeness,
        "cohort": cohort,
        "years_of_experience": years_of_experience,
    }

    # Only update linkedin_url if found in resume — don't overwrite manually entered one
    linkedin_url = extracted.get("linkedin_url")
    if linkedin_url and "linkedin.com/in/" in linkedin_url:
        update_data["linkedin_url"] = linkedin_url
        print(f"LinkedIn URL extracted: {linkedin_url}")

    supabase.table("user_profiles").update(update_data).eq("user_id", user_id).execute()

    print("Profile saved to Supabase successfully")

    return {
        "extracted_skills": flat_skills,
        "education_data": extracted.get("education_data", []),
        "extracted_summary": extracted.get("extracted_summary", ""),
        "years_of_experience": extracted.get("years_of_experience", 0),
        "raw_profile_text": extracted.get("raw_profile_text", ""),
        "profile_completeness_score": completeness,
    }