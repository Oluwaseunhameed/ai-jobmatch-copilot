#!/usr/bin/env bash
# Start the AI service in development mode with hot reload.
# Bootstraps the virtualenv on first run so `pnpm dev` works from a fresh clone.
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/setup.sh

PORT="${AI_SERVICE_PORT:-${PORT:-8000}}"

echo "ai-service: listening on http://localhost:${PORT}"
exec .venv/bin/python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port "$PORT" \
  --reload
