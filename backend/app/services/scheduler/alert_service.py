"""Stale application checks and follow-up generation (FlarqMCPClient + Gemini)."""

from __future__ import annotations

from typing import Any

from app.services.applications.application_service import ApplicationService
from app.services.gemini.follow_up_email import generate_follow_up_email as gemini_follow_up
from app.services.mongodb.mcp_client import FlarqMCPClient


async def check_stale_applications(mcp: FlarqMCPClient, user_id: str) -> list[dict[str, Any]]:
    svc = ApplicationService(mcp)
    items = await svc.list_stale(user_id, days=7)
    for item in items:
        item.setdefault(
            "suggested_action",
            "follow up" if item.get("daysSinceUpdate", 0) >= 14 else "check status",
        )
    return items


async def generate_follow_up_email(
    mcp: FlarqMCPClient,
    *,
    application_id: str,
    user_id: str,
) -> dict[str, str]:
    svc = ApplicationService(mcp)
    detail = await svc.get_detail(user_id, application_id)
    if detail is None:
        raise ValueError("Application not found")
    app = detail["application"]
    cl = detail.get("coverLetter") or {}
    excerpt = str(cl.get("body") or "")[:2000]
    return await gemini_follow_up(
        company_name=str(app.get("companyName") or ""),
        job_title=str(app.get("jobTitle") or ""),
        cover_letter_excerpt=excerpt or None,
    )
