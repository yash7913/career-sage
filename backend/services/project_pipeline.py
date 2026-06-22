"""
Staged project extraction pipeline.

Problem: users upload multiple overlapping documents (resume + PRDs + case
studies). A project might be a single bullet line in the resume AND a full
10-page PRD elsewhere. Naive per-document extraction either duplicates the
same project across documents, or fabricates detail for projects that only
have a one-line mention.

Solution — three stages, each with one job:

  Stage 1 (Candidates)  — read every active document, list EVERY project or
                            initiative mentioned, however briefly. Deliberately
                            over-inclusive. No filtering, no enrichment yet.

  Stage 2 (Resolution)  — take the candidate list (titles + one-liners +
                            source doc_ids only, not full text) and cluster
                            candidates that describe the same underlying
                            project. Output: merged list with all source
                            doc_ids per project.

  Stage 3 (Enrichment)  — for each merged project that has a *substantial*
                            source document behind it (a PRD/case study, not
                            just a resume bullet), run a focused synthesis
                            call to produce a real summary/outcomes/tech_stack.
                            Projects with only a one-line mention are saved
                            as-is — never fabricated into something richer
                            than the source material supports.
"""

import os
import json
import re
import difflib
from supabase import create_client
from services.claude_client import create_message
from dotenv import load_dotenv
load_dotenv()

from logger import get_logger
log = get_logger(__name__)

supabase = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)


def _strip_json_fences(raw: str) -> str:
    raw = raw.strip()
    raw = re.sub(r'^```json\s*', '', raw)
    raw = re.sub(r'^```\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return raw.strip()


async def _stage1_extract_candidates(documents: list[dict]) -> list[dict]:
    """Read every active document and list every project/initiative mentioned,
    however briefly. Deliberately over-inclusive — nothing filtered here."""
    from services.profile_extractor import extract_text_from_bytes

    doc_excerpts = []
    for doc in documents:
        try:
            file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
            text = extract_text_from_bytes(file_bytes, doc["file_name"])
            log.info(f"[Pipeline:S1] {doc['file_name']} — extracted {len(text) if text else 0} chars")
            if text:
                # Scale per-doc budget down as document count grows, so total
                # input stays bounded regardless of how many files are uploaded.
                # 19 docs at flat 6000 chars = up to 114K chars before any cap —
                # this keeps the combined prompt sane.
                per_doc_budget = max(1500, 18000 // len(documents))
                doc_excerpts.append({
                    "doc_id": doc["doc_id"],
                    "file_name": doc["file_name"],
                    "text": text[:per_doc_budget],
                })
        except Exception as e:
            log.info(f"[Pipeline:S1] {doc.get('file_name')} FAILED: {e}")
            continue

    log.info(f"[Pipeline:S1] {len(doc_excerpts)}/{len(documents)} docs yielded usable text")

    if not doc_excerpts:
        return []

    combined = "\n\n".join(
        f"=== DOCUMENT [{d['doc_id']}] {d['file_name']} ===\n{d['text']}"
        for d in doc_excerpts
    )

    prompt = f"""List EVERY distinct project, initiative, or piece of work mentioned anywhere in these documents — however briefly. A single resume bullet counts. A full PRD counts. Do not skip anything, even minor mentions.

{combined[:20000]}

Return ONLY a valid JSON array. For each project/initiative found:
[
  {{
    "title": "Short name as mentioned in the source",
    "one_liner": "One sentence describing it, using only what's stated in the source",
    "source_doc_id": "the doc_id in brackets where this was found",
    "depth": "brief" | "substantial"
  }}
]

Rules:
- "brief" = mentioned in a sentence or bullet point only, no real detail
- "substantial" = has a dedicated section, paragraph, or whole document describing it
- Include EVERY project mentioned, do not filter or judge importance
- Do not merge similar-sounding projects yet — list each mention separately, even if you suspect they're the same project
- Return ONLY the JSON array, no markdown"""

    message = create_message(
        model="claude-haiku-4-5-20251001",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = _strip_json_fences(message.content[0].text)
    log.info(f"[Pipeline:S1] Claude response length: {len(raw)} chars, stop_reason: {message.stop_reason}")

    try:
        candidates = json.loads(raw)
        return candidates if isinstance(candidates, list) else []
    except json.JSONDecodeError:
        # Response may be truncated mid-array (hit max_tokens) — recover whatever
        # complete objects exist rather than discarding everything.
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if match:
            try:
                candidates = json.loads(match.group())
                return candidates if isinstance(candidates, list) else []
            except json.JSONDecodeError:
                pass

        # Last resort: extract individual complete {...} objects even without
        # a closing bracket, in case the array itself got cut off.
        recovered = []
        for obj_match in re.finditer(r'\{[^{}]*\}', raw):
            try:
                obj = json.loads(obj_match.group())
                recovered.append(obj)
            except json.JSONDecodeError:
                continue
        log.info(f"[Pipeline:S1] Recovered {len(recovered)} complete objects from truncated response")
        return recovered


async def _stage2_resolve_duplicates(candidates: list[dict]) -> list[dict]:
    """Cluster candidates that describe the same underlying project across
    different documents. Input is small (titles + one-liners only) — cheap and fast."""
    if not candidates:
        return []

    if len(candidates) == 1:
        c = candidates[0]
        return [{
            "title": c.get("title", "Untitled project"),
            "one_liner": c.get("one_liner", ""),
            "source_doc_ids": [c.get("source_doc_id")] if c.get("source_doc_id") else [],
            "max_depth": c.get("depth", "brief"),
        }]

    candidate_list = json.dumps([
        {"idx": i, "title": c.get("title"), "one_liner": c.get("one_liner"),
         "source_doc_id": c.get("source_doc_id"), "depth": c.get("depth")}
        for i, c in enumerate(candidates)
    ], indent=2)

    prompt = f"""These are project mentions extracted from multiple documents belonging to the same person. Some entries describe the SAME underlying project (just mentioned in different documents, or at different levels of detail). Cluster them.

Candidates:
{candidate_list}

Return ONLY a valid JSON array of merged/resolved projects:
[
  {{
    "title": "Best/clearest title for this project",
    "one_liner": "Best one-line description, combining info if helpful",
    "source_indices": [0, 2],
    "max_depth": "brief" | "substantial"
  }}
]

Rules:
- Group candidate indices that clearly describe the same real-world project or initiative
- "max_depth" = "substantial" if ANY of the merged candidates was "substantial"
- Distinct projects must stay separate — only merge when you're confident they're the same thing
- Every input index must appear in exactly one output group
- Return ONLY the JSON array, no markdown"""

    message = create_message(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}]
    )

    raw = _strip_json_fences(message.content[0].text)
    match = re.search(r'\[.*\]', raw, re.DOTALL)
    if not match:
        # Fallback — treat every candidate as its own project, no merging
        return [{
            "title": c.get("title", "Untitled project"),
            "one_liner": c.get("one_liner", ""),
            "source_doc_ids": [c.get("source_doc_id")] if c.get("source_doc_id") else [],
            "max_depth": c.get("depth", "brief"),
        } for c in candidates]

    try:
        groups = json.loads(match.group())
    except json.JSONDecodeError:
        groups = []

    resolved = []
    seen_indices = set()
    for g in groups:
        indices = g.get("source_indices", [])
        source_doc_ids = []
        for i in indices:
            seen_indices.add(i)
            if 0 <= i < len(candidates):
                doc_id = candidates[i].get("source_doc_id")
                if doc_id and doc_id not in source_doc_ids:
                    source_doc_ids.append(doc_id)
        resolved.append({
            "title": g.get("title", "Untitled project"),
            "one_liner": g.get("one_liner", ""),
            "source_doc_ids": source_doc_ids,
            "max_depth": g.get("max_depth", "brief"),
        })

    # Safety net — any candidate the model didn't place into a group still gets included
    for i, c in enumerate(candidates):
        if i not in seen_indices:
            resolved.append({
                "title": c.get("title", "Untitled project"),
                "one_liner": c.get("one_liner", ""),
                "source_doc_ids": [c.get("source_doc_id")] if c.get("source_doc_id") else [],
                "max_depth": c.get("depth", "brief"),
            })

    return resolved


async def _stage3_enrich_and_save(user_id: str, resolved_projects: list[dict], documents: list[dict]):
    """For projects with substantial source material, run focused synthesis.
    For brief mentions, save as-is — never fabricate detail beyond the source."""
    from services.profile_extractor import extract_text_from_bytes

    doc_lookup = {d["doc_id"]: d for d in documents}

    existing = supabase.table("user_projects").select("title, doc_ids").eq("user_id", user_id).execute()
    existing_titles = [(p["title"], p.get("doc_ids") or []) for p in (existing.data or [])]

    for proj in resolved_projects:
        title = proj.get("title", "Untitled project").strip()
        if not title:
            continue

        # Skip if a very similar project already exists for this user
        is_duplicate = False
        for existing_title, _ in existing_titles:
            if difflib.SequenceMatcher(None, title.lower(), existing_title.lower()).ratio() > 0.6:
                is_duplicate = True
                break
        if is_duplicate:
            continue

        source_doc_ids = proj.get("source_doc_ids", [])
        max_depth = proj.get("max_depth", "brief")

        if max_depth == "substantial" and source_doc_ids:
            # Real source material exists — enrich with a focused synthesis call
            doc_text = ""
            for doc_id in source_doc_ids[:2]:  # cap at 2 source docs for this call
                doc = doc_lookup.get(doc_id)
                if not doc:
                    continue
                try:
                    file_bytes = supabase.storage.from_("user-documents").download(doc["storage_path"])
                    text = extract_text_from_bytes(file_bytes, doc["file_name"])
                    if text:
                        doc_text += f"\n\n--- {doc['file_name']} ---\n{text[:6000]}"
                except Exception:
                    continue

            if doc_text:
                try:
                    message = create_message(
                        model="claude-haiku-4-5-20251001",
                        max_tokens=400,
                        messages=[{"role": "user", "content": f"""Write a professional project summary based ONLY on this source material. Do not add detail that isn't supported by the text.

Project: {title}
Source:{doc_text}

Return ONLY valid JSON:
{{
  "summary": "2-3 sentence summary of what was built and the impact, using only facts present in the source",
  "outcomes": "Measurable outcomes mentioned in the source, or null if none stated",
  "tech_stack": ["tech mentioned in source"]
}}"""}]
                    )
                    raw = _strip_json_fences(message.content[0].text)
                    result = json.loads(raw)

                    supabase.table("user_projects").insert({
                        "user_id": user_id,
                        "title": title,
                        "synthesized_summary": result.get("summary"),
                        "outcomes": result.get("outcomes"),
                        "tech_stack": result.get("tech_stack") or [],
                        "doc_ids": source_doc_ids,
                    }).execute()
                    existing_titles.append((title, source_doc_ids))
                    continue
                except Exception:
                    pass  # fall through to brief save below

        # Brief mention or enrichment failed — save the fact as-is, no fabrication
        supabase.table("user_projects").insert({
            "user_id": user_id,
            "title": title,
            "description": proj.get("one_liner") or None,
            "doc_ids": source_doc_ids,
        }).execute()
        existing_titles.append((title, source_doc_ids))


async def run_project_pipeline(user_id: str, documents: list[dict]):
    """Entry point — runs all three stages."""
    if not documents:
        log.info("[Pipeline] No documents provided")
        return

    log.info(f"[Pipeline] Stage 1 — extracting candidates from {len(documents)} docs")
    candidates = await _stage1_extract_candidates(documents)
    log.info(f"[Pipeline] Stage 1 found {len(candidates)} candidates: {[c.get('title') for c in candidates]}")
    if not candidates:
        log.info("[Pipeline] No candidates found, stopping")
        return

    log.info(f"[Pipeline] Stage 2 — resolving duplicates")
    resolved = await _stage2_resolve_duplicates(candidates)
    log.info(f"[Pipeline] Stage 2 resolved to {len(resolved)} projects: {[r.get('title') for r in resolved]}")
    if not resolved:
        log.info("[Pipeline] No resolved projects, stopping")
        return

    log.info(f"[Pipeline] Stage 3 — enriching and saving")
    await _stage3_enrich_and_save(user_id, resolved, documents)
    log.info(f"[Pipeline] Stage 3 complete")