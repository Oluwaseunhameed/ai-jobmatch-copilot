# Production deployment (single-region cut)

This runbook is the **single-region** production cut (ADR-007 + ADR-038). Multi-region failover stays open Wave 6 work and is intentionally out of scope here.

Target topology:

| Service | Host | Notes |
|---|---|---|
| **Web** (Next.js BFF) | **Vercel** (`iad1`) | Clerk, billing webhooks, most user APIs |
| **API** (Nest + BullMQ workers) | **Render** (or Railway / Fly) | Resume workers, health, optional Nest routes — see `render.yaml` |
| **AI service** (FastAPI) | **Render** (or Railway / Fly) | Parsing + LLM features |
| **Postgres** (pgvector) | Supabase / Neon | Use `pnpm db:migrate:deploy` |
| **Redis** | Render Key Value / Upstash | Required for reliable queues |
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

### First-time baseline (db:push history)

If the database already has tables from `db:push` but **no** `_prisma_migrations` rows, do **not** run `migrate deploy` yet (it will try to recreate tables and fail). Baseline once:

```bash
export DATABASE_URL="postgresql://..."
./scripts/baseline-prisma-migrations.sh
pnpm db:migrate:deploy   # should report already up to date
```

After that, only new migration folders are applied by `migrate deploy`.

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

## 4. Deploy API + AI (Render / Railway / Fly / Docker)

### Render (preferred free path)

Blueprint: root [`render.yaml`](../render.yaml) — `jobmatch-api`, `jobmatch-ai`, `jobmatch-redis` (Key Value) on the **free** plan in `oregon`.

1. Push `main` (Blueprint must be on the default branch).
2. Open [New Blueprint Instance](https://dashboard.render.com/select-repo?type=blueprint) → connect this GitHub repo → confirm `render.yaml`.
3. When prompted, set secrets (`sync: false` vars), for example:
   - **API:** `DATABASE_URL`, `CLERK_SECRET_KEY`, `CORS_ORIGIN=https://ai-jobmatch-web.vercel.app`, `APP_URL=https://ai-jobmatch-web.vercel.app`, S3_*, then after AI is live set `AI_SERVICE_URL=https://jobmatch-ai.onrender.com`
   - **AI:** `CORS_ORIGINS=https://ai-jobmatch-web.vercel.app,https://jobmatch-api.onrender.com`
4. Wait for both web services to deploy. Free instances **spin down after ~15 min idle** (~1 min cold start).
5. Copy the **external** Redis URL from Key Value into Vercel `REDIS_URL` (internal `connectionString` is already wired to the API service).
6. On Vercel, set:
   - `NEXT_PUBLIC_API_URL=https://jobmatch-api.onrender.com/api/v1`
   - `AI_SERVICE_URL=https://jobmatch-ai.onrender.com`
   - Redeploy web so `NEXT_PUBLIC_*` picks up.

Health: `GET https://jobmatch-api.onrender.com/api/v1/health` and `GET https://jobmatch-ai.onrender.com/health`

If the Nest image OOMs on free (512 MB), upgrade **jobmatch-api** to Starter ($7).

### Docker images (repo root context)

```bash
docker build -f apps/api/Dockerfile -t jobmatch-api .
docker build -f apps/ai-service/Dockerfile -t jobmatch-ai .
# Optional LLM extras:
docker build -f apps/ai-service/Dockerfile --build-arg INSTALL_LLM=1 -t jobmatch-ai .
```

### Railway / Fly (paid / trial)

- Railway: root `railway.toml` + `apps/ai-service/railway.toml` (trial may block new deploys).
- Fly: pay-as-you-go after a short trial — no ongoing free tier for new orgs.
- Health check path for API readiness: `/api/v1/health/ready`

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

- [ ] `pnpm db:migrate:deploy` applied (baseline first if DB came from `db:push` — see §2)
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
