# Progress — Prototype: mobility-booking-022113085647114025640

## Current State

- **Built and verified locally on 2026-10-22.** Handed over at http://127.0.0.1:4319 for review.
- Brand: **Northlane**, a fictional Bay Area chauffeur company. Six public pages plus a dispatcher
  board, a three-step booking flow, and a serverless-shaped API.
- Stack: static HTML/CSS/ES modules, Node 20 handlers in `lib/`, Vercel functions in `api/`, no
  dependencies and no build step.
- Not pushed and not deployed: the workstream gates those on the user's approval.

## What Ran

| Command | Result |
|---|---|
| `node tests/run.mjs` | `PASSED: 226 checks` (pricing, booking API, site structure, design tokens, repo hygiene) |
| `powershell -ExecutionPolicy Bypass -File .\init.ps1` | `PASSED: 226 checks`; validator `Overall: 100/100`; exit 0 |
| HTTP smoke test, `http://127.0.0.1:4319` | `/`, `/services`, `/fleet`, `/booking`, `/about`, `/contact`, `/ops`, `/api/catalog` → 200; `/nope` → 404 |
| `POST /api/bookings` over HTTP | `NL-PLC9SM`, status `requested`, server-computed price `$122` (SFO → Palo Alto, sedan) |
| `GET /api/bookings` | 5 bookings, 2 requested, booked value $810 |
| Quote check | SFO → Downtown SF: 14.6 mi, 35 min, sedan $90 including $15 airport access |

## Verification Evidence

- Entrypoint: `.\init.ps1` in this directory (also `node tests/run.mjs` directly).
- The suite asserts the exact fare ($90 sedan SFO → Downtown), the 18% night surcharge, the four-hour
  charter price, rejection codes for same-location/past-date/unserved-location, the server ignoring a
  tampered client price, sold-out refusal with HTTP 409, the full booking lifecycle through PATCH, and
  every page's title, meta description, h1, unique ids, asset and internal-link resolution.
- Design gate is part of the suite: brand tokens, signal orange, mobile breakpoint, reduced motion.

## Session Notes

- Build started 06:29 PT; frozen and handed over inside the 30-minute window.
- Scope call: a **branded site with a real booking engine** rather than a collection of static pages,
  because the brief names booking integration as a core requirement.
- The four sample fares on `/services` were recomputed from the engine after the first draft so the
  page and the API cannot disagree.

## Next

1. **User reviews** http://127.0.0.1:4319 and approves.
2. On approval: confirm the repository URL (expected `mobility-booking-022113085647114025640`), add it
   to `github.json` → `approved_remotes`, push, then `node .harness/deploy.mjs <slug>`.
3. Write the proposal only after the deployment URL exists.

## Blockers

- None. Production integrations (payments, provider feed, auth) need the client's providers and
  credentials; they are listed as `proto-002` to `proto-005` in `feature_list.json`.
