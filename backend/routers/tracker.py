from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_tracker():
    return {"message": "tracker router — wired up Day 7"}