#!/usr/bin/env bash
# Fail fast if critical production env vars are missing.
# Usage:
#   ./scripts/deploy-check.sh web
#   ./scripts/deploy-check.sh api
#   ./scripts/deploy-check.sh ai

set -euo pipefail

TARGET="${1:-}"

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required env: $name" >&2
    exit 1
  fi
}

warn_if_missing() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Warning: optional/recommended env not set: $name" >&2
  fi
}

case "$TARGET" in
  web)
    require DATABASE_URL
    require NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
    require CLERK_SECRET_KEY
    require NEXT_PUBLIC_APP_URL
    require APP_URL
    warn_if_missing REDIS_URL
    warn_if_missing NEXT_PUBLIC_API_URL
    warn_if_missing AI_SERVICE_URL
    warn_if_missing S3_BUCKET
    warn_if_missing CLERK_WEBHOOK_SECRET
    warn_if_missing LEMON_SQUEEZY_WEBHOOK_SECRET
    warn_if_missing PAYSTACK_SECRET_KEY
    ;;
  api)
    require DATABASE_URL
    require CLERK_SECRET_KEY
    require CORS_ORIGIN
    require APP_URL
    warn_if_missing REDIS_URL
    warn_if_missing AI_SERVICE_URL
    warn_if_missing S3_BUCKET
    ;;
  ai)
    warn_if_missing LITELLM_MODEL
    warn_if_missing OPENAI_API_KEY
    warn_if_missing CORS_ORIGINS
    ;;
  *)
    echo "Usage: $0 {web|api|ai}" >&2
    exit 2
    ;;
esac

echo "deploy-check: $TARGET OK"
