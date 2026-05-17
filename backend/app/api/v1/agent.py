from __future__ import annotations

import asyncio
import json
from typing import Any

import structlog
from fastapi import APIRouter, Request, status
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, MCPClient
from app.core.limiter import limiter
from app.core.responses import json_response
from app.services.agent.agent_builder import run_agent
from app.services.agent import conversation_store

logger = structlog.get_logger("agent")

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentChatRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    message: str = Field(min_length=1, max_length=4000)
    conversation_id: str | None = Field(default=None, alias="conversationId")


@router.post("/chat", response_model=None)
@limiter.limit("10/minute")
async def agent_chat(
    request: Request,
    payload: AgentChatRequest,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
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


@router.post("/chat/stream", response_model=None)
@limiter.limit("10/minute")
async def stream_agent_chat(
    request: Request,
    payload: AgentChatRequest,
    user: CurrentUser,
    mcp: MCPClient,
) -> StreamingResponse:
    """Stream agent responses using Server-Sent Events (SSE).

    Provides real-time streaming of agent responses with live tool execution
    updates, creating the "agent at work" experience. Events include:
    - thinking: Agent is processing the request
    - tools_count: Number of tools that will be used
    - tool_start: Agent is calling an MCP tool
    - tool_complete: Tool execution finished
    - generating: Response text is about to stream
    - token: A chunk of the response text
    - done: Stream complete with metadata
    - error: Something went wrong
    """

    # Friendly display names for known tools
    TOOL_DISPLAY = {
        "get_profile_summary": "Reading your profile",
        "search_applications": "Searching applications",
        "get_analytics_insight": "Running analytics",
        "get_stale_applications": "Finding stale applications",
        "generate_follow_up": "Drafting follow-up",
        "update_application_status": "Updating application",
    }

    async def event_generator():
        try:
            # Send thinking indicator
            yield f"data: {json.dumps({'type': 'thinking', 'message': 'Analyzing your request...'})}\n\n"
            await asyncio.sleep(0.1)

            # Build conversation history
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

            # Run the agent (full response, we'll stream it out)
            result = await run_agent(mcp, user["id"], payload.message, history)

            # Send tool usage events as they happened
            tools_used = result.get("tools_used") or []
            if tools_used:
                yield f"data: {json.dumps({'type': 'tools_count', 'count': len(tools_used)})}\n\n"
                await asyncio.sleep(0.05)

                for i, tool in enumerate(tools_used):
                    tool_display = TOOL_DISPLAY.get(tool, f"Using {tool}")

                    yield f"data: {json.dumps({'type': 'tool_start', 'tool': tool, 'message': tool_display, 'index': i})}\n\n"
                    await asyncio.sleep(0.3)  # Small delay for visual effect
                    yield f"data: {json.dumps({'type': 'tool_complete', 'tool': tool, 'index': i})}\n\n"
                    await asyncio.sleep(0.1)

            # Stream the response text word by word
            reply = result.get("response", "")
            if reply:
                # First send a "generating" event
                yield f"data: {json.dumps({'type': 'generating'})}\n\n"

                # Split into words and send with small delays
                words = reply.split(" ")
                for i, word in enumerate(words):
                    chunk = word if i == 0 else f" {word}"
                    yield f"data: {json.dumps({'type': 'token', 'content': chunk})}\n\n"
                    await asyncio.sleep(0.015)  # ~15ms per word for natural feel

            # Persist the conversation
            new_conv = await conversation_store.append_turn(
                mcp,
                user["id"],
                conversation_id=conv_id,
                user_text=payload.message,
                assistant_text=reply,
                tools_used=list(tools_used),
            )

            # Send completion with metadata
            yield f"data: {json.dumps({'type': 'done', 'conversation_id': new_conv, 'tools_used': tools_used, 'suggestions': result.get('suggestions') or []})}\n\n"

        except Exception as e:
            logger.error("stream_agent_error", error=str(e))
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering for Cloud Run
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
