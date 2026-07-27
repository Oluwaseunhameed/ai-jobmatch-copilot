# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 2 — Module 17 (Notifications)

### Phase 0 — Complete ✅

### Phase 1 — Complete ✅ (Modules 1–6, 18, 19 Free framing)

### Phase 2 — Module 4 / 9 / 11 ✅

### Phase 2 — Module 17: Notifications (email) ✅

- [x] Product email templates (optimise complete, draft ready, stage change, reminder)
- [x] Preference-gated sends via `emailApplicationUpdates`
- [x] Hooks on resume optimise + application draft runners
- [x] Stage-change email from applications PATCH
- [x] Idle application reminder sweep (Nest worker; `lastReminderAt`)
- [x] Document Resend / EMAIL_FROM / reminder env vars
- [x] Settings copy clarifies live vs coming-soon prefs

### Phase 2 — Next up

- [ ] Module 19 — Pro tier + Stripe billing

---

## Technical Debt Tracker

| Item                                         | Introduced | Priority | Notes                                                 |
| -------------------------------------------- | ---------- | -------- | ----------------------------------------------------- |
| Education / Experience models                | Module 2   | Medium   | Deferred; Architecture diagram lists them for later   |
| Nest vs Next dual path (profile/resume/jobs) | Module 2–5 | Low      | BFF uses Prisma; Nest API available for clients       |
| E2E profile/resume/jobs tests                | Module 2–5 | Medium   | Unit tests only so far                                |
| UploadThing / Cloudinary                     | Module 3   | Low      | Deferred by ADR-010 until CDN/upload UX needed        |
| Full LLM ATS optimization                    | Module 4   | Medium   | Keyword-fit + rewrite shipped; vendor ATS later       |
| Legacy `.doc` support                        | Module 4   | Low      | PDF/DOCX only; clear error for `.doc`                 |
| Optimized resume PDF export                  | Module 4   | Medium   | Version text/JSON only today                          |
| Nest optimize endpoints parity               | Module 4   | Low      | Worker registered; BFF is primary product path        |
| Licensed job API ingestion                   | Module 5   | Medium   | ADR-006: seed for now; Adzuna/Remotive later          |
| Meilisearch / OpenSearch                     | Module 5   | Low      | Deferred by ADR-003 until scale demands it            |
| AI JD analysis / learning recommendations    | Module 6   | Medium   | Phase 3 rich insights; MVP is deterministic overlap   |
| Required vs preferred job skills split       | Module 6   | Low      | Single `Job.skills[]` treated as requirements for now |
| Dedicated saved-jobs route                   | Module 18  | Low      | Dashboard lists recent saves; full list via Jobs UI   |
| Charts / advanced analytics                  | Module 18  | Low      | Phase 6; Free tier stays a quiet readout              |
| Enforce Free plan limit ceilings             | Module 19  | Medium   | Framing only; gate uploads/saves/optimise when needed |
| Subscription table + Stripe webhooks         | Module 19  | Medium   | Phase 2 Pro billing                                   |
| Nest applications CRUD parity                | Module 11  | Low      | BFF is primary product path                           |
| Application documents / attachments          | Module 11  | Low      | Architecture lists Documents; link drafts only today  |
| Nest application-draft endpoints parity      | Module 9   | Low      | Worker registered; BFF is primary product path        |
| Cover letter PDF / DOCX export               | Module 9   | Low      | Copyable text only today                              |
| Weekly digest + job-alert emails             | Module 17  | Medium   | Prefs exist; senders deferred to Phase 3 alerts       |
| NotificationLog / delivery audit             | Module 17  | Low      | Console + Resend dashboard for now                    |
| In-app notification center                   | Module 17  | Low      | Email-only for this slice                             |
