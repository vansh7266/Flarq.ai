from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
import structlog

from app.api.router import api_router
from app.core.config import get_settings
from app.core.limiter import limiter
from app.core.middleware import RequestLoggingMiddleware, configure_structlog
from app.services.gemini.vertex_client import init_vertex
from app.services.mongodb.client import MongoClientManager, ensure_indexes
from app.services.mongodb.mcp_client import mcp_client

mongo_manager = MongoClientManager()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    configure_structlog()
    settings = get_settings()
    init_vertex()
    structlog.get_logger("flarq.startup").info(
        "vertex_ai_ready",
        project=settings.google_cloud_project,
        location=settings.google_cloud_location,
    )
    database = await mongo_manager.connect()
    await ensure_indexes(database)
    _app.state.db = database
    yield
    await mcp_client.close()
    await mongo_manager.disconnect()


def create_app() -> FastAPI:
    settings = get_settings()
    application = FastAPI(
        title="FLARQ API",
        version="0.1.0",
        lifespan=lifespan,
    )
    application.state.limiter = limiter
    application.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    @application.exception_handler(HTTPException)
    async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
        detail = exc.detail
        if isinstance(detail, dict):
            return JSONResponse(status_code=exc.status_code, content=detail)
        message = str(detail)
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "success": False,
                "message": message,
                "data": None,
                "error": {"code": "HTTP_ERROR", "detail": message},
            },
        )

    application.add_middleware(RequestLoggingMiddleware)
    allow_origins = [settings.frontend_url.rstrip("/")] if settings.frontend_url else []
    application.add_middleware(
        CORSMiddleware,
        allow_origins=allow_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(SlowAPIMiddleware, limiter=limiter)

    application.include_router(api_router, prefix="/api/v1")

    @application.get("/health", tags=["health"])
    async def health(_request: Request) -> JSONResponse:
        checks: dict[str, str] = {}
        try:
            await mcp_client.count("users", {})
            checks["mongodb"] = "ok"
        except Exception as exc:  # noqa: BLE001
            checks["mongodb"] = f"error: {str(exc)[:50]}"

        try:
            from app.services.gemini.vertex_client import vertex_client

            checks["vertex_ai"] = "ok" if vertex_client else "not initialized"
        except Exception as exc:  # noqa: BLE001
            checks["vertex_ai"] = f"error: {str(exc)[:50]}"

        all_ok = all(value == "ok" for value in checks.values())
        return JSONResponse(
            status_code=200 if all_ok else 503,
            content={
                "status": "ok" if all_ok else "degraded",
                "environment": settings.environment,
                "checks": checks,
            },
        )

    return application


app = create_app()
