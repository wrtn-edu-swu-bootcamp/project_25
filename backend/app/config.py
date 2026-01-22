from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "News Literacy Platform"
    DEBUG: bool = True
    DATABASE_URL: str = "sqlite+aiosqlite:///./news_literacy.db"
    OPENAI_API_KEY: str = ""
    
    class Config:
        env_file = ".env"
        extra = "allow"

@lru_cache()
def get_settings() -> Settings:
    return Settings()

settings = get_settings()
