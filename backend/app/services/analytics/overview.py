"""Analytics overview assembly + 1-hour cache in MongoDB."""

from __future__ import annotations

import asyncio
from datetime import timedelta
from typing import Any

from app.services.mongodb.aggregations.company_patterns import get_company_patterns
from app.services.mongodb.aggregations.response_rate import avg_days_to_response, get_response_rate
from app.services.mongodb.aggregations.skill_demand import get_skill_demand
from app.services.mongodb.aggregations.timeline_analytics import get_timeline
from app.services.mongodb.mcp_client import FlarqMCPClient, utcnow


async def get_cached_overview(mcp: FlarqMCPClient, user_id: str) -> dict[str, Any]:
    now = utcnow()
    cached = await mcp.find_one(
        "analytics_cache",
        {"user_id": user_id, "cache_key": "overview"},
    )
    if cached and cached.get("expires_at"):
        exp = cached["expires_at"]
        if isinstance(exp, str):
            from datetime import datetime as dt

            exp = dt.fromisoformat(exp.replace("Z", "+00:00"))
        if isinstance(exp, type(now)) and exp > now:
            return dict(cached.get("payload") or {})

    rr, cp, sd, tl, avg_resp = await asyncio.gather(
        get_response_rate(mcp, user_id),
        get_company_patterns(mcp, user_id),
        get_skill_demand(mcp, user_id),
        get_timeline(mcp, user_id),
        avg_days_to_response(mcp, user_id),
    )

    total_apps = int(rr.get("total_applications") or 0)
    payload: dict[str, Any] = {
        "totals": {
            "applications": total_apps,
            "response_rate_percent": rr.get("response_rate_percent", 0),
            "interview_rate_percent": rr.get("interview_rate_percent", 0),
            "offer_rate_percent": rr.get("offer_rate_percent", 0),
            "avg_days_to_response": avg_resp,
        },
        "response_rate": rr,
        "company_patterns": cp,
        "skill_demand": sd,
        "timeline": tl,
        "cached_at": now.isoformat(),
    }

    expires = now + timedelta(hours=1)
    await mcp.update_one(
        "analytics_cache",
        {"user_id": user_id, "cache_key": "overview"},
        {
            "$set": {
                "user_id": user_id,
                "cache_key": "overview",
                "payload": payload,
                "expires_at": expires,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )
    return payload
