#!/usr/bin/env bash
# Start the AI service in development mode with hot reload
set -euo pipefail
cd "$(dirname "$0")/.."
uvicorn app.main:app --host 0.0.0.0 --port "${PORT:-8000}" --reload
