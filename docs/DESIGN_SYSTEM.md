# Design System — AI JobMatch Copilot

**Identity:** Precision Editorial  
**Inspirations:** Linear density · Stripe polish · editorial typography · quiet motion  
**Status:** Canonical for Modules 1–20  

---

## 1. Principles

1. **One composition per viewport** — especially marketing and auth heroes.
2. **Brand first** — “AI JobMatch Copilot” is a hero-level signal, not nav-only text.
3. **Calm density** — Linear-like structure; avoid dashboard soup.
4. **Editorial hierarchy** — Serif for brand/headlines; sans for UI chrome.
5. **Cards are rare** — use only when a container clarifies interaction.
6. **Motion is purposeful** — enter, hover lift, focus; never noise.
7. **Responsive by default** — mobile-first; desktop adds density, not clutter.
8. **Light-first, true dark** — dark mode is designed, not inverted gray.

---

## 2. Typography

| Role | Family | Usage |
|---|---|---|
| Display | **Newsreader** (`font-display`) | Brand wordmark, H1/H2, card titles |
| UI / body | **Plus Jakarta Sans** (`font-sans`) | Nav, forms, body, buttons |
| Mono | System mono | Codes, tokens (rare) |

**Scale (approx):** 12 · 14 · 16 · 20 · 28 · 36 · 40+

---

## 3. Color tokens

Defined in `apps/web/src/app/globals.css` as CSS variables.

| Token | Role |
|---|---|
| `--background` / `--foreground` | Page canvas & ink |
| `--primary` | Deep forest green CTAs (classic professional, not default blue) |
| `--secondary` | Soft tinted surfaces / active nav |
| `--muted` | Quiet backgrounds & secondary text |
| `--border` / `--ring` | Hairlines & focus |
| `--success` / `--warning` / `--destructive` | Semantics |

Atmosphere comes from subtle radial gradients on the canvas — not flat single-color pages.

---

## 4. Spacing, radius, elevation

- **Radius:** `0.625rem` base (`rounded-lg` / `rounded-xl` for panels)
- **Elevation:** `shadow-soft` default · `shadow-lift` on hover
- **Panels:** `.surface-panel` utility for interactive containers

---

## 5. Motion

| Motion | Class / behavior |
|---|---|
| Page / section enter | `.animate-enter`, `.animate-enter-delayed`, `.animate-enter-late` |
| Button hover | slight `-translate-y` + shadow lift |
| Reduced motion | animations disabled via `prefers-reduced-motion` |

Keep to **2–3 intentional motions** per surface. No perpetual glow pulses.

---

## 6. Layout shells

| Shell | File | Use |
|---|---|---|
| Marketing / landing | `app/page.tsx` | Full-bleed hero, brand-first |
| Auth | `components/auth/auth-layout.tsx` | Login, register, onboarding |
| App | `components/layout/app-shell.tsx` | Dashboard, settings (responsive nav) |
| Brand | `components/brand/brand-mark.tsx` | Logo + wordmark |

---

## 7. Components

Primitives live in `apps/web/src/components/ui/`:

- `Button` — default / outline / ghost / secondary / destructive
- `Input`, `Label`, `Card`, `Textarea`
- `Skeleton`, `SkeletonField`, `SkeletonText` — shimmering placeholders
- `Spinner`, `SpinnerBlock` — indeterminate activity

Clerk UI inherits theme via `ClerkThemeProvider` (`components/providers/`), which
maps `next-themes` → Clerk `appearance`. It must never be keyed off the theme:
remounting `ClerkProvider` unmounts the whole tree and drops unsaved form state.

---

## 8. Loading states

Never use words as a loading indicator ("Loading…", "Saving…").

| Situation | Pattern |
| --- | --- |
| Page/route transition | `loading.tsx` with skeletons mirroring the real layout |
| Data-backed form or panel | Skeleton matching the final structure |
| Action in progress in a button | `Spinner` replacing the label, `min-w-*` to hold width |
| Small unstructured area | `SpinnerBlock` |

Every loading region carries `role="status"`, `aria-live="polite"`, and an
`sr-only` description. Shimmer is disabled under `prefers-reduced-motion`.

---

## 9. Do / Don’t

**Do**
- Use `font-display` for headlines
- Prefer forest primary and stone canvas
- Leave breathing room; one job per section

**Don’t**
- Default to Inter / Roboto / system-only branding
- Purple-on-white AI gradients, cream+terracotta kitsch, or dense newspaper grids
- Pill-stat strips, badge spam, or card-wrapped everything
- Overlay floating promo chips on hero media
- Use text as a loading indicator

---

## 10. Adding a new feature screen

1. Choose the correct shell (auth vs app).
2. One headline (`font-display`) + short supporting sentence.
3. Use tokens — no one-off hex colors.
4. Mobile layout first; then densify for `md+`.
5. Add at most one enter animation + hover feedback.
6. Ship a skeleton for every asynchronous region.

---

*Last updated: 2026-07-26*
