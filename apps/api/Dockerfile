# NestJS API (+ BullMQ workers in-process). Build from monorepo root:
#   docker build -f apps/api/Dockerfile -t jobmatch-api .
#
# Playwright browsers are NOT installed in this image. Keep apply-automation
# disabled in production unless you add a dedicated browser layer.

FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV PNPM_HOME=/usr/local/share/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json apps/api/
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/queue/package.json packages/queue/
COPY packages/storage/package.json packages/storage/
COPY packages/resume-parsing/package.json packages/resume-parsing/
COPY packages/job-search/package.json packages/job-search/
COPY packages/email/package.json packages/email/
COPY packages/i18n/package.json packages/i18n/
COPY packages/typescript-config packages/typescript-config
RUN pnpm install --frozen-lockfile --filter @jobmatch/api...

FROM base AS build
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @jobmatch/database db:generate \
  && pnpm --filter @jobmatch/types build \
  && pnpm --filter @jobmatch/queue build \
  && pnpm --filter @jobmatch/storage build \
  && pnpm --filter @jobmatch/email build \
  && pnpm --filter @jobmatch/database build \
  && pnpm --filter @jobmatch/resume-parsing build \
  && pnpm --filter @jobmatch/job-search build \
  && pnpm --filter @jobmatch/api build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/api ./apps/api
COPY --from=build /app/packages ./packages

# Prisma client needs the schema + generated client at runtime.
WORKDIR /app/apps/api
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||4000)+'/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/main.js"]
