"""Gemini-generated follow-up email (JSON: subject, body)."""

from __future__ import annotations

from app.services.gemini.client import generate_json_from_prompt

SYSTEM = """You are Flarq's outreach assistant. Write a brief, professional follow-up email (max 100 words).
Reference the original application context. Be warm, not desperate. Show continued interest. Ask about timeline.
Return ONLY valid JSON: {"subject": string, "body": string}"""


async def generate_follow_up_email(
    *,
    company_name: str,
    job_title: str,
    cover_letter_excerpt: str | None,
) -> dict[str, str]:
    excerpt = (cover_letter_excerpt or "")[:1200]
    user_prompt = (
        f"Company: {company_name}\nRole: {job_title}\n"
        f"Cover letter excerpt (if any):\n{excerpt}\n"
        "Generate the follow-up JSON."
    )
    data = await generate_json_from_prompt(
        system_instruction=SYSTEM,
        user_prompt=user_prompt,
        temperature=0.35,
    )
    return {
        "subject": str(data.get("subject") or "Following up on my application"),
        "body": str(data.get("body") or ""),
    }
