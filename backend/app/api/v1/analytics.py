from __future__ import annotations

import asyncio

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.core.dependencies import CurrentUser, MCPClient
from app.core.limiter import limiter
from app.core.responses import json_response
from app.services.analytics.overview import get_cached_overview
from app.services.mongodb.aggregations.company_patterns import get_company_patterns
from app.services.mongodb.aggregations.skill_demand import get_skill_demand

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=None)
@limiter.limit("30/minute")
async def analytics_overview(request: Request, user: CurrentUser, mcp: MCPClient) -> JSONResponse:
    data = await get_cached_overview(mcp, user["id"])
    return json_response(success=True, message="Analytics overview", data=data)


@router.get("/patterns", response_model=None)
@limiter.limit("30/minute")
async def analytics_patterns(request: Request, user: CurrentUser, mcp: MCPClient) -> JSONResponse:
    companies, skills = await asyncio.gather(
        get_company_patterns(mcp, user["id"]),
        get_skill_demand(mcp, user["id"]),
    )
    return json_response(
        success=True,
        message="Pattern summary",
        data={"companies": companies, "skills": skills},
    )
