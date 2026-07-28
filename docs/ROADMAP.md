# Roadmap — AI JobMatch Copilot

## Delivery Strategy

We ship in **vertical slices** — each phase delivers a usable end-to-end flow, not 20 half-built modules.

**Status:** Phases 0–5 complete (all 20 modules have an MVP). Active delivery is the **Full Program** below (Waves 1–6), which closes deferred depth, Phase 6 enterprise items, and high-value tech debt. LinkedIn scrape / auto-message remains **explicitly out of scope** (ADR-027). Nest API parity is optional and deprioritized while the Next BFF is the product path.

---

## Phase 0 — Foundation ✅

**Goal:** Align on architecture, scaffold monorepo, local dev environment, CI baseline.

| Item                                     | Status  |
| ---------------------------------------- | ------- |
| Architecture document                    | ✅ Done |
| Decision log                             | ✅ Done |
| Roadmap                                  | ✅ Done |
| Confirm MVP scope & open decisions       | ✅ Done |
| Monorepo scaffold (Turborepo + pnpm)     | ✅ Done |
| Docker Compose (Postgres, Redis, Ollama) | ✅ Done |
| Prisma schema (User, CareerProfile)      | ✅ Done |
| NestJS API skeleton                      | ✅ Done |
| Next.js web skeleton                     | ✅ Done |
| FastAPI AI service skeleton              | ✅ Done |
| GitHub Actions (lint, test, build)       | ✅ Done |
| Environment variable templates           | ✅ Done |

---

## Phase 1 — MVP: "Profile → Resume → First Match" ✅

**Goal:** A user can sign up, build a profile, upload a resume, see AI-parsed data, and view a basic job match.

**Modules included:**

- Module 1 — Auth & Onboarding (email, Google, GitHub; email verification; theme)
- Module 2 — Career Profile Setup (core fields)
- Module 3 — Resume Management (upload PDF/DOCX, library)
- Module 4 — AI Resume Optimization (basic: parse + keyword extract)
- Module 5 — Job Discovery (seeded jobs + keyword/semantic search v1)
- Module 6 — Job Intelligence (basic match score + missing skills)
- Module 18 — Analytics Dashboard (minimal: profile completeness, jobs saved)
- Module 19 — Subscription (Free tier framing; Pro billing in Phase 2)

**Exit criteria:**

- New user completes onboarding in < 10 minutes
- Resume upload returns structured profile data
- User sees at least 5 relevant job recommendations
- Admin can view users in basic admin panel

---

## Phase 2 — Application Workflow ✅

**Goal:** User can optimize resume for a job, generate a cover letter, and track an application.

**Modules:**

- Module 4 — Full resume optimization (before/after, ATS score)
- Module 9 — AI Application Assistant (cover letter, short answers)
- Module 11 — Application Tracker (Kanban pipeline)
- Module 17 — Notifications (email: optimization complete, reminders)
- Module 19 — Pro tier + Lemon Squeezy (global) + Paystack (Nigeria)

---

## Phase 3 — Job Intelligence & Discovery Scale ✅

**Modules:**

- Module 5 — Job alerts, saved searches, trending jobs ✅
- Module 6 — Rich job insights, skill gap, learning recs ✅
- Module 7 — Company intelligence profiles ✅
- Module 15 — Career Growth Hub (skill gaps, roadmaps) ✅
- Search upgrade (Meilisearch/OpenSearch) — deferred to Wave 2

---

## Phase 4 — Interview & Career Coaching ✅

**Modules:**

- Module 12 — AI Interview Preparation ✅
- Module 13 — Coding Assessment Prep ✅
- Module 16 — AI Career Coach ✅
- Module 14 — Portfolio & Project Builder ✅

---

## Phase 5 — Automation & Networking ✅

**Modules:**

- Module 8 — Professional Networking (public data only) ✅
- Module 10 — Smart Application Automation (Playwright, user-approved) ✅
- Module 20 — Full Admin Portal ✅

---

## Full Program — Waves 1–6 (Active)

Closes deferred depth + Phase 6 enterprise. Ship and verify each wave before starting the next.

### Wave 1 — Polish & retention ✅

| Item | Status |
|------|--------|
| Weekly digest email | ✅ |
| Optimized resume PDF export | ✅ |
| Cover letter PDF export | ✅ |
| Jobs UI filters (`employmentType`, `country`, `salaryMin`) | ✅ |
| Dedicated `/jobs/saved` page | ✅ |
| E2E smoke tests (profile → resume → jobs) | ✅ foundation (public smoke) |

### Wave 2 — Data & discovery _(in progress)_

| Item | Status |
|------|--------|
| Multi-provider job ingestion (public/licensed APIs) | ✅ |
| Purge seeded jobs after live ingest | ✅ |
| Meilisearch / OpenSearch | 🔲 |
| Advanced analytics dashboard | 🔲 |

### Wave 3 — Automation depth

- Production Playwright ATS adapters (Greenhouse, Lever, etc.)
- Apply-assist hardening (fixtures, observability)

### Wave 4 — AI depth

- LLM job-description narrative insights
- Voice + conversational mock interview
- Coding sandbox / AI code review
- Coach long-term memory / tool agents
- Hosted portfolio / GitHub project sync

### Wave 5 — Platform & enterprise (Phase 6 core)

- Team tier (career coaches) + support/coach admin workflows
- Referral program
- In-app notification center + NotificationLog
- Education / Experience profile models

### Wave 6 — Scale & infra

- Multi-region deployment
- Feature flags / A/B at scale (beyond Postgres flags-lite)
- Upload CDN (UploadThing / Cloudinary) when needed
- External company enrichment (funding / interview data)

### Explicitly out of scope

- LinkedIn scrape / auto-message (ADR-027)

### Optional / deprioritized

- Nest API parity for modules already on the Next BFF

---

## Module-to-Phase Map

| Module | Name                   | Phase                |
| ------ | ---------------------- | -------------------- |
| 1      | Auth & Onboarding      | 1                    |
| 2      | Career Profile         | 1                    |
| 3      | Resume Management      | 1                    |
| 4      | AI Resume Optimization | 1 (basic) → 2 (full) |
| 5      | Job Discovery          | 1 → 3                |
| 6      | Job Intelligence       | 1 (basic) → 3        |
| 7      | Company Intelligence   | 3                    |
| 8      | Networking             | 5                    |
| 9      | Application Assistant  | 2                    |
| 10     | Application Automation | 5                    |
| 11     | Application Tracker    | 2                    |
| 12     | Interview Prep          | 4                    |
| 13     | Coding Prep            | 4                    |
| 14     | Portfolio Builder      | 4                    |
| 15     | Career Growth Hub      | 3                    |
| 16     | AI Career Coach        | 4                    |
| 17     | Notifications          | 2 → Wave 1 / 5       |
| 18     | Analytics Dashboard    | 1 (minimal) → Wave 2 |
| 19     | Subscription & Billing | 2                    |
| 20     | Admin Portal           | 1 (basic) → 5 (full) |
