from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


async def summarize_skill_demand(
    database: AsyncIOMotorDatabase,
    user_id: str,
) -> list[dict[str, Any]]:
    """Placeholder for skill demand trends across saved JDs."""
    _ = database
    _ = user_id
    return []


async def skill_demand_pipeline(
    database: AsyncIOMotorDatabase,
    user_id: str,
) -> list[dict[str, Any]]:
    _ = database
    _ = user_id
    return []
