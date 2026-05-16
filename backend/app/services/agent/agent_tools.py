"""Executable Flarq agent tools (FlarqMCPClient / real MCP)."""

from __future__ import annotations

import re
from datetime import datetime
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.services.applications.application_service import ApplicationService, is_valid_status
from app.services.analytics.overview import get_cached_overview
from app.services.mongodb.mcp_client import FlarqMCPClient, utcnow
from app.services.scheduler import alert_service


async def get_profile_summary(mcp: FlarqMCPClient, user_id: str) -> dict[str, Any]:
    doc = await mcp.find_one("profiles", {"user_id": user_id})
    if doc is None:
        return {"found": False, "summary": "No profile saved yet."}
    parsed = doc.get("parsed_resume") or {}
    skills = parsed.get("skills") if isinstance(parsed, dict) else []
    simple = doc.get("skills") or []
    headline = doc.get("headline") or parsed.get("full_name")
    return {
        "found": True,
        "headline": headline,
        "summary": doc.get("summary") or parsed.get("summary"),
        "skills": simple if simple else [s.get("name") for s in skills if isinstance(s, dict)],
        "experience_count": len(parsed.get("experience") or []) if isinstance(parsed, dict) else 0,
    }


async def search_applications(
    mcp: FlarqMCPClient,
    user_id: str,
    *,
    status: str | None = None,
    company: str | None = None,
    start_date: str | None = None,
    end_date: str | None = None,
) -> dict[str, Any]:
    clauses: list[dict[str, Any]] = [
        {"user_id": user_id},
        {"deleted": {"$ne": True}},
    ]
    if status:
        clauses.append({"status": status})
    if company:
        escaped_company = re.escape(company)
        clauses.append(
            {
                "$or": [
                    {"company_name": {"$regex": escaped_company, "$options": "i"}},
                    {"company": {"$regex": escaped_company, "$options": "i"}},
                ]
            }
        )
    if start_date or end_date:
        rng: dict[str, Any] = {}
        if start_date:
            rng["$gte"] = datetime.fromisoformat(start_date.replace("Z", "+00:00"))
        if end_date:
            rng["$lte"] = datetime.fromisoformat(end_date.replace("Z", "+00:00"))
        clauses.append({"created_at": rng})
    q: dict[str, Any] = {"$and": clauses} if len(clauses) > 1 else clauses[0]
    docs = await mcp.find_many("applications", q, sort=[("updated_at", -1)], limit=25)
    return {
        "count": len(docs),
        "applications": [
            {
                "id": str(d.get("_id")),
                "company": d.get("company_name") or d.get("company"),
                "title": d.get("job_title") or d.get("role_title"),
                "status": d.get("status"),
            }
            for d in docs
        ],
    }


async def get_analytics_insight(mcp: FlarqMCPClient, user_id: str) -> dict[str, Any]:
    data = await get_cached_overview(mcp, user_id)
    totals = data.get("totals") or {}
    rr = data.get("response_rate") or {}
    cp = data.get("company_patterns") or {}
    text = (
        f"Applications: {totals.get('applications', 0)}. "
        f"Response rate ~{totals.get('response_rate_percent', 0)}%, "
        f"interview rate ~{totals.get('interview_rate_percent', 0)}%, "
        f"offer rate ~{totals.get('offer_rate_percent', 0)}%. "
        f"Avg days to first movement: {totals.get('avg_days_to_response')}. "
        f"Pattern headline: {cp.get('top_insight', '')}"
    )
    return {"insight_text": text, "totals": totals, "week_over_week": rr.get("week_over_week", [])}


async def get_stale_applications(mcp: FlarqMCPClient, user_id: str) -> dict[str, Any]:
    items = await alert_service.check_stale_applications(mcp, user_id)
    return {"stale": items, "count": len(items)}


async def generate_follow_up(mcp: FlarqMCPClient, user_id: str, application_id: str) -> dict[str, Any]:
    try:
        email = await alert_service.generate_follow_up_email(
            mcp, application_id=application_id, user_id=user_id
        )
        return {"ok": True, **email}
    except ValueError as exc:
        return {"ok": False, "error": str(exc)}


async def update_application_status(
    mcp: FlarqMCPClient,
    user_id: str,
    *,
    application_id: str,
    new_status: str,
    note: str | None = None,
) -> dict[str, Any]:
    svc = ApplicationService(mcp)
    try:
        updated = await svc.update(
            user_id,
            application_id,
            {"status": new_status},
        )
    except ValueError:
        return {"ok": False, "error": "Invalid application id"}
    if updated is None:
        return {"ok": False, "error": "Application not found"}
    if note:
        await svc.append_note(user_id, application_id, f"[status → {new_status}] {note}")
    return {"ok": True, "application": updated}


async def dispatch_tool(
    mcp: FlarqMCPClient,
    user_id: str,
    name: str,
    raw_args: dict[str, Any],
) -> dict[str, Any]:
    args = {k: v for k, v in raw_args.items() if v is not None}
    if name == "get_profile_summary":
        return await get_profile_summary(mcp, user_id)
    if name == "search_applications":
        return await search_applications(
            mcp,
            user_id,
            status=args.get("status"),
            company=args.get("company"),
            start_date=args.get("start_date"),
            end_date=args.get("end_date"),
        )
    if name == "get_analytics_insight":
        return await get_analytics_insight(mcp, user_id)
    if name == "get_stale_applications":
        return await get_stale_applications(mcp, user_id)
    if name == "generate_follow_up":
        app_id = str(args.get("application_id", ""))
        return await generate_follow_up(mcp, user_id, app_id)
    if name == "update_application_status":
        new_status = str(args.get("new_status", ""))
        if not is_valid_status(new_status):
            return {"ok": False, "error": "Invalid status"}
        return await update_application_status(
            mcp,
            user_id,
            application_id=str(args.get("application_id", "")),
            new_status=str(args.get("new_status", "")),
            note=args.get("note"),
        )
    return {"error": f"Unknown tool {name}"}
