# Demo — Northlane (mobility-booking-022113085647114025640)

A brand-led website for a fictional Bay Area chauffeur company, with a working instant-quote and
booking engine. Built as a response to the Upwork post asking for a transportation and mobility site
with service pages, booking integration, and room to grow.

- **Local URL (review handover):** http://127.0.0.1:4319
- **Start locally:** `npm start` (or `node dev-server.mjs`), then open the URL above
- **Live URL:** _not deployed yet — deployment happens after the user approves the local build and
  provides the repository URL_ (`node .harness/deploy.mjs mobility-booking-022113085647114025640`)
- **Last verified:** 2026-10-22

## The 60-second path

| # | Do this | What you should see |
|---|---|---|
| 1 | Open `/` | Dark editorial hero, live route card, and a quick-quote bar already filled with SFO to Downtown SF |
| 2 | Press **See live price** | `/booking` opens on step 1, prefilled; press again and four classes price against live availability for that date |
| 3 | Pick **Executive Sedan** | Selection state, fare breakdown (base, airport access, tolls included), total in the sticky summary at $90 for this route |
| 4 | Continue, enter a name, email, and phone, then **Confirm reservation** | A reference (e.g. `NL-4KQ7M2`), the full trip summary, and the three next steps |
| 5 | Open `/ops` | The reservation you just made appears at the top of the operations board; change its status and refresh |

Also worth opening: `/services` (five service pages with deep links), `/fleet` (class comparison),
`/about`, `/contact` (working enquiry form).

## The one sentence to say about it

> "This is what a transportation brand can look like when it is not a car-rental template: distinct
> identity, service pages that actually sell, and a booking flow that quotes from live availability
> instead of a contact form."

## What is deliberately fake

- **Northlane is an invented company.** All names, addresses, phone numbers, reviews, and operating
  figures are illustrative; `TCP 21458` is a placeholder, not a real permit.
- **Pricing is a seeded model, not a tariff.** Distance comes from a handful of Bay Area zones
  (haversine x 1.27 road factor), fares from four vehicle classes. It is internally consistent and
  server-recomputed, but it is not a commercially published rate card.
- **Availability is deterministic demo data.** Same date plus class always gives the same capacity,
  seeded from a hash, minus bookings already in the store. The sedan is never sold out so the demo
  path always works.
- **Bookings live in a JSON file in `/tmp`.** On Vercel, a cold start can reset them; `/ops` seeds
  four sample reservations when the store is empty.
- **No payment, email, or SMS is sent.** The confirmation is on screen only; the dispatcher message
  is scripted copy.
- **The operations board has no authentication.** It is a prototype view over the same API.

## If something fails while they look

- The FAQ/deep links use clean URLs (`/services`); locally they are served by `dev-server.mjs`, and on
  Vercel by `cleanUrls`.
- If `/ops` is empty after a cold start, refresh once: the store seeds itself on first read.
- Redeploy: `node .harness/deploy.mjs mobility-booking-022113085647114025640` from the workspace root.

## Not built (next, if the user wants it)

1. Payment capture and deposit rules (Stripe or the client's provider).
2. A real booking-platform adapter: availability feed, reservation push, webhook status sync.
3. Staff authentication for `/ops`, plus assignment of a named chauffeur and vehicle.
4. A content layer (CMS or MDX) so services, fares, and coverage can change without a deploy.
5. Email/SMS notifications, calendar invites, and a guest-facing manage-my-booking link.
6. Real photography, accessibility audit with a screen reader, and legal/terms pages.
