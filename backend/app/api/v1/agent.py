from __future__ import annotations

from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, MCPClient
from app.core.responses import json_response
from app.services.agent.agent_builder import run_agent
from app.services.agent import conversation_store

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = Field(default=None, alias="conversationId")


@router.post("/chat", response_model=None)
async def agent_chat(payload: AgentChatRequest, user: CurrentUser, mcp: MCPClient) -> JSONResponse:
    history: list[dict[str, Any]] = []
    conv_id = payload.conversation_id
    if conv_id:
        doc = await conversation_store.get_conversation(mcp, user["id"], conv_id)
        if doc:
            msgs = doc.get("messages") or []
            history = [
                {"role": m.get("role"), "content": m.get("content", "")}
                for m in msgs[-10:]
                if m.get("role") in ("user", "assistant", "model")
            ]

    try:
        result = await run_agent(mcp, user["id"], payload.message, history)
    except RuntimeError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "AGENT_FAILED"},
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        )

    new_conv = await conversation_store.append_turn(
        mcp,
        user["id"],
        conversation_id=conv_id,
        user_text=payload.message,
        assistant_text=result["response"],
        tools_used=list(result.get("tools_used") or []),
    )

    return json_response(
        success=True,
        message="Agent reply",
        data={
            "response": result["response"],
            "toolsUsed": result.get("tools_used") or [],
            "conversationId": new_conv,
            "suggestions": result.get("suggestions") or [],
        },
    )


@router.get("/conversations/{conversation_id}", response_model=None)
async def get_agent_conversation(
    conversation_id: str,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    doc = await conversation_store.get_conversation(mcp, user["id"], conversation_id)
    if doc is None:
        return json_response(
            success=False,
            message="Conversation not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return json_response(
        success=True,
        message="Conversation",
        data={
            "conversationId": str(doc.get("_id")),
            "messages": doc.get("messages") or [],
        },
    )


@router.get("/history", response_model=None)
async def agent_history(user: CurrentUser, mcp: MCPClient) -> JSONResponse:
    rows = await conversation_store.list_conversations(mcp, user["id"], limit=20)
    return json_response(
        success=True,
        message="Conversations",
        data=rows,
        status_code=status.HTTP_200_OK,
    )
