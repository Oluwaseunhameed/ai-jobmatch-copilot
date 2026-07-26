#!/usr/bin/env bash
# Run the AI service test suite inside the local virtualenv.
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/setup.sh
.venv/bin/python -m pytest "$@"
