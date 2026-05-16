from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Body, File, UploadFile, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.config import get_settings
from app.core.dependencies import CurrentUser, MCPClient
from app.core.responses import json_response
from app.services.gemini.resume_parser import parse_resume
from app.services.mongodb.mcp_client import utcnow
from app.utils.file_parser import (
    UnsupportedResumeFormatError,
    extract_resume_text,
)
from app.utils.text_cleaner import clean_extracted_text

router = APIRouter(prefix="/profile", tags=["profile"])

ALLOWED_RESUME_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword",
}


def _iso(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _compute_completeness(parsed: dict[str, Any] | None) -> int:
    if not parsed:
        return 0
    score = 0
    if parsed.get("full_name"):
        score += 12
    if parsed.get("email"):
        score += 8
    if parsed.get("summary"):
        score += 10
    skills = parsed.get("skills") or []
    score += min(20, len(skills) * 2)
    experience = parsed.get("experience") or []
    score += min(25, len(experience) * 5)
    education = parsed.get("education") or []
    score += min(15, len(education) * 5)
    if parsed.get("location"):
        score += 5
    if parsed.get("certifications"):
        score += 3
    if parsed.get("languages"):
        score += 2
    return int(min(100, score))


def _serialize_profile(document: dict[str, Any]) -> dict[str, Any]:
    parsed = document.get("parsed_resume")
    skills_simple = document.get("skills") or []
    if not skills_simple and parsed:
        skills_simple = [
            str(s.get("name"))
            for s in (parsed.get("skills") or [])
            if isinstance(s, dict) and s.get("name")
        ]

    category_counts: dict[str, int] = {}
    if parsed and isinstance(parsed.get("skills"), list):
        for skill in parsed["skills"]:
            if not isinstance(skill, dict):
                continue
            cat = str(skill.get("category") or "technical")
            category_counts[cat] = category_counts.get(cat, 0) + 1

    completeness = document.get("profile_completeness")
    if completeness is None:
        completeness = _compute_completeness(parsed)

    return {
        "userId": document["user_id"],
        "headline": document.get("headline"),
        "summary": document.get("summary"),
        "skills": skills_simple,
        "parsedResume": parsed,
        "resumeFileName": document.get("resume_file_name"),
        "resumeUploadedAt": _iso(document.get("resume_uploaded_at")),
        "profileCompleteness": completeness,
        "skillCategoryCounts": category_counts,
        "updatedAt": _iso(document.get("updated_at")),
    }


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    headline: str | None = Field(default=None, max_length=200)
    summary: str | None = Field(default=None, max_length=8000)
    skills: list[str] | None = None
    parsed_resume: dict[str, Any] | None = Field(default=None, alias="parsedResume")


@router.get("", response_model=None)
async def get_profile(user: CurrentUser, mcp: MCPClient) -> JSONResponse:
    document = await mcp.find_one("profiles", {"user_id": user["id"]})
    if document is None:
        return json_response(success=True, message="No profile yet", data=None)

    return json_response(
        success=True,
        message="Profile loaded",
        data=_serialize_profile(document),
    )


@router.put("", response_model=None)
async def update_profile(
    payload: ProfileUpdateRequest,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    update_fields: dict[str, Any] = {}
    if payload.headline is not None:
        update_fields["headline"] = payload.headline
    if payload.summary is not None:
        update_fields["summary"] = payload.summary
    if payload.skills is not None:
        update_fields["skills"] = payload.skills
    if payload.parsed_resume is not None:
        update_fields["parsed_resume"] = payload.parsed_resume
        update_fields["profile_completeness"] = _compute_completeness(payload.parsed_resume)

    if not update_fields:
        return json_response(
            success=False,
            message="No fields to update",
            data=None,
            error={"code": "EMPTY_UPDATE"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    now = utcnow()
    await mcp.update_one(
        "profiles",
        {"user_id": user["id"]},
        {
            "$set": {**update_fields, "updated_at": now},
            "$setOnInsert": {"user_id": user["id"], "created_at": now, "skills": []},
        },
        upsert=True,
    )

    document = await mcp.find_one("profiles", {"user_id": user["id"]})
    return json_response(
        success=True,
        message="Profile updated",
        data=_serialize_profile(document) if document else None,
    )


@router.post("/upload-resume", response_model=None)
async def upload_resume(
    user: CurrentUser,
    mcp: MCPClient,
    file: UploadFile = File(...),
) -> JSONResponse:
    settings = get_settings()
    max_bytes = settings.max_resume_size_mb * 1024 * 1024
    data = await file.read()
    if len(data) > max_bytes:
        return json_response(
            success=False,
            message=f"File too large. Maximum size is {settings.max_resume_size_mb} MB.",
            data=None,
            error={"code": "FILE_TOO_LARGE"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    content_type = file.content_type or ""
    if content_type not in ALLOWED_RESUME_TYPES:
        return json_response(
            success=False,
            message="Only PDF and DOCX files are accepted",
            data=None,
            error={"code": "UNSUPPORTED_TYPE"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    magic = data[:8]
    is_pdf = content_type == "application/pdf" and magic.startswith(b"%PDF")
    is_docx = (
        content_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        and magic.startswith(b"PK\x03\x04")
    )
    is_doc = content_type == "application/msword" and magic.startswith(b"\xd0\xcf\x11\xe0")
    if not (is_pdf or is_docx or is_doc):
        return json_response(
            success=False,
            message="File signature does not match an accepted PDF or DOCX document",
            data=None,
            error={"code": "INVALID_FILE_SIGNATURE"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        raw = extract_resume_text(data, file.filename or "resume")
    except UnsupportedResumeFormatError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "UNSUPPORTED_FORMAT"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    cleaned = clean_extracted_text(raw)
    if len(cleaned) < 40:
        return json_response(
            success=False,
            message="Could not extract enough text from this file.",
            data=None,
            error={"code": "EMPTY_TEXT"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    try:
        parsed = await parse_resume(cleaned)
    except RuntimeError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "AI_PROCESSING_FAILED"},
            status_code=status.HTTP_502_BAD_GATEWAY,
        )

    now = utcnow()
    await mcp.update_one(
        "profiles",
        {"user_id": user["id"]},
        {
            "$set": {
                "resume_file_name": file.filename,
                "resume_uploaded_at": now,
                "resume_last_parsed_at": now,
                "pending_parsed_resume": parsed,
                "updated_at": now,
            },
            "$setOnInsert": {"user_id": user["id"], "created_at": now, "skills": []},
        },
        upsert=True,
    )

    return json_response(
        success=True,
        message="Resume parsed. Confirm to save to your profile.",
        data={"profile_id": user["id"], "parsed_data": parsed},
    )


@router.post("/confirm-parsed-resume", response_model=None)
async def confirm_parsed_resume(
    user: CurrentUser,
    mcp: MCPClient,
    payload: dict[str, Any] = Body(...),
) -> JSONResponse:
    if "full_name" not in payload or "skills" not in payload:
        return json_response(
            success=False,
            message="Invalid payload: full_name and skills are required.",
            data=None,
            error={"code": "INVALID_PAYLOAD"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    completeness = _compute_completeness(payload)
    skills_simple = [
        str(s.get("name"))
        for s in payload.get("skills", [])
        if isinstance(s, dict) and s.get("name")
    ]
    now = utcnow()
    summary = payload.get("summary")
    headline = str(payload.get("full_name") or "")

    await mcp.update_one(
        "profiles",
        {"user_id": user["id"]},
        {
            "$set": {
                "parsed_resume": payload,
                "pending_parsed_resume": None,
                "skills": skills_simple,
                "summary": summary,
                "headline": headline,
                "profile_completeness": completeness,
                "updated_at": now,
            },
            "$setOnInsert": {"user_id": user["id"], "created_at": now, "skills": skills_simple},
        },
        upsert=True,
    )

    document = await mcp.find_one("profiles", {"user_id": user["id"]})
    return json_response(
        success=True,
        message="Profile saved",
        data=_serialize_profile(document) if document else None,
    )
