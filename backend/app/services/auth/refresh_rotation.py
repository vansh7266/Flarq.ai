from __future__ import annotations

from datetime import UTC, datetime
from typing import Any

from app.core.security import create_access_token, create_refresh_token


async def rotate_refresh_token(
    db: Any,
    token_payload: dict[str, Any],
    user_doc: dict[str, Any],
) -> dict[str, Any]:
    """Revoke the used refresh token and issue a fresh access/refresh pair."""
    jti = token_payload["jti"]
    expires_at = datetime.fromtimestamp(float(token_payload["exp"]), tz=UTC)

    await db["token_blocklist"].update_one(
        {"jti": jti},
        {"$setOnInsert": {"jti": jti, "expires_at": expires_at}},
        upsert=True,
    )

    subject = str(user_doc["_id"])
    access_token, expires_in = create_access_token(
        subject=subject,
        email=user_doc["email"],
    )
    refresh_token, _, _ = create_refresh_token(subject=subject)

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": expires_in,
    }
