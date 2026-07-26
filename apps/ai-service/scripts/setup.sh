#!/usr/bin/env bash
# Create the local virtualenv and install Python dependencies.
# Idempotent: safe to run repeatedly.
set -euo pipefail
cd "$(dirname "$0")/.."

PYTHON_BIN="${PYTHON_BIN:-python3}"

if ! command -v "$PYTHON_BIN" >/dev/null 2>&1; then
  echo "ai-service: '$PYTHON_BIN' not found. Install Python 3.11+ or set PYTHON_BIN." >&2
  exit 1
fi

if [[ ! -x .venv/bin/python ]]; then
  echo "ai-service: creating virtualenv at apps/ai-service/.venv"
  "$PYTHON_BIN" -m venv .venv
fi

.venv/bin/python -m pip install --quiet --upgrade pip
.venv/bin/python -m pip install --quiet -r requirements.txt

# LLM enrichment is optional: heuristic parsing works without it, and litellm
# needs a Rust toolchain on some platforms. Never fail setup because of it.
if [[ "${INSTALL_LLM:-0}" == "1" ]]; then
  if ! .venv/bin/python -m pip install --quiet -r requirements-llm.txt; then
    echo "ai-service: optional LLM extras failed to install — continuing with heuristic parsing." >&2
  fi
fi

echo "ai-service: dependencies ready"
