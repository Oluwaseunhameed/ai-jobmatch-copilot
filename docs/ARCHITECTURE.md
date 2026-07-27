# Architecture — AI JobMatch Copilot

## 1. High-Level Overview

AI JobMatch Copilot is a **modular monolith-first** SaaS platform that evolves into a **service-oriented architecture** as AI workloads, job ingestion, and automation scale.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│   Web App (Next.js)  ·  Browser Extension (Phase 2+)  ·  Admin Portal │
└───────────────────────────────────┬─────────────────────────────────────┘
                                    │ HTTPS
┌───────────────────────────────────▼─────────────────────────────────────┐
│                         API GATEWAY / BFF (NestJS)                       │
│  Auth · Users · Profiles · Resumes · Jobs · Applications · Billing · Admin│
└───────┬─────────────────┬──────────────────┬────────────────────────────┘
        │                 │                  │
        ▼                 ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│  PostgreSQL  │  │    Redis     │  │  Object Storage  │
│  + pgvector  │  │  cache/queue │  │ UploadThing/Cloud│
└──────────────┘  └──────┬───────┘  └──────────────────┘
                         │
                         ▼
                  ┌──────────────┐
                  │   BullMQ     │
                  │  Workers     │
                  └──────┬───────┘
                         │
        ┌────────────────┼────────────────┐
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ AI Service   │  │ Job Ingestion│  │ Playwright   │
│ (FastAPI)    │  │ Workers      │  │ Automation   │
└──────────────┘  └──────────────┘  └──────────────┘
```

## 2. Architectural Principles

1. **Monorepo, feature-based modules** — Each product module maps to bounded contexts in the backend and feature folders in the frontend.
2. **API-first** — The web app consumes REST APIs; future mobile/extension clients reuse the same contracts.
3. **Async by default for AI** — Resume parsing, optimization, job enrichment, and embeddings run as background jobs with progress tracking.
4. **User-in-the-loop for automation** — Browser-assisted apply never submits without explicit user approval.
5. **Single career profile source of truth** — Profiles, resumes, and applications all reference canonical user data.
6. **Provider abstraction for AI** — LiteLLM allows swapping OpenAI, Anthropic, local Ollama, etc., without rewriting business logic.
7. **Security by design** — OWASP baseline, RBAC, audit logs, encrypted secrets, rate limiting.

## 3. Repository Structure (Proposed)

```
ai-jobmatch-copilot/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── api/                 # NestJS backend
│   ├── ai-service/          # FastAPI AI microservice
│   └── worker/              # BullMQ job processors (may merge into api initially)
├── packages/
│   ├── ui/                  # Shared shadcn/ui components
│   ├── config/              # ESLint, TS, Tailwind configs
│   ├── types/               # Shared TypeScript types / API contracts
│   └── database/            # Prisma schema + migrations
├── infrastructure/
│   ├── docker/
│   └── github-actions/
├── docs/
├── docker-compose.yml
└── package.json             # Turborepo or pnpm workspaces root
```

## 4. Core Domain Models (Initial)

```
User ──┬── CareerProfile ──┬── Skills
       │                   ├── Education[]
       │                   ├── WorkExperience[]
       │                   ├── Projects[]
       │                   └── Preferences
       │
       ├── Resume[] ── ResumeVersion[]
       │
       ├── JobInteraction[] (saved, viewed, matched)
       │
       ├── Application[] ── PipelineStage, Notes, Documents
       │
       └── Subscription
```

## 5. Service Responsibilities

### 5.1 Web App (`apps/web`)
- Authentication UI via Clerk (`/login`, `/register`)
- Onboarding and career profile forms
- Resume upload/builder UI
- Job search, job detail, rich match insights (fit signals, skill gaps, learning paths)
- Company intelligence profiles (`/companies/[slug]`)
- Career Growth Hub (`/growth`) — market skill gaps, roadmap, promotion readiness
- AI Career Coach (`/coach`) — conversational coaching over Growth Hub context
- Interview prep (`/interview`) — role-specific question packs + confidence practice
- Coding assessment prep (`/practice`) — timed problem packs + performance analytics
- Application tracker (Kanban)
- Dashboard and analytics
- Settings (theme, language, notifications; account security via Clerk)

### 5.2 API (`apps/api`)
- REST API with versioning (`/api/v1/...`)
- Auth integration (Better Auth or Auth.js)
- CRUD for profiles, resumes, applications
- Job search proxy and saved jobs
- Billing webhooks (Lemon Squeezy + Paystack; Next.js BFF)
- Admin endpoints with RBAC
- Enqueues background jobs

### 5.3 AI Service (`apps/ai-service`)
- Resume parsing (PDF/DOCX → structured JSON)
- Resume optimization against job descriptions
- Cover letter and application answer generation
- Embeddings generation for semantic search
- Job description analysis (skills, keywords, gaps)
- Interview question generation

### 5.4 Workers
- Resume parse/optimize pipelines
- Application draft generation (cover letter / short answers)
- Job ingestion and enrichment
- Notification dispatch
- Scheduled alerts and digests
- Job alert sweep (saved searches)
- Playwright-assisted form fill (Phase 2+)

## 6. Data Storage Strategy

| Data Type | Store | Rationale |
|---|---|---|
| Relational user/profile/job/application data | PostgreSQL | ACID, joins, Prisma support |
| Vector embeddings (jobs, resumes, skills) | pgvector | Co-locate with relational data initially |
| Full-text job search (later scale) | Meilisearch or OpenSearch | Better relevance at scale |
| File uploads (resumes, exports) | Local disk (dev) + S3-compatible (prod) | ADR-010; Supabase Storage / MinIO / AWS |
| Sessions, rate limits, job queues | Redis | Fast ephemeral state |
| Audit logs | PostgreSQL (partitioned table) | Queryable compliance trail |

## 7. Authentication & Authorization

- **Auth provider:** Clerk (managed) — see ADR-008
- **Methods:** Email/password, OAuth, 2FA, email verification (configured in Clerk Dashboard)
- **App user sync:** Postgres `User.id` = Clerk user id; webhook + ensure-on-request
- **API auth:** NestJS verifies Clerk session JWT (`Authorization: Bearer`)
- **Roles:** `user`, `admin`, `support`, `coach` (Team tier)
- **Authorization:** Resource-level checks (users can only access their own profiles/applications)

## 8. AI Pipeline Example — Resume Optimization

```
1. User uploads resume + selects target job
2. API validates ownership, stores file, creates OptimizationJob (status: queued)
3. Worker sends resume text + JD to AI service
4. AI service:
   a. Extracts JD keywords/skills (structured output)
   b. Scores current resume (ATS compatibility)
   c. Rewrites sections with diff metadata
   d. Returns before/after + missing keywords + score
5. Worker saves ResumeVersion, updates job status
6. WebSocket/SSE or polling notifies frontend
7. User reviews diff, approves → version promoted
```

## 9. API Conventions

- Base path: `/api/v1`
- Pagination: `?page=1&limit=20`
- Sorting: `?sort=createdAt&order=desc`
- Filtering: query params per resource
- Errors: `{ "error": { "code": "...", "message": "...", "details": [] } }`
- Success list: `{ "data": [], "meta": { "page", "limit", "total" } }`
- OpenAPI/Swagger at `/api/docs`

## 10. Security Baseline

- HTTPS everywhere
- CSRF protection on cookie-based auth
- Rate limiting per IP and per user
- Input validation (class-validator / Zod)
- File upload scanning and type validation
- Secrets via environment variables (never committed)
- PII encryption at rest for sensitive fields (Phase 2)
- Audit log for admin actions

## 11. Observability

- Structured JSON logging
- Health checks: `/health`, `/ready`
- Prometheus metrics
- Grafana dashboards
- Error tracking (Sentry — optional)

## 12. Deployment Topology (Proposed)

**Development:** Docker Compose (Postgres, Redis, Ollama, all services)

**Production (initial):**
- Web: Vercel or containerized behind Traefik
- API + Workers: Container on Railway/Fly.io/AWS ECS
- AI Service: Separate container (GPU optional for local models)
- Database: Managed PostgreSQL (Neon, Supabase, or RDS)
- Redis: Managed (Upstash or ElastiCache)

## 13. What We Are NOT Building in MVP

- Browser extension
- Full job board integrations (start with seeded + 1–2 sources)
- Voice mock interviews
- Team/coach tier
- Playwright auto-apply (design only; implement Phase 2)
- Elasticsearch (pgvector + Postgres full-text first)

## 14. Open Decisions

See [DECISIONS_LOG.md](./DECISIONS_LOG.md) for confirmed and pending decisions.
