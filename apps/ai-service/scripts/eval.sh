#!/usr/bin/env bash
# Score resume parsing against the eval fixtures.
set -euo pipefail
cd "$(dirname "$0")/.."

./scripts/setup.sh

# pnpm may forward a bare "--" before script args; drop it for argparse.
args=()
for arg in "$@"; do
  if [[ "$arg" != "--" ]]; then
    args+=("$arg")
  fi
done

.venv/bin/python -m evals.run "${args[@]}"
