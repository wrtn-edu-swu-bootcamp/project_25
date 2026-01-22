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
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Settings class
class Settings:
    APP_NAME: str = APP_NAME
    DEBUG: bool = DEBUG
    DATABASE_URL: str = DATABASE_URL
    OPENAI_API_KEY: str = OPENAI_API_KEY
    GEMINI_API_KEY: str = GEMINI_API_KEY

settings = Settings()

# Log output
print(f"[STARTUP] Gemini API Key loaded: {'YES' if GEMINI_API_KEY else 'NO'}")
if GEMINI_API_KEY:
    print(f"[STARTUP] Gemini API Key length: {len(GEMINI_API_KEY)}")
    print(f"[STARTUP] Gemini API Key starts with: {GEMINI_API_KEY[:10]}...")