import os
from pydantic_settings import BaseSettings
from pydantic import Field

class Settings(BaseSettings):
    SUPABASE_URL: str = Field(default="https://mock-supabase.supabase.co")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(default="mock-key-123")
    
    JWT_SECRET: str = Field(default="mock_jwt_access_secret_key_32_characters_long")
    JWT_REFRESH_SECRET: str = Field(default="mock_jwt_refresh_secret_key_32_characters_long")
    
    ENV: str = Field(default="development")
    DEBUG: bool = Field(default=True)
    
    TURNSTILE_SECRET_KEY: str = Field(default="mock-turnstile-secret")

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
