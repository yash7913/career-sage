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

    # Document selection strategy:
    # 1. ALWAYS include the LinkedIn export if one exists — it's typically
    #    the single most complete record of work history, since tailored
    #    resumes often trim older/less-relevant roles to fit a page limit.
    # 2. Among RESUME docs, filter out near-duplicates by content similarity
    #    (not just tag+recency) — multiple tailored resume variants for
    #    different job applications often describe the SAME roles with
    #    different wording. Sending 4 near-identical resumes wastes the
    #    character budget on redundant content instead of genuinely
    #    distinct information, which is exactly what caused an entire
    #    earlier-career role (American Express) to go missing despite
    #    being present in every uploaded resume.
    # 3. With duplicates filtered, widen the pool — more genuinely distinct
    #    documents can now fit before hitting the character budget.
    import difflib

    relevant_docs = [
        d for d in docs.data
        if d.get("doc_tag") in ("RESUME", "LINKEDIN_EXPORT", "OTHER", "CERTIFICATION")
    ]

    linkedin_docs = [d for d in relevant_docs if d.get("doc_tag") == "LINKEDIN_EXPORT"]
    resume_docs = [d for d in relevant_docs if d.get("doc_tag") == "RESUME"]
    other_docs = [d for d in relevant_docs if d.get("doc_tag") not in ("LINKEDIN_EXPORT", "RESUME")]

    # Most recent LinkedIn export first (guaranteed inclusion)
    linkedin_docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    linkedin_docs = linkedin_docs[:1]

    # Most recent resumes first, as tiebreak ordering before similarity filtering
    resume_docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)

    # Filter near-duplicate resumes by content — keep the first (most
    # recent) of each cluster of similar resumes, skip near-duplicates
    selected_resumes = []
    resume_texts = []
    for doc in resume_docs:
        if len(selected_resumes) >= 5:  # cap distinct resumes considered
            break
        try:
            file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            if not text or len(text.strip()) < 100:
                continue

            is_duplicate = False
            for existing_text in resume_texts:
                score = difflib.SequenceMatcher(None, text[:5000].lower(), existing_text[:5000].lower()).ratio()
                if score > 0.55:
                    is_duplicate = True
                    break

            if not is_duplicate:
                selected_resumes.append((doc, text))
                resume_texts.append(text)
        except Exception as e:
            print(f"[Extraction] Failed to process {doc.get('file_name')}: {e}")
            continue

    other_docs.sort(key=lambda d: d.get("created_at", ""), reverse=True)
    other_docs = other_docs[:2]

    all_text = ""
    doc_names_used = []

    for doc in linkedin_docs:
        try:
            file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            if text:
                print(f"[Extraction] Using LinkedIn export: {doc['file_name']} — {len(text)} chars available, sending {min(len(text), 8000)}")
                all_text += f"\n\n--- {doc['file_name']} (LINKEDIN_EXPORT) ---\n{text[:8000]}"
                doc_names_used.append(doc['file_name'])
        except Exception as e:
            print(f"[Extraction] Failed to process LinkedIn export {doc.get('file_name')}: {e}")

    for doc, text in selected_resumes:
        print(f"[Extraction] Using distinct resume: {doc['file_name']} — {len(text)} chars available, sending {min(len(text), 7000)}")
        all_text += f"\n\n--- {doc['file_name']} (RESUME) ---\n{text[:7000]}"
        doc_names_used.append(doc['file_name'])

    for doc in other_docs:
        try:
            file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            if text:
                print(f"[Extraction] Using doc: {doc['file_name']} ({doc['doc_tag']}) — {len(text)} chars available, sending {min(len(text), 5000)}")
                all_text += f"\n\n--- {doc['file_name']} ({doc['doc_tag']}) ---\n{text[:5000]}"
                doc_names_used.append(doc['file_name'])
        except Exception as e:
            print(f"[Extraction] Failed to process {doc.get('file_name')}: {e}")

    print(f"[Extraction] Final selection — {len(doc_names_used)} distinct docs: {doc_names_used}")

    if not all_text.strip():
        raise ValueError("Could not extract text from any uploaded documents")

    # Budget: 1 LinkedIn (8000) + up to 5 distinct resumes (7000 each = 35000)
    # + 2 other docs (5000 each = 10000) = up to 53000 max. Raised the final
    # cap accordingly so distinct content from multiple genuinely different
    # resumes isn't re-truncated after already being deduplicated above.
    prompt = load_prompt("profile_extraction.txt", documents_text=all_text[:45000])
    print(f"Sending {len(prompt)} chars to Claude...")

    message = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    print(f"[Extraction] Claude response: {len(raw)} chars, stop_reason: {message.stop_reason}")

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

    # Run staged project extraction pipeline (candidates → resolution → enrichment)
    try:
        from services.project_pipeline import run_project_pipeline
        print(f"[Pipeline] Starting with {len(docs.data)} documents")
        await run_project_pipeline(user_id, docs.data)
        print(f"[Pipeline] Completed")
    except Exception as proj_err:
        import traceback
        print(f"[Pipeline] FAILED: {proj_err}")
        traceback.print_exc()

    return {
        "extracted_skills": flat_skills,
        "education_data": extracted.get("education_data", []),
        "extracted_summary": extracted.get("extracted_summary", ""),
        "years_of_experience": extracted.get("years_of_experience", 0),
        "raw_profile_text": extracted.get("raw_profile_text", ""),
        "profile_completeness_score": completeness,
    }

