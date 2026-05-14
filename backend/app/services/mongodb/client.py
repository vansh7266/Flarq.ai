from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import get_settings


class MongoClientManager:
    def __init__(self) -> None:
        self._client: AsyncIOMotorClient | None = None

    async def connect(self) -> AsyncIOMotorDatabase:
        settings = get_settings()
        if self._client is None:
            self._client = AsyncIOMotorClient(settings.mongodb_uri)
        return self._client[settings.mongodb_db_name]

    async def disconnect(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None


async def ensure_indexes(database: AsyncIOMotorDatabase) -> None:
    users = database["users"]
    await users.create_index("email", unique=True)

    applications = database["applications"]
    await applications.create_index(
        [("user_id", 1), ("status", 1), ("created_at", -1)],
        name="user_status_created",
    )

    job_descriptions = database["job_descriptions"]
    await job_descriptions.create_index([("requirements", "text")])
    await job_descriptions.create_index([("user_id", 1), ("created_at", -1)])

    profiles = database["profiles"]
    await profiles.create_index("user_id", unique=True)

    cover_letters = database["cover_letters"]
    await cover_letters.create_index(
        [("user_id", 1), ("jd_id", 1), ("version", -1)],
        name="user_jd_version",
    )

    blocklist = database["token_blocklist"]
    await blocklist.create_index("jti", unique=True)
