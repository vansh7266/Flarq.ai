"""Gemini generation through the Google Gen AI SDK on Vertex AI."""

from __future__ import annotations

import asyncio
import concurrent.futures
import time
from functools import lru_cache

import structlog
from google import genai
from google.genai import errors
from google.genai.types import (
    AutomaticFunctionCallingConfig,
    Content,
    FunctionDeclaration,
    GenerateContentConfig,
    GenerateContentResponse,
    HttpOptions,
    SafetySetting,
    Tool,
)

from app.core.config import get_settings

logger = structlog.get_logger("vertex_ai")

_gemini_executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)
DEFAULT_SAFETY_SETTINGS = [
    SafetySetting(category=category, threshold="BLOCK_MEDIUM_AND_ABOVE")
    for category in (
        "HARM_CATEGORY_HARASSMENT",
        "HARM_CATEGORY_HATE_SPEECH",
        "HARM_CATEGORY_SEXUALLY_EXPLICIT",
        "HARM_CATEGORY_DANGEROUS_CONTENT",
    )
]


@lru_cache
def get_vertex_client(project: str, location: str) -> genai.Client:
    return genai.Client(
        vertexai=True,
        project=project,
        location=location,
        http_options=HttpOptions(api_version="v1", timeout=30_000),
    )


def init_vertex() -> None:
    """Prepare the Vertex AI client at app startup."""
    settings = get_settings()
    get_vertex_client(settings.google_cloud_project, settings.vertex_ai_location)


def _sync_generate(
    contents: str | list[Content],
    config: GenerateContentConfig,
) -> GenerateContentResponse:
    settings = get_settings()
    client = get_vertex_client(settings.google_cloud_project, settings.vertex_ai_location)
    for attempt in range(3):
        try:
            return client.models.generate_content(
                model=settings.vertex_ai_model, contents=contents, config=config
            )
        except errors.APIError as exc:
            if exc.code not in {429, 500, 502, 503, 504} or attempt == 2:
                raise
            delay = 2**attempt
            logger.warning("vertex_retry", attempt=attempt + 1, delay_s=delay, status=exc.code)
            time.sleep(delay)
    raise RuntimeError("Vertex generation retry loop exhausted")


def _generation_config(
    system_instruction: str | None,
    temperature: float,
    max_output_tokens: int,
    *,
    json_mode: bool = False,
    tools: list[Tool] | None = None,
) -> GenerateContentConfig:
    model = get_settings().vertex_ai_model
    return GenerateContentConfig(
        system_instruction=system_instruction,
        # Gemini 3.5 Flash-Lite uses its default sampling parameters.
        temperature=None if model == "gemini-3.5-flash-lite" else temperature,
        max_output_tokens=max_output_tokens,
        response_mime_type="application/json" if json_mode else None,
        safety_settings=DEFAULT_SAFETY_SETTINGS,
        tools=tools,
        automatic_function_calling=AutomaticFunctionCallingConfig(disable=True) if tools else None,
    )


class VertexAIClient:
    """Central Vertex AI client for structured responses and agent tools."""

    async def generate(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        json_mode: bool = False,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
    ) -> str:
        config = _generation_config(system_instruction, temperature, max_output_tokens, json_mode=json_mode)
        response = await asyncio.get_running_loop().run_in_executor(
            _gemini_executor, _sync_generate, prompt, config
        )
        text = (response.text or "").strip()
        if not text:
            raise ValueError("Empty model response")
        return text

    async def generate_with_tools(
        self,
        *,
        contents: list[Content],
        tools: list[Tool],
        system_instruction: str | None,
        temperature: float = 0.35,
        max_output_tokens: int = 4096,
    ) -> GenerateContentResponse:
        config = _generation_config(system_instruction, temperature, max_output_tokens, tools=tools)
        return await asyncio.get_running_loop().run_in_executor(
            _gemini_executor, _sync_generate, contents, config
        )


def build_agent_tools() -> list[Tool]:
    """Vertex AI tool definitions for the FLARQ agent."""
    get_profile = FunctionDeclaration(
        name="get_profile_summary",
        description="Get the user's profile including skills, experience, and career summary",
        parameters={"type": "object", "properties": {}, "required": []},
    )
    search_applications = FunctionDeclaration(
        name="search_applications",
        description="Search user's job applications by status, company, or date range",
        parameters={
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "description": "Filter by status: saved, applied, phone_screen, interview, offer, rejected, ghosted",
                },
                "company": {"type": "string", "description": "Filter by company name"},
                "start_date": {"type": "string", "description": "ISO date lower bound"},
                "end_date": {"type": "string", "description": "ISO date upper bound"},
            },
        },
    )
    get_analytics = FunctionDeclaration(
        name="get_analytics_insight",
        description="Get data-driven insights about job search performance and patterns",
        parameters={"type": "object", "properties": {}, "required": []},
    )
    get_stale = FunctionDeclaration(
        name="get_stale_applications",
        description="Find applications with no activity in 7+ days that need follow-up",
        parameters={"type": "object", "properties": {}, "required": []},
    )
    generate_followup = FunctionDeclaration(
        name="generate_follow_up",
        description="Generate a professional follow-up email for a specific application",
        parameters={
            "type": "object",
            "properties": {
                "application_id": {
                    "type": "string",
                    "description": "The ID of the application to follow up on",
                }
            },
            "required": ["application_id"],
        },
    )
    update_status = FunctionDeclaration(
        name="update_application_status",
        description="Update the status of a job application",
        parameters={
            "type": "object",
            "properties": {
                "application_id": {"type": "string"},
                "new_status": {"type": "string"},
                "note": {"type": "string"},
            },
            "required": ["application_id", "new_status"],
        },
    )
    declarations = [
        get_profile,
        search_applications,
        get_analytics,
        get_stale,
        generate_followup,
        update_status,
    ]
    if get_settings().jobs_vector_index.strip():
        declarations.append(
            FunctionDeclaration(
                name="search_job_descriptions",
                description="Find the user's saved job descriptions by skills, role, or requirements.",
                parameters={
                    "type": "object",
                    "properties": {"query": {"type": "string"}},
                    "required": ["query"],
                },
            )
        )
    return [Tool(function_declarations=declarations)]


vertex_client = VertexAIClient()
