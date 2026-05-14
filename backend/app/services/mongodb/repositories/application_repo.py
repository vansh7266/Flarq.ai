from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase


class ApplicationRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._collection = database["applications"]

    async def list_for_user(self, user_id: str) -> list[dict[str, Any]]:
        cursor = self._collection.find({"user_id": user_id}).sort("created_at", -1)
        return await cursor.to_list(length=500)

    async def create(self, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
        now = datetime.now(tz=UTC)
        document = {
            "user_id": user_id,
            **data,
            "created_at": now,
            "updated_at": now,
        }
        result = await self._collection.insert_one(document)
        document["_id"] = result.inserted_id
        return document

    async def delete(self, user_id: str, application_id: str) -> bool:
        try:
            object_id = ObjectId(application_id)
        except Exception:  # noqa: BLE001
            return False
        result = await self._collection.delete_one(
            {"_id": object_id, "user_id": user_id}
        )
        return result.deleted_count == 1
