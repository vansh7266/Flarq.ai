from fastapi import APIRouter
from fastapi.responses import JSONResponse

from app.core.dependencies import CurrentUser, Database
from app.core.responses import json_response
from app.services.mongodb.aggregations.company_patterns import summarize_company_patterns
from app.services.mongodb.aggregations.response_rate import compute_response_rate
from app.services.mongodb.aggregations.skill_demand import summarize_skill_demand
from app.services.mongodb.repositories.analytics_repo import AnalyticsRepository

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/overview", response_model=None)
async def analytics_overview(user: CurrentUser, db: Database) -> JSONResponse:
    repo = AnalyticsRepository(db)
    base = await repo.overview(user["id"])
    response_rate = await compute_response_rate(db, user["id"])
    return json_response(
        success=True,
        message="Analytics overview",
        data={**base, "responseRate": response_rate},
    )


@router.get("/patterns", response_model=None)
async def analytics_patterns(user: CurrentUser, db: Database) -> JSONResponse:
    companies = await summarize_company_patterns(db, user["id"])
    skills = await summarize_skill_demand(db, user["id"])
    return json_response(
        success=True,
        message="Pattern summary",
        data={"companies": companies, "skills": skills},
    )
