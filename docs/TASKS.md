# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 2 — Module 11 (Application Tracker)

### Phase 0 — Complete ✅

### Phase 1 — Complete ✅ (Modules 1–6, 18, 19 Free framing)

### Phase 2 — Module 4: Full resume optimisation ✅

### Phase 2 — Module 9: AI Application Assistant ✅

### Phase 2 — Module 11: Application Tracker ✅

- [x] `Application` schema + migration (stage, notes, optional resume/draft links)
- [x] BFF list / create / get / patch / delete
- [x] Auto-attach latest ready `ApplicationDraft` on create
- [x] `/applications` Kanban board with stage moves + notes
- [x] Drag-and-drop between columns (select remains for accessibility)
- [x] Dashboard pipeline counts + recent applications
- [x] Job detail “Track application” panel
- [x] Nav entry + Free plan framing

### Phase 2 — Next up

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
