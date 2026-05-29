from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.tier_service import create_user_profile

router = APIRouter()

class ProfileCreateRequest(BaseModel):
    user_id: str
    email: str
    full_name: str = ""

@router.post("/create")
async def create_profile(req: ProfileCreateRequest):
    try:
        profile = await create_user_profile(
            user_id=req.user_id,
            email=req.email,
            full_name=req.full_name
        )
        return {"status": "ok", "profile": profile}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{user_id}")
async def get_profile(user_id: str):
    from dotenv import load_dotenv
    load_dotenv()
    import os
    from supabase import create_client
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    result = sb.table("user_profiles").select("*").eq("user_id", user_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return result.data[0]