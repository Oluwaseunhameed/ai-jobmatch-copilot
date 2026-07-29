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

---

## ADR-019: Job alerts — saved searches + scheduled email sweep

**Context:** Phase 3 Module 5 needs alerts, saved searches, and trending without a full search platform upgrade.
**Options:** Profile-only alerts; third-party alert SaaS; persist `JobSearchParams` as saved searches and sweep with Nest `setInterval` (same pattern as application reminders).
**Outcome:** **Accepted** — `SavedSearch` stores filter JSON matching `JobSearchParams`. Users toggle `alertEnabled` per search; global gate remains `UserPreference.emailJobAlerts`. Nest `JobAlertWorker` runs `runJobAlerts()` which reuses `searchJobs({ …, postedAfter })` and sends `jobAlertEmail`. Trending ranks jobs by recent save/view interaction volume (saves weighted higher).
**Rationale:** Reuses existing search + email + reminder worker patterns; no Meilisearch/ingestion dependency for this slice.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-020: Job insights — deterministic fit + curated learning paths

**Context:** Phase 3 Module 6 needs richer job intelligence beyond basic skill overlap, without blocking on LLM JD analysis.
**Options:** LLM JD analysis day 1; embedding similarity; extend ADR-012 deterministic layer with fit signals + learning catalog.
**Outcome:** **Accepted** — `buildJobInsights()` layers seniority, work-mode, role, and salary fit signals on top of `matchJobSkills`. Prioritised skill gaps (high/medium/low) from requirements ordering. Curated offline learning catalog for common missing skills; generic search fallback otherwise. Exposed via `GET /api/jobs/[slug]/insights` and job detail sidebar panel.
**Rationale:** Explainable, fast, no AI dependency for MVP rich insights; LLM narratives can extend later without changing the DTO contract.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-021: Company intelligence — job-derived aggregates (no external enrichment)

**Context:** Phase 3 Module 7 needs dedicated company profiles (hiring, stack, culture, compensation themes) without third-party company APIs on day one.
**Options:** Crunchbase/Clearbit enrichment; manual admin curation; aggregate intelligence from existing `Company` + active `Job` rows.
**Outcome:** **Accepted** — `buildCompanyProfile()` derives open-role counts, posting velocity, tech-stack frequency, benefits themes, work-mode/seniority mix, salary bands, and culture signals from active listings. User-specific viewer stats (saved roles, applications, avg match). Exposed via `GET /api/companies/[slug]` and `/companies/[slug]` page; job detail links to full profile.
**Rationale:** Reuses seed + job catalog data already in Postgres; funding/interview difficulty deferred until licensed sources or enough application telemetry exist.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-022: Career Growth Hub — market-demand gaps + curated roadmaps

**Context:** Phase 3 Module 15 needs skill-gap analysis, learning roadmaps, certifications, career paths, salary growth, and promotion readiness without waiting on an AI coach (Module 16).
**Options:** LLM coach day 1; third-party L&D APIs; deterministic hub comparing profile skills to active job-catalog demand with curated learning/cert catalogs.
**Outcome:** **Accepted** — `buildCareerGrowthHub()` ranks market skill demand from active jobs, surfaces gaps vs the profile, builds a prioritised learning roadmap (shared catalog with Module 6), suggests certifications, career ladders from desired roles, salary vs catalog medians, and a promotion-readiness checklist toward the next seniority band. Exposed via `GET /api/users/me/growth` and `/growth`.
**Rationale:** Explainable and offline-friendly; Module 16 can later layer conversational coaching without changing the DTO contract.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-023: Interview prep — deterministic question packs + self-rated confidence

**Context:** Phase 4 Module 12 needs job/company-specific interview preparation across behavioral, technical, coding, system design, database, frontend, backend, and DevOps categories.
**Options:** Full conversational LLM mock + voice day 1; third-party interview SaaS; curated question bank tailored by job title/skills/seniority with practice self-ratings.
**Outcome:** **Accepted** — `InterviewPrep` sessions store generated packs from `buildInterviewQuestions()`. Categories inferred from role signals; difficulty gated by seniority. Users rate confidence 1–5 per question; `computeConfidenceScore()` blends average rating with coverage. Sync create (no queue). Voice mock interviews and LLM conversational scoring stay deferred (ARCHITECTURE already lists voice out of scope).
**Rationale:** Ships usable prep without AI latency/cost; LLM enrichment can wrap the same DTO later.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-024: Coding assessment prep — curated timed packs + attempt analytics

**Context:** Phase 4 Module 13 needs company/role coding prep across LeetCode-style, HackerRank-style, and take-home challenges with difficulty, timers, and performance analytics.
**Options:** Sandboxed code runner + LLM review day 1; third-party LeetCode embeds; curated offline problem bank with attempt tracking and review checklists.
**Outcome:** **Accepted** — `CodingPracticeSession` stores packs from `buildCodingPack()` (skill/seniority-aware). Users log solved/attempted/skipped with minutes and self-ratings; `computeCodingPerformance()` produces a 0–100 score. Per-problem review checklist stands in for AI code review. Exposed via `/practice` and job-detail panel. Full AI code review and sandboxed execution deferred.
**Rationale:** Delivers assessment prep without judge infrastructure; DTO can later attach LLM review results.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-025: AI Career Coach — Growth Hub context + LiteLLM with template fallback

**Context:** Phase 4 Module 16 needs conversational coaching without replacing Module 15’s deterministic Growth Hub (ADR-022) or inventing ungrounded advice.
**Options:** Free-form chat with no market grounding; human coach marketplace (Phase 6); Growth Hub snapshot + LiteLLM replies with deterministic template fallback.
**Outcome:** **Accepted** — `CareerCoachSession` stores focus, message history, and a slim Growth Hub context snapshot. `POST /v1/coach/chat` (AI service) attempts LiteLLM; on failure the BFF/`buildTemplateCoachReply()` path still coaches from gaps, roadmap, salary, and promotion signals. Exposed via `/coach` and `GET/POST/PATCH /api/users/me/coach-sessions`. Team/human coach roles stay Phase 6.
**Rationale:** Keeps `CareerGrowthHubDto` stable while adding a conversational layer; works offline when LLM is unavailable.
**Status:** ✅ Accepted  
**Date:** 2026-07-27

---

## ADR-026: Portfolio & Project Builder — manual projects + skill-gap suggestions

**Context:** Phase 4 Module 14 needs a project library for applications/resumes without building a public hosted portfolio site or GitHub OAuth import on day one.
**Options:** Hosted themeable portfolio site; GitHub API sync; LLM project writeups; structured `PortfolioProject` CRUD with deterministic suggestions from Growth Hub gaps.
**Outcome:** **Accepted** — `PortfolioProject` stores title, stack, STAR fields, links, featured/status flags. `buildProjectSuggestions()` proposes builds from Module 15 skill gaps; `buildResumeBullets()` produces paste-ready bullets. Exposed via `/portfolio` and `GET/POST/PATCH/DELETE /api/users/me/portfolio`. Profile `portfolioUrl`/`githubUrl` remain external links. Hosted sites, GitHub import, and LLM writeups deferred.
**Rationale:** Ships the architecture `Projects[]` need as an explainable content library that feeds resumes/applications without CDN or third-party sync.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-027: Professional Networking — user CRM + public company/job signals

**Context:** Phase 5 Module 8 needs networking support without LinkedIn scraping or auto-messaging (roadmap: “public data only”).
**Options:** LinkedIn unofficial APIs; people-enrichment vendors; user-owned contact CRM seeded by saved jobs/applications plus copyable talk tracks.
**Outcome:** **Accepted** — `NetworkingContact` stores manual contacts (optional `Company` link, public profile URL, status). Hub builds **target companies** from applications/saved/viewed jobs and public website/careers/source URLs already in the catalog. Talk-track templates are copy-paste only. Exposed via `/network` and `GET/POST/PATCH/DELETE /api/users/me/network`. Scraping, auto-send, and connection graphs deferred.
**Rationale:** Respects legal/ToS constraints while making outreach practical for companies the user already engages with in-product.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-028: Assisted apply — checklist + user-approved fill plan (no unsupervised submit)

**Context:** Phase 5 Module 10 needs Playwright-oriented application automation without violating the architecture rule that browser assist never submits without explicit user approval.
**Options:** Unsupervised ATS auto-apply; browser extension; checklist + copyable fill plan + confirm-submitted, with Playwright limited to future fixture/approved fill only.
**Outcome:** **Accepted** — `ApplyAssistSession` stores checklist, fill plan (profile/draft fields), open/approve/confirm timestamps, and a Playwright gate status. Users open `applyUrl`, approve the fill plan, paste values themselves (or run fill-only assist per ADR-033), then confirm submission (moves pipeline to `applied`). Unsupervised Playwright submit remains forbidden; production fill adapters are gated by `APPLY_AUTOMATION_LIVE` / fixture flags.
**Rationale:** Ships useful assisted apply immediately while encoding the user-in-the-loop boundary in data + API.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-029: Admin portal — Next `(admin)` + BFF, role/`ADMIN_EMAILS` gate

**Context:** Phase 5 Module 20 needs an ops surface for users, catalog, billing, and lightweight flags. Phase 1’s “basic admin users panel” was never shipped; Nest admin parity and LaunchDarkly-scale flags are out of scope for this slice.
**Options:** Separate admin SPA; Nest-only admin API; Next route group + `/api/admin/*` BFF gated by `User.role` / bootstrap emails.
**Outcome:** **Accepted** — Admin lives at `/admin/*` in a dedicated `(admin)` layout (no onboarding gate). Access via `requireAdmin()`: `User.role === 'admin'` or email in `ADMIN_EMAILS` (allowlisted users are promoted to `admin` on first admin hit). BFF routes return 401/403. `AppFeatureFlag` + thin `AdminActionLog` cover flags-lite and role/flag mutations. Coach/support workflows, Nest parity, and full audit platforms deferred.
**Rationale:** Reuses the existing Next+Prisma product path, matches architecture roles, and unblocks ops without a second frontend.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-030: Full Program — Waves 1–6 after Phase 5

**Context:** Phases 0–5 delivered MVP depth for all 20 modules. Remaining work is deferred depth, Phase 6 enterprise, and tech debt — too large for a single sprint and uneven in dependency/risk.
**Options:** Pick ad-hoc polish forever; jump straight to Phase 6 enterprise; sequence a **Full Program** of six waves.
**Outcome:** **Accepted** — Deliver Waves 1→6 as documented in `ROADMAP.md` / `TASKS.md`. Wave 1 = polish & retention (digest, PDF exports, jobs filters, saved jobs, E2E). Nest parity stays optional/deprioritized. LinkedIn scrape remains out of scope (ADR-027). Each wave ships and verifies before the next starts.
**Rationale:** Makes “get it all done” actionable without pretending enterprise + ATS adapters + LLM depth fit in one PR.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-031: Wave 2 job ingestion — public/licensed APIs only (no scrape-all)

**Context:** Wave 2 needs a live job catalog. The product wishlist includes dozens of boards (Himalayas, Remotive, USAJobs, Greenhouse, Upwork, Google Careers, ZipRecruiter, etc.). Many have no redistributable public API; freelance marketplaces and big-tech career sites prohibit scraping or require partnerships.
**Options:** Scrape everything; only Adzuna/Remotive; multi-provider ingest with an explicit catalog of active / keyed / deferred sources.
**Outcome:** **Accepted** — `runJobIngest()` + provider catalog. **Default active (no key):** Remotive, Himalayas, Jobicy, Arbeitnow, Remote OK. **Optional with credentials/boards:** Adzuna, USAJobs, Greenhouse/Lever/Ashby/Workable board lists. **Deferred (partner/ToS):** aggregators, freelance marketplaces, government portals beyond USAJobs, and corporate career sites without a published board token. Scraping remains rejected (extends ADR-006). Seed jobs are purged after first successful ingest via `purgeSeedJobs()`.
**Rationale:** Ships a real catalog immediately while staying legally defensible; remaining platforms can unlock as keys/boards become available without redesign.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-032: Meilisearch for keyword search; keep Postgres hybrid + analytics charts

**Context:** Wave 2 called for Meilisearch/OpenSearch and an advanced analytics dashboard. Catalog size after multi-provider ingest makes Postgres FTS alone less ideal for keyword ranking/facets, while pgvector hybrid already works in-repo.
**Options:** OpenSearch cluster; Meilisearch only; stay on Postgres FTS forever.
**Outcome:** **Accepted** — Optional Meilisearch behind `MEILI_HOST` for keyword search + facets; automatic fallback to Postgres FTS. Hybrid semantic search stays on Postgres/pgvector (ADR-011). Ingest best-effort indexes documents; `pnpm jobs:reindex` backfills. Advanced analytics = weekly time-series + pipeline charts on user dashboard and admin overview (Recharts), not a separate BI product. OpenSearch remains deferred.
**Rationale:** Meilisearch is the lighter ops fit for this monorepo; preserves existing hybrid path; charts reuse Prisma aggregates already used for Module 18/20.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-033: Wave 3 — Playwright ATS fill adapters (never unsupervised submit)

**Context:** Wave 3 needed production ATS browser assist beyond checklist/copy-paste, while ADR-028 forbids unsupervised submit.
**Options:** Full auto-apply; extension-only; fill-only Playwright adapters gated by env/flags + user-confirmed submit.
**Outcome:** **Accepted** — Detect Greenhouse / Lever / Ashby / Workable (URL or ingest `source`) plus `/apply-fixture`. After fill-plan approval, `run_fill` launches Playwright to fill mapped fields only (never clicks Submit/Apply). Live ATS requires `APPLY_AUTOMATION_LIVE=1`; fixture assist uses `/apply-fixture` and/or `APPLY_AUTOMATION_FIXTURE` / admin `apply_automation_fixture`. Persist `atsVendor` + `fillAttemptJson` for observability. Stage still moves to `applied` only via `confirm_submitted`.
**Rationale:** Delivers Wave 3 automation depth without weakening the user-in-the-loop submit boundary.
**Status:** ✅ Accepted  
**Date:** 2026-07-28

---

## ADR-034: Production job ingest schedule — GitHub Actions primary

**Context:** Catalog refresh was manual (`pnpm jobs:ingest`). Production needs recurring ingest without a scrape-all crawler; deploy hosts (Railway/Fly) are not yet fully wired in-repo.
**Options:** Vercel cron; Docker cron; Nest `setInterval` only; GitHub Actions `schedule` + optional Nest worker.
**Outcome:** **Accepted** — Primary cron is `.github/workflows/job-ingest.yml` (twice daily UTC + `workflow_dispatch`). Default mode `include-keyed` (public + ready keyed/ATS). Secrets supply `DATABASE_URL` and optional provider keys. Never auto-runs `jobs:purge-seed`. Optional Nest `JobIngestWorker` behind `JOB_INGEST_ENABLED=true` for long-lived API hosts; operators should enable only one scheduler.
**Rationale:** Reuses the existing CLI, works before API hosting is finalized, and matches alert/digest worker patterns without coupling heavy provider IO to request latency.
**Status:** ✅ Accepted  
**Date:** 2026-07-29

---

## ADR-035: Wave 4 — AI depth overlays (LLM + degrade, no unsupervised automation)

**Context:** Wave 4 needed LLM narratives, mock interview feedback, coding review, coach memory, and portfolio hosting without breaking deterministic MVPs or inventing sandbox/voice infra.
**Options:** Replace template modules with LLM-only; full voice+sandbox agents; additive AI overlays with template fallback.
**Outcome:** **Accepted** — Deterministic bases stay; ai-service adds `/v1/jobs/insights/narrative`, `/v1/interview/mock-turn`, `/v1/coding/review`, `/v1/coach/memory/summarize`. Coach injects `CoachMemory` + recent applications. Interview supports browser SpeechRecognition for capture only. Portfolio adds `/p/[slug]` publish + public GitHub import (`GITHUB_TOKEN` optional). Code execution sandbox and full TTS remain deferred.
**Rationale:** Ships Wave 4 depth on the existing LiteLLM degrade pattern; keeps product usable when models are offline.
**Status:** ✅ Accepted  
**Date:** 2026-07-29

---

## ADR-036: Wave 5 — Platform & enterprise (profile depth, notifications, team, referrals)

**Context:** Wave 5 needed structured education/work experience on profiles, durable notification delivery with an in-app center, a Team plan tier for coach-led cohorts, coach/support staff workflows, and a referral loop that rewards after onboarding — without unsupervised apply automation or a separate notification microservice.
**Options:** Third-party notification inbox; email-only alerts; full enterprise SSO org model; minimal Prisma + BFF extensions on the existing monorepo.
**Outcome:** **Accepted** — `Education` / `WorkExperience` on `CareerProfile` with BFF PUT + profile UI. `NotificationLog` stores in-app rows; transactional emails in `resume-parsing/notifications` always `recordInApp` when the user exists, then respect email prefs. Header bell polls BFF `/api/users/me/notifications`. `Team` + `TeamMembership` + `CoachAssignment` with `team` plan limits (`TEAM_PLAN_LIMITS`, display-only checkout). Coach desk (`requireCoach`) and support lookup (`requireSupport`) BFF routes + pages. Referrals: `/register?ref=` → `jm_ref` cookie → `redeemReferralCode` on first user ensure; `maybeRewardReferral` on onboarding complete extends referrer Pro.
**Rationale:** Keeps Wave 5 on the established Next BFF + Prisma pattern, ships staff tooling with role gates, and ties growth mechanics to completed onboarding rather than signup alone.
**Status:** ✅ Accepted  
**Date:** 2026-07-29
