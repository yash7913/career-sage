from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List

router = APIRouter()

class ScrapeRequest(BaseModel):
    keywords: Optional[List[str]] = None
    location: str = "India"

@router.post("/trigger")
async def trigger_scrape(req: ScrapeRequest, background_tasks: BackgroundTasks):
    from services.scraper_service import run_full_scrape
    background_tasks.add_task(run_full_scrape, req.keywords, req.location)
    return {
        "status": "started",
        "message": "Scraping started in background. Check aggregated_jobs in 2-3 minutes.",
        "keywords": req.keywords,
        "location": req.location,
    }

@router.post("/trigger-sync")
async def trigger_scrape_sync(req: ScrapeRequest):
    try:
        from services.scraper_service import run_full_scrape
        result = await run_full_scrape(req.keywords, req.location)
        return {"status": "complete", "result": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/status")
async def scraper_status():
    from supabase import create_client
    import os
    from dotenv import load_dotenv
    load_dotenv()
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
    total = sb.table("aggregated_jobs").select("id", count="exact").eq("is_active", True).execute()
    return {
        "status": "ok",
        "active_jobs": total.count,
    }