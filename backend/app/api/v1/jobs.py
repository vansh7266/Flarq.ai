from __future__ import annotations

import asyncio
from typing import Any, Literal

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, MCPClient
from app.core.responses import json_response
from app.services.gemini.cover_letter import generate_cover_letter
from app.services.gemini.gap_analyzer import analyze_gap
from app.services.gemini.jd_analyzer import analyze_jd
from app.services.mongodb.mcp_client import utcnow

router = APIRouter(prefix="/jobs", tags=["jobs"])


def _profile_for_ai(document: dict[str, Any]) -> dict[str, Any]:
    parsed = document.get("parsed_resume")
    if isinstance(parsed, dict) and parsed:
        return parsed
    skills = document.get("skills") or []
    return {
        "full_name": document.get("headline") or "",
        "email": None,
        "phone": None,
        "location": None,
        "summary": document.get("summary"),
        "total_years_experience": 0,
        "skills": [
            {"name": name, "category": "technical", "proficiency": "intermediate"}
            for name in skills
        ],
        "experience": [],
        "education": [],
        "certifications": [],
        "languages": [],
    }


class AnalyzeJobBody(BaseModel):
    jd_text: str = Field(min_length=50, max_length=10_000)


class GapAnalysisBody(BaseModel):
    profile_id: str = Field(min_length=1)
    jd_text: str = Field(min_length=50, max_length=10_000)


class CoverLetterBody(BaseModel):
    profile_id: str = Field(min_length=1)
    jd_id: str = Field(min_length=1)
    tone: Literal["professional", "conversational", "bold"] = "professional"


@router.post("/analyze", response_model=None)
async def analyze_job(
    body: AnalyzeJobBody,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    settings = get_settings()
    if len(body.jd_text) > settings.max_jd_length:
        return json_response(
            success=False,
            message=f"Job description exceeds {settings.max_jd_length} characters.",
            data=None,
            error={"code": "JD_TOO_LONG"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        analysis = await analyze_jd(body.jd_text)
    except RuntimeError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "AI_PROCESSING_FAILED"},
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    now = utcnow()
    jd_id = await mcp.insert_one(
        "job_descriptions",
        {
            "user_id": user["id"],
            "raw_text": body.jd_text,
            "analysis": analysis,
            "requirements": body.jd_text[:50_000],
            "created_at": now,
            "updated_at": now,
        },
    )

    return json_response(
        success=True,
        message="Job description analyzed",
        data={"jd_id": jd_id, "analysis": analysis},
    )


@router.post("/gap-analysis", response_model=None)
async def gap_analysis(
    body: GapAnalysisBody,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    settings = get_settings()
    if body.profile_id != user["id"]:
        return json_response(
            success=False,
            message="profile_id must match the authenticated user.",
            data=None,
            error={"code": "FORBIDDEN"},
            status_code=status.HTTP_403_FORBIDDEN,
        )
    if len(body.jd_text) > settings.max_jd_length:
        return json_response(
            success=False,
            message=f"Job description exceeds {settings.max_jd_length} characters.",
            data=None,
            error={"code": "JD_TOO_LONG"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    async def load_profile() -> dict[str, Any] | None:
        return await mcp.find_one("profiles", {"user_id": user["id"]})

    async def run_jd() -> dict[str, Any]:
        return await analyze_jd(body.jd_text)

    profile_doc, jd_analysis = await asyncio.gather(load_profile(), run_jd())
    if profile_doc is None or not (
        profile_doc.get("parsed_resume") or profile_doc.get("skills")
    ):
        return json_response(
            success=False,
            message="Complete your resume profile before running gap analysis.",
            data=None,
            error={"code": "PROFILE_INCOMPLETE"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        gap = await analyze_gap(_profile_for_ai(profile_doc), jd_analysis)
    except RuntimeError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "AI_PROCESSING_FAILED"},
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    now = utcnow()
    jd_id = await mcp.insert_one(
        "job_descriptions",
        {
            "user_id": user["id"],
            "raw_text": body.jd_text,
            "analysis": jd_analysis,
            "requirements": body.jd_text[:50_000],
            "created_at": now,
            "updated_at": now,
        },
    )

    return json_response(
        success=True,
        message="Gap analysis complete",
        data={
            "jd_id": jd_id,
            "jd_analysis": jd_analysis,
            "gap_analysis": gap,
        },
    )


@router.post("/cover-letter", response_model=None)
async def cover_letter(
    body: CoverLetterBody,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    if body.profile_id != user["id"]:
        return json_response(
            success=False,
            message="profile_id must match the authenticated user.",
            data=None,
            error={"code": "FORBIDDEN"},
            status_code=status.HTTP_403_FORBIDDEN,
        )

    jd_doc = await mcp.find_one(
        "job_descriptions",
        {"_id": body.jd_id, "user_id": user["id"]},
    )
    if jd_doc is None:
        return json_response(
            success=False,
            message="Job description not found.",
            data=None,
            error={"code": "JD_NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    profile_doc = await mcp.find_one("profiles", {"user_id": user["id"]})
    if profile_doc is None:
        return json_response(
            success=False,
            message="Profile not found.",
            data=None,
            error={"code": "PROFILE_NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    jd_analysis = jd_doc.get("analysis") or {}
    profile_blob = _profile_for_ai(profile_doc)

    try:
        gap = await analyze_gap(profile_blob, jd_analysis)
        letter = await generate_cover_letter(
            profile_blob,
            jd_analysis,
            gap,
            body.tone,
        )
    except RuntimeError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "AI_PROCESSING_FAILED"},
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    existing = await mcp.find_many(
        "cover_letters",
        {"user_id": user["id"], "jd_id": body.jd_id},
        sort=[("version", -1)],
        limit=1,
    )
    next_version = (
        int(existing[0].get("version", 0)) + 1 if existing else 1
    )

    now = utcnow()
    letter_id = await mcp.insert_one(
        "cover_letters",
        {
            "user_id": user["id"],
            "jd_id": body.jd_id,
            "version": next_version,
            "tone": body.tone,
            "subject_line": letter.get("subject_line"),
            "body": letter.get("body"),
            "word_count": letter.get("word_count"),
            "key_points_highlighted": letter.get("key_points_highlighted", []),
            "gap_analysis_snapshot": gap,
            "created_at": now,
        },
    )

    return json_response(
        success=True,
        message="Cover letter generated",
        data={
            "cover_letter_id": letter_id,
            "version": next_version,
            "cover_letter": letter,
            "gap_analysis": gap,
        },
    )
