from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
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

    application.add_middleware(RequestLoggingMiddleware)
    application.add_middleware(
        CORSMiddleware,
        allow_origins=[str(settings.frontend_url).rstrip("/")],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    application.add_middleware(SlowAPIMiddleware, limiter=limiter)

    application.include_router(api_router, prefix="/api/v1")

    @application.get("/health", tags=["health"])
    async def health(_request: Request) -> dict[str, str]:
        return {"status": "ok", "environment": settings.environment}

    return application


app = create_app()
