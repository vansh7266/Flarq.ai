"""Skill frequency from linked JD analyses vs profile skills."""

from __future__ import annotations

from typing import Any

from app.services.mongodb.mcp_client import MongoMCPClient

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


async def get_skill_demand(mcp: MongoMCPClient, user_id: str) -> dict[str, Any]:
    pipeline: list[dict[str, Any]] = [
        {"$match": {"user_id": user_id, "deleted": {"$ne": True}}},
        _JD_LOOKUP_STAGE,
        {"$addFields": {"jd": {"$arrayElemAt": ["$_jd", 0]}}},
        {"$match": {"jd.analysis.required_skills": {"$exists": True, "$ne": []}}},
        {"$unwind": "$jd.analysis.required_skills"},
        {
            "$group": {
                "_id": {"$toLower": {"$ifNull": ["$jd.analysis.required_skills.name", ""]}},
                "count": {"$sum": 1},
                "name": {"$first": "$jd.analysis.required_skills.name"},
            }
        },
        {"$match": {"_id": {"$ne": ""}}},
        {"$sort": {"count": -1}},
        {"$limit": 40},
    ]
    skill_rows = await mcp.aggregate("applications", pipeline)

    profile = await mcp.find_one("profiles", {"user_id": user_id})
    user_skill_names: set[str] = set()
    if profile:
        for s in profile.get("skills") or []:
            user_skill_names.add(str(s).strip().lower())
        parsed = profile.get("parsed_resume") or {}
        for sk in parsed.get("skills") or []:
            if isinstance(sk, dict) and sk.get("name"):
                user_skill_names.add(str(sk["name"]).strip().lower())

    top_have: list[dict[str, Any]] = []
    top_missing: list[dict[str, Any]] = []
    for row in skill_rows:
        name = str(row.get("name") or "").strip()
        key = str(row.get("_id") or "").strip()
        if not name:
            continue
        entry = {"name": name, "count": int(row.get("count", 0))}
        if key in user_skill_names:
            top_have.append(entry)
        else:
            top_missing.append(entry)

    top_have = sorted(top_have, key=lambda x: x["count"], reverse=True)[:5]
    top_missing = sorted(top_missing, key=lambda x: x["count"], reverse=True)[:5]

    return {
        "top_skills_you_have": top_have,
        "top_skills_missing": top_missing,
    }


async def summarize_skill_demand(database: Any, user_id: str) -> list[dict[str, Any]]:
    from app.services.mongodb.mcp_client import MongoMCPClient

    mcp = MongoMCPClient(database)
    data = await get_skill_demand(mcp, user_id)
    return list(data.get("top_skills_missing") or [])
