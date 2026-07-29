# Production deployment (single-region cut)

This runbook is the **single-region** production cut (ADR-007 + ADR-038). Multi-region failover stays open Wave 6 work and is intentionally out of scope here.

Target topology:

| Service | Host | Notes |
|---|---|---|
| **Web** (Next.js BFF) | **Vercel** (`iad1`) | Clerk, billing webhooks, most user APIs |
| **API** (Nest + BullMQ workers) | **Railway** or **Fly.io** | Resume workers, health, optional Nest routes |
| **AI service** (FastAPI) | **Railway** / **Fly** | Parsing + LLM features |
| **Postgres** (pgvector) | Supabase / Neon / Railway | Use `pnpm db:migrate:deploy` |
| **Redis** | Upstash / Railway Redis | Required for reliable queues |
| **Object storage** | S3-compatible (Supabase Storage / R2 / AWS) | ADR-010 — do not use ephemeral disk |
| **Meilisearch** | Optional hosted | Falls back to Postgres FTS |

---

## 1. Prerequisites

1. Production Clerk application (API keys + webhook endpoint).
2. Managed Postgres with the **pgvector** extension enabled.
3. Managed Redis (`REDIS_URL`).
4. S3-compatible bucket + credentials (`S3_*`).
5. Public HTTPS origins for web + API.
6. (Recommended) Hosted LLM keys for AI service (`OPENAI_API_KEY` / `ANTHROPIC_API_KEY`, `INSTALL_LLM=1` image build).

---

## 2. Database migrations (production)

Local DIY uses `pnpm db:push`. **Production must use migrate deploy:**

```bash
export DATABASE_URL="postgresql://..."
pnpm db:generate
pnpm db:migrate:deploy
```

Run this as a **release step** before/when the new API/web revision goes live (Railway release command, GitHub Action, or one-off job).

Do **not** run `prisma migrate dev` or `db:push` against production.

---

## 3. Deploy web (Vercel)

1. Import the GitHub repo into Vercel.
2. Set **Root Directory** to `apps/web`.
3. Framework: Next.js (see `apps/web/vercel.json`).
4. Install/build commands are already set in `vercel.json` (runs from monorepo root via `cd ../..`).
5. Add env vars from [§5 Web](#5-environment-matrices).
6. After first deploy, point Clerk + Lemon/Paystack webhooks at:
   - `https://<web-domain>/api/webhooks/clerk`
   - `https://<web-domain>/api/webhooks/lemonsqueezy`
   - `https://<web-domain>/api/webhooks/paystack`

Health: `GET https://<web-domain>/api/health`

---

## 4. Deploy API + AI (Railway / Fly / Docker)

### Docker images (repo root context)

```bash
docker build -f apps/api/Dockerfile -t jobmatch-api .
docker build -f apps/ai-service/Dockerfile -t jobmatch-ai .
# Optional LLM extras:
docker build -f apps/ai-service/Dockerfile --build-arg INSTALL_LLM=1 -t jobmatch-ai .
```

### Railway

- Use root `railway.toml` (Dockerfile builder for the API).
- Create a second service for AI using `apps/ai-service/Dockerfile`.
- Health check path for API: `/api/v1/health/ready`
- Release / deploy command suggestion:

```bash
pnpm db:migrate:deploy && node apps/api/dist/main.js
```

(Or run migrate in a one-off job, then start the container CMD.)

### Local production-like stack

```bash
docker compose up -d
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build
```

### Health endpoints

| Service | Liveness | Readiness |
|---|---|---|
| Web | `GET /api/health` | — |
| API | `GET /api/v1/health` | `GET /api/v1/health/ready` (Postgres + Redis) |
| AI | `GET /health` | `GET /ready` |

---

## 5. Environment matrices

Validate with:

```bash
# with env exported or dotenv loaded into the shell
./scripts/deploy-check.sh web
./scripts/deploy-check.sh api
./scripts/deploy-check.sh ai
```

### Web (Vercel)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Same Postgres as API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Yes | Production Clerk keys |
| `NEXT_PUBLIC_APP_URL` / `APP_URL` | Yes | Public site origin (no trailing slash) |
| `NEXT_PUBLIC_API_URL` | Recommended | `https://<api>/api/v1` if clients call Nest |
| `REDIS_URL` | Recommended | Queue enqueue from BFF |
| `AI_SERVICE_URL` | Recommended | Resume parse / AI features |
| `S3_BUCKET` + keys + endpoint | Yes in prod | Ephemeral Vercel FS loses uploads |
| `RESUME_CDN_BASE_URL` | Optional | CDN front for resume downloads |
| `CLERK_WEBHOOK_SECRET` | Yes if using Clerk webhooks | |
| Lemon / Paystack keys + webhook secrets | If billing enabled | |
| `ADMIN_EMAILS` | Recommended | Bootstrap admin access |

### API (Railway/Fly)

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | |
| `CLERK_SECRET_KEY` | Yes | JWT verification |
| `CORS_ORIGIN` | Yes | Comma-separated web origins |
| `APP_URL` | Yes | Email / absolute links |
| `REDIS_URL` | Yes for workers | Without Redis, queues degrade |
| `AI_SERVICE_URL` | Recommended | |
| `S3_*` | Yes in prod | Shared with web |
| `JOB_INGEST_ENABLED` | Prefer `false` | Keep GitHub Actions ingest (ADR-034) |
| `PORT` | Platform sets | Default 4000 |

### AI service

| Variable | Required | Notes |
|---|---|---|
| `CORS_ORIGINS` | Yes | Web + API origins |
| `LITELLM_MODEL` / provider keys | For LLM features | Local Ollama is not prod-default |
| `PORT` | Platform sets | Default 8000 |

See also `apps/*/.env.example` and `.env.production.example`.

---

## 6. Post-deploy checklist

- [ ] `pnpm db:migrate:deploy` applied
- [ ] Web `/api/health` returns `ok`
- [ ] API `/api/v1/health/ready` returns `ok` with `checks.database=ok`
- [ ] Redis check `ok` when `REDIS_URL` set
- [ ] Clerk sign-in / sign-up on production domain
- [ ] Clerk webhook delivering `user.created`
- [ ] Resume upload lands in S3 (not local disk)
- [ ] Background resume parse completes (API worker + Redis)
- [ ] Billing webhook test event (Lemon or Paystack)
- [ ] Job ingest Actions secrets present (`docs/JOB_INGEST_KEYS.md`)
- [ ] `JOB_INGEST_ENABLED=false` on API replicas (avoid double ingest)

---

## 7. Scaling notes

- Nest **API process also runs BullMQ workers**. Horizontal replicas multiply cron-style workers (alerts/digest/ingest). Prefer **one API replica** for workers, or later split a dedicated worker service.
- Keep catalog ingest on **GitHub Actions** (`.github/workflows/job-ingest.yml`) unless you intentionally enable the Nest ingest worker.
- Web stays on Vercel edge/serverless; heavy AI and queues stay on long-lived containers.
