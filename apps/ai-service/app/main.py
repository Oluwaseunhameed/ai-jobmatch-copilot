"""AI JobMatch Copilot — AI Service (FastAPI).

Handles all LLM workloads: resume parsing, optimization, cover letters,
embeddings, and job description analysis.

Provider abstraction via LiteLLM:
  - Dev:  Ollama (local, free)
  - Prod: OpenAI + Anthropic (via LiteLLM routing)
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import applications, coach, embeddings, health, resumes

app = FastAPI(
    title="AI JobMatch Copilot — AI Service",
    description="AI inference service for resume parsing, optimization, and job intelligence.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["health"])
app.include_router(resumes.router)
app.include_router(applications.router)
app.include_router(embeddings.router)
app.include_router(coach.router)


@app.get("/")
async def root():
    return {"service": "ai-service", "status": "running"}
