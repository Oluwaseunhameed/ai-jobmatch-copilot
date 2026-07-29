#!/usr/bin/env bash
# Mark existing Prisma migrations as applied without running their SQL.
# Use when the database was built with `db:push` (or restored) and has no
# `_prisma_migrations` history — required before production `migrate deploy`.
#
# Usage (DATABASE_URL must point at the target DB):
#   ./scripts/baseline-prisma-migrations.sh
#
# Safe: does not CREATE/ALTER tables. Only writes to `_prisma_migrations`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT/packages/database"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required" >&2
  exit 1
fi

MIGRATIONS="$(find prisma/migrations -mindepth 1 -maxdepth 1 -type d -exec basename {} \; | sort)"
if [[ -z "$MIGRATIONS" ]]; then
  echo "No migrations found under prisma/migrations" >&2
  exit 1
fi

COUNT="$(printf '%s\n' "$MIGRATIONS" | wc -l | tr -d ' ')"
HOST_HINT="$(node -e 'const u=new URL(process.env.DATABASE_URL.replace(/^"|"$/g,"")); console.log(`${u.hostname}:${u.port||5432}${u.pathname}`)')"
echo "Baselining $COUNT migrations against $HOST_HINT"

printf '%s\n' "$MIGRATIONS" | while IFS= read -r name; do
  [[ -z "$name" ]] && continue
  echo "  resolve --applied $name"
  pnpm exec prisma migrate resolve --applied "$name" >/dev/null
done

echo "Done. Verifying status..."
pnpm exec prisma migrate status
