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

---

## ADR-014: Resume optimisation — keyword-fit score + LiteLLM rewrite

**Context:** Phase 2 Module 4 needs before/after resume tailoring for a job without claiming vendor ATS accuracy.
**Options:** Commercial ATS APIs, embedding-only rewrite, deterministic keyword coverage + optional LiteLLM rewrite.
**Outcome:** **Accepted** — Always compute **job-skill keyword fit** (0–100). Best-effort LiteLLM rewrite of headline/summary/skills via `POST /v1/resumes/optimize`; degrade to heuristic keyword tips when Ollama is down. Persist `ResumeOptimization` + `ResumeVersion(source=optimized)`.
**Rationale:** Matches ADR-005/012 style (explainable score, graceful degradation). True ATS parsers and PDF export stay later.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-015: Application assistant — LiteLLM + template fallback

**Context:** Phase 2 Module 9 needs cover letters and short application answers for a resume↔job pair before the Application tracker (Module 11) exists.
**Options:** Wait for full Application model, commercial writing APIs, LiteLLM with a deterministic template fallback.
**Outcome:** **Accepted** — Persist `ApplicationDraft` (status machine like Module 4). AI `POST /v1/applications/generate` returns cover letter + up to 3 short answers via LiteLLM; when the model is unavailable, return a filled **template** draft with `source: "template"`. Job-detail panel polls BFF; queue/inline parity with resume optimise.
**Rationale:** Users always get usable copy; Module 11 can later attach drafts to pipeline rows without blocking this slice.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-016: Application tracker — pipeline row distinct from JobInteraction

**Context:** Phase 2 Module 11 needs a Kanban pipeline. Users already “save” jobs via `JobInteraction`, and Module 9 stores cover-letter drafts separately.
**Options:** Overload `JobInteraction.notes/type`, fold everything into `ApplicationDraft`, or introduce `Application` as the pipeline entity.
**Outcome:** **Accepted** — New `Application` with unique `(userId, jobId)`, `ApplicationStage` vocabulary, notes, and optional `resumeId` / `draftId`. `JobInteraction.saved` remains the shortlist bookmark; tracker is the intentional pipeline. Creating an application auto-links the latest ready draft when present.
**Rationale:** Clear product semantics (bookmark vs pipeline), attaches Module 9 drafts without blocking Module 17 notifications later.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-017: Notifications — Resend + preference-gated product email

**Context:** Phase 2 Module 17 needs transactional email for optimisation complete and application reminders without building a full notification center.
**Options:** Third-party only (Customer.io), in-app inbox first, Resend via existing `@jobmatch/email` with console fallback.
**Outcome:** **Accepted** — Extend `@jobmatch/email` templates; send asynchronously from optimize/draft runners, application stage PATCH, and a Nest idle-pipeline reminder sweep. Gate all product application emails on `UserPreference.emailApplicationUpdates`. Without `RESEND_API_KEY`, log to console in development. Job alerts / weekly digest remain prefs-only until Phase 3.
**Rationale:** Transport and settings UI already existed; minimal hooks deliver ROADMAP value while keeping digests and push out of scope.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-018: Billing — Lemon Squeezy (global) + Paystack (Nigeria)

**Context:** Phase 2 Module 19 needs Pro subscriptions and one-time purchases. Stripe is common but weaker for Nigerian cards/NGN; Lemon Squeezy covers global SaaS checkout well.
**Options:** Stripe-only; Paystack-only; Lemon Squeezy + Paystack dual providers; Paddle.
**Outcome:** **Accepted** — Dual providers. Lemon Squeezy is the default global checkout (cards / subscriptions / one-time variants). Paystack serves Nigerian customers (NGN plan code or one-time amount in kobo). Region hint from `CareerProfile.country`; user can override on Settings → Plan. Webhooks on the Next.js BFF upsert a `Subscription` row; Free/Pro ceilings enforced on resume upload, job save, optimise, and cover-letter generation.
**Rationale:** Matches product geography (global + Nigeria), avoids Stripe Nigeria friction, keeps billing in the BFF next to Clerk webhooks without a Nest dependency for this slice.
**Status:** ✅ Accepted  
**Date:** 2026-07-27
