from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_tracks():
    return {"message": "tracks router — wired up Day 3"}