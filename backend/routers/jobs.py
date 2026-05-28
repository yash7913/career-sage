from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_jobs():
    return {"message": "jobs router — wired up Day 4"}