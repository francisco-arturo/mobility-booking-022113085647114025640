# Session Handoff — Prototype: mobility-booking-022113085647114025640

## Last Updated

- 2026-10-22 — first build complete, verified locally, handed over for review.

## Current Objective

A brand-led site for a transportation and mobility company with service pages, fleet, and a working
instant-quote and booking flow, shaped for a third-party booking platform.

## State

- **Review handover:** http://127.0.0.1:4319 (`npm start`, or `node dev-server.mjs`).
- **Verification:** `.\init.ps1` → 226 checks passed, structural score 100/100.
- **Not pushed, not deployed, no proposal written.** All three wait on the user's approval.

## Recommended Next Step

1. Open http://127.0.0.1:4319 and walk the path in `DEMO.md` (home → quick quote → booking → `/ops`).
2. After approval: confirm the GitHub repository URL matches
   `mobility-booking-022113085647114025640`, add it to `github.json` → `approved_remotes`, push with
   the one-shot escalation, then `node .harness/deploy.mjs mobility-booking-022113085647114025640`.
3. Update `DEMO.md` with the live URL and send it back before any proposal.

## Files

- `index.html`, `services.html`, `fleet.html`, `booking.html`, `about.html`, `contact.html`, `ops.html`,
  `404.html` — pages.
- `assets/css/site.css` — the design system (ink/bone/signal, Fraunces + Inter).
- `assets/js/site.js`, `assets/js/booking.js`, `assets/js/ops.js` — interactions.
- `lib/pricing.js` — the only place fares and availability are computed.
- `lib/store.js` — `/tmp` booking store with seeded data.
- `lib/api.js` + `api/*.js` — handlers and their Vercel adapters.
- `tests/run.mjs` — verification suite.
- `DEMO.md`, `INTEGRATIONS.md`, `README.md` — demo script, provider seam, run notes.

## Blockers

- None technical. Product decisions that need the client: payment provider, booking platform, staff
  roles, and whether content should be CMS-managed.

## Next Session

- Continue in this directory. Do not re-scaffold or create a second prototype.
- If the baseline gate is red on arrival, fix that before adding scope.
- Payments/provider/auth are `proto-002` to `proto-005`; pick one only after the user chooses.
