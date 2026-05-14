from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from fastapi import APIRouter, Query, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, MCPClient
from app.core.responses import json_response
from app.services.applications.application_service import ApplicationService, is_valid_status

router = APIRouter(prefix="/applications", tags=["applications"])


class ApplicationCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    company_name: str | None = Field(default=None, alias="companyName", min_length=1, max_length=200)
    job_title: str | None = Field(default=None, alias="jobTitle", min_length=1, max_length=200)
    company: str | None = Field(default=None, min_length=1, max_length=200)
    role_title: str | None = Field(default=None, alias="roleTitle", min_length=1, max_length=200)
    status: str = "saved"
    jd_id: str | None = Field(default=None, alias="jobDescriptionId")
    cover_letter_id: str | None = Field(default=None, alias="coverLetterId")
    notes: str | None = Field(default=None, max_length=4000)
    source: str | None = None
    priority: Literal["high", "medium", "low"] = "medium"
    tags: list[str] | None = None
    match_score: float | None = Field(default=None, alias="matchScore")
    salary_expectation: str | None = Field(default=None, alias="salaryExpectation")
    contact_name: str | None = Field(default=None, alias="contactName")
    contact_email: str | None = Field(default=None, alias="contactEmail")

    def resolved_company(self) -> str:
        if self.company_name:
            return self.company_name.strip()
        if self.company:
            return self.company.strip()
        return ""

    def resolved_title(self) -> str:
        if self.job_title:
            return self.job_title.strip()
        if self.role_title:
            return self.role_title.strip()
        return ""


class ApplicationUpdateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    company_name: str | None = Field(default=None, alias="companyName", max_length=200)
    job_title: str | None = Field(default=None, alias="jobTitle", max_length=200)
    status: str | None = None
    jd_id: str | None = Field(default=None, alias="jobDescriptionId")
    cover_letter_id: str | None = Field(default=None, alias="coverLetterId")
    source: str | None = None
    priority: Literal["high", "medium", "low"] | None = None
    tags: list[str] | None = None
    match_score: float | None = Field(default=None, alias="matchScore")
    notes: str | None = Field(default=None, max_length=4000)
    salary_expectation: str | None = Field(default=None, alias="salaryExpectation")
    contact_name: str | None = Field(default=None, alias="contactName")
    contact_email: str | None = Field(default=None, alias="contactEmail")
    rejection_reason: str | None = Field(default=None, alias="rejectionReason")
    offer_amount: str | None = Field(default=None, alias="offerAmount")
    interview_dates: list[str] | None = Field(default=None, alias="interviewDates")


class NoteBody(BaseModel):
    text: str = Field(min_length=1, max_length=4000)


class InterviewBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    scheduled_at: datetime = Field(alias="scheduledAt")


@router.get("/stale", response_model=None)
async def list_stale_applications(user: CurrentUser, mcp: MCPClient) -> JSONResponse:
    svc = ApplicationService(mcp)
    items = await svc.list_stale(user["id"])
    return json_response(success=True, message="Stale applications", data={"items": items})


@router.get("", response_model=None)
async def list_applications(
    user: CurrentUser,
    mcp: MCPClient,
    status_filter: str | None = Query(default=None, alias="status"),
    sort: Literal["last_updated", "created_at", "applied_date"] = Query(default="last_updated"),
    limit: int = Query(default=50, ge=1, le=200),
) -> JSONResponse:
    svc = ApplicationService(mcp)
    if status_filter and not is_valid_status(status_filter):
        return json_response(
            success=False,
            message="Invalid status filter",
            data=None,
            error={"code": "INVALID_STATUS"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    data = await svc.list_grouped(
        user["id"],
        status=status_filter,
        sort=sort,
        limit=limit,
    )
    return json_response(success=True, message="Applications loaded", data=data)


@router.post("", response_model=None)
async def create_application(
    payload: ApplicationCreateRequest,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    company = payload.resolved_company()
    title = payload.resolved_title()
    if not company or not title:
        return json_response(
            success=False,
            message="companyName and jobTitle are required",
            data=None,
            error={"code": "VALIDATION_ERROR"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if not is_valid_status(payload.status):
        return json_response(
            success=False,
            message="Invalid status",
            data=None,
            error={"code": "INVALID_STATUS"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    svc = ApplicationService(mcp)
    created = await svc.create(
        user["id"],
        {
            "company_name": company,
            "job_title": title,
            "status": payload.status,
            "jd_id": payload.jd_id,
            "cover_letter_id": payload.cover_letter_id,
            "notes": payload.notes,
            "source": payload.source,
            "priority": payload.priority,
            "tags": payload.tags,
            "match_score": payload.match_score,
            "salary_expectation": payload.salary_expectation,
            "contact_name": payload.contact_name,
            "contact_email": payload.contact_email,
        },
    )
    return json_response(
        success=True,
        message="Application created",
        data=created,
        status_code=status.HTTP_201_CREATED,
    )


@router.get("/{application_id}", response_model=None)
async def get_application(
    application_id: str,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    svc = ApplicationService(mcp)
    try:
        detail = await svc.get_detail(user["id"], application_id)
    except ValueError:
        return json_response(
            success=False,
            message="Invalid application id",
            data=None,
            error={"code": "INVALID_ID"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if detail is None:
        return json_response(
            success=False,
            message="Application not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return json_response(success=True, message="Application detail", data=detail)


@router.put("/{application_id}", response_model=None)
async def update_application(
    application_id: str,
    payload: ApplicationUpdateRequest,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    body: dict[str, Any] = {}
    if payload.company_name is not None:
        body["company_name"] = payload.company_name
    if payload.job_title is not None:
        body["job_title"] = payload.job_title
    if payload.status is not None:
        if not is_valid_status(payload.status):
            return json_response(
                success=False,
                message="Invalid status",
                data=None,
                error={"code": "INVALID_STATUS"},
                status_code=status.HTTP_400_BAD_REQUEST,
            )
        body["status"] = payload.status
    if payload.jd_id is not None:
        body["jd_id"] = payload.jd_id
    if payload.cover_letter_id is not None:
        body["cover_letter_id"] = payload.cover_letter_id
    if payload.source is not None:
        body["source"] = payload.source
    if payload.priority is not None:
        body["priority"] = payload.priority
    if payload.tags is not None:
        body["tags"] = payload.tags
    if payload.match_score is not None:
        body["match_score"] = payload.match_score
    if payload.salary_expectation is not None:
        body["salary_expectation"] = payload.salary_expectation
    if payload.contact_name is not None:
        body["contact_name"] = payload.contact_name
    if payload.contact_email is not None:
        body["contact_email"] = payload.contact_email
    if payload.rejection_reason is not None:
        body["rejection_reason"] = payload.rejection_reason
    if payload.offer_amount is not None:
        body["offer_amount"] = payload.offer_amount
    if payload.interview_dates is not None:
        parsed: list[datetime] = []
        for s in payload.interview_dates:
            try:
                parsed.append(datetime.fromisoformat(s.replace("Z", "+00:00")))
            except ValueError:
                return json_response(
                    success=False,
                    message="Invalid interviewDates ISO value",
                    data=None,
                    error={"code": "INVALID_DATE"},
                    status_code=status.HTTP_400_BAD_REQUEST,
                )
        body["interview_dates"] = parsed
    if not body:
        return json_response(
            success=False,
            message="No fields to update",
            data=None,
            error={"code": "EMPTY_UPDATE"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    svc = ApplicationService(mcp)
    try:
        updated = await svc.update(user["id"], application_id, body)
    except ValueError:
        return json_response(
            success=False,
            message="Invalid application id",
            data=None,
            error={"code": "INVALID_ID"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if updated is None:
        return json_response(
            success=False,
            message="Application not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return json_response(success=True, message="Application updated", data=updated)


@router.delete("/{application_id}", response_model=None)
async def delete_application(
    application_id: str,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    svc = ApplicationService(mcp)
    try:
        ok = await svc.soft_delete(user["id"], application_id)
    except ValueError:
        return json_response(
            success=False,
            message="Invalid application id",
            data=None,
            error={"code": "INVALID_ID"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if not ok:
        return json_response(
            success=False,
            message="Application not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return json_response(success=True, message="Application archived", data=None)


@router.post("/{application_id}/notes", response_model=None)
async def append_application_note(
    application_id: str,
    body: NoteBody,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    svc = ApplicationService(mcp)
    try:
        updated = await svc.append_note(user["id"], application_id, body.text)
    except ValueError:
        return json_response(
            success=False,
            message="Invalid application id",
            data=None,
            error={"code": "INVALID_ID"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if updated is None:
        return json_response(
            success=False,
            message="Application not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return json_response(success=True, message="Note added", data=updated)


@router.post("/{application_id}/interview", response_model=None)
async def add_application_interview(
    application_id: str,
    body: InterviewBody,
    user: CurrentUser,
    mcp: MCPClient,
) -> JSONResponse:
    svc = ApplicationService(mcp)
    try:
        updated = await svc.append_interview(user["id"], application_id, body.scheduled_at)
    except ValueError:
        return json_response(
            success=False,
            message="Invalid application id",
            data=None,
            error={"code": "INVALID_ID"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )
    if updated is None:
        return json_response(
            success=False,
            message="Application not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )
    return json_response(success=True, message="Interview date added", data=updated)