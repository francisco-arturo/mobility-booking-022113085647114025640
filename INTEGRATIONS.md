# Integration notes — replacing the demo engine with a booking platform

The site is built so the booking engine is a seam, not the architecture. Everything the browser
calls is a small JSON endpoint; everything a third-party platform needs is in the handlers.

## The contract the front end relies on

`GET /api/quote?from=&to=&date=&time=&passengers=&bags=&service=`
→ `{ trip, options: [{ vehicleId, name, price, available, remaining, breakdown }], pricing }`

`POST /api/bookings`
→ `{ booking: { reference, status, price, ... } }`

`GET /api/bookings` → `{ bookings, stats }` (used by `/ops`)

`PATCH /api/bookings` `{ id, status }` → updated booking

`POST /api/contact` → `{ received: true, reference }`

The browser never sends a price that is trusted: `POST /api/bookings` re-runs `priceSelection()` and
rejects a class that is unavailable or too small (409 / 400).

## Where to put the provider

`lib/store.js` is the only module that knows where bookings live. To connect a platform such as
Mozio, Limo Anywhere, or a client's in-house system:

1. **Availability** — replace `availabilityFor(date, vehicleId)` in `lib/pricing.js` with a cached
   call to the provider's availability endpoint. Keep the shape (`remaining: number`), because the
   UI and the sold-out test both depend on it.
2. **Create** — replace `createBooking()` in `lib/store.js` with the provider's reservation call.
   Map the canonical fields: `from`, `to`, `date`, `time`, `passengers`, `bags`, `vehicleId`,
   `customer`, `flight`, `notes`. Keep returning a `reference` the guest can read over the phone.
3. **Status** — replace `listBookings()` / `updateBookingStatus()` with the provider's booking list
   and status transitions. `/ops` already reads `{ bookings, stats }`.
4. **Webhooks** — add `api/webhooks/[provider].js` that verifies the signature, maps the provider
   status to `requested | confirmed | dispatched | completed | cancelled`, and writes through the
   same store function. The five statuses are the only vocabulary the UI uses.
5. **Payments** — quote totals are integers in `USD`; add an authorisation step in
   `createBooking()` after the provider confirms, and return a `payment` object without exposing
   card data to the browser.

## Design constraints worth keeping

- The quote is computed server-side from a distance model. Do not move pricing into the browser.
- `lib/api.js` handlers stay framework-free so the same code runs under Vercel, the local dev server,
  and `tests/run.mjs`. That is what makes the 226-check suite possible.
- The booking store is `/tmp` on Vercel. Any real deployment must use a database or the provider
  itself; a JSON file is a demo affordance, not a persistence strategy.
