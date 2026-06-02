from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import notifications
from routers import tracker
from dotenv import load_dotenv
import os

load_dotenv()

from routers import jobs, profile, generate, tracker, scraper, tracks
from scheduler import start_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    start_scheduler()
    yield

app = FastAPI(
    title="Career Sage API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        os.getenv("FRONTEND_URL", "http://localhost:3000"),
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(jobs.router,     prefix="/api/jobs",     tags=["jobs"])
app.include_router(profile.router,  prefix="/api/profile",  tags=["profile"])
app.include_router(generate.router, prefix="/api/generate", tags=["generate"])
app.include_router(tracker.router,  prefix="/api/tracker",  tags=["tracker"])
app.include_router(tracker.router,  prefix="/api/tracker",  tags=["tracker"])
app.include_router(tracks.router,   prefix="/api/tracks",   tags=["tracks"])
app.include_router(scraper.router,  prefix="/api/scraper",  tags=["scraper"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["notifications"])


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "career-sage-api",
        "environment": os.getenv("ENVIRONMENT", "development")
    }