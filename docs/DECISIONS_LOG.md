# Decision Log — AI JobMatch Copilot

Record of architectural, product, and technology decisions.  
Format: **Decision · Context · Options · Outcome · Date**

---

## ADR-001: Monorepo with Turborepo + pnpm

**Context:** Multiple apps (web, api, ai-service) share types, UI, and database schema.  
**Options:** Separate repos vs monorepo (Turborepo, Nx).  
**Outcome:** **Proposed** — Monorepo with Turborepo + pnpm workspaces.  
**Rationale:** Shared types, atomic changes across frontend/backend, simpler local dev.  
**Status:** ✅ Accepted  
**Date:** 2026-07-21

---

## ADR-002: Backend framework — NestJS

**Context:** Need structured, scalable API with DI, modules, and Swagger.  
**Options:** NestJS, Fastify standalone, Next.js API routes only.  
**Outcome:** **Proposed** — NestJS as primary API; FastAPI only for AI workloads.  
**Rationale:** Separation of concerns; NestJS excels at enterprise API patterns; AI stays in Python ecosystem.  
**Status:** ✅ Accepted  
**Date:** 2026-07-21

---

## ADR-003: Database — PostgreSQL + Prisma + pgvector

**Context:** Relational data plus semantic search for jobs/resumes.  
**Options:** PostgreSQL only, PostgreSQL + Elasticsearch day 1, MongoDB.  
**Outcome:** **Proposed** — PostgreSQL with Prisma; pgvector for embeddings; defer Elasticsearch.  
**Rationale:** YAGNI — pgvector is sufficient for MVP job matching.  
**Status:** ✅ Accepted  
**Date:** 2026-07-21

---

## ADR-004: Auth library — Better Auth (superseded)

**Context:** Need email/password, OAuth, 2FA, email verification.  
**Options:** Better Auth, Auth.js (NextAuth v5), Clerk, Supabase Auth.  
**Outcome:** **Accepted** — Better Auth (self-hosted). Auth routes live in Next.js; NestJS validates sessions.  
**Status:** ♻️ Superseded by ADR-008  
**Date:** 2026-07-21

---

## ADR-008: Auth library — Clerk

**Context:** Prefer managed authentication for production readiness (email/password, OAuth, 2FA, verification, session management) without maintaining self-hosted auth infra.  
**Options:** Keep Better Auth, migrate to Clerk, Auth.js.  
**Outcome:** **Accepted** — Clerk for identity. Next.js uses `@clerk/nextjs`; NestJS verifies Clerk session JWTs via `@clerk/backend`. App `User` rows are synced from Clerk (webhook + ensure-on-request). App-owned preferences (theme, locale, notifications, onboarding) remain in Postgres.  
**Rationale:** Faster production auth, less custom auth surface, Clerk handles security flows; product data stays in our DB.  
**Status:** ✅ Accepted  
**Date:** 2026-07-25

---

## ADR-009: Design system — Precision Editorial

**Context:** Need a single world-class, responsive visual language before Module 2 so all product surfaces stay consistent.  
**Options:** Generic shadcn defaults; purple AI aesthetic; Precision Editorial (Linear density + Stripe polish + editorial type + quiet motion).  
**Outcome:** **Accepted** — Precision Editorial. Tokens/fonts in `apps/web`; contract in `docs/DESIGN_SYSTEM.md`. Light-first with true dark mode. Display: Newsreader; UI: Plus Jakarta Sans; accent: deep forest green on stone/charcoal (classic professional). Clerk appearance syncs with `next-themes`.  
**Status:** ✅ Accepted  
**Date:** 2026-07-25

---

## ADR-005: AI provider strategy — LiteLLM abstraction

**Context:** Support multiple LLM providers; local dev with Ollama.  
**Options:** Direct OpenAI SDK, LiteLLM, LangChain-only.  
**Outcome:** **Accepted** — LiteLLM in FastAPI service; Dev: Ollama; Prod: OpenAI + Anthropic.  
**Status:** ✅ Accepted  
**Date:** 2026-07-21

---

## ADR-006: MVP job data source

**Context:** Job discovery requires data before integrations exist.  
**Options:** Manual seed data, Adzuna/Remotive APIs, scrape (legal concerns).  
**Outcome:** **Accepted** — Seed data for dev; licensed job APIs for staging/production.  
**Status:** ✅ Accepted  
**Date:** 2026-07-21

---

## ADR-007: Deployment target

**Context:** Affects Docker setup, env management, and CI/CD.  
**Options:** Vercel + Railway, AWS, self-hosted VPS, Docker Compose only for now.  
**Outcome:** **Accepted** — Vercel (web) + Railway or Fly.io (API, workers, AI service).  
**Status:** ✅ Accepted  
**Date:** 2026-07-21

---

## ADR-010: Resume file storage — local + S3-compatible

**Context:** Module 3 needs durable resume files (PDF/DOCX) with a path to CDN later. Architecture mentioned UploadThing + Cloudinary; the project already uses Supabase Postgres.
**Options:** UploadThing-only, Cloudinary raw, local disk only, S3-compatible (Supabase Storage / MinIO / AWS).
**Outcome:** **Accepted** — Storage abstraction: **local filesystem** for development (`uploads/`), **S3-compatible** object storage for staging/production (Supabase Storage, MinIO, or AWS S3 via standard env vars). UploadThing/Cloudinary deferred until we need their upload UX or image CDN features.
**Rationale:** Works immediately without a third vendor account; Supabase Storage reuses existing infra; same code path for Nest and Next BFF.
**Status:** ✅ Accepted  
**Date:** 2026-07-26

---

## ADR-011: Job embeddings — nomic-embed-text @ 768 dims

**Context:** Module 5 needs semantic job search. Vector column dimensions are fixed at migration time, so the embedding model choice is hard to reverse.
**Options:** OpenAI `text-embedding-3-small` (1536 or reduced), local `nomic-embed-text` (768), keyword-only until Phase 3.
**Outcome:** **Accepted** — Local **`ollama/nomic-embed-text` at 768 dimensions**, with keyword search as the always-on baseline and hybrid RRF ranking when vectors exist. OpenAI remains swappable later at the same width without a schema migration.
**Rationale:** Embeddings are the AI workload where local models are competitive (tens of ms, free). Chat-style LLM enrichment for resume parsing was not; that stays opt-in. Keyword-first means search still works when Ollama is down.
**Status:** ✅ Accepted

**Date:** 2026-07-26

---

## ADR-012: Job match scoring — deterministic skill coverage

**Context:** Module 6 needs a match score and missing-skills breakdown without waiting on AI JD analysis.
**Options:** LLM job-description analysis day 1, embedding similarity vs profile text, deterministic skill-set overlap.
**Outcome:** **Accepted** — Deterministic **job-skill coverage** (`matched / job.skills`, 0–100) with light alias normalisation in `@jobmatch/job-search`. Personalised ranking uses `sort=match` (and becomes the default when browsing with a non-empty profile).
**Rationale:** Profile and job skills already exist; overlap is explainable, fast, and offline-friendly. LLM insights and learning recommendations stay Phase 3.
**Status:** ✅ Accepted
**Date:** 2026-07-26
