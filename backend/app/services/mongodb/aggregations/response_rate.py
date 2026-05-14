"""Response rate, funnel, and week-over-week application counts via MongoDB aggregation."""

from __future__ import annotations

from typing import Any

from app.services.mongodb.mcp_client import FlarqMCPClient


def _week_key_expr(date_field: str = "$created_at") -> dict[str, Any]:
    """ISO year-week string for grouping (no $dateTrunc dependency)."""
    return {
        "$concat": [
            {"$toString": {"$year": date_field}},
            "-W",
            {"$toString": {"$isoWeek": date_field}},
        ]
    }


async def get_response_rate(mcp: FlarqMCPClient, user_id: str) -> dict[str, Any]:
    base_match: dict[str, Any] = {"user_id": user_id, "deleted": {"$ne": True}}
    pipeline: list[dict[str, Any]] = [
        {"$match": base_match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    rows = await mcp.aggregate("applications", pipeline)
    by_status: dict[str, int] = {}
    total = 0
    for row in rows:
        st = str(row.get("_id") or "saved")
        c = int(row.get("count") or 0)
        by_status[st] = c
        total += c

    applied_plus = sum(
        by_status.get(s, 0)
        for s in ("applied", "phone_screen", "interview", "offer", "accepted", "rejected", "ghosted")
    )
    responded = sum(by_status.get(s, 0) for s in ("phone_screen", "interview", "offer", "accepted"))
    interviewed = sum(by_status.get(s, 0) for s in ("interview", "offer", "accepted"))
    offers = sum(by_status.get(s, 0) for s in ("offer", "accepted"))

    def pct(num: int, den: int) -> float:
        if den <= 0:
            return 0.0
        return round(100.0 * num / den, 1)

    response_rate = pct(responded, applied_plus) if applied_plus else 0.0
    interview_rate = pct(interviewed, applied_plus) if applied_plus else 0.0
    offer_rate = pct(offers, applied_plus) if applied_plus else 0.0

    wow_pipeline = [
        {"$match": base_match},
        {"$addFields": {"wk": _week_key_expr("$created_at")}},
        {"$group": {"_id": "$wk", "applications": {"$sum": 1}}},
        {"$sort": {"_id": -1}},
        {"$limit": 8},
    ]
    wow_raw = await mcp.aggregate("applications", wow_pipeline)
    week_over_week = [
        {"week": str(r["_id"]), "applications": int(r.get("applications", 0))}
        for r in reversed(wow_raw)
    ]

    return {
        "total_applications": total,
        "by_status": by_status,
        "response_rate_percent": response_rate,
        "interview_rate_percent": interview_rate,
        "offer_rate_percent": offer_rate,
        "week_over_week": week_over_week,
    }


async def avg_days_to_response(mcp: FlarqMCPClient, user_id: str) -> float | None:
    """Mean days from application created to first movement (proxy: created → last_updated)."""
    pipeline: list[dict[str, Any]] = [
        {
            "$match": {
                "user_id": user_id,
                "deleted": {"$ne": True},
                "status": {"$in": ["phone_screen", "interview", "offer", "accepted"]},
                "created_at": {"$exists": True},
            }
        },
        {
            "$project": {
                "delta": {
                    "$divide": [
                        {
                            "$subtract": [
                                {"$ifNull": ["$last_updated", "$updated_at"]},
                                "$created_at",
                            ]
                        },
                        86400000,
                    ]
                }
            }
        },
        {"$group": {"_id": None, "avg": {"$avg": "$delta"}}},
    ]
    rows = await mcp.aggregate("applications", pipeline)
    if not rows:
        return None
    avg = rows[0].get("avg")
    if avg is None:
        return None
    return round(float(avg), 1)
