"""Gemini resume → structured JSON for FLARQ."""

from __future__ import annotations

from typing import Any

from app.services.gemini.client import generate_json_from_prompt

RESUME_PARSER_SYSTEM = """
You are an expert resume parser for Flarq, an AI job search agent. Extract structured data from the resume text provided.
Return ONLY valid JSON with this exact schema:
{
  "full_name": string,
  "email": string | null,
  "phone": string | null,
  "location": string | null,
  "summary": string | null,
  "total_years_experience": number,
  "skills": [
    {
      "name": string,
      "category": "technical" | "soft" | "tool" | "language",
      "proficiency": "beginner" | "intermediate" | "advanced" | "expert"
    }
  ],
  "experience": [
    {
      "company": string,
      "title": string,
      "start_date": string,
      "end_date": string | "present",
      "description": string,
      "key_achievements": [string]
    }
  ],
  "education": [
    {
      "institution": string,
      "degree": string,
      "field": string,
      "graduation_year": number | null
    }
  ],
  "certifications": [string],
  "languages": [string]
}
Return nothing except the JSON object.
""".strip()


async def parse_resume(raw_text: str) -> dict[str, Any]:
    prompt = f"Resume text:\n\n{raw_text}"
    return await generate_json_from_prompt(
        system_instruction=RESUME_PARSER_SYSTEM,
        user_prompt=prompt,
        temperature=0.15,
    )
