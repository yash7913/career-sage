import os
import re
import json
import httpx
from bs4 import BeautifulSoup
from dotenv import load_dotenv
load_dotenv()

import anthropic

claude = anthropic.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))


async def fetch_url_content(url: str) -> str:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                return ""
            soup = BeautifulSoup(res.text, "html.parser")
            for tag in soup(["script", "style", "nav", "header", "footer"]):
                tag.decompose()
            text = soup.get_text(separator="\n", strip=True)
            return text[:8000]
    except Exception as e:
        print(f"URL fetch error: {e}")
        return ""


async def parse_job_with_claude(raw_text: str, source_url: str = "") -> dict:
    prompt = f"""Extract job details from this text and return a JSON object.

TEXT:
{raw_text[:6000]}

Return ONLY a JSON object with these exact fields:
{{
  "job_title": "exact job title",
  "company_name": "company name",
  "location": "location or Remote",
  "job_description": "full job description cleaned up, max 2000 chars",
  "skills_needed": ["skill1", "skill2"],
  "employment_type": "full-time or contract or part-time"
}}

Rules:
- Extract only what is explicitly stated
- skills_needed: list of technical and soft skills mentioned
- If company name not found use Unknown
- Return ONLY the JSON object, no preamble, no markdown fences
"""

    message = claude.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = message.content[0].text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw, flags=re.MULTILINE)
    raw = re.sub(r'\s*```$', '', raw, flags=re.MULTILINE)
    raw = raw.strip()

    json_match = re.search(r'\{.*\}', raw, re.DOTALL)
    if json_match:
        raw = json_match.group(0)

    parsed = json.loads(raw)
    parsed["source_link"] = source_url
    return parsed


async def parse_job_input(text_or_url: str) -> dict:
    is_url = text_or_url.strip().startswith("http")

    if is_url:
        print(f"Fetching URL: {text_or_url}")
        raw_text = await fetch_url_content(text_or_url)
        if not raw_text:
            raise ValueError("Could not fetch content from that URL. Try pasting the job description directly.")
        return await parse_job_with_claude(raw_text, source_url=text_or_url)
    else:
        print("Parsing pasted job description")
        return await parse_job_with_claude(text_or_url, source_url="")