"""Persisted Flarq agent conversations (MongoDB via MCP)."""

from __future__ import annotations

from typing import Any

from bson import ObjectId
from bson.errors import InvalidId

from app.services.mongodb.mcp_client import FlarqMCPClient, utcnow


def _preview(text: str, n: int = 100) -> str:
    t = text.strip().replace("\n", " ")
    return t if len(t) <= n else f"{t[: n - 1]}…"


async def list_conversations(mcp: FlarqMCPClient, user_id: str, limit: int = 20) -> list[dict[str, Any]]:
    docs = await mcp.find_many(
        "agent_conversations",
        {"user_id": user_id},
        sort=[("updated_at", -1)],
        limit=limit,
    )
    out: list[dict[str, Any]] = []
    for d in docs:
        msgs = d.get("messages") or []
        first = msgs[0] if msgs else {}
        out.append(
            {
                "conversationId": str(d.get("_id")),
                "preview": d.get("preview") or str(first.get("content", ""))[:120],
                "updatedAt": d.get("updated_at"),
                "messageCount": len(msgs),
            }
        )
    return out


async def get_conversation(mcp: FlarqMCPClient, user_id: str, conversation_id: str) -> dict[str, Any] | None:
    try:
        oid = ObjectId(conversation_id)
    except InvalidId:
        return None
    doc = await mcp.find_one(
        "agent_conversations",
        {"_id": oid, "user_id": user_id},
    )
    return doc


async def append_turn(
    mcp: FlarqMCPClient,
    user_id: str,
    *,
    conversation_id: str | None,
    user_text: str,
    assistant_text: str,
    tools_used: list[str],
) -> str:
    now = utcnow()
    user_entry = {
        "role": "user",
        "content": user_text,
        "tool_calls": None,
        "timestamp": now.isoformat(),
    }
    assistant_entry = {
        "role": "assistant",
        "content": assistant_text,
        "tool_calls": tools_used or None,
        "timestamp": now.isoformat(),
    }
    preview = _preview(user_text)

    if conversation_id:
        try:
            oid = ObjectId(conversation_id)
        except InvalidId:
            conversation_id = None
        else:
            existing = await mcp.find_one(
                "agent_conversations",
                {"_id": oid, "user_id": user_id},
            )
            if existing is not None:
                await mcp.update_one(
                    "agent_conversations",
                    {"_id": oid, "user_id": user_id},
                    {
                        "$push": {"messages": {"$each": [user_entry, assistant_entry]}},
                        "$set": {"updated_at": now, "preview": preview},
                    },
                )
                return conversation_id

    new_id = await mcp.insert_one(
        "agent_conversations",
        {
            "user_id": user_id,
            "preview": preview,
            "messages": [user_entry, assistant_entry],
            "created_at": now,
            "updated_at": now,
        },
    )
    return new_id
