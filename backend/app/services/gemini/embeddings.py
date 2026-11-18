"""Generate Vertex AI embeddings for the saved job descriptions index."""

from __future__ import annotations

import asyncio

from google.genai.types import EmbedContentConfig

from app.core.config import get_settings
from app.services.gemini.vertex_client import get_vertex_client

EMBEDDING_DIMENSIONS = 768


def _sync_generate_embedding(text: str, task_type: str) -> list[float]:
    settings = get_settings()
    client = get_vertex_client(settings.google_cloud_project, settings.google_cloud_location)
    response = client.models.embed_content(
        model=settings.vertex_embedding_model,
        contents=text,
        config=EmbedContentConfig(
            task_type=task_type,
            output_dimensionality=EMBEDDING_DIMENSIONS,
        ),
    )
    vectors = response.embeddings or []
    values = vectors[0].values if vectors else None
    if values is None or len(values) != EMBEDDING_DIMENSIONS:
        raise ValueError("Vertex AI returned an unexpected embedding shape")
    return values


async def generate_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    return await asyncio.to_thread(_sync_generate_embedding, text, task_type)


async def generate_query_embedding(query: str) -> list[float]:
    return await generate_embedding(query, task_type="RETRIEVAL_QUERY")
