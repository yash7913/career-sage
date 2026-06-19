from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import asyncio

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

class MarketScrapeRequest(BaseModel):
    market: str  # "US" | "UK" | "SG"

@router.post("/trigger-market")
async def trigger_market_scrape(req: MarketScrapeRequest, background_tasks: BackgroundTasks):
    from services.scraper_service import run_market_scrape
    if req.market not in ("US", "UK", "SG"):
        raise HTTPException(status_code=400, detail="market must be one of US, UK, SG")
    background_tasks.add_task(run_market_scrape, req.market)
    return {
        "status": "started",
        "message": f"{req.market} scraping started in background. Check aggregated_jobs in a few minutes.",
        "market": req.market,
    }

@router.post("/trigger-all-markets")
async def trigger_all_markets(background_tasks: BackgroundTasks):
    from services.scraper_service import run_all_markets_scrape
    background_tasks.add_task(run_all_markets_scrape)
    return {
        "status": "started",
        "message": "Scraping all markets (India, US, UK, SG) in background. This takes several minutes.",
    }

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

@router.post("/embed-jobs")
async def embed_jobs_endpoint():
    try:
        from services.embedding import embed_all_jobs
        result = await asyncio.to_thread(embed_all_jobs)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))