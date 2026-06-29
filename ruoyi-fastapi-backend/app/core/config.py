from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    app_name: str = "RuoYi FastAPI"
    database_url: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ruoyi_fastapi"
    redis_url: str = "redis://localhost:6379/0"
    secret_key: str = Field(default="change-me")
    access_token_expire_minutes: int = 30
    token_refresh_threshold_minutes: int = 20
    cors_origins: str = "http://localhost:3000"
    captcha_enabled: bool = True
    captcha_type: str = "math"
    password_max_retry_count: int = 5
    password_lock_time_minutes: int = 10
    upload_path: str = "uploads"
    repeat_submit_interval_ms: int = 5000
    rate_limit_count: int = 100
    rate_limit_time_seconds: int = 60

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
