from datetime import UTC, datetime
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError


class UserRepository:
    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._collection = database["users"]

    async def create_user(
        self,
        *,
        email: str,
        full_name: str,
        hashed_password: str,
    ) -> dict[str, Any]:
        now = datetime.now(tz=UTC)
        document = {
            "email": email.lower(),
            "full_name": full_name,
            "hashed_password": hashed_password,
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        try:
            result = await self._collection.insert_one(document)
        except DuplicateKeyError as exc:
            raise ValueError("Email already registered") from exc

        document["_id"] = result.inserted_id
        return document

    async def create_google_user(
        self,
        *,
        email: str,
        full_name: str,
        picture: str | None = None,
    ) -> dict[str, Any]:
        """Create a user authenticated via Google OAuth (no password)."""
        now = datetime.now(tz=UTC)
        document: dict[str, Any] = {
            "email": email.lower(),
            "full_name": full_name,
            "hashed_password": "",
            "auth_provider": "google",
            "picture": picture or "",
            "is_active": True,
            "created_at": now,
            "updated_at": now,
        }

        try:
            result = await self._collection.insert_one(document)
        except DuplicateKeyError as exc:
            raise ValueError("Email already registered") from exc

        document["_id"] = result.inserted_id
        return document

    async def find_by_email(self, email: str) -> dict[str, Any] | None:
        return await self._collection.find_one({"email": email.lower()})

    async def find_by_id(self, user_id: str) -> dict[str, Any] | None:
        try:
            object_id = ObjectId(user_id)
        except Exception:  # noqa: BLE001
            return None
        return await self._collection.find_one({"_id": object_id})
