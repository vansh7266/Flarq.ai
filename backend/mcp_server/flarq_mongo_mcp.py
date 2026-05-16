"""
Flarq MongoDB MCP Server
Real Model Context Protocol server exposing MongoDB operations
as MCP tools — this is the agent's superpower.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
from datetime import UTC, datetime
from typing import Any

import motor.motor_asyncio
from bson import ObjectId
import mcp.types as types
from mcp.server import Server
from mcp.server.stdio import stdio_server

ALLOWED_COLLECTIONS = frozenset(
    {
        "users",
        "profiles",
        "applications",
        "job_descriptions",
        "cover_letters",
        "alerts",
        "analytics_cache",
        "agent_conversations",
        "token_blocklist",
    }
)

ALLOWED_FILTER_OPERATORS = {
    "$eq",
    "$ne",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$in",
    "$nin",
    "$and",
    "$or",
    "$not",
    "$nor",
    "$exists",
    "$type",
    "$regex",
    "$options",
    "$elemMatch",
    "$size",
    "$all",
}

BLOCKED_FILTER_OPERATORS = {"$where", "$function"}

BLOCKED_PIPELINE_STAGES = {
    "$out",
    "$merge",
    "$currentOp",
    "$listSessions",
    "$indexStats",
    "$function",
}

USER_SCOPED_COLLECTIONS = frozenset(
    {
        "applications",
        "profiles",
        "cover_letters",
        "job_descriptions",
        "agent_conversations",
    }
)


class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj: Any) -> Any:
        if isinstance(obj, ObjectId):
            return str(obj)
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def mongo_serialize(data: Any) -> Any:
    return json.loads(json.dumps(data, cls=MongoJSONEncoder))


def _parse_object_id(value: str) -> ObjectId:
    return ObjectId(value)


def _maybe_object_id_filter(filter_dict: dict[str, Any]) -> dict[str, Any]:
    prepared = dict(filter_dict)
    _id = prepared.get("_id")
    if isinstance(_id, str):
        try:
            prepared["_id"] = _parse_object_id(_id)
        except Exception:
            pass
    return prepared


def validate_filter(obj: Any, depth: int = 0) -> bool:
    if depth > 10:
        return False
    if isinstance(obj, dict):
        for key, value in obj.items():
            if key in BLOCKED_FILTER_OPERATORS:
                return False
            if key.startswith("$") and key not in ALLOWED_FILTER_OPERATORS:
                return False
            if not validate_filter(value, depth + 1):
                return False
    elif isinstance(obj, list):
        for item in obj:
            if not validate_filter(item, depth + 1):
                return False
    return True


def _has_user_id(obj: Any, depth: int = 0) -> bool:
    if depth > 10:
        return False
    if isinstance(obj, dict):
        if "user_id" in obj:
            return True
        return any(_has_user_id(value, depth + 1) for value in obj.values())
    if isinstance(obj, list):
        return any(_has_user_id(item, depth + 1) for item in obj)
    return False


def validate_pipeline(pipeline: list[Any]) -> tuple[bool, str]:
    if len(pipeline) > 20:
        return False, "Pipeline too complex (max 20 stages)"
    for stage in pipeline:
        if not isinstance(stage, dict):
            return False, "Invalid pipeline stage"
        for key, value in stage.items():
            if key in BLOCKED_PIPELINE_STAGES:
                return False, f"Stage {key} not allowed"
            if key == "$match" and not validate_filter(value):
                return False, "Invalid filter operator"
    return True, ""


def _requires_user_scope(collection_name: str) -> bool:
    return collection_name in USER_SCOPED_COLLECTIONS


def _validate_filter_scope(collection_name: str, filter_dict: dict[str, Any]) -> str | None:
    if not validate_filter(filter_dict):
        return "Invalid filter operator"
    if _requires_user_scope(collection_name) and not _has_user_id(filter_dict):
        return "user_id required for this collection"
    return None


def _validate_pipeline_scope(collection_name: str, pipeline: list[Any]) -> str | None:
    ok, error = validate_pipeline(pipeline)
    if not ok:
        return error
    if not _requires_user_scope(collection_name):
        return None
    first = pipeline[0] if pipeline else None
    if not isinstance(first, dict) or "$match" not in first or not _has_user_id(first["$match"]):
        return "user_id required for this collection"
    return None


def _error(text: str) -> list[types.TextContent]:
    return [types.TextContent(type="text", text=json.dumps({"success": False, "error": text}))]


def _merge_updated_at(update: dict[str, Any]) -> dict[str, Any]:
    """Ensure updated_at is set without clobbering operator-style updates."""
    now = datetime.now(tz=UTC)
    up = dict(update)
    if any(k.startswith("$") for k in up):
        set_part = dict(up.get("$set") or {})
        set_part["updated_at"] = now
        up["$set"] = set_part
    else:
        up = {"$set": {**up, "updated_at": now}}
    return up


_mongo_client: motor.motor_asyncio.AsyncIOMotorClient | None = None
_mongo_db: Any = None

server = Server("flarq-mongodb-mcp")


@server.list_tools()
async def _list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="mongodb_find_one",
            description="Find a single document in a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string", "description": "Collection name"},
                    "filter": {"type": "object", "description": "MongoDB filter query"},
                },
                "required": ["collection", "filter"],
            },
        ),
        types.Tool(
            name="mongodb_find_many",
            description="Find multiple documents in a MongoDB collection. Callers MUST include user_id in filters for user-scoped collections.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "filter": {"type": "object"},
                    "sort": {
                        "type": "array",
                        "description": "Sort as [[field, direction], ...] e.g. [['updated_at', -1]]",
                        "items": {"type": "array"},
                    },
                    "limit": {"type": "integer", "default": 50},
                },
                "required": ["collection", "filter"],
            },
        ),
        types.Tool(
            name="mongodb_insert_one",
            description="Insert a document into a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "document": {"type": "object"},
                },
                "required": ["collection", "document"],
            },
        ),
        types.Tool(
            name="mongodb_update_one",
            description="Update a document in a MongoDB collection",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "filter": {"type": "object"},
                    "update": {"type": "object"},
                    "upsert": {"type": "boolean", "default": False},
                },
                "required": ["collection", "filter", "update"],
            },
        ),
        types.Tool(
            name="mongodb_delete_one",
            description="Soft delete a document (sets deleted=true)",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "filter": {"type": "object"},
                },
                "required": ["collection", "filter"],
            },
        ),
        types.Tool(
            name="mongodb_aggregate",
            description="Run an aggregation pipeline on a MongoDB collection. Callers MUST include user_id in the first $match stage for user-scoped collections.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "pipeline": {
                        "type": "array",
                        "description": "MongoDB aggregation pipeline stages",
                    },
                    "max_results": {
                        "type": "integer",
                        "default": 10000,
                        "description": "Maximum documents to return",
                    },
                },
                "required": ["collection", "pipeline"],
            },
        ),
        types.Tool(
            name="mongodb_inspect_schema",
            description="Inspect the schema of a MongoDB collection by sampling documents",
            inputSchema={
                "type": "object",
                "properties": {"collection": {"type": "string"}},
                "required": ["collection"],
            },
        ),
        types.Tool(
            name="mongodb_count",
            description="Count documents matching a filter. Callers MUST include user_id in filters for user-scoped collections.",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "filter": {"type": "object"},
                },
                "required": ["collection", "filter"],
            },
        ),
        types.Tool(
            name="mongodb_vector_search",
            description="Atlas $vectorSearch on embedding path (returns empty if unavailable)",
            inputSchema={
                "type": "object",
                "properties": {
                    "collection": {"type": "string"},
                    "query_vector": {"type": "array", "items": {"type": "number"}},
                    "index_name": {"type": "string"},
                    "limit": {"type": "integer", "default": 10},
                },
                "required": ["collection", "query_vector", "index_name", "limit"],
            },
        ),
    ]


@server.call_tool()
async def _call_tool(name: str, arguments: dict[str, Any]) -> list[types.TextContent]:
    try:
        if _mongo_db is None:
            return [
                types.TextContent(
                    type="text",
                    text=json.dumps({"success": False, "error": "MongoDB client not initialized"}),
                )
            ]

        collection_name = arguments.get("collection")
        if not isinstance(collection_name, str) or collection_name not in ALLOWED_COLLECTIONS:
            return [
                types.TextContent(
                    type="text",
                    text=json.dumps(
                        {
                            "success": False,
                            "error": f"Collection '{collection_name}' not allowed",
                        }
                    ),
                )
            ]

        collection = _mongo_db[collection_name]
        result: Any = None

        if name == "mongodb_find_one":
            filter_dict = _maybe_object_id_filter(dict(arguments["filter"]))
            scope_error = _validate_filter_scope(collection_name, filter_dict)
            if scope_error:
                return _error(scope_error)
            doc = await collection.find_one(filter_dict)
            result = mongo_serialize(doc) if doc else None

        elif name == "mongodb_find_many":
            filter_dict = _maybe_object_id_filter(dict(arguments["filter"]))
            scope_error = _validate_filter_scope(collection_name, filter_dict)
            if scope_error:
                return _error(scope_error)
            sort = arguments.get("sort")
            limit = int(arguments.get("limit", 50))
            cursor = collection.find(filter_dict)
            if sort:
                pairs: list[tuple[str, int]] = []
                for item in sort:
                    if isinstance(item, (list, tuple)) and len(item) == 2:
                        pairs.append((str(item[0]), int(item[1])))
                if pairs:
                    cursor = cursor.sort(pairs)
            cursor = cursor.limit(limit)
            docs = await cursor.to_list(length=limit)
            result = mongo_serialize(docs)

        elif name == "mongodb_insert_one":
            document = dict(arguments["document"])
            now = datetime.now(tz=UTC)
            document.setdefault("created_at", now)
            document.setdefault("updated_at", now)
            res = await collection.insert_one(document)
            result = {"inserted_id": str(res.inserted_id)}

        elif name == "mongodb_update_one":
            filter_dict = _maybe_object_id_filter(dict(arguments["filter"]))
            scope_error = _validate_filter_scope(collection_name, filter_dict)
            if scope_error:
                return _error(scope_error)
            update = dict(arguments["update"])
            upsert = bool(arguments.get("upsert", False))
            update = _merge_updated_at(update)
            res = await collection.update_one(filter_dict, update, upsert=upsert)
            result = {"modified_count": res.modified_count, "matched_count": res.matched_count}

        elif name == "mongodb_delete_one":
            filter_dict = _maybe_object_id_filter(dict(arguments["filter"]))
            scope_error = _validate_filter_scope(collection_name, filter_dict)
            if scope_error:
                return _error(scope_error)
            res = await collection.update_one(
                filter_dict,
                {
                    "$set": {
                        "deleted": True,
                        "deleted_at": datetime.now(tz=UTC),
                        "updated_at": datetime.now(tz=UTC),
                    }
                },
            )
            result = {"modified_count": res.modified_count}

        elif name == "mongodb_aggregate":
            pipeline = list(arguments["pipeline"])
            scope_error = _validate_pipeline_scope(collection_name, pipeline)
            if scope_error:
                return _error(scope_error)
            max_results = int(arguments.get("max_results", 10000))
            docs = await collection.aggregate(pipeline).to_list(length=max_results)
            result = mongo_serialize(docs)

        elif name == "mongodb_inspect_schema":
            samples = await collection.find().limit(5).to_list(length=5)
            indexes = await collection.index_information()
            if not samples:
                result = {
                    "collection": collection_name,
                    "sample_size": 0,
                    "observed_fields": [],
                    "indexes": mongo_serialize(indexes),
                }
            else:
                keys: set[str] = set()
                for doc in samples:
                    keys.update(doc.keys())
                result = {
                    "collection": collection_name,
                    "sample_size": len(samples),
                    "observed_fields": sorted(keys),
                    "indexes": mongo_serialize(indexes),
                }

        elif name == "mongodb_count":
            filter_dict = _maybe_object_id_filter(dict(arguments["filter"]))
            scope_error = _validate_filter_scope(collection_name, filter_dict)
            if scope_error:
                return _error(scope_error)
            count = await collection.count_documents(filter_dict)
            result = {"count": count}

        elif name == "mongodb_vector_search":
            query_vector = list(arguments["query_vector"])
            index_name = str(arguments["index_name"])
            limit = int(arguments["limit"])
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
            try:
                cursor = collection.aggregate(pipeline)
                docs = await cursor.to_list(length=None)
                result = mongo_serialize(docs)
            except Exception:
                result = []

        else:
            return [
                types.TextContent(
                    type="text",
                    text=json.dumps({"success": False, "error": f"Unknown tool: {name}"}),
                )
            ]

        return [
            types.TextContent(
                type="text",
                text=json.dumps({"success": True, "data": result}),
            )
        ]

    except Exception as e:
        return [
            types.TextContent(
                type="text",
                text=json.dumps({"success": False, "error": str(e)}),
            )
        ]


async def _run() -> None:
    global _mongo_client, _mongo_db
    uri = os.environ["MONGODB_URI"]
    db_name = os.environ.get("MONGODB_DB_NAME", "flarq")
    _mongo_client = motor.motor_asyncio.AsyncIOMotorClient(uri)
    _mongo_db = _mongo_client[db_name]
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


def main() -> None:
    parser = argparse.ArgumentParser(description="Flarq MongoDB MCP Server (stdio transport)")
    parser.parse_args()
    asyncio.run(_run())


if __name__ == "__main__":
    main()
