"""Gemini gap analysis: candidate profile vs JD analysis for FLARQ."""

from __future__ import annotations

import json
from typing import Any

from app.services.gemini.client import generate_json_from_prompt

GAP_SYSTEM = """
You are Flarq's intelligent gap analysis engine. Compare the candidate profile against the job requirements.
Return ONLY valid JSON:
{
  "match_score": number,
  "match_level": "strong"|"good"|"fair"|"weak",
  "matching_skills": [
    { "skill": string, "importance": "must-have"|"nice-to-have" }
  ],
  "missing_skills": [
    {
      "skill": string,
      "importance": "must-have"|"nice-to-have",
      "how_to_acquire": string
    }
  ],
  "experience_match": {
    "required_years": number | null,
    "candidate_years": number,
    "verdict": "overqualified"|"match"|"slightly-under"|"underqualified"
  },
  "strengths": [string],
  "weaknesses": [string],
  "recommendation": string,
  "application_strategy": string
}
match_score must be an integer from 0 to 100 inclusive.
""".strip()


async def analyze_gap(profile: dict[str, Any], jd_analysis: dict[str, Any]) -> dict[str, Any]:
    user_prompt = (
        "Candidate profile JSON:\n"
        f"{json.dumps(profile, ensure_ascii=False)}\n\n"
        "Job analysis JSON:\n"
        f"{json.dumps(jd_analysis, ensure_ascii=False)}"
    )
    return await generate_json_from_prompt(
        system_instruction=GAP_SYSTEM,
        user_prompt=user_prompt,
        temperature=0.2,
    )
