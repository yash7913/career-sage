from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client
from dotenv import load_dotenv
load_dotenv()

router = APIRouter()
supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# ── Request models ──────────────────────────────────────────

class ProfileCreateRequest(BaseModel):
    user_id: str
    email: str
    full_name: str = ""

class DocumentSaveRequest(BaseModel):
    user_id: str
    file_name: str
    file_hash: str
    storage_path: str
    doc_tag: str = "RESUME"

class ExtractionRequest(BaseModel):
    user_id: str

# ── Helpers ─────────────────────────────────────────────────

STUDENT_DOMAINS = [".edu", ".ac.in", ".ac.uk", ".edu.au", ".org"]

def detect_tier(email: str) -> str:
    email_lower = email.lower()
    for domain in STUDENT_DOMAINS:
        if email_lower.endswith(domain):
            return "STUDENT_VERIFIED"
    return "GENERAL_FREE"

def get_max_tracks(tier: str) -> int:
    return 999 if tier in ("STUDENT_VERIFIED", "PREMIUM_PRO") else 1

# ── Routes ───────────────────────────────────────────────────

@router.post("/create")
async def create_profile(req: ProfileCreateRequest):
    try:
        existing = supabase.table("user_profiles")\
            .select("user_id")\
            .eq("user_id", req.user_id)\
            .execute()

        if existing.data:
            return {"status": "exists", "profile": existing.data[0]}

        tier = detect_tier(req.email)
        max_tracks = get_max_tracks(tier)

        result = supabase.table("user_profiles").insert({
            "user_id": req.user_id,
            "email": req.email,
            "full_name": req.full_name,
            "tier_status": tier,
            "max_tracks": max_tracks,
        }).execute()

        return {"status": "created", "profile": result.data[0]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/document")
async def save_document(req: DocumentSaveRequest):
    try:
        existing = supabase.table("user_documents")\
            .select("doc_id")\
            .eq("user_id", req.user_id)\
            .eq("file_hash", req.file_hash)\
            .execute()

        if existing.data:
            return {"status": "exists", "doc_id": existing.data[0]["doc_id"]}

        result = supabase.table("user_documents").insert({
            "user_id": req.user_id,
            "file_name": req.file_name,
            "file_hash": req.file_hash,
            "storage_path": req.storage_path,
            "doc_tag": req.doc_tag,
        }).execute()

        return {"status": "saved", "doc_id": result.data[0]["doc_id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extract")
async def extract_profile(req: ExtractionRequest):
    try:
        from services.profile_extractor import extract_and_save_profile
        result = await extract_and_save_profile(req.user_id)
        return {"status": "ok", "profile": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{user_id}")
async def get_profile(user_id: str):
    try:
        result = supabase.table("user_profiles")\
            .select("*")\
            .eq("user_id", user_id)\
            .execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Profile not found")

        return result.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))