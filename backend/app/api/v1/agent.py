from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.dependencies import CurrentUser
from app.core.responses import json_response

router = APIRouter(prefix="/agent", tags=["agent"])


class AgentChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


@router.post("/chat", response_model=None)
async def agent_chat(payload: AgentChatRequest, user: CurrentUser) -> JSONResponse:
    snippet = payload.message if len(payload.message) <= 160 else f"{payload.message[:157]}..."
    return json_response(
        success=True,
        message="Agent stub reply",
        data={
            "reply": (
                f"You asked: “{snippet}”. MongoDB MCP tools and Gemini reasoning will answer this "
                f"with live data in upcoming releases. For now, your request is authenticated for "
                f"user {user['email']} on FLARQ."
            )
        },
    )


@router.get("/history", response_model=None)
async def agent_history(_user: CurrentUser) -> JSONResponse:
    return json_response(
        success=True,
        message="No persisted history in Phase 1",
        data=[],
        status_code=status.HTTP_200_OK,
    )
