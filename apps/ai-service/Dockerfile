# FastAPI AI service. Build from monorepo root:
#   docker build -f apps/ai-service/Dockerfile -t jobmatch-ai .

FROM python:3.12-slim-bookworm AS base
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY apps/ai-service/requirements.txt apps/ai-service/requirements-llm.txt ./
# Install core deps; LLM extras are optional via build-arg.
ARG INSTALL_LLM=1
RUN pip install -r requirements.txt \
  && if [ "$INSTALL_LLM" = "1" ]; then pip install -r requirements-llm.txt; fi

COPY apps/ai-service/app ./app

ENV PORT=8000 \
    UVICORN_WORKERS=2
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8000/health')"

CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers ${UVICORN_WORKERS:-2}"]
