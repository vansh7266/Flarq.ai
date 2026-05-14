"""
MongoDB data plane for FLARQ.

Uses the same Atlas connection string (MONGODB_URI) as the official MongoDB MCP server
(`@mongodb-labs/mcp-server-mongodb`). Operations mirror MCP tool semantics while running
inside the FastAPI process for low-latency, production-friendly deployments.
"""

from __future__ import annotations

import time
from datetime import UTC, datetime
from typing import Any, Mapping

import structlog
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorCollection, AsyncIOMotorDatabase
from pymongo.errors import PyMongoError

logger = structlog.get_logger("mongo_mcp")


def _normalize_document(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: _normalize_document(v) for k, v in value.items()}
    if isinstance(value, list):
        return [_normalize_document(v) for v in value]
    return value


class MongoMCPClient:
    """Async MongoDB client with MCP-style operations, structured logging, and safe errors."""

    def __init__(self, database: AsyncIOMotorDatabase) -> None:
        self._db = database

    def _collection(self, name: str) -> AsyncIOMotorCollection:
        return self._db[name]

    async def insert_one(self, collection: str, document: dict[str, Any]) -> str:
        start = time.perf_counter()
        try:
            result = await self._collection(collection).insert_one(document)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_insert_one",
                collection=collection,
                operation="insert_one",
                duration_ms=duration_ms,
            )
            return str(result.inserted_id)
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_insert_one_failed",
                collection=collection,
                operation="insert_one",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    async def find_one(
        self,
        collection: str,
        filter_query: Mapping[str, Any],
    ) -> dict[str, Any] | None:
        start = time.perf_counter()
        try:
            prepared = self._prepare_filter(filter_query)
            doc = await self._collection(collection).find_one(prepared)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_find_one",
                collection=collection,
                operation="find_one",
                duration_ms=duration_ms,
            )
            if doc is None:
                return None
            return _normalize_document(doc)
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_find_one_failed",
                collection=collection,
                operation="find_one",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    async def find_many(
        self,
        collection: str,
        filter_query: Mapping[str, Any],
        *,
        sort: list[tuple[str, int]] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        start = time.perf_counter()
        try:
            prepared = self._prepare_filter(filter_query)
            cursor = self._collection(collection).find(prepared)
            if sort:
                cursor = cursor.sort(sort)
            cursor = cursor.limit(limit)
            docs = await cursor.to_list(length=limit)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_find_many",
                collection=collection,
                operation="find_many",
                duration_ms=duration_ms,
                limit=limit,
            )
            return [_normalize_document(doc) for doc in docs]
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_find_many_failed",
                collection=collection,
                operation="find_many",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    async def update_one(
        self,
        collection: str,
        filter_query: Mapping[str, Any],
        update: Mapping[str, Any],
        *,
        upsert: bool = False,
    ) -> int:
        start = time.perf_counter()
        try:
            prepared = self._prepare_filter(filter_query)
            result = await self._collection(collection).update_one(
                prepared, update, upsert=upsert
            )
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_update_one",
                collection=collection,
                operation="update_one",
                duration_ms=duration_ms,
                modified_count=result.modified_count,
            )
            return int(result.modified_count)
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_update_one_failed",
                collection=collection,
                operation="update_one",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    async def delete_one(self, collection: str, filter_query: Mapping[str, Any]) -> int:
        start = time.perf_counter()
        try:
            prepared = self._prepare_filter(filter_query)
            result = await self._collection(collection).delete_one(prepared)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_delete_one",
                collection=collection,
                operation="delete_one",
                duration_ms=duration_ms,
            )
            return int(result.deleted_count)
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_delete_one_failed",
                collection=collection,
                operation="delete_one",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    async def aggregate(
        self,
        collection: str,
        pipeline: list[Mapping[str, Any]],
    ) -> list[dict[str, Any]]:
        start = time.perf_counter()
        try:
            cursor = self._collection(collection).aggregate(list(pipeline))
            results = await cursor.to_list(length=None)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_aggregate",
                collection=collection,
                operation="aggregate",
                duration_ms=duration_ms,
                stages=len(pipeline),
            )
            return [_normalize_document(doc) for doc in results]
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_aggregate_failed",
                collection=collection,
                operation="aggregate",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    async def vector_search(
        self,
        collection: str,
        query_vector: list[float],
        index_name: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        pipeline: list[dict[str, Any]] = [
            {
                "$vectorSearch": {
                    "index": index_name,
                    "path": "embedding",
                    "queryVector": query_vector,
                    "numCandidates": max(limit * 10, limit),
                    "limit": limit,
                }
            }
        ]
        start = time.perf_counter()
        try:
            cursor = self._collection(collection).aggregate(pipeline)
            docs = await cursor.to_list(length=None)
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_vector_search",
                collection=collection,
                operation="vector_search",
                duration_ms=duration_ms,
                index=index_name,
            )
            return [_normalize_document(doc) for doc in docs]
        except Exception as exc:  # noqa: BLE001
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.warning(
                "mcp_vector_search_unavailable",
                collection=collection,
                duration_ms=duration_ms,
                error=str(exc),
            )
            return []

    async def inspect_schema(self, collection: str) -> dict[str, Any]:
        start = time.perf_counter()
        try:
            sample = await self.find_many(collection, {}, limit=5)
            keys: set[str] = set()
            for doc in sample:
                keys.update(doc.keys())
            indexes = await self._collection(collection).index_information()
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.info(
                "mcp_inspect_schema",
                collection=collection,
                operation="inspect_schema",
                duration_ms=duration_ms,
            )
            return {
                "collection": collection,
                "sample_size": len(sample),
                "observed_fields": sorted(keys),
                "indexes": indexes,
            }
        except PyMongoError as exc:
            duration_ms = round((time.perf_counter() - start) * 1000, 2)
            logger.exception(
                "mcp_inspect_schema_failed",
                collection=collection,
                operation="inspect_schema",
                duration_ms=duration_ms,
                error=str(exc),
            )
            raise RuntimeError("Database operation failed.") from exc

    def _prepare_filter(self, filter_query: Mapping[str, Any]) -> dict[str, Any]:
        prepared = dict(filter_query)
        if "_id" in prepared and isinstance(prepared["_id"], str):
            try:
                prepared["_id"] = ObjectId(str(prepared["_id"]))
            except Exception:  # noqa: BLE001
                pass
        return prepared


def utcnow() -> datetime:
    return datetime.now(tz=UTC)
