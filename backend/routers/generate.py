from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_generate():
    return {"message": "generate router — wired up Day 6"}