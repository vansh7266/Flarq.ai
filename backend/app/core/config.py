from functools import lru_cache

from pydantic import AnyUrl, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    mongodb_uri: str = Field(..., alias="MONGODB_URI")
    mongodb_db_name: str = Field("flarq", alias="MONGODB_DB_NAME")

    jwt_secret_key: str = Field(..., alias="JWT_SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(30, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    google_cloud_project: str = Field(..., alias="GOOGLE_CLOUD_PROJECT")
    google_cloud_location: str = Field("us-central1", alias="GOOGLE_CLOUD_LOCATION")
    vertex_ai_model: str = Field("gemini-2.0-flash-001", alias="VERTEX_AI_MODEL")

    max_resume_size_mb: int = Field(5, alias="MAX_RESUME_SIZE_MB")
    max_jd_length: int = Field(10_000, alias="MAX_JD_LENGTH")
    agent_builder_id: str | None = Field(None, alias="AGENT_BUILDER_ID")

    frontend_url: AnyUrl = Field("http://localhost:3000", alias="FRONTEND_URL")
    environment: str = Field("development", alias="ENVIRONMENT")

    @model_validator(mode="after")
    def check_gcp_config(self) -> "Settings":
        if not self.google_cloud_project or not str(self.google_cloud_project).strip():
            raise ValueError("GOOGLE_CLOUD_PROJECT is required")
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
