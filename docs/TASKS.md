# Tasks — AI JobMatch Copilot

## Current Sprint: Phase 1 — Module 4 (AI Resume Optimization — basic)

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

### Phase 1 — Next up: Module 5 (Job Discovery)

- [ ] Job seed script + basic search API
- [ ] Job list/detail UI
- [ ] Wire resume keywords into match scoring (Module 6 prep)

---

## Technical Debt Tracker

| Item | Introduced | Priority | Notes |
|---|---|---|---|
| Education / Experience models | Module 2 | Medium | Deferred; Architecture diagram lists them for later |
| Nest vs Next dual path (profile/resume) | Module 2–3 | Low | BFF uses Prisma; Nest API available for clients |
| E2E profile/resume tests | Module 2–3 | Medium | Unit tests only so far |
| UploadThing / Cloudinary | Module 3 | Low | Deferred by ADR-010 until CDN/upload UX needed |
| Full LLM ATS optimization | Module 4 | Medium | Basic parse shipped; before/after optimize in Phase 2 |
| Legacy `.doc` support | Module 4 | Low | PDF/DOCX only; clear error for `.doc` |
