from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


async def compute_response_rate(database: AsyncIOMotorDatabase, user_id: str) -> float:
    """Placeholder aggregation for interview / response velocity (Phase 2)."""
    _ = database["applications"]
    _ = user_id
    return 0.0


async def pipeline_response_rate(database: AsyncIOMotorDatabase, user_id: str) -> list[dict[str, Any]]:
    """Reserved for MongoDB aggregation pipeline implementation."""
    _ = database
    _ = user_id
    return []
