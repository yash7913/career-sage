from fastapi import APIRouter
router = APIRouter()

@router.get("/")
def get_scraper():
    return {"message": "scraper router — wired up Day 4"}