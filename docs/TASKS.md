# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 3 — Module 5 (Job Discovery scale) ✅

### Phase 0 — Complete ✅

### Phase 1 — Complete ✅ (Modules 1–6 basic, 18, 19 Free framing)

### Phase 2 — Complete ✅ (Modules 4 full, 9, 11, 17, 19 Pro billing)

### Phase 3 — Module 5: Job alerts, saved searches, trending ✅

- [x] `SavedSearch` model + migration
- [x] CRUD APIs for saved searches with alert toggle
- [x] Jobs UI: save/apply/delete searches + alert bell
- [x] Trending jobs API (saves + views) + Jobs/Dashboard panels
- [x] Job alert email template + Nest sweep worker (`emailJobAlerts`)
- [x] `postedAfter` filter on search for alert deltas
- [x] ADR-019 + env docs

### Phase 3 — Next up

- [ ] Module 6 — Rich job insights, skill gap, learning recs
- [ ] Module 7 — Company intelligence profiles

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
| Enforce Free plan limit ceilings             | Module 19  | —        | ✅ Done — resume/save/optimise/cover letter gates     |
| Subscription + Lemon/Paystack webhooks       | Module 19  | —        | ✅ Done — ADR-018                                     |
| Nest applications CRUD parity                | Module 11  | Low      | BFF is primary product path                           |
| Application documents / attachments          | Module 11  | Low      | Architecture lists Documents; link drafts only today  |
| Nest application-draft endpoints parity      | Module 9   | Low      | Worker registered; BFF is primary product path        |
| Cover letter PDF / DOCX export               | Module 9   | Low      | Copyable text only today                              |
| Weekly digest + job-alert emails             | Module 17  | —        | Job alerts ✅ Module 5; weekly digest still deferred  |
| NotificationLog / delivery audit             | Module 17  | Low      | Console + Resend dashboard for now                    |
| In-app notification center                   | Module 17  | Low      | Email-only for this slice                             |
| Nest saved-search / trending parity          | Module 5   | Low      | BFF is primary product path                           |
| employmentType / country / salaryMin in UI   | Module 5   | Low      | API-ready; Jobs UI uses q/workMode/seniority for now  |
