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

    # Prioritise: best resume first, then other resumes, skip projects/slides
    # This keeps the prompt focused and fast
    priority_order = {"RESUME": 0, "LINKEDIN_EXPORT": 1, "OTHER": 2, "CERTIFICATION": 3}
    relevant_docs = [
        d for d in docs.data
        if d.get("doc_tag") in ("RESUME", "LINKEDIN_EXPORT", "OTHER", "CERTIFICATION")
    ]
    relevant_docs.sort(key=lambda d: priority_order.get(d.get("doc_tag"), 99))

    # Only process up to 3 documents — beyond that adds noise not signal
    relevant_docs = relevant_docs[:3]

    all_text = ""
    for doc in relevant_docs:
        try:
            file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            if text:
                # Cap each doc at 4000 chars to keep total under 12000
                all_text += f"\n\n--- {doc['file_name']} ({doc['doc_tag']}) ---\n{text[:4000]}"
        except Exception as e:
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

    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
    raw = raw.strip()

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)

    try:
        extracted = json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Claude returned invalid JSON: {e}")

    flat_skills = flatten_skills(extracted.get("extracted_skills", {}))
    completeness = calculate_completeness(extracted, len(docs.data))

    from services.cohort_classifier import classify_cohort
    cohort = classify_cohort(
        extracted_skills=flat_skills,
        raw_profile_text=extracted.get("raw_profile_text", ""),
        work_history=extracted.get("work_history", []),
        years_of_experience=extracted.get("years_of_experience", 0),
    )
    

    import datetime
    current_year = datetime.datetime.now().year

    # Calculate years of experience from work history (most accurate)
    work_history = extracted.get("work_history", [])
    years_of_experience = 0
    current_role_title   = ""
    current_company_name = ""

    if work_history:
        # Sort by start_date descending to find most recent role
        def parse_year(date_str):
            if not date_str:
                return 0
            try:
                return int(str(date_str)[:4])
            except:
                return 0

        sorted_history = sorted(
            [w for w in work_history if isinstance(w, dict)],
            key=lambda w: parse_year(w.get("start_date")),
            reverse=True
        )

        # Most recent role = first after sorting by start_date desc
        if sorted_history:
            most_recent = sorted_history[0]
            current_role_title   = most_recent.get("title") or ""
            current_company_name = most_recent.get("company") or ""

        # Years of experience = current year - earliest start date
        earliest_year = None
        for w in work_history:
            yr = parse_year(w.get("start_date"))
            if yr > 1990:  # sanity check
                if earliest_year is None or yr < earliest_year:
                    earliest_year = yr

        if earliest_year:
            years_of_experience = max(0, current_year - earliest_year)
        else:
            # Fallback to graduation year
            if extracted.get("education_data"):
                earliest_grad = min(
                    (e.get("graduation_year") or current_year
                     for e in extracted.get("education_data", [])
                     if isinstance(e, dict) and e.get("graduation_year")),
                    default=current_year
                )
                years_of_experience = max(0, current_year - earliest_grad)
    else:
        # No work history — fallback to graduation year
        if extracted.get("education_data"):
            earliest_grad = min(
                (e.get("graduation_year") or current_year
                 for e in extracted.get("education_data", [])
                 if isinstance(e, dict) and e.get("graduation_year")),
                default=current_year
            )
            years_of_experience = max(0, current_year - earliest_grad)

    

    # Derive seniority from years of experience + extracted title signals
    raw_seniority = extracted.get("seniority_level", "mid")
    
    # Override with years-based logic for accuracy
    if years_of_experience >= 15:
        seniority = "director"
    elif years_of_experience >= 12:
        seniority = "senior_manager"
    elif years_of_experience >= 9:
        seniority = "senior"
    elif years_of_experience >= 6:
        seniority = "senior"
    elif years_of_experience >= 3:
        seniority = "mid"
    elif years_of_experience >= 1:
        seniority = "junior"
    else:
        seniority = "intern"

    # If Claude detected lead/manager/director signals, trust that over years
    if raw_seniority in ("lead", "manager", "senior_manager", "director", "vp", "c-suite"):
        seniority = raw_seniority

    update_data = {
        "extracted_skills":          flat_skills,
        "education_data":            extracted.get("education_data", []),
        "extracted_summary":         extracted.get("extracted_summary", ""),
        "raw_profile_text":          extracted.get("raw_profile_text", ""),
        "profile_completeness_score": completeness,
        "cohort":                    cohort,
        "years_of_experience":       years_of_experience,
        "seniority_level":           seniority,
    }

    # Save current role and company if found
    if current_role_title:
        update_data["current_company"] = current_company_name
    if extracted.get("phone"):
        update_data["phone"] = extracted.get("phone")

    # Only update linkedin_url if found in resume — don't overwrite manually entered one
    linkedin_url = extracted.get("linkedin_url")
    if linkedin_url and "linkedin.com/in/" in linkedin_url:
        update_data["linkedin_url"] = linkedin_url

    supabase.table("user_profiles").update(update_data).eq("user_id", user_id).execute()

    print("Profile saved to Supabase successfully")

    # Auto-extract projects mentioned in resume
    try:
        project_prompt = f"""Extract distinct projects or major initiatives mentioned in this resume text.
For each project return a JSON array:
[
  {{
    "title": "Short project name",
    "description": "What was built or done",
    "outcomes": "Measurable impact or result if mentioned",
    "tech_stack": ["tech1", "tech2"]
  }}
]
Only include substantial projects — not routine tasks. Max 5 projects.
Return ONLY valid JSON array, nothing else.

Resume text:
{all_text[:6000]}"""

        proj_message = claude.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=800,
            messages=[{"role": "user", "content": project_prompt}]
        )

        proj_raw = proj_message.content[0].text.strip()
        proj_raw = proj_raw.replace('```json', '').replace('```', '').strip()
        projects = json.loads(proj_raw)

        if isinstance(projects, list):
            # Get existing project titles to avoid duplicates
            existing = supabase.table("user_projects").select("title").eq(
                "user_id", user_id
            ).execute()
            existing_titles = {p["title"].lower() for p in (existing.data or [])}

            for proj in projects[:5]:
                title = proj.get("title", "").strip()
                if not title or title.lower() in existing_titles:
                    continue
                supabase.table("user_projects").insert({
                    "user_id":     user_id,
                    "title":       title,
                    "description": proj.get("description"),
                    "outcomes":    proj.get("outcomes"),
                    "tech_stack":  proj.get("tech_stack") or [],
                    "include_in_resume": True,
                }).execute()
                existing_titles.add(title.lower())
    except Exception as proj_err:
        pass  # Never block profile extraction due to project extraction failure

    return {
        "extracted_skills": flat_skills,
        "education_data": extracted.get("education_data", []),
        "extracted_summary": extracted.get("extracted_summary", ""),
        "years_of_experience": extracted.get("years_of_experience", 0),
        "raw_profile_text": extracted.get("raw_profile_text", ""),
        "profile_completeness_score": completeness,
    }

