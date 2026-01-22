from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("Starting News Literacy Platform...")
    yield
    print("Shutting down...")

app = FastAPI(title=settings.APP_NAME, version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api.routes import news, analysis
app.include_router(news.router, prefix="/api/news", tags=["News"])
app.include_router(analysis.router, prefix="/api/analysis", tags=["Analysis"])

@app.get("/")
async def root():
    return {"message": "News Literacy Platform API", "version": "1.0.0"}

@app.get("/health")
async def health():
    return {"status": "healthy"}
