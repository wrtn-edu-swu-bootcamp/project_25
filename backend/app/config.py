import os
from pathlib import Path
from dotenv import load_dotenv

# .env ?뚯씪 濡쒕뱶
BASE_DIR = Path(__file__).resolve().parent.parent
ENV_FILE = BASE_DIR / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)

# ?ㅼ젙 蹂?섎뱾??吏곸젒 ?뺤쓽
APP_NAME = "News Literacy Platform"
DEBUG = True
DATABASE_URL = "sqlite+aiosqlite:///./news_literacy.db"
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")

# Settings ?대옒??(?섏쐞 ?명솚??
class Settings:
    APP_NAME: str = APP_NAME
    DEBUG: bool = DEBUG
    DATABASE_URL: str = DATABASE_URL
    OPENAI_API_KEY: str = OPENAI_API_KEY

settings = Settings()

# 濡쒓렇 異쒕젰
print(f"[STARTUP] API Key loaded: {'YES' if OPENAI_API_KEY else 'NO'}")
if OPENAI_API_KEY:
    print(f"[STARTUP] API Key length: {len(OPENAI_API_KEY)}")
    print(f"[STARTUP] API Key starts with: {OPENAI_API_KEY[:20]}...")