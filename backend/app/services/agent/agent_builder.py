"""Vertex AI function-calling agent loop for Flarq."""

from __future__ import annotations

import json
import asyncio
from typing import Any

import structlog
from vertexai.generative_models import Content, Part

from app.core.config import get_settings
from app.services.agent import agent_tools
from app.services.gemini.client import generate_json_from_prompt
from app.services.gemini.vertex_client import build_agent_tools, vertex_client
from app.services.mongodb.mcp_client import FlarqMCPClient

logger = structlog.get_logger("agent")

SYSTEM_PROMPT = """You are Flarq, an intelligent job search agent. You help users manage their job search through reasoning and action.

You have access to these tools:
- get_profile_summary: See the user's skills and experience
- search_applications: Find specific applications (filters: status, company, date range)
- get_analytics_insight: Get data-driven insights from their pipeline
- get_stale_applications: Find applications needing follow-up
- generate_follow_up: Write follow-up email for an application (needs application_id)
- update_application_status: Update application records (application_id, new_status, optional note)

Be proactive. If the user says "how am I doing?", run get_analytics_insight automatically. If they mention a company, search_applications for it. Always ground your answers in their actual data.

Tone: Direct, intelligent, encouraging. Like a sharp career coach who also happens to have access to all their data.

After tools return, synthesize a concise answer (under 220 words unless they ask for detail)."""


def _fc_args(fc: Any) -> dict[str, Any]:
    args = getattr(fc, "args", None)
    if args is None:
        return {}
    if isinstance(args, dict):
        return dict(args)
    if hasattr(args, "items"):
        try:
            return dict(args.items())
        except Exception:  # noqa: BLE001
            pass
    try:
        from google.protobuf.json_format import MessageToDict

        return MessageToDict(args)
    except Exception:  # noqa: BLE001
        return json.loads(json.dumps(args, default=str))


def _history_to_contents(history: list[dict[str, Any]]) -> list[Content]:
    out: list[Content] = []
    for turn in history[-10:]:
        role = turn.get("role") or "user"
        if role == "assistant":
            role = "model"
        text = str(turn.get("content") or "").strip()
        if not text:
            continue
        out.append(Content(role=role, parts=[Part.from_text(text)]))
    return out


async def _build_suggestions(user_message: str, assistant_reply: str) -> list[str]:
    try:
        data = await generate_json_from_prompt(
            system_instruction='Return JSON only: {"suggestions": [string, string, string]} — short next prompts (max 6 words each).',
            user_prompt=f"User asked: {user_message[:400]}\nAssistant answered: {assistant_reply[:800]}",
            temperature=0.4,
        )
        sugs = data.get("suggestions") if isinstance(data, dict) else None
        if isinstance(sugs, list) and len(sugs) >= 3:
            return [str(sugs[0]), str(sugs[1]), str(sugs[2])]
    except Exception:  # noqa: BLE001
        pass
    return [
        "How am I doing?",
        "What needs follow-up?",
        "Analyze my patterns",
    ]


async def run_agent(
    mcp: FlarqMCPClient,
    user_id: str,
    message: str,
    history: list[dict[str, Any]],
) -> dict[str, Any]:
    settings = get_settings()
    if not (settings.google_cloud_project or "").strip():
        raise RuntimeError("GOOGLE_CLOUD_PROJECT is required for the FLARQ agent (Vertex AI).")

    tools = build_agent_tools()
    contents: list[Content] = _history_to_contents(history)
    contents.append(Content(role="user", parts=[Part.from_text(message)]))

    tools_used: list[str] = []

    for _ in range(8):
        response = await vertex_client.generate_with_tools(
            contents=contents,
            tools=tools,
            system_instruction=SYSTEM_PROMPT,
            temperature=0.35,
        )
        if not response.candidates:
            logger.warning("agent_empty_candidates")
            break
        cand = response.candidates[0]
        parts = list(cand.content.parts)
        fcs = [p.function_call for p in parts if getattr(p, "function_call", None) and p.function_call.name]

        if not fcs:
            final_text = (getattr(response, "text", None) or "").strip()
            suggestions = await _build_suggestions(message, final_text)
            return {
                "response": final_text or "I could not produce a response. Please try again.",
                "tools_used": tools_used,
                "suggestions": suggestions,
            }

        contents.append(cand.content)
        tool_calls = [(fc.name, _fc_args(fc)) for fc in fcs]
        tools_used.extend(name for name, _args in tool_calls)
        results = await asyncio.gather(
            *[
                agent_tools.dispatch_tool(mcp, user_id, name, args)
                for name, args in tool_calls
            ]
        )
        fr_parts = [
            Part.from_function_response(name=name, response=result)
            for (name, _args), result in zip(tool_calls, results, strict=True)
        ]
        contents.append(Content(role="user", parts=fr_parts))

    return {
        "response": "I hit the maximum tool depth — please narrow your question.",
        "tools_used": tools_used,
        "suggestions": await _build_suggestions(message, ""),
    }
