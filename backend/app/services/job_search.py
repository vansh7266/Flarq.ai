from __future__ import annotations

import asyncio
from typing import Any

import structlog

from app.core.config import get_settings
from app.services.gemini.embeddings import generate_embedding, generate_query_embedding
from app.services.mongodb.mcp_client import FlarqMCPClient, utcnow

logger = structlog.get_logger(__name__)


async def save_job_description(
    mcp: FlarqMCPClient,
    user_id: str,
    raw_text: str,
    analysis: dict[str, Any],
) -> str:
    now = utcnow()
    document: dict[str, Any] = {
        "user_id": user_id,
        "raw_text": raw_text,
        "analysis": analysis,
        "requirements": raw_text[:50_000],
        "created_at": now,
        "updated_at": now,
    }
    if get_settings().jobs_vector_index.strip():
        try:
            async with asyncio.timeout(10):
                document["embedding"] = await generate_embedding(raw_text)
        except Exception as exc:
            # Saving the analysis should still work during an embedding outage.
            logger.warning("job_embedding_unavailable", error_type=type(exc).__name__)
    return await mcp.insert_one("job_descriptions", document)


async def search_job_descriptions(
    mcp: FlarqMCPClient, user_id: str, query: object
) -> dict[str, Any]:
    index_name = get_settings().jobs_vector_index.strip()
    if not index_name:
        return {"ok": False, "error": "Saved job search is disabled."}
    if not isinstance(query, str) or not query.strip() or len(query) > 1000:
        return {"ok": False, "error": "Enter a search query of 1 to 1,000 characters."}

    try:
        async with asyncio.timeout(10):
            query_vector = await generate_query_embedding(query.strip())
        documents = await mcp.vector_search(
            "job_descriptions", query_vector, index_name, 5, user_id=user_id
        )
    except Exception as exc:
        logger.warning("saved_job_search_unavailable", error_type=type(exc).__name__)
        return {"ok": False, "error": "Saved job search is temporarily unavailable."}

    matches = []
    for document in documents:
        if document.get("user_id") != user_id or "_id" not in document:
            continue
        analysis = document.get("analysis")
        if not isinstance(analysis, dict):
            analysis = {}
        matches.append(
            {
                "job_description_id": str(document["_id"]),
                "title": str(analysis.get("job_title") or document.get("title") or "")[:200],
                "company": str(analysis.get("company_name") or document.get("company") or "")[:200],
                "excerpt": str(document.get("raw_text") or "")[:1200],
            }
        )
    return {"ok": True, "matches": matches}
