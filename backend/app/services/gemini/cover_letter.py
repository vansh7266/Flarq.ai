"""Gemini cover letter generation for FLARQ."""

from __future__ import annotations

import json
from typing import Any, Literal

from app.services.gemini.client import generate_json_from_prompt
from app.utils.sanitize import sanitize_value

Tone = Literal["professional", "conversational", "bold"]


def _cover_letter_system(tone: Tone) -> str:
    return f"""
You are Flarq's cover letter writer. Write a compelling, tailored cover letter. Rules:
- 3-4 paragraphs, max 400 words
- Opening: hook that references the specific role/company
- Body: connect candidate's top matching skills to JD needs
- Address top gap proactively and positively if critical
- Closing: confident CTA
- Never use generic phrases like "I am writing to apply"
- Tone: {tone}
Return ONLY valid JSON:
{{
  "subject_line": string,
  "body": string,
  "word_count": number,
  "key_points_highlighted": [string]
}}
""".strip()


async def generate_cover_letter(
    profile: dict[str, Any],
    jd_analysis: dict[str, Any],
    gap_analysis: dict[str, Any],
    tone: Tone = "professional",
) -> dict[str, Any]:
    profile = sanitize_value(profile, 10000)
    jd_analysis = sanitize_value(jd_analysis, 10000)
    gap_analysis = sanitize_value(gap_analysis, 10000)
    user_prompt = (
        f"Tone: {tone}\n\n"
        "Candidate profile JSON:\n"
        f"{json.dumps(profile, ensure_ascii=False)}\n\n"
        "Job analysis JSON:\n"
        f"{json.dumps(jd_analysis, ensure_ascii=False)}\n\n"
        "Gap analysis JSON:\n"
        f"{json.dumps(gap_analysis, ensure_ascii=False)}"
    )
    return await generate_json_from_prompt(
        system_instruction=_cover_letter_system(tone),
        user_prompt=user_prompt,
        temperature=0.35,
    )
