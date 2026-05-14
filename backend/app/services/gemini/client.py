"""Async Gemini helper with retries, JSON extraction, and Flarq-aligned defaults."""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import structlog
from google.api_core import exceptions as google_exceptions
from google import generativeai as genai

from app.core.config import get_settings

logger = structlog.get_logger("gemini")

_JSON_FENCE = re.compile(r"```(?:json)?\s*([\s\S]*?)\s*```", re.IGNORECASE)


def _strip_json_fences(text: str) -> str:
    stripped = text.strip()
    match = _JSON_FENCE.search(stripped)
    if match:
        return match.group(1).strip()
    return stripped


def _parse_json_response(raw: str) -> dict[str, Any]:
    cleaned = _strip_json_fences(raw)
    return json.loads(cleaned)


def _is_retryable(exc: BaseException) -> bool:
    if isinstance(exc, google_exceptions.GoogleAPICallError):
        code = getattr(exc, "code", None)
        if code in {429, 500, 502, 503, 504}:
            return True
    message = str(exc).lower()
    return any(token in message for token in ("429", "500", "503", "resource exhausted"))


async def generate_json_from_prompt(
    *,
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.2,
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.gemini_api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    def _invoke(*, strict_json: bool) -> str:
        genai.configure(api_key=settings.gemini_api_key)
        model = genai.GenerativeModel(
            model_name=settings.gemini_model,
            system_instruction=system_instruction,
        )
        suffix = (
            "\n\nReturn ONLY a single JSON object matching the schema. "
            "No markdown fences, no commentary."
            if strict_json
            else ""
        )
        cfg = genai.types.GenerationConfig(
            temperature=0.0 if strict_json else temperature,
        )
        response = model.generate_content(
            user_prompt + suffix,
            generation_config=cfg,
        )
        text = (getattr(response, "text", None) or "").strip()
        if not text and response.candidates:
            parts = response.candidates[0].content.parts
            text = "".join(getattr(p, "text", "") for p in parts).strip()
        if not text:
            raise ValueError("Empty model response")
        return text

    last_error: BaseException | None = None
    for attempt in range(3):
        try:
            raw = await asyncio.to_thread(_invoke, strict_json=False)
            return _parse_json_response(raw)
        except json.JSONDecodeError as exc:
            last_error = exc
            logger.warning("gemini_json_parse_failed", attempt=attempt + 1, error=str(exc))
            try:
                raw_retry = await asyncio.to_thread(_invoke, strict_json=True)
                return _parse_json_response(raw_retry)
            except Exception as exc2:  # noqa: BLE001
                last_error = exc2
                logger.warning("gemini_json_retry_failed", error=str(exc2))
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            if _is_retryable(exc):
                delay = 0.4 * (2**attempt)
                logger.warning("gemini_retryable_error", attempt=attempt + 1, error=str(exc))
                await asyncio.sleep(delay)
                continue
            raise

    raise RuntimeError("AI processing failed. Please try again.") from last_error
