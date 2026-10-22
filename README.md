# Northlane

Brand-led ground transportation site with a working quote and booking engine, built as a prototype
for the Upwork post `022113085647114025640`.

## Run it

```powershell
npm start            # http://127.0.0.1:4319
npm test             # 226 checks: pricing, booking API, site structure, design tokens
```

No dependencies and no build step. The site is plain HTML, CSS, and ES modules; the API is Node
handlers that run unchanged as Vercel serverless functions.

## What is here

| Path | What it does |
|---|---|
| `index.html` | Home: hero, quick quote, services, fleet, process, coverage |
| `services.html` | Five deep-linked service sections plus sample fares |
| `fleet.html` | Four vehicle classes and a comparison table |
| `booking.html` | Three-step booking flow with live quote and availability |
| `ops.html` | Dispatcher board over the bookings API |
| `about.html`, `contact.html` | Brand story and a working enquiry form |
| `api/*.js` | Vercel endpoints: quote, bookings, catalog, contact |
| `lib/pricing.js` | Distance, fare, and availability rules (single source of truth) |
| `lib/store.js` | `/tmp` JSON store with seeded bookings and a provider seam |
| `lib/api.js` | Framework-free handlers used by the server, the functions, and the tests |
| `tests/run.mjs` | Verification: pricing edge cases, API contract, site integrity |
| `INTEGRATIONS.md` | How to replace the demo engine with a booking platform |

## Deploy

Web-shaped for Vercel from the first commit: static files at the root, serverless functions in
`api/`, `vercel.json` for clean URLs. `dev-server.mjs` is local-only and excluded by
`.vercelignore`.

```powershell
node ..\.harness\deploy.mjs mobility-booking-022113085647114025640
```

## Prototype honesty

The company, copy, prices, availability, and reviews are illustrative. See `DEMO.md` for the exact
list of what is fake and why.
