"""
Shared structured logger for the entire backend.

Replaces ad-hoc print() statements with leveled logging (DEBUG/INFO/WARNING/ERROR)
that writes to both console and a rotating log file. Every router and service
should import get_logger(__name__) instead of using print().

Usage:
    from logger import get_logger
    log = get_logger(__name__)

    log.info("Profile extracted successfully")
    log.warning("Apify limit hit, falling back to company boards")
    log.error("Job match failed", exc_info=True)  # includes traceback automatically
"""

import logging
import os
import sys
from logging.handlers import RotatingFileHandler

LOG_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "logs")
os.makedirs(LOG_DIR, exist_ok=True)
LOG_FILE = os.path.join(LOG_DIR, "career_sage.log")

_FORMAT = "%(asctime)s | %(levelname)-7s | %(name)s | %(message)s"
_DATE_FORMAT = "%Y-%m-%d %H:%M:%S"

_configured = False


def _configure_root():
    global _configured
    if _configured:
        return

    root = logging.getLogger()
    root.setLevel(logging.INFO)

    # Quiet noisy third-party libraries — httpx logs every single HTTP
    # request at INFO level, which would drown out our own application logs
    logging.getLogger("httpx").setLevel(logging.WARNING)
    logging.getLogger("httpcore").setLevel(logging.WARNING)
    logging.getLogger("supabase").setLevel(logging.WARNING)

    formatter = logging.Formatter(_FORMAT, datefmt=_DATE_FORMAT)

    # Console handler — same place print() used to show up
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    root.addHandler(console_handler)

    # File handler — rotates at 5MB, keeps 3 backups, survives even if
    # nobody is watching the terminal live (this was the actual blocker
    # all of today's debugging — every error only existed in a scrollback
    # buffer that could be lost on a terminal restart)
    file_handler = RotatingFileHandler(
        LOG_FILE, maxBytes=5 * 1024 * 1024, backupCount=3, encoding="utf-8"
    )
    file_handler.setFormatter(formatter)
    root.addHandler(file_handler)

    _configured = True


def get_logger(name: str) -> logging.Logger:
    """Get a named logger for a module. Call once per file, e.g.:
    log = get_logger(__name__)"""
    _configure_root()
    return logging.getLogger(name)