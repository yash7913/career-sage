"""
Shared Claude API wrapper with automatic retry/backoff.

Problem: every Claude call in the codebase is a single attempt — a transient
rate limit, timeout, or network blip means a hard failure for the user, even
though the same call would likely succeed seconds later. None of today's
bugs were caused by this directly, but it's the kind of failure mode that
becomes increasingly common as usage grows (more concurrent users hitting
Claude's API = more rate-limit collisions).

Usage:
    from services.claude_client import create_message

    message = create_message(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}],
    )
"""

import os
import time
import anthropic
from logger import get_logger

log = get_logger(__name__)

_client = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

MAX_RETRIES = 3
BASE_DELAY_SECONDS = 1.5

RETRYABLE_ERRORS = (
    anthropic.RateLimitError,
    anthropic.APIConnectionError,
    anthropic.APITimeoutError,
    anthropic.InternalServerError,
)


def create_message(**kwargs):
    """Drop-in replacement for client.messages.create(**kwargs) with
    automatic retry on transient failures (rate limits, timeouts, network
    errors, 5xx). Does NOT retry on errors that won't be fixed by retrying
    (bad request, auth failure, etc) — those fail immediately."""
    last_error = None

    for attempt in range(1, MAX_RETRIES + 1):
        try:
            return _client.messages.create(**kwargs)
        except RETRYABLE_ERRORS as e:
            last_error = e
            if attempt == MAX_RETRIES:
                log.error(f"Claude call failed after {MAX_RETRIES} attempts: {e}")
                raise
            delay = BASE_DELAY_SECONDS * (2 ** (attempt - 1))  # 1.5s, 3s, 6s
            log.warning(f"Claude call attempt {attempt}/{MAX_RETRIES} failed ({type(e).__name__}), retrying in {delay}s")
            time.sleep(delay)
        except Exception:
            # Non-retryable error (bad request, auth, etc) — fail immediately
            raise

    raise last_error