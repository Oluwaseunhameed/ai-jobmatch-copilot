# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 1 — Module 2 (Career Profile)

### Phase 0 — Complete ✅
### Phase 1 — Module 1 (Clerk) ✅
### Phase 1 — Design foundation ✅

### Phase 1 — Module 2: Career Profile ✅

- [x] Expand `CareerProfile` (headline, summary, city) + skills model
- [x] Completeness scoring (`calculateCompletenessScore`)
- [x] NestJS `ProfilesModule` — GET/PUT `/api/v1/users/me/profile` (+ skills)
- [x] Next.js BFF `/api/users/me/profile`
- [x] Profile UI (`/profile`) — overview, career, location, links, skills
- [x] App shell nav + dashboard completeness widget
- [x] Shared types in `@jobmatch/types`
- [x] Unit tests for `ProfilesService`

### Phase 1 — Next up: Module 3 (Resume Management)

- [ ] Resume upload (PDF/DOCX) to object storage
- [ ] Resume library UI
- [ ] AI service skeleton (FastAPI + resume parse endpoint)
- [ ] Job seed script + basic search API

---

## Technical Debt Tracker

| Item | Introduced | Priority | Notes |
|---|---|---|---|
| Education / Experience models | Module 2 | Medium | Deferred; Architecture diagram lists them for later |
| Nest vs Next profile dual path | Module 2 | Low | BFF uses Prisma; Nest API available for clients |
| E2E profile tests | Module 2 | Medium | Unit tests only so far |
