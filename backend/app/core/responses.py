from typing import Any

from fastapi.responses import JSONResponse


def json_response(
    *,
    success: bool,
    message: str,
    data: Any | None = None,
    error: dict[str, Any] | None = None,
    status_code: int = 200,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "success": success,
            "message": message,
            "data": data,
            "error": error,
        },
    )
