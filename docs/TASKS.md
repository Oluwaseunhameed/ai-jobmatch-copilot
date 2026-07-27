# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 4 — Module 14 (Portfolio) ✅

### Phase 0 — Complete ✅

### Phase 1 — Complete ✅ (Modules 1–6 basic, 18, 19 Free framing)

### Phase 2 — Complete ✅ (Modules 4 full, 9, 11, 17, 19 Pro billing)

### Phase 3 — Modules 5–7, 15 ✅ (search upgrade deferred)

### Phase 4 — Module 12: AI Interview Preparation ✅

### Phase 4 — Module 13: Coding Assessment Prep ✅

### Phase 4 — Module 16: AI Career Coach ✅

### Phase 4 — Module 14: Portfolio & Project Builder

- [x] `PortfolioProject` model + migration
- [x] Skill-gap project suggestions + resume bullet builder + readiness score
- [x] `GET/POST /api/users/me/portfolio` + `[id]` GET/PATCH/DELETE
- [x] `/portfolio` hub + project editor + Growth Hub CTA + nav
- [x] ADR-026 + unit tests
- [ ] Hosted public portfolio site / GitHub import — deferred

### Phase 5 — Next up

- [ ] Module 8 — Professional Networking
- [ ] Module 10 — Smart Application Automation
- [ ] Module 20 — Full Admin Portal

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
| LLM JD narrative insights                    | Module 6   | Medium   | Deterministic insights shipped; LLM layer optional  |
| Required vs preferred job skills split       | Module 6   | Low      | Single `Job.skills[]` treated as requirements for now |
| Dedicated saved-jobs route                   | Module 18  | Low      | Dashboard lists recent saves; full list via Jobs UI   |
| Charts / advanced analytics                  | Module 18  | Low      | Phase 6; Free tier stays a quiet readout              |
| Enforce Free plan limit ceilings             | Module 19  | —        | ✅ Done — resume/save/optimise/cover letter gates     |
| Subscription + Lemon/Paystack webhooks       | Module 19  | —        | ✅ Done — ADR-018                                     |
| Nest applications CRUD parity                | Module 11  | Low      | BFF is primary product path                           |
| Application documents / attachments          | Module 11  | Low      | Architecture lists Documents; link drafts only today  |
| Nest application-draft endpoints parity      | Module 9   | Low      | Worker registered; BFF is primary product path        |
| Cover letter PDF / DOCX export               | Module 9   | Low      | Copyable text only today                              |
| Weekly digest email                          | Module 17  | Medium   | Job alerts ✅ Module 5; weekly digest still deferred  |
| NotificationLog / delivery audit             | Module 17  | Low      | Console + Resend dashboard for now                    |
| In-app notification center                   | Module 17  | Low      | Email-only for this slice                             |
| Nest saved-search / trending parity          | Module 5   | Low      | BFF is primary product path                           |
| employmentType / country / salaryMin in UI   | Module 5   | Low      | API-ready; Jobs UI uses q/workMode/seniority for now  |
| Skill.level / years in match scoring         | Module 6   | Low      | Profile proficiency not weighted yet                |
| Nest job insights parity                     | Module 6   | Low      | BFF is primary product path                           |
| External funding / interview data            | Module 7   | Medium   | Deterministic job-derived intelligence shipped        |
| Nest company profile parity                  | Module 7   | Low      | BFF is primary product path                           |
| LLM personalized coaching                    | Module 15  | —        | ✅ Done — Module 16 coach over Growth Hub (ADR-025)   |
| Nest growth hub parity                       | Module 15  | Low      | BFF is primary product path                           |
| Voice + LLM conversational mock interview    | Module 12  | Medium   | Deterministic packs + confidence shipped              |
| Nest interview prep parity                   | Module 12  | Low      | BFF is primary product path                           |
| Full AI code review / sandboxed runner       | Module 13  | Medium   | Checklist + self scoring shipped                      |
| Nest coding session parity                   | Module 13  | Low      | BFF is primary product path                           |
| Nest career coach parity                     | Module 16  | Low      | BFF is primary product path                           |
| Coach long-term memory / tool agents         | Module 16  | Medium   | Session JSON only for MVP                             |
| Nest portfolio parity                        | Module 14  | Low      | BFF is primary product path                           |
| Hosted portfolio site / GitHub project sync  | Module 14  | Medium   | Project library + suggestions shipped                 |
