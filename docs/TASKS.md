# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 1 complete — Phase 2 next

### Phase 0 — Complete ✅

### Phase 1 — Module 1 (Clerk) ✅

### Phase 1 — Design foundation ✅

### Phase 1 — Module 2: Career Profile ✅

### Phase 1 — Module 3: Resume Management ✅

### Phase 1 — Module 4: AI Resume Optimization (basic) ✅

- [x] Real PDF/DOCX text extraction (`pypdf`, `python-docx`)
- [x] Heuristic structuring (+ optional LiteLLM enrichment)
- [x] Auto-parse after upload (`queued → processing → ready/failed`)
- [x] Manual re-parse endpoint + Nest `POST .../parse`
- [x] Resume library: parse status, preview, re-parse, apply-to-profile
- [x] Apply parsed headline/summary/skills into empty profile fields
- [x] AI service unit test for structuring heuristics

### Phase 1 — Module 5: Job Discovery ✅

- [x] Company / Job / JobInteraction schema + `vector(768)` + FTS index
- [x] Seed script (`pnpm db:seed`) — 10 companies, 60 roles
- [x] Embeddings via Ollama `nomic-embed-text` (`pnpm jobs:embed`)
- [x] Hybrid search (Postgres FTS + pgvector RRF) in `@jobmatch/job-search`
- [x] Nest + Next BFF: search, detail, save/unsave, saved list
- [x] Jobs list/detail UI, nav + dashboard wiring

### Phase 1 — Module 6: Job Intelligence (basic) ✅

- [x] Deterministic skill-overlap match score (`matchJobSkills` in `@jobmatch/job-search`)
- [x] Matched / missing skills on job detail
- [x] Personalised ranking (`sort=match`; browsing defaults to match when profile has skills)
- [x] Match % on job cards + profile prompt when skills are empty

### Phase 1 — Module 18: Analytics Dashboard (minimal) ✅

- [x] Completeness % with unmet profile gaps on dashboard
- [x] Saved / viewed activity counts + last job activity
- [x] Recent saved roles list with match scores
- [x] Remove Module 3/5 scaffolding labels and pipeline stub

### Phase 1 — Module 19: Subscription (Free tier only) ✅

- [x] Free-tier product framing (limits/copy) without Stripe — Settings → Plan
- [x] Shared `FREE_PLAN_LIMITS` constants + dashboard soft plan note
- [x] Defer billing / Pro / Stripe wiring to Phase 2

### Phase 2 — Next up

- [ ] Module 4 — Full resume optimisation (before/after, ATS score)
- [ ] Module 9 — AI Application Assistant
- [ ] Module 11 — Application Tracker
- [ ] Module 17 — Notifications (email)
- [ ] Module 19 — Pro tier + Stripe billing

---

## Technical Debt Tracker

| Item                                         | Introduced | Priority | Notes                                                 |
| -------------------------------------------- | ---------- | -------- | ----------------------------------------------------- |
| Education / Experience models                | Module 2   | Medium   | Deferred; Architecture diagram lists them for later   |
| Nest vs Next dual path (profile/resume/jobs) | Module 2–5 | Low      | BFF uses Prisma; Nest API available for clients       |
| E2E profile/resume/jobs tests                | Module 2–5 | Medium   | Unit tests only so far                                |
| UploadThing / Cloudinary                     | Module 3   | Low      | Deferred by ADR-010 until CDN/upload UX needed        |
| Full LLM ATS optimization                    | Module 4   | Medium   | Basic parse shipped; before/after optimize in Phase 2 |
| Legacy `.doc` support                        | Module 4   | Low      | PDF/DOCX only; clear error for `.doc`                 |
| Licensed job API ingestion                   | Module 5   | Medium   | ADR-006: seed for now; Adzuna/Remotive later          |
| Meilisearch / OpenSearch                     | Module 5   | Low      | Deferred by ADR-003 until scale demands it            |
| AI JD analysis / learning recommendations    | Module 6   | Medium   | Phase 3 rich insights; MVP is deterministic overlap   |
| Required vs preferred job skills split       | Module 6   | Low      | Single `Job.skills[]` treated as requirements for now |
| Dedicated saved-jobs route                   | Module 18  | Low      | Dashboard lists recent saves; full list via Jobs UI   |
| Charts / advanced analytics                  | Module 18  | Low      | Phase 6; Free tier stays a quiet readout              |
| Enforce Free plan limit ceilings             | Module 19  | Medium   | Framing only; gate uploads/saves when product needs it|
| Subscription table + Stripe webhooks         | Module 19  | Medium   | Phase 2 Pro billing                                   |
