from apscheduler.schedulers.background import BackgroundScheduler
import logging

logger = logging.getLogger(__name__)
scheduler = BackgroundScheduler()

def run_scraper_job():
    logger.info("12-hour scraper cycle starting...")

def start_scheduler():
    scheduler.add_job(
        run_scraper_job,
        trigger="interval",
        hours=12,
        id="scraper_cycle",
        replace_existing=True
    )
    scheduler.start()
    logger.info("Scheduler started — scraper runs every 12 hours")