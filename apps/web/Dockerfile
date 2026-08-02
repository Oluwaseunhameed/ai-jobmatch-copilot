# Next.js web (App Router). Build from monorepo root:
#   docker build -f apps/web/Dockerfile -t jobmatch-web .
#
# Used on Render free tier so we are not blocked by Vercel Hobby's
# 12-serverless-function deploy limit.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/web/package.json apps/web/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/queue/package.json packages/queue/
COPY packages/storage/package.json packages/storage/
COPY packages/resume-parsing/package.json packages/resume-parsing/
COPY packages/job-search/package.json packages/job-search/
COPY packages/email/package.json packages/email/
COPY packages/i18n/package.json packages/i18n/
COPY packages/typescript-config packages/typescript-config
RUN pnpm install --frozen-lockfile --filter @jobmatch/web...

FROM base AS build
COPY --from=deps /app /app
COPY . .
# Public Clerk/app URLs must be present at build time for Next.js inlining.
ARG NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_CLERK_SIGN_IN_URL=/login
ARG NEXT_PUBLIC_CLERK_SIGN_UP_URL=/register
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
ARG NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=$NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY \
    NEXT_PUBLIC_CLERK_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_SIGN_UP_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL \
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=$NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    DOCKER_BUILD=1
RUN pnpm --filter @jobmatch/database db:generate \
  && pnpm turbo build --filter=@jobmatch/web --force \
  && mkdir -p /app/apps/web/public

FROM node:22-bookworm-slim AS runner
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1
# Fill-only ATS assist (ADR-033). Browsers installed below.
ENV APPLY_AUTOMATION_LIVE=1
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
WORKDIR /app

# Standalone server + static assets (monorepo layout).
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
# public/ may be empty; build stage always creates the dir for this COPY.
COPY --from=build /app/apps/web/public ./apps/web/public

# Playwright is serverExternalPackages — install next to the standalone server so
# dynamic import('playwright') resolves at runtime, plus Chromium + OS deps.
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates \
  && npm install --omit=dev --no-package-lock playwright@1.54.2 \
  && npx playwright install --with-deps chromium \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "node apps/web/server.js"]
