from typing import Any

from fastapi import APIRouter, status
from fastapi.responses import JSONResponse
from pydantic import BaseModel, ConfigDict, Field

from app.core.dependencies import CurrentUser, Database
from app.core.responses import json_response
from app.models.application import ApplicationStatus
from app.services.mongodb.repositories.application_repo import ApplicationRepository

router = APIRouter(prefix="/applications", tags=["applications"])


def get_application_repository(db: Database) -> ApplicationRepository:
    return ApplicationRepository(db)


def _serialize_application(document: dict[str, Any]) -> dict[str, Any]:
    applied_at = document.get("applied_at")
    next_follow_up_at = document.get("next_follow_up_at")
    return {
        "id": str(document["_id"]),
        "userId": document["user_id"],
        "company": document["company"],
        "roleTitle": document["role_title"],
        "status": document["status"],
        "jobDescriptionId": document.get("job_description_id"),
        "notes": document.get("notes"),
        "appliedAt": applied_at.isoformat() if applied_at else None,
        "nextFollowUpAt": next_follow_up_at.isoformat() if next_follow_up_at else None,
        "createdAt": document["created_at"].isoformat(),
        "updatedAt": document["updated_at"].isoformat(),
    }


class ApplicationCreateRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    company: str = Field(min_length=1, max_length=200)
    role_title: str = Field(alias="roleTitle", min_length=1, max_length=200)
    status: ApplicationStatus = "saved"
    job_description_id: str | None = Field(default=None, alias="jobDescriptionId")
    notes: str | None = Field(default=None, max_length=4000)


@router.get("", response_model=None)
async def list_applications(
    user: CurrentUser,
    db: Database,
) -> JSONResponse:
    repo = ApplicationRepository(db)
    documents = await repo.list_for_user(user["id"])
    payload = [_serialize_application(item) for item in documents]
    return json_response(success=True, message="Applications loaded", data=payload)


@router.post("", response_model=None)
async def create_application(
    payload: ApplicationCreateRequest,
    user: CurrentUser,
    db: Database,
) -> JSONResponse:
    repo = ApplicationRepository(db)
    created = await repo.create(
        user["id"],
        {
            "company": payload.company,
            "role_title": payload.role_title,
            "status": payload.status,
            "job_description_id": payload.job_description_id,
            "notes": payload.notes,
        },
    )
    return json_response(
        success=True,
        message="Application created",
        data=_serialize_application(created),
        status_code=status.HTTP_201_CREATED,
    )


@router.delete("/{application_id}", response_model=None)
async def delete_application(
    application_id: str,
    user: CurrentUser,
    db: Database,
) -> JSONResponse:
    repo = ApplicationRepository(db)
    deleted = await repo.delete(user["id"], application_id)
    if not deleted:
        return json_response(
            success=False,
            message="Application not found",
            data=None,
            error={"code": "NOT_FOUND"},
            status_code=status.HTTP_404_NOT_FOUND,
        )

    return json_response(success=True, message="Application deleted", data=None)
