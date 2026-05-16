from __future__ import annotations

import re
from typing import Any

INJECTION_PATTERNS = [
    r"(?i)ignore previous instructions",
    r"(?i)ignore all previous",
    r"(?i)system prompt",
    r"(?i)you are now",
    r"(?i)disregard",
    r"(?i)forget everything",
    r"(?i)new instructions:",
    r"(?i)override your",
    r"(?i)act as",
    r"(?i)pretend you are",
    r"(?i)jailbreak",
]


def sanitize_input(text: str, max_length: int = 10000) -> str:
    for pattern in INJECTION_PATTERNS:
        text = re.sub(pattern, "[REDACTED]", text)
    return text[:max_length]


def sanitize_value(value: Any, max_length: int = 10000) -> Any:
    if isinstance(value, str):
        return sanitize_input(value, max_length)
    if isinstance(value, list):
        return [sanitize_value(item, max_length) for item in value]
    if isinstance(value, dict):
        return {key: sanitize_value(item, max_length) for key, item in value.items()}
    return value
