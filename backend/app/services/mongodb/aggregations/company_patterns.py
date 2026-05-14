"""Company / remote / industry segments vs application outcomes."""

from __future__ import annotations

from typing import Any

from app.services.mongodb.mcp_client import FlarqMCPClient

_JD_LOOKUP_STAGE = {
    "$lookup": {
        "from": "job_descriptions",
        "let": {"jdid": "$jd_id"},
        "pipeline": [
            {
                "$match": {
                    "$expr": {
                        "$and": [
                            {"$ne": ["$$jdid", None]},
                            {"$ne": ["$$jdid", ""]},
                            {
                                "$eq": [
                                    "$_id",
                                    {
                                        "$convert": {
                                            "input": "$$jdid",
                                            "to": "objectId",
                                            "onError": None,
                                            "onNull": None,
                                        }
                                    },
                                ]
                            },
                        ]
                    }
                }
            }
        ],
        "as": "_jd",
    }
}


async def get_company_patterns(mcp: FlarqMCPClient, user_id: str) -> dict[str, Any]:
    pipeline: list[dict[str, Any]] = [
        {"$match": {"user_id": user_id, "deleted": {"$ne": True}}},
        _JD_LOOKUP_STAGE,
        {"$addFields": {"jd": {"$arrayElemAt": ["$_jd", 0]}}},
        {"$match": {"jd": {"$ne": None}}},
        {
            "$group": {
                "_id": {
                    "company_size": {"$ifNull": ["$jd.analysis.company_size", "unknown"]},
                    "industry": {"$ifNull": ["$jd.analysis.industry", "unknown"]},
                    "remote_policy": {"$ifNull": ["$jd.analysis.remote_policy", "unknown"]},
                },
                "applications": {"$sum": 1},
                "responses": {
                    "$sum": {
                        "$cond": [
                            {
                                "$in": [
                                    "$status",
                                    ["phone_screen", "interview", "offer", "accepted"],
                                ]
                            },
                            1,
                            0,
                        ]
                    }
                },
            }
        },
        {"$sort": {"applications": -1}},
        {"$limit": 24},
    ]
    segments = await mcp.aggregate("applications", pipeline)

    best: dict[str, Any] | None = None
    for seg in segments:
        apps = int(seg.get("applications") or 0)
        resp = int(seg.get("responses") or 0)
        rate = (resp / apps) if apps else 0.0
        seg["response_rate"] = round(rate * 100, 1)
        if apps >= 2 and (best is None or rate > best.get("_rate", -1)):
            best = {**seg, "_rate": rate}

    insight = (
        "Link applications to saved job descriptions (JD analysis) to unlock "
        "company-size and remote-policy conversion insights."
    )
    if best and best.get("applications", 0) >= 2:
        rid = best["_id"]
        baseline = 0.12
        mult = round(max(1.0, (best["_rate"] / baseline)) if baseline else 1.0, 1)
        insight = (
            f"You see ~{mult}x higher progression after outreach in "
            f"{rid.get('remote_policy')} roles at {rid.get('company_size')} companies "
            f"({best['response_rate']}% moving to phone screen or better in this bucket)."
        )

    return {
        "segments": segments,
        "top_insight": insight,
    }


async def summarize_company_patterns(database: Any, user_id: str) -> list[dict[str, Any]]:
    from app.services.mongodb.mcp_client import mcp_client

    data = await get_company_patterns(mcp_client, user_id)
    return list(data.get("segments") or [])
