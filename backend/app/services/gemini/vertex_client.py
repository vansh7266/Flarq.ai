"""
Flarq Vertex AI client — Google Cloud Vertex AI (not consumer Gemini API).
"""

from __future__ import annotations

import asyncio
import concurrent.futures
import time
from typing import Any

import structlog
import vertexai
from google.api_core import exceptions as google_exceptions
from vertexai.generative_models import (
    Content,
    FunctionDeclaration,
    GenerationConfig,
    GenerativeModel,
    Part,
    Tool,
)

from app.core.config import get_settings

logger = structlog.get_logger("vertex_ai")

_initialized = False
_gemini_executor = concurrent.futures.ThreadPoolExecutor(max_workers=10)


def init_vertex() -> None:
    """Initialize Vertex AI SDK (idempotent). Call from app lifespan."""
    global _initialized
    settings = get_settings()
    project = (settings.google_cloud_project or "").strip()
    if not project:
        raise ValueError("GOOGLE_CLOUD_PROJECT is required for Vertex AI")
    location = (settings.google_cloud_location or "us-central1").strip()
    vertexai.init(project=project, location=location)
    _initialized = True
    logger.info(
        "vertex_ai_initialized",
        project=project,
        location=location,
        model=settings.vertex_ai_model,
    )


def _ensure_init() -> None:
    if not _initialized:
        init_vertex()


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(
        exc,
        (
            google_exceptions.ResourceExhausted,
            google_exceptions.ServiceUnavailable,
            google_exceptions.InternalServerError,
            google_exceptions.DeadlineExceeded,
        ),
    ):
        return True
    if isinstance(exc, google_exceptions.GoogleAPICallError):
        code = getattr(exc, "code", None)
        if code in {429, 500, 502, 503, 504}:
            return True
    msg = str(exc).lower()
    return any(x in msg for x in ("429", "500", "503", "resource exhausted", "unavailable"))


def _sync_generate_text(
    *,
    prompt: str,
    system_instruction: str | None,
    temperature: float,
    max_output_tokens: int,
    response_mime_type: str | None,
) -> str:
    _ensure_init()
    settings = get_settings()
    model_name = settings.vertex_ai_model
    gen_kwargs: dict[str, Any] = {
        "temperature": temperature,
        "max_output_tokens": max_output_tokens,
    }
    if response_mime_type:
        gen_kwargs["response_mime_type"] = response_mime_type

    last_err: BaseException | None = None
    for attempt in range(3):
        try:
            model = GenerativeModel(
                model_name=model_name,
                system_instruction=system_instruction,
                generation_config=GenerationConfig(**gen_kwargs),
            )
            response = model.generate_content(prompt)
            text = (getattr(response, "text", None) or "").strip()
            if not text and response.candidates:
                parts = response.candidates[0].content.parts
                text = "".join(getattr(p, "text", "") or "" for p in parts).strip()
            if not text:
                raise ValueError("Empty model response")
            return text
        except Exception as exc:  # noqa: BLE001
            last_err = exc
            if not _is_retryable(exc) or attempt == 2:
                raise
            delay = min(2**attempt, 10)
            logger.warning("vertex_retry", attempt=attempt + 1, delay_s=delay, error=str(exc))
            time.sleep(delay)
    raise RuntimeError("Vertex generation failed") from last_err


class VertexAIClient:
    """Central Vertex AI client for FLARQ (JSON + tool flows)."""

    async def generate(
        self,
        prompt: str,
        *,
        system_instruction: str | None = None,
        json_mode: bool = False,
        temperature: float = 0.7,
        max_output_tokens: int = 8192,
    ) -> str:
        mime = "application/json" if json_mode else "text/plain"
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(
            _gemini_executor,
            lambda: _sync_generate_text(
                prompt=prompt,
                system_instruction=system_instruction,
                temperature=temperature,
                max_output_tokens=max_output_tokens,
                response_mime_type=mime,
            ),
        )

    async def generate_with_tools(
        self,
        *,
        contents: list[Content],
        tools: list[Tool],
        system_instruction: str | None,
        temperature: float = 0.35,
        max_output_tokens: int = 4096,
    ) -> Any:
        _ensure_init()
        settings = get_settings()

        def _call() -> Any:
            last_err: BaseException | None = None
            for attempt in range(3):
                try:
                    model = GenerativeModel(
                        model_name=settings.vertex_ai_model,
                        system_instruction=system_instruction,
                        tools=tools,
                        generation_config=GenerationConfig(
                            temperature=temperature,
                            max_output_tokens=max_output_tokens,
                        ),
                    )
                    return model.generate_content(contents)
                except Exception as exc:  # noqa: BLE001
                    last_err = exc
                    if not _is_retryable(exc) or attempt == 2:
                        raise
                    delay = min(2**attempt, 10)
                    logger.warning("vertex_tools_retry", attempt=attempt + 1, error=str(exc))
                    time.sleep(delay)
            raise RuntimeError("Vertex tool generation failed") from last_err

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(_gemini_executor, _call)


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
    return [
        Tool(
            function_declarations=[
                get_profile,
                search_applications,
                get_analytics,
                get_stale,
                generate_followup,
                update_status,
            ]
        )
    ]


vertex_client = VertexAIClient()
