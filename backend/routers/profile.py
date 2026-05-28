from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_profile():
    return {"message": "profile router — wired up Day 3"}