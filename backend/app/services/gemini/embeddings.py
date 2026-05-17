"""Embedding generation using Vertex AI for Atlas Vector Search.

Generates text embeddings using the text-embedding-004 model, which produces
768-dimensional vectors suitable for MongoDB Atlas Vector Search.
"""
from __future__ import annotations

import asyncio
import structlog
import vertexai
from vertexai.language_models import TextEmbeddingModel, TextEmbeddingInput

from app.core.config import get_settings

logger = structlog.get_logger("embeddings")

_model: TextEmbeddingModel | None = None


def _get_model() -> TextEmbeddingModel:
    """Get or initialize the embedding model (singleton)."""
    global _model
    if _model is None:
        settings = get_settings()
        vertexai.init(
            project=settings.google_cloud_project,
            location=settings.google_cloud_location,
        )
        _model = TextEmbeddingModel.from_pretrained("text-embedding-004")
        logger.info("embedding_model_initialized", model="text-embedding-004")
    return _model


def _sync_generate_embedding(text: str, task_type: str) -> list[float]:
    """Synchronous embedding generation (runs in thread executor)."""
    model = _get_model()
    inputs = [TextEmbeddingInput(text=text, task_type=task_type)]
    embeddings = model.get_embeddings(inputs)
    vector = embeddings[0].values
    logger.info("embedding_generated", text_len=len(text), vector_dim=len(vector))
    return vector


async def generate_embedding(text: str, task_type: str = "RETRIEVAL_DOCUMENT") -> list[float]:
    """Generate an embedding vector for the given text.

    Args:
        text: The text to embed
        task_type: One of RETRIEVAL_DOCUMENT, RETRIEVAL_QUERY, SEMANTIC_SIMILARITY, etc.

    Returns:
        A 768-dimensional float vector
    """
    try:
        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, _sync_generate_embedding, text, task_type)
    except Exception as e:
        logger.error("embedding_generation_failed", error=str(e))
        raise


async def generate_query_embedding(query: str) -> list[float]:
    """Generate an embedding for a search query.

    Uses RETRIEVAL_QUERY task type for optimal search performance.
    """
    return await generate_embedding(query, task_type="RETRIEVAL_QUERY")
