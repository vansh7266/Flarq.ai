from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.secrets import get_secret


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = Field(
        default_factory=lambda: get_secret("MONGODB_URI") or "",  # type: ignore[arg-type]
        alias="MONGODB_URI",
    )
    mongodb_db_name: str = Field("flarq", alias="MONGODB_DB_NAME")

    jwt_secret_key: str = Field(
        default_factory=lambda: get_secret("JWT_SECRET_KEY") or "",  # type: ignore[arg-type]
        alias="JWT_SECRET_KEY",
    )
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    google_cloud_project: str = Field(..., alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = Field("us-central1", alias="GOOGLE_CLOUD_LOCATION")
    vertex_ai_model: str = Field("gemini-2.0-flash-001", alias="VERTEX_AI_MODEL")
    google_client_id: str = Field("", alias="GOOGLE_CLIENT_ID")

    max_resume_size_mb: int = Field(5, alias="MAX_RESUME_SIZE_MB")
    max_jd_length: int = Field(10_000, alias="MAX_JD_LENGTH")
    agent_builder_id: str | None = Field(
        None,
        alias="AGENT_BUILDER_ID",
        description=(
            "Google Cloud Agent Builder engine ID (from Discovery Engine). "
            "Required for the Google Cloud Rapid Agent Hackathon. "
            "Set this to the engine ID of your Agent Builder app created in "
            "the Google Cloud Console under Agent Builder > Apps."
        ),
    )

    frontend_url: str = Field("", alias="FRONTEND_URL")
    environment: str = Field("development", alias="ENVIRONMENT")

    @model_validator(mode="after")
    def check_gcp_config(self) -> "Settings":
        if not self.google_cloud_project or not str(self.google_cloud_project).strip():
            raise ValueError("GOOGLE_CLOUD_PROJECT is required")
        return self

    @model_validator(mode="after")
    def check_secrets(self) -> "Settings":
        weak = {
            "your-super-secret-jwt-key-change-in-production",
            "change-me",
            "secret",
            "",
        }
        if self.environment.lower() == "production" and self.jwt_secret_key in weak:
            raise ValueError("JWT_SECRET_KEY must be changed in production")
        return self

    @model_validator(mode="after")
    def check_production_urls(self) -> "Settings":
        if self.environment.lower() == "production":
            if not self.frontend_url or "localhost" in self.frontend_url:
                raise ValueError("FRONTEND_URL must be set to production URL")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
