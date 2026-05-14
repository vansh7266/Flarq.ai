"""Gemini function-calling agent loop for Flarq."""

from __future__ import annotations

import json
from typing import Any

import google.protobuf.json_format as proto_json
from google import generativeai as genai
from google.generativeai import protos
from google.generativeai.types import FunctionDeclaration, Tool
from google.protobuf.json_format import ParseDict
from google.protobuf.struct_pb2 import Struct

from app.core.config import get_settings
from app.services.agent import agent_tools
from app.services.gemini.client import generate_json_from_prompt
from app.services.mongodb.mcp_client import MongoMCPClient

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


def _tool_specs() -> Tool:
    return Tool(
        function_declarations=[
            FunctionDeclaration(
                name="get_profile_summary",
                description="Load the user's saved profile headline, summary, and skills.",
                parameters={"type": "object", "properties": {}},
            ),
            FunctionDeclaration(
                name="search_applications",
                description="Search the user's applications with optional filters.",
                parameters={
                    "type": "object",
                    "properties": {
                        "status": {"type": "string", "description": "Application status filter"},
                        "company": {"type": "string", "description": "Company name substring"},
                        "start_date": {"type": "string", "description": "ISO date lower bound"},
                        "end_date": {"type": "string", "description": "ISO date upper bound"},
                    },
                },
            ),
            FunctionDeclaration(
                name="get_analytics_insight",
                description="Summarize funnel metrics, rates, and pattern insights.",
                parameters={"type": "object", "properties": {}},
            ),
            FunctionDeclaration(
                name="get_stale_applications",
                description="Applications in applied/phone_screen/interview with no updates in 7+ days.",
                parameters={"type": "object", "properties": {}},
            ),
            FunctionDeclaration(
                name="generate_follow_up",
                description="Generate a follow-up email for a specific application.",
                parameters={
                    "type": "object",
                    "properties": {
                        "application_id": {"type": "string"},
                    },
                    "required": ["application_id"],
                },
            ),
            FunctionDeclaration(
                name="update_application_status",
                description="Update an application's status and optionally log a note.",
                parameters={
                    "type": "object",
                    "properties": {
                        "application_id": {"type": "string"},
                        "new_status": {"type": "string"},
                        "note": {"type": "string"},
                    },
                    "required": ["application_id", "new_status"],
                },
            ),
        ]
    )


def _fc_args_to_dict(fc: protos.FunctionCall) -> dict[str, Any]:
    if not fc.args:
        return {}
    try:
        return proto_json.MessageToDict(fc.args)
    except Exception:  # noqa: BLE001
        return dict(fc.args)


def _history_contents(history: list[dict[str, Any]]) -> list[protos.Content]:
    out: list[protos.Content] = []
    for turn in history[-10:]:
        role = turn.get("role") or "user"
        if role == "assistant":
            role = "model"
        content = str(turn.get("content") or "").strip()
        if not content:
            continue
        out.append(protos.Content(role=role, parts=[protos.Part(text=content)]))
    return out


def _result_struct(result: dict[str, Any]) -> Struct:
    safe = json.loads(json.dumps(result, default=str))
    return ParseDict(safe, Struct())


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
    mcp: MongoMCPClient,
    user_id: str,
    message: str,
    history: list[dict[str, Any]],
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    genai.configure(api_key=settings.gemini_api_key)
    model_name = settings.gemini_model
    if "/" not in model_name:
        model_name = f"models/{model_name}"

    tools_used: list[str] = []
    model = genai.GenerativeModel(
        model_name=model_name,
        system_instruction=SYSTEM_PROMPT,
        tools=[_tool_specs()],
    )

    contents: list[protos.Content] = _history_contents(history)
    contents.append(protos.Content(role="user", parts=[protos.Part(text=message)]))

    cfg = genai.types.GenerationConfig(temperature=0.35)

    for _ in range(8):
        response = await model.generate_content_async(
            contents,
            generation_config=cfg,
        )
        cand = response.candidates[0]
        parts = list(cand.content.parts)
        fcs = [p.function_call for p in parts if p.function_call and p.function_call.name]
        if not fcs:
            final_text = (response.text or "").strip()
            suggestions = await _build_suggestions(message, final_text)
            return {
                "response": final_text or "I could not produce a response. Please try again.",
                "tools_used": tools_used,
                "suggestions": suggestions,
            }

        contents.append(protos.Content(role="model", parts=[protos.Part(function_call=fc) for fc in fcs]))
        fr_parts: list[protos.Part] = []
        for fc in fcs:
            name = fc.name
            tools_used.append(name)
            args = _fc_args_to_dict(fc)
            result = await agent_tools.dispatch_tool(mcp, user_id, name, args)
            fr_parts.append(
                protos.Part(
                    function_response=protos.FunctionResponse(
                        name=name,
                        response=_result_struct(result),
                    )
                )
            )
        contents.append(protos.Content(role="user", parts=fr_parts))

    return {
        "response": "I hit the maximum tool depth — please narrow your question.",
        "tools_used": tools_used,
        "suggestions": await _build_suggestions(message, ""),
    }
