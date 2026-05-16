"""Gemini job description → structured requirements for FLARQ."""

from __future__ import annotations

from typing import Any

from app.services.gemini.client import generate_json_from_prompt
from app.utils.sanitize import sanitize_input

JD_ANALYST_SYSTEM = """
You are a job description analyst for Flarq. Extract structured requirements from this job description.
Return ONLY valid JSON:
{
  "job_title": string,
  "company_name": string | null,
  "employment_type": "full-time"|"part-time"|"contract"|"internship"|null,
  "experience_required": {
    "min_years": number | null,
    "max_years": number | null,
    "level": "entry"|"mid"|"senior"|"lead"|"executive"|null
  },
  "required_skills": [
    {
      "name": string,
      "category": "technical"|"soft"|"tool"|"language",
      "importance": "must-have"|"nice-to-have"
    }
  ],
  "responsibilities": [string],
  "benefits": [string],
  "location": string | null,
  "remote_policy": "remote"|"hybrid"|"onsite"|null,
  "salary_range": {
    "min": number | null,
    "max": number | null,
    "currency": string | null
  } | null,
  "company_size": string | null,
  "industry": string | null
}
""".strip()


def sanitize_jd(text: str) -> str:
    return sanitize_input(text, 10000)


async def analyze_jd(jd_text: str) -> dict[str, Any]:
    sanitized_text = sanitize_jd(jd_text)
    prompt = f"Job description:\n\n{sanitized_text}"
    return await generate_json_from_prompt(
        system_instruction=JD_ANALYST_SYSTEM,
        user_prompt=prompt,
        temperature=0.15,
    )
