"""
Flarq MCP Client
Communicates with the Flarq MongoDB MCP Server via subprocess.
All agent data operations flow through MCP protocol.
"""

from __future__ import annotations

import json
import os
import sys
import time
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Mapping

import structlog
from mcp import ClientSession, StdioServerParameters
from mcp.client.stdio import stdio_client

logger = structlog.get_logger()

_BACKEND_ROOT = Path(__file__).resolve().parents[3]
_MCP_SERVER_SCRIPT = _BACKEND_ROOT / "mcp_server" / "flarq_mongo_mcp.py"


class FlarqMCPClient:
    """
    Real MCP client for Flarq MongoDB operations.
    Spawns the MCP server as subprocess and communicates
    via stdio transport — proper Model Context Protocol.
    """

    def __init__(self) -> None:
        self.server_params = StdioServerParameters(
            command=sys.executable,
            args=[str(_MCP_SERVER_SCRIPT)],
            env={
                "MONGODB_URI": os.environ["MONGODB_URI"],
                "MONGODB_DB_NAME": os.environ.get("MONGODB_DB_NAME", "flarq"),
            },
            cwd=str(_BACKEND_ROOT),
        )

    async def _call(self, tool_name: str, arguments: dict[str, Any]) -> dict[str, Any]:
        """Make a real MCP tool call via stdio transport."""
        start = time.monotonic()

        try:
            async with stdio_client(self.server_params) as (read, write):
                async with ClientSession(read, write) as session:
                    await session.initialize()
                    result = await session.call_tool(tool_name, arguments)

                    duration_ms = (time.monotonic() - start) * 1000
                    logger.info(
                        "mcp_tool_call",
                        tool=tool_name,
                        collection=arguments.get("collection"),
                        duration_ms=round(duration_ms, 2),
                    )

                    if result.isError:
                        text = ""
                        if result.content:
                            block = result.content[0]
                            if hasattr(block, "text"):
                                text = block.text
                        raise RuntimeError(text or "MCP tool call failed")

                    if not result.content:
                        return {"success": False, "error": "No content returned"}

                    payload = json.loads(result.content[0].text)
                    if payload.get("success") is False:
                        raise RuntimeError(str(payload.get("error", "Unknown MCP error")))
                    return payload

        except Exception as e:
            logger.error("mcp_tool_call_failed", tool=tool_name, error=str(e))
            raise

    async def find_one(
        self,
        collection: str,
        filter_query: Mapping[str, Any],
    ) -> dict[str, Any] | None:
        res = await self._call(
            "mongodb_find_one",
            {"collection": collection, "filter": dict(filter_query)},
        )
        return res.get("data")

    async def find_many(
        self,
        collection: str,
        filter_query: Mapping[str, Any],
        *,
        sort: list[tuple[str, int]] | None = None,
        limit: int = 100,
    ) -> list[dict[str, Any]]:
        args: dict[str, Any] = {
            "collection": collection,
            "filter": dict(filter_query),
            "limit": limit,
        }
        if sort:
            args["sort"] = [list(pair) for pair in sort]
        res = await self._call("mongodb_find_many", args)
        return res.get("data") or []

    async def insert_one(self, collection: str, document: dict[str, Any]) -> str:
        res = await self._call(
            "mongodb_insert_one",
            {"collection": collection, "document": dict(document)},
        )
        inserted = (res.get("data") or {}).get("inserted_id")
        if not inserted:
            raise RuntimeError("Database operation failed.")
        return str(inserted)

    async def update_one(
        self,
        collection: str,
        filter_query: Mapping[str, Any],
        update: Mapping[str, Any],
        *,
        upsert: bool = False,
    ) -> int:
        res = await self._call(
            "mongodb_update_one",
            {
                "collection": collection,
                "filter": dict(filter_query),
                "update": dict(update),
                "upsert": upsert,
            },
        )
        data = res.get("data") or {}
        return int(data.get("modified_count", 0))

    async def delete_one(self, collection: str, filter_query: Mapping[str, Any]) -> int:
        res = await self._call(
            "mongodb_delete_one",
            {"collection": collection, "filter": dict(filter_query)},
        )
        return int((res.get("data") or {}).get("modified_count", 0))

    async def aggregate(
        self,
        collection: str,
        pipeline: list[Mapping[str, Any]],
    ) -> list[dict[str, Any]]:
        res = await self._call(
            "mongodb_aggregate",
            {"collection": collection, "pipeline": [dict(s) for s in pipeline]},
        )
        return res.get("data") or []

    async def inspect_schema(self, collection: str) -> dict[str, Any]:
        res = await self._call(
            "mongodb_inspect_schema",
            {"collection": collection},
        )
        return res.get("data") or {}

    async def count(self, collection: str, filter_query: Mapping[str, Any]) -> int:
        res = await self._call(
            "mongodb_count",
            {"collection": collection, "filter": dict(filter_query)},
        )
        return int((res.get("data") or {}).get("count", 0))

    async def vector_search(
        self,
        collection: str,
        query_vector: list[float],
        index_name: str,
        limit: int,
    ) -> list[dict[str, Any]]:
        res = await self._call(
            "mongodb_vector_search",
            {
                "collection": collection,
                "query_vector": query_vector,
                "index_name": index_name,
                "limit": limit,
            },
        )
        return res.get("data") or []


mcp_client = FlarqMCPClient()


def utcnow() -> datetime:
    return datetime.now(tz=UTC)
