from datetime import UTC, datetime
from typing import Annotated, Any

from fastapi import APIRouter, Depends, Request, status
from fastapi.responses import JSONResponse
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.core.config import get_settings
from app.core.dependencies import Database
from app.core.limiter import limiter
from app.core.responses import json_response
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.services.auth.refresh_rotation import rotate_refresh_token
from app.services.mongodb.repositories.user_repo import UserRepository

router = APIRouter(prefix="/auth", tags=["auth"])


def get_user_repository(db: Database) -> UserRepository:
    return UserRepository(db)


UserRepo = Annotated[UserRepository, Depends(get_user_repository)]


class RegisterRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str = Field(alias="fullName", min_length=2, max_length=120)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class RefreshRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refresh_token: str = Field(alias="refreshToken")


class LogoutRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    refresh_token: str = Field(alias="refreshToken")


class GoogleAuthRequest(BaseModel):
    credential: str = Field(min_length=1)


def _serialize_user(document: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(document["_id"]),
        "email": document["email"],
        "fullName": document["full_name"],
        "isActive": document.get("is_active", True),
    }


def _serialize_tokens(access_token: str, refresh_token: str, expires_in: int) -> dict[str, Any]:
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }


async def _is_blocklisted(db, jti: str) -> bool:
    existing = await db["token_blocklist"].find_one({"jti": jti})
    return existing is not None


async def _blocklist(db, jti: str, expires_at: datetime) -> None:
    await db["token_blocklist"].update_one(
        {"jti": jti},
        {"$setOnInsert": {"jti": jti, "expires_at": expires_at, "blocked_at": datetime.now(tz=UTC)}},
        upsert=True,
    )


@router.post("/register")
@limiter.limit("20/minute")
async def register_user(
    request: Request,
    payload: RegisterRequest,
    db: Database,
    users: UserRepo,
) -> JSONResponse:
    try:
        hashed = hash_password(payload.password)
        created = await users.create_user(
            email=str(payload.email),
            full_name=payload.full_name,
            hashed_password=hashed,
        )
    except ValueError as exc:
        return json_response(
            success=False,
            message=str(exc),
            data=None,
            error={"code": "EMAIL_TAKEN"},
            status_code=status.HTTP_409_CONFLICT,
        )

    access_token, expires_in = create_access_token(
        subject=str(created["_id"]),
        email=created["email"],
    )
    refresh_token, _, _ = create_refresh_token(subject=str(created["_id"]))

    return json_response(
        success=True,
        message="Account created",
        data={
            "user": _serialize_user(created),
            "tokens": _serialize_tokens(access_token, refresh_token, expires_in),
        },
    )


@router.post("/login")
@limiter.limit("20/minute")
async def login_user(
    request: Request,
    payload: LoginRequest,
    db: Database,
    users: UserRepo,
) -> JSONResponse:
    user_doc = await users.find_by_email(str(payload.email))
    if user_doc is None or not verify_password(payload.password, user_doc["hashed_password"]):
        return json_response(
            success=False,
            message="Invalid email or password",
            data=None,
            error={"code": "INVALID_CREDENTIALS"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    access_token, expires_in = create_access_token(
        subject=str(user_doc["_id"]),
        email=user_doc["email"],
    )
    refresh_token, _, _ = create_refresh_token(subject=str(user_doc["_id"]))

    return json_response(
        success=True,
        message="Authenticated",
        data={
            "user": _serialize_user(user_doc),
            "tokens": _serialize_tokens(access_token, refresh_token, expires_in),
        },
    )


@router.post("/refresh")
@limiter.limit("20/minute")
async def refresh_token(request: Request, payload: RefreshRequest, db: Database) -> JSONResponse:
    try:
        token_payload = decode_token(payload.refresh_token)
    except Exception:  # noqa: BLE001
        return json_response(
            success=False,
            message="Invalid refresh token",
            data=None,
            error={"code": "INVALID_REFRESH"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    if token_payload.get("type") != "refresh":
        return json_response(
            success=False,
            message="Invalid token type",
            data=None,
            error={"code": "INVALID_REFRESH"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    jti = token_payload.get("jti")
    exp = token_payload.get("exp")
    if not isinstance(jti, str) or not isinstance(exp, (int, float)):
        return json_response(
            success=False,
            message="Malformed refresh token",
            data=None,
            error={"code": "INVALID_REFRESH"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    if await _is_blocklisted(db, jti):
        return json_response(
            success=False,
            message="Refresh token revoked",
            data=None,
            error={"code": "TOKEN_REVOKED"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    user_repo = UserRepository(db)
    user_doc = await user_repo.find_by_id(str(token_payload.get("sub")))
    if user_doc is None:
        return json_response(
            success=False,
            message="User not found",
            data=None,
            error={"code": "USER_MISSING"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    tokens = await rotate_refresh_token(db, token_payload, user_doc)

    return json_response(
        success=True,
        message="Token refreshed",
        data=tokens,
    )


@router.post("/logout")
@limiter.limit("20/minute")
async def logout_user(request: Request, payload: LogoutRequest, db: Database) -> JSONResponse:
    try:
        token_payload = decode_token(payload.refresh_token)
    except Exception:  # noqa: BLE001
        return json_response(
            success=False,
            message="Invalid refresh token",
            data=None,
            error={"code": "INVALID_REFRESH"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    if token_payload.get("type") != "refresh":
        return json_response(
            success=False,
            message="Invalid token type",
            data=None,
            error={"code": "INVALID_REFRESH"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    jti = token_payload.get("jti")
    exp = token_payload.get("exp")
    if not isinstance(jti, str) or not isinstance(exp, (int, float)):
        return json_response(
            success=False,
            message="Malformed refresh token",
            data=None,
            error={"code": "INVALID_REFRESH"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    expires_at = datetime.fromtimestamp(float(exp), tz=UTC)
    await _blocklist(db, jti, expires_at)

    return json_response(
        success=True,
        message="Logged out",
        data=None,
    )


@router.post("/google")
@limiter.limit("20/minute")
async def google_auth(
    request: Request,
    payload: GoogleAuthRequest,
    db: Database,
    users: UserRepo,
) -> JSONResponse:
    """Authenticate user via Google OAuth credential.

    Verifies the Google ID token and creates/finds a user in the database.
    """
    settings = get_settings()
    google_client_id = getattr(settings, "google_client_id", "") or ""

    try:
        idinfo = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            audience=google_client_id,
        )
    except ValueError as exc:
        return json_response(
            success=False,
            message=f"Invalid Google credential: {exc}",
            data=None,
            error={"code": "INVALID_GOOGLE_CREDENTIAL"},
            status_code=status.HTTP_401_UNAUTHORIZED,
        )

    email = idinfo.get("email", "")
    name = idinfo.get("name", "")
    picture = idinfo.get("picture", "")

    if not email:
        return json_response(
            success=False,
            message="No email in Google credential",
            data=None,
            error={"code": "NO_EMAIL"},
            status_code=status.HTTP_400_BAD_REQUEST,
        )

    # Find or create user
    user_doc = await users.find_by_email(email)
    if user_doc is None:
        try:
            user_doc = await users.create_google_user(
                email=email,
                full_name=name or email.split("@")[0],
                picture=picture,
            )
        except ValueError as exc:
            return json_response(
                success=False,
                message=str(exc),
                data=None,
                error={"code": "EMAIL_TAKEN"},
                status_code=status.HTTP_409_CONFLICT,
            )

    access_token, expires_in = create_access_token(
        subject=str(user_doc["_id"]),
        email=user_doc["email"],
    )
    refresh_token, _, _ = create_refresh_token(subject=str(user_doc["_id"]))

    return json_response(
        success=True,
        message="Authenticated via Google",
        data={
            "user": _serialize_user(user_doc),
            "tokens": _serialize_tokens(access_token, refresh_token, expires_in),
        },
    )
