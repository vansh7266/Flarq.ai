from datetime import UTC, datetime, timedelta
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


async def find_stale_applications(
    database: AsyncIOMotorDatabase,
    *,
    user_id: str,
    stale_after_days: int = 10,
) -> list[dict[str, Any]]:
    """Locate applications without updates for proactive follow-up alerts (Phase 2)."""
    cutoff = datetime.now(tz=UTC) - timedelta(days=stale_after_days)
    cursor = database["applications"].find(
        {
            "user_id": user_id,
            "updated_at": {"$lt": cutoff},
            "status": {"$in": ["applied", "interviewing"]},
        }
    )
    return await cursor.to_list(length=200)
