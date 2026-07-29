# Tasks — AI JobMatch Copilot

## Current Sprint: Full Program — Wave 6 (Scale & infra)

### Phases 0–5 — Complete ✅ · Waves 1–4 — Complete ✅ · Wave 5 — Complete ✅

### Wave 2 — Data & discovery ✅

- [x] Multi-provider job ingest (`pnpm jobs:ingest`) — Remotive, Himalayas, Jobicy, Arbeitnow, Remote OK
- [x] Optional keyed providers — Adzuna, USAJobs, Greenhouse/Lever/Ashby/Workable boards
- [x] Keyed unlock docs + `--status` / `--keyed` / ATS defaults — `docs/JOB_INGEST_KEYS.md`
- [x] Provider catalog for deferred platforms (partner/ToS) — ADR-031
- [x] Purge seeded jobs (`pnpm jobs:purge-seed`)
- [x] Meilisearch keyword search + `pnpm jobs:reindex` (Postgres FTS fallback)
- [x] Advanced analytics dashboard (user `/dashboard` + admin trends)

### Wave 2 follow-up — Production ingest schedule ✅

- [x] GitHub Actions scheduled ingest (twice daily + `workflow_dispatch`) — `.github/workflows/job-ingest.yml`
- [x] Optional Nest `JobIngestWorker` (`JOB_INGEST_ENABLED=true`) — prefer Actions or worker, not both
- [x] Runbook secrets — `docs/JOB_INGEST_KEYS.md` § Production auto-ingest

### Wave 3 — Automation depth ✅

- [x] Production Playwright ATS adapters (Greenhouse / Lever / Ashby / Workable + `/apply-fixture`) — **fill-only**, never unsupervised submit (ADR-028 / ADR-033)
- [x] Apply-assist hardening — `run_fill`, fill attempt observability, fixture page, env/flag gates

### Wave 4 — AI depth ✅

- [x] LLM JD narrative insights (`POST /v1/jobs/insights/narrative` + themes/source on insights)
- [x] Voice + conversational mock interview (text mock turn + browser Voice input; TTS/sandbox deferred)
- [x] Coding AI review (paste solution → `/v1/coding/review`; execution sandbox deferred)
- [x] Coach long-term memory + light tools (`CoachMemory`, recent applications in context)
- [x] Hosted portfolio `/p/[slug]` + GitHub repo import

### Wave 5 — Platform & enterprise ✅

- [x] Team tier (career coaches)
- [x] Coach / support admin workflows
- [x] Referral program
- [x] In-app notification center + NotificationLog
- [x] Education / Experience models

### Wave 5 follow-up (pre–Wave 6) ✅

- [x] Team plan checkout (Lemon/Paystack) + webhook `planId` mapping + create/invite gate
- [x] Referral `jm_ref` redeem after Clerk webhook race + cookie clear
- [x] Settings i18n for Team / Referral; interview/coding hub copy refresh

### Wave 6 — Scale & infra

- [ ] Multi-region deployment
- [x] Flags / A/B at scale (rollout % bucketing via admin-controlled feature flags)
- [ ] Upload CDN when needed
- [ ] External company enrichment

### Explicitly out of scope

- [x] LinkedIn scrape / auto-message — never (ADR-027)

### Optional / deprioritized

- Nest API parity for BFF-first modules

---

## Technical Debt Tracker

| Item                                         | Introduced | Priority | Notes                                                 |
| -------------------------------------------- | ---------- | -------- | ----------------------------------------------------- |
| Education / Experience models                | Module 2   | —        | ✅ Wave 5                                             |
| Nest vs Next dual path (profile/resume/jobs) | Module 2–5 | Low      | BFF uses Prisma; Nest optional                        |
| E2E profile/resume/jobs tests                | Module 2–5 | Medium   | ✅ Wave 1 public smoke; auth flows later              |
| UploadThing / Cloudinary                     | Module 3   | Low      | Wave 6 / ADR-010                                      |
| Full LLM ATS optimization                    | Module 4   | Medium   | Keyword-fit + rewrite shipped; vendor ATS later       |
| Legacy `.doc` support                        | Module 4   | Low      | PDF/DOCX only; clear error for `.doc`                 |
| Optimized resume PDF export                  | Module 4   | Medium   | ✅ Wave 1                                             |
| Nest optimize endpoints parity               | Module 4   | Low      | Deprioritized                                         |
| Licensed job API ingestion                   | Module 5   | Medium   | ✅ Wave 2 — multi-provider ingest (ADR-031)           |
| Meilisearch / OpenSearch                     | Module 5   | Low      | ✅ Wave 2 — Meilisearch + FTS fallback (ADR-032)      |
| LLM JD narrative insights                    | Module 6   | —        | ✅ Wave 4                                             |
| Required vs preferred job skills split       | Module 6   | Low      | Single `Job.skills[]` for now                         |
| Dedicated saved-jobs route                   | Module 18  | Low      | ✅ Wave 1 — `/jobs/saved`                             |
| Charts / advanced analytics                  | Module 18  | Low      | ✅ Wave 2 — dashboard + admin trends                  |
| Enforce Free plan limit ceilings             | Module 19  | —        | ✅ Done                                               |
| Subscription + Lemon/Paystack webhooks       | Module 19  | —        | ✅ Done — ADR-018                                     |
| Nest applications CRUD parity                | Module 11  | Low      | Deprioritized                                         |
| Application documents / attachments          | Module 11  | Low      | Link drafts only today                                |
| Nest application-draft endpoints parity      | Module 9   | Low      | Deprioritized                                         |
| Cover letter PDF / DOCX export               | Module 9   | Low      | ✅ Wave 1 — PDF                                       |
| Weekly digest email                          | Module 17  | Medium   | ✅ Wave 1                                             |
| NotificationLog / delivery audit             | Module 17  | —        | ✅ Wave 5                                             |
| In-app notification center                   | Module 17  | —        | ✅ Wave 5                                             |
| Nest saved-search / trending parity          | Module 5   | Low      | Deprioritized                                         |
| employmentType / country / salaryMin in UI   | Module 5   | Low      | ✅ Wave 1                                             |
| Skill.level / years in match scoring         | Module 6   | Low      | Profile proficiency not weighted yet                  |
| Nest job insights parity                     | Module 6   | Low      | Deprioritized                                         |
| External funding / interview data            | Module 7   | Medium   | Wave 6                                                |
| Nest company profile parity                  | Module 7   | Low      | Deprioritized                                         |
| LLM personalized coaching                    | Module 15  | —        | ✅ Done — Module 16 (ADR-025)                         |
| Nest growth hub parity                       | Module 15  | Low      | Deprioritized                                         |
| Voice + LLM conversational mock interview    | Module 12  | —        | ✅ Wave 4 (TTS deferred)                              |
| Nest interview prep parity                   | Module 12  | Low      | Deprioritized                                         |
| Full AI code review / sandboxed runner       | Module 13  | —        | ✅ Wave 4 review API; sandbox deferred                |
| Nest coding session parity                   | Module 13  | Low      | Deprioritized                                         |
| Nest career coach parity                     | Module 16  | Low      | Deprioritized                                         |
| Coach long-term memory / tool agents         | Module 16  | —        | ✅ Wave 4                                             |
| Nest portfolio parity                        | Module 14  | Low      | Deprioritized                                         |
| Hosted portfolio site / GitHub project sync  | Module 14  | —        | ✅ Wave 4                                             |
| Nest networking parity                       | Module 8   | Low      | Deprioritized                                         |
| LinkedIn scrape / auto-message               | Module 8   | —        | Explicitly out of scope (ADR-027)                     |
| Nest apply-assist parity                     | Module 10  | Low      | Deprioritized                                         |
| Nest admin portal parity                     | Module 20  | Low      | Deprioritized                                         |
| LaunchDarkly / A/B at scale                  | Module 20  | Low      | Wave 6                                                |
| Coach / support admin workflows              | Module 20  | —        | ✅ Wave 5                                             |
| Production Playwright ATS adapters           | Module 10  | Medium   | Wave 3 ✅                                              |
| Team tier / referral / multi-region          | Phase 6    | Medium   | Team + referral + Team checkout ✅; multi-region Wave 6 |
