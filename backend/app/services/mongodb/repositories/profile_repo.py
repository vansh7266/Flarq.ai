from datetime import UTC, datetime
from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase


class ProfileRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._collection = database["profiles"]

    async def find_by_user_id(self, user_id: str) -> dict[str, Any] | None:
        return await self._collection.find_one({"user_id": user_id})

    async def upsert_profile(self, user_id: str, payload: dict[str, Any]) -> None:
        now = datetime.now(tz=UTC)
        await self._collection.update_one(
            {"user_id": user_id},
            {
                "$set": {**payload, "updated_at": now},
                "$setOnInsert": {"user_id": user_id, "created_at": now},
            },
            upsert=True,
        )
