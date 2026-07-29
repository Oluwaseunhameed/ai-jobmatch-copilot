#!/usr/bin/env bash
# Production start (no reload) for container / Railway / Fly.
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/setup.sh

PORT="${AI_SERVICE_PORT:-${PORT:-8000}}"
WORKERS="${UVICORN_WORKERS:-2}"

echo "ai-service: production listen on 0.0.0.0:${PORT} (workers=${WORKERS})"
exec .venv/bin/python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --workers "$WORKERS"
