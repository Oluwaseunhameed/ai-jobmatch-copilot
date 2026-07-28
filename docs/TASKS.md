# Tasks — AI JobMatch Copilot

## Current Sprint: Full Program — Wave 3 (Automation depth)

### Phases 0–5 — Complete ✅ · Wave 1 — Complete ✅ · Wave 2 — Complete ✅

### Wave 2 — Data & discovery ✅

- [x] Multi-provider job ingest (`pnpm jobs:ingest`) — Remotive, Himalayas, Jobicy, Arbeitnow, Remote OK
- [x] Optional keyed providers — Adzuna, USAJobs, Greenhouse/Lever/Ashby/Workable boards
- [x] Keyed unlock docs + `--status` / `--keyed` / ATS defaults — `docs/JOB_INGEST_KEYS.md`
- [x] Provider catalog for deferred platforms (partner/ToS) — ADR-031
- [x] Purge seeded jobs (`pnpm jobs:purge-seed`)
- [x] Meilisearch keyword search + `pnpm jobs:reindex` (Postgres FTS fallback)
- [x] Advanced analytics dashboard (user `/dashboard` + admin trends)

### Wave 3 — Automation depth

- [ ] Production Playwright ATS adapters
- [ ] Apply-assist hardening

### Wave 4 — AI depth

- [ ] LLM JD narrative insights
- [ ] Voice + conversational mock interview
- [ ] Coding sandbox / AI code review
- [ ] Coach long-term memory / tool agents
- [ ] Hosted portfolio / GitHub sync

### Wave 5 — Platform & enterprise

- [ ] Team tier (career coaches)
- [ ] Coach / support admin workflows
- [ ] Referral program
- [ ] In-app notification center + NotificationLog
- [ ] Education / Experience models

### Wave 6 — Scale & infra

- [ ] Multi-region deployment
- [ ] Flags / A/B at scale
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
| Education / Experience models                | Module 2   | Medium   | Wave 5                                                |
| Nest vs Next dual path (profile/resume/jobs) | Module 2–5 | Low      | BFF uses Prisma; Nest optional                        |
| E2E profile/resume/jobs tests                | Module 2–5 | Medium   | ✅ Wave 1 public smoke; auth flows later              |
| UploadThing / Cloudinary                     | Module 3   | Low      | Wave 6 / ADR-010                                      |
| Full LLM ATS optimization                    | Module 4   | Medium   | Keyword-fit + rewrite shipped; vendor ATS later       |
| Legacy `.doc` support                        | Module 4   | Low      | PDF/DOCX only; clear error for `.doc`                 |
| Optimized resume PDF export                  | Module 4   | Medium   | ✅ Wave 1                                             |
| Nest optimize endpoints parity               | Module 4   | Low      | Deprioritized                                         |
| Licensed job API ingestion                   | Module 5   | Medium   | ✅ Wave 2 — multi-provider ingest (ADR-031)           |
| Meilisearch / OpenSearch                     | Module 5   | Low      | ✅ Wave 2 — Meilisearch + FTS fallback (ADR-032)      |
| LLM JD narrative insights                    | Module 6   | Medium   | Wave 4                                                |
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
| NotificationLog / delivery audit             | Module 17  | Low      | Wave 5                                                |
| In-app notification center                   | Module 17  | Low      | Wave 5                                                |
| Nest saved-search / trending parity          | Module 5   | Low      | Deprioritized                                         |
| employmentType / country / salaryMin in UI   | Module 5   | Low      | ✅ Wave 1                                             |
| Skill.level / years in match scoring         | Module 6   | Low      | Profile proficiency not weighted yet                  |
| Nest job insights parity                     | Module 6   | Low      | Deprioritized                                         |
| External funding / interview data            | Module 7   | Medium   | Wave 6                                                |
| Nest company profile parity                  | Module 7   | Low      | Deprioritized                                         |
| LLM personalized coaching                    | Module 15  | —        | ✅ Done — Module 16 (ADR-025)                         |
| Nest growth hub parity                       | Module 15  | Low      | Deprioritized                                         |
| Voice + LLM conversational mock interview    | Module 12  | Medium   | Wave 4                                                |
| Nest interview prep parity                   | Module 12  | Low      | Deprioritized                                         |
| Full AI code review / sandboxed runner       | Module 13  | Medium   | Wave 4                                                |
| Nest coding session parity                   | Module 13  | Low      | Deprioritized                                         |
| Nest career coach parity                     | Module 16  | Low      | Deprioritized                                         |
| Coach long-term memory / tool agents         | Module 16  | Medium   | Wave 4                                                |
| Nest portfolio parity                        | Module 14  | Low      | Deprioritized                                         |
| Hosted portfolio site / GitHub project sync  | Module 14  | Medium   | Wave 4                                                |
| Nest networking parity                       | Module 8   | Low      | Deprioritized                                         |
| LinkedIn scrape / auto-message               | Module 8   | —        | Explicitly out of scope (ADR-027)                     |
| Nest apply-assist parity                     | Module 10  | Low      | Deprioritized                                         |
| Nest admin portal parity                     | Module 20  | Low      | Deprioritized                                         |
| LaunchDarkly / A/B at scale                  | Module 20  | Low      | Wave 6                                                |
| Coach / support admin workflows              | Module 20  | Medium   | Wave 5                                                |
| Production Playwright ATS adapters           | Module 10  | Medium   | Wave 3                                                |
| Team tier / referral / multi-region          | Phase 6    | Medium   | Waves 5–6                                             |
