"""Google Cloud Secret Manager integration for FLARQ.

Loads sensitive configuration (API keys, connection strings) from
Google Cloud Secret Manager when running in production on Cloud Run.
Falls back to environment variables for local development.

Usage in config.py:
    from app.core.secrets import get_secret
    mongodb_uri: str = Field(default_factory=lambda: get_secret("MONGODB_URI"))
"""
from __future__ import annotations

import os
import structlog

logger = structlog.get_logger("secrets")

_cache: dict[str, str] = {}


def get_secret(
    secret_id: str,
    project_id: str | None = None,
    version: str = "latest",
) -> str | None:
    """Access a secret from Google Cloud Secret Manager.

    Falls back to environment variable if Secret Manager is unavailable.
    This design allows the same code to work in both Cloud Run (with
    Secret Manager) and local development (with .env files).

    Args:
        secret_id: The ID of the secret (e.g., "MONGODB_URI")
        project_id: Google Cloud project ID (defaults to GOOGLE_CLOUD_PROJECT env var)
        version: Secret version (default: "latest")

    Returns:
        The secret value, or the environment variable fallback
    """
    # Check cache first
    if secret_id in _cache:
        return _cache[secret_id]

    # Try environment variable first (for local development)
    env_value = os.environ.get(secret_id)
    if env_value:
        _cache[secret_id] = env_value
        return env_value

    # Skip Secret Manager in development
    environment = os.environ.get("ENVIRONMENT", "development")
    if environment == "development":
        logger.debug("secrets_env_fallback", secret_id=secret_id, reason="development_mode")
        return None

    # Try Secret Manager in production
    try:
        from google.cloud import secretmanager

        if project_id is None:
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT", "")

        if not project_id:
            logger.warning("secrets_no_project", secret_id=secret_id)
            return None

        client = secretmanager.SecretManagerServiceClient()
        name = f"projects/{project_id}/secrets/{secret_id}/versions/{version}"
        response = client.access_secret_version(request={"name": name})
        value = response.payload.data.decode("UTF-8")

        _cache[secret_id] = value
        logger.info("secrets_loaded", secret_id=secret_id, source="secret_manager")
        return value

    except ImportError:
        logger.warning("secrets_no_sdk", secret_id=secret_id)
        return None
    except Exception as e:
        logger.error("secrets_error", secret_id=secret_id, error=str(e))
        return None


def clear_cache() -> None:
    """Clear the secret cache (useful for testing)."""
    _cache.clear()
