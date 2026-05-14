"""Vertex AI Gemini JSON helper — retries, JSON extraction, FLARQ defaults."""

from __future__ import annotations

import asyncio
import json
import re
from typing import Any

import structlog

from app.services.gemini.vertex_client import vertex_client

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


async def generate_json_from_prompt(
    *,
    system_instruction: str,
    user_prompt: str,
    temperature: float = 0.2,
) -> dict[str, Any]:
    suffix_loose = "\n\nReturn a single JSON object matching the schema. JSON only."
    suffix_strict = (
        "\n\nReturn ONLY a single JSON object matching the schema. "
        "No markdown fences, no commentary."
    )

    last_error: BaseException | None = None
    for attempt in range(3):
        try:
            raw = await vertex_client.generate(
                user_prompt + suffix_loose,
                system_instruction=system_instruction,
                json_mode=True,
                temperature=temperature,
            )
            return _parse_json_response(raw)
        except json.JSONDecodeError as exc:
            last_error = exc
            logger.warning("vertex_json_parse_failed", attempt=attempt + 1, error=str(exc))
            try:
                raw_retry = await vertex_client.generate(
                    user_prompt + suffix_strict,
                    system_instruction=system_instruction,
                    json_mode=True,
                    temperature=0.0,
                )
                return _parse_json_response(raw_retry)
            except Exception as exc2:  # noqa: BLE001
                last_error = exc2
                logger.warning("vertex_json_retry_failed", error=str(exc2))
        except Exception as exc:  # noqa: BLE001
            last_error = exc
            delay = 0.4 * (2**attempt)
            logger.warning("vertex_generation_error", attempt=attempt + 1, error=str(exc))
            await asyncio.sleep(delay)
            continue

    raise RuntimeError("AI processing failed. Please try again.") from last_error
