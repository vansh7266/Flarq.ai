from __future__ import annotations

import json
from types import SimpleNamespace

import httpx
import pytest
from bson import ObjectId
from fastapi import FastAPI
from google.genai import types
from mcp import ClientSession
from mcp.client.stdio import stdio_client

from app.api.v1 import jobs
from app.core.config import get_settings
from app.core.dependencies import get_current_user, get_mcp_client
from app.services.agent import agent_builder
from app.services.gemini import embeddings, vertex_client
from app.services.job_search import save_job_description, search_job_descriptions
from app.services.mongodb.mcp_client import FlarqMCPClient
from mcp_server import flarq_mongo_mcp

ALICE = "alice"
JD = "Build Python services and maintain distributed systems for the data platform."
VECTOR = [0.125] * 768


class JobCollection:
    def __init__(self) -> None:
        self.documents: list[dict] = []
        self.pipeline: list[dict] = []

    async def insert_one(self, document):
        job = {"_id": ObjectId(), **document}
        self.documents.append(job)
        return SimpleNamespace(inserted_id=job["_id"])

    def aggregate(self, pipeline):
        self.pipeline = pipeline

        async def to_list(length):
            # Simulate Atlas applying the owner prefilter and excluding vectors.
            stage = pipeline[0]["$vectorSearch"]
            owner = stage["filter"]["user_id"]["$eq"]
            return [
                {key: value for key, value in job.items() if key != "embedding"}
                for job in self.documents
                if job["user_id"] == owner and job.get("embedding")
            ][: stage["limit"]]

        return SimpleNamespace(to_list=to_list)


@pytest.fixture
def vector_index(monkeypatch):
    monkeypatch.setenv("JOBS_VECTOR_INDEX", "jobs_semantic")
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


@pytest.fixture
def database(monkeypatch):
    collection = JobCollection()
    monkeypatch.setattr(flarq_mongo_mcp, "_mongo_db", {"job_descriptions": collection})
    return collection


@pytest.fixture
def mcp(monkeypatch):
    client = FlarqMCPClient()

    async def call(tool_name, arguments):
        if tool_name == "mongodb_find_one" and arguments["collection"] == "profiles":
            return {"success": True, "data": {"skills": ["Python"]}}
        blocks = await flarq_mongo_mcp._call_tool(tool_name, arguments)
        payload = json.loads(blocks[0].text)
        if not payload["success"]:
            raise RuntimeError(payload["error"])
        return payload

    monkeypatch.setattr(client, "_call", call)
    return client


@pytest.mark.parametrize(
    ("route", "extra_body"), [("/analyze", {}), ("/gap-analysis", {"profile_id": ALICE})]
)
async def test_saved_job_reaches_agent_context(
    route, extra_body, vector_index, database, mcp, monkeypatch
):
    model_calls = []
    region_calls = []
    embedding_tasks = []
    function_name = "search_job_descriptions"

    def generate_content(model, contents, config):
        model_calls.append((model, contents, config))
        if isinstance(contents, str):
            text = json.dumps({"job_title": "Platform Engineer", "company_name": "Acme"})
            return types.GenerateContentResponse(
                candidates=[types.Candidate(content=types.Content(role="model", parts=[types.Part(text=text)]))]
            )
        if not any(part.function_response for content in contents for part in content.parts or []):
            names = [decl.name for tool in config.tools for decl in tool.function_declarations]
            assert len(names) == 7
            assert function_name in names
            assert config.automatic_function_calling.disable
            return types.GenerateContentResponse(
                candidates=[
                    types.Candidate(
                        content=types.Content(
                            role="model",
                            parts=[
                                types.Part(
                                    thought_signature=b"preserve-call",
                                    function_call=types.FunctionCall(
                                        id="lookup", name=function_name, args={"query": "Python roles"}
                                    ),
                                ),
                                types.Part(
                                    function_call=types.FunctionCall(
                                        id="status", name="update_application_status", args={}
                                    ),
                                ),
                            ],
                        )
                    )
                ]
            )
        tool_part = contents[-1].parts[0].function_response
        assert tool_part.id == "lookup"
        status_part = contents[-1].parts[1].function_response
        assert status_part.id == "status"
        assert status_part.response == {
            "ok": False,
            "error": "Send status updates in a separate message.",
        }
        assert contents[-2].parts[0].thought_signature == b"preserve-call"
        assert tool_part.response == {
            "ok": True,
            "matches": [{
                "job_description_id": str(database.documents[0]["_id"]),
                "title": "Platform Engineer",
                "company": "Acme",
                "excerpt": JD,
            }],
        }
        return types.GenerateContentResponse(
            candidates=[
                types.Candidate(
                    content=types.Content(role="model", parts=[types.Part(text="Acme uses Python.")])
                )
            ]
        )

    def embed_content(model, contents, config):
        assert model == "gemini-embedding-001"
        assert config.output_dimensionality == 768
        embedding_tasks.append((contents, config.task_type))
        return types.EmbedContentResponse(embeddings=[types.ContentEmbedding(values=VECTOR)])

    def fake_vertex_client(project, location):
        region_calls.append(location)
        return SimpleNamespace(models=SimpleNamespace(
            generate_content=generate_content, embed_content=embed_content
        ))

    monkeypatch.setattr(vertex_client, "get_vertex_client", fake_vertex_client)
    monkeypatch.setattr(embeddings, "get_vertex_client", fake_vertex_client)
    app = FastAPI()
    app.include_router(jobs.router)
    app.dependency_overrides[get_mcp_client] = lambda: mcp
    app.dependency_overrides[get_current_user] = lambda: {"id": ALICE}
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(f"/jobs{route}", json={"jd_text": JD, **extra_body})

    assert response.status_code == 200
    assert database.documents[0]["user_id"] == ALICE
    assert database.documents[0]["embedding"] == VECTOR
    await database.insert_one({"user_id": "other", "raw_text": "Other account", "embedding": VECTOR})
    result = await agent_builder.run_agent(mcp, ALICE, "Find my saved Python jobs.", [])

    assert result["response"] == "Acme uses Python."
    assert result["tools_used"] == [function_name]
    assert database.pipeline[0]["$vectorSearch"]["filter"] == {"user_id": {"$eq": ALICE}}
    assert database.pipeline[1] == {"$project": {"embedding": 0}}
    assert embedding_tasks == [(JD, "RETRIEVAL_DOCUMENT"), ("Python roles", "RETRIEVAL_QUERY")]
    assert all(model == "gemini-3.5-flash-lite" for model, _, _ in model_calls)
    assert {"global", "us-central1"} <= set(region_calls)


async def test_vector_search_requires_owner(database, mcp):
    with pytest.raises(RuntimeError, match="user_id required"):
        await mcp.vector_search("job_descriptions", VECTOR, "jobs_semantic", 5)
    assert not database.pipeline


async def test_embedding_failure_preserves_saved_analysis(vector_index, database, mcp, monkeypatch):
    from app.services import job_search

    async def failed_embedding(text):
        raise RuntimeError("Vertex unavailable")

    monkeypatch.setattr(job_search, "generate_embedding", failed_embedding)
    analysis = {"job_title": "Platform Engineer"}
    job_id = await save_job_description(mcp, ALICE, JD, analysis)

    assert job_id == str(database.documents[0]["_id"])
    assert database.documents[0]["analysis"] == analysis
    assert "embedding" not in database.documents[0]


async def test_disabled_search_preserves_existing_behavior(database, mcp, monkeypatch):
    monkeypatch.setenv("JOBS_VECTOR_INDEX", "")
    get_settings.cache_clear()
    try:
        await save_job_description(mcp, ALICE, JD, {"job_title": "Platform Engineer"})
        result = await search_job_descriptions(mcp, ALICE, "Python")
        declarations = vertex_client.build_agent_tools()[0].function_declarations
        assert len(declarations) == 6
        assert "embedding" not in database.documents[0]
        assert result == {"ok": False, "error": "Saved job search is disabled."}
    finally:
        get_settings.cache_clear()


async def test_vector_provider_failure_is_explicit(vector_index, database, mcp, monkeypatch):
    from app.services import job_search

    async def fake_embedding(query):
        return VECTOR

    def failed_aggregate(pipeline):
        raise RuntimeError("Index unavailable")

    monkeypatch.setattr(job_search, "generate_query_embedding", fake_embedding)
    monkeypatch.setattr(database, "aggregate", failed_aggregate)
    assert await search_job_descriptions(mcp, ALICE, "Python") == {
        "ok": False,
        "error": "Saved job search is temporarily unavailable.",
    }


async def test_mcp_stdio_exposes_vector_search():
    client = FlarqMCPClient()
    async with stdio_client(client.server_params) as (read, write):
        async with ClientSession(read, write) as session:
            await session.initialize()
            tools = (await session.list_tools()).tools

    assert len(tools) == 9
    assert any(tool.name == "mongodb_vector_search" for tool in tools)
