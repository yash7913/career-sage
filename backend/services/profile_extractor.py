import os
import json
import io
from dotenv import load_dotenv
load_dotenv()

from supabase import create_client
import anthropic

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)
claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

def extract_text_from_bytes(file_bytes: bytes, file_name: str) -> str:
    try:
        if file_name.endswith(".pdf"):
            try:
                import pypdf
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text = "\n".join(
                    page.extract_text() or "" for page in reader.pages
                )
                return text.strip()
            except Exception as e:
                print(f"PDF extraction error: {e}")
                return ""

        if file_name.endswith(".docx"):
            try:
                from docx import Document
                doc = Document(io.BytesIO(file_bytes))
                text = "\n".join(p.text for p in doc.paragraphs if p.text.strip())
                return text.strip()
            except Exception as e:
                print(f"DOCX extraction error: {e}")
                return ""

        try:
            return file_bytes.decode("utf-8", errors="ignore").strip()
        except Exception:
            return ""

    except Exception as e:
        print(f"Text extraction failed for {file_name}: {e}")
        return ""


def calculate_completeness(extracted: dict, doc_count: int) -> int:
    score = 0
    if extracted.get("extracted_skills") and len(extracted["extracted_skills"]) >= 5:
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
    docs = supabase.table("user_documents")\
        .select("*")\
        .eq("user_id", user_id)\
        .eq("is_active", True)\
        .execute()

    if not docs.data:
        raise ValueError("No documents found for this user")

    all_text = ""
    for doc in docs.data:
        try:
            file_bytes = supabase.storage\
                .from_("user-documents")\
                .download(doc["storage_path"])

            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            if text:
                all_text += f"\n\n--- {doc['file_name']} ({doc['doc_tag']}) ---\n{text}"
                print(f"Extracted {len(text)} chars from {doc['file_name']}")
        except Exception as e:
            print(f"Failed to process {doc['file_name']}: {e}")
            continue

    if not all_text.strip():
        raise ValueError("Could not extract text from any uploaded documents")

    from services.prompt_loader import load_prompt
    prompt = load_prompt(
        "profile_extraction.txt",
        documents_text=all_text[:14000]
    )

    print(f"Sending {len(prompt)} chars to Claude for extraction...")

    message = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        extracted = json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"JSON parse error: {e}\nRaw response: {raw[:500]}")
        raise ValueError(f"Claude returned invalid JSON: {e}")

    completeness = calculate_completeness(extracted, len(docs.data))

    supabase.table("user_profiles").update({
        "extracted_skills": extracted.get("extracted_skills", []),
        "education_data": extracted.get("education_data", []),
        "extracted_summary": extracted.get("extracted_summary", ""),
        "raw_profile_text": extracted.get("raw_profile_text", ""),
        "profile_completeness_score": completeness,
    }).eq("user_id", user_id).execute()

    print(f"Profile saved. Completeness: {completeness}%")

    return {
        **extracted,
        "profile_completeness_score": completeness,
    }