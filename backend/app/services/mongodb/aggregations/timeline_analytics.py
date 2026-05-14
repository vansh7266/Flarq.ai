"""Applications over time and simple funnel timing proxies."""

from __future__ import annotations

from typing import Any

from app.services.mongodb.mcp_client import MongoMCPClient

from .response_rate import _week_key_expr


async def get_timeline(mcp: MongoMCPClient, user_id: str) -> dict[str, Any]:
    base = {"user_id": user_id, "deleted": {"$ne": True}}
    weekly = await mcp.aggregate(
        "applications",
        [
            {"$match": base},
            {"$addFields": {"wk": _week_key_expr("$created_at")}},
            {"$group": {"_id": "$wk", "count": {"$sum": 1}}},
            {"$sort": {"_id": -1}},
            {"$limit": 12},
        ],
    )
    applications_by_week = [
        {"week": str(r["_id"]), "count": int(r.get("count", 0))} for r in reversed(weekly)
    ]

    # Average days in "applied" state proxy: created -> last_updated for still-applied
    applied_rows = await mcp.aggregate(
        "applications",
        [
            {
                "$match": {
                    **base,
                    "status": "applied",
                    "created_at": {"$exists": True},
                    "last_updated": {"$exists": True},
                }
            },
            {
                "$project": {
                    "d": {
                        "$divide": [
                            {"$subtract": ["$last_updated", "$created_at"]},
                            86400000,
                        ]
                    }
                }
            },
            {"$group": {"_id": None, "avg_days": {"$avg": "$d"}}},
        ],
    )
    avg_days_applied_stale = None
    if applied_rows and applied_rows[0].get("avg_days") is not None:
        avg_days_applied_stale = round(float(applied_rows[0]["avg_days"]), 1)

    # Streak: consecutive calendar days with >=1 application created (last 30d window)
    day_counts = await mcp.aggregate(
        "applications",
        [
            {"$match": base},
            {
                "$group": {
                    "_id": {
                        "$dateToString": {"format": "%Y-%m-%d", "date": "$created_at"},
                    },
                    "c": {"$sum": 1},
                }
            },
            {"$sort": {"_id": -1}},
            {"$limit": 60},
        ],
    )
    streak = 0
    if day_counts:
        from datetime import UTC, datetime, timedelta

        today = datetime.now(tz=UTC).date()
        days_with = {r["_id"] for r in day_counts if r.get("c", 0) > 0}
        for i in range(365):
            d = (today - timedelta(days=i)).isoformat()
            if d in days_with:
                streak += 1
            else:
                if i == 0:
                    continue
                break

    return {
        "applications_by_week": applications_by_week,
        "avg_days_in_applied_without_move": avg_days_applied_stale,
        "application_streak_days": streak,
        "avg_days_applied_to_response": None,
        "avg_days_response_to_interview": None,
        "avg_days_interview_to_offer": None,
    }
