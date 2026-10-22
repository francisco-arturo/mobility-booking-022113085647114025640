// HTTP-facing handlers, kept free of any framework so the Vercel adapter, the local dev server and
// the tests all exercise exactly the same code path.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { VEHICLES, ZONES, SERVICES, COMPANY, CURRENCY } from './catalog.js';
import { ApiError, buildQuote, RULES } from './pricing.js';
import { createBooking, listBookings, bookingStats, updateBookingStatus } from './store.js';

function ok(body, status = 200) {
  return { status, body };
}

export function errorResponse(error) {
  if (error instanceof ApiError) {
    return {
      status: error.status,
      body: { error: { code: error.code, message: error.message, fields: error.fields } }
    };
  }
  console.error('[northlane] unhandled', error);
  return {
    status: 500,
    body: { error: { code: 'server_error', message: 'Something went wrong on our side. Try again.' } }
  };
}

export async function call(handler, request) {
  try {
    return await handler(request);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function handleQuote({ query }) {
  return ok(buildQuote(query || {}, listBookings()));
}

export async function handleCatalog() {
  return ok({
    company: COMPANY,
    currency: CURRENCY,
    rules: {
      airportFee: RULES.airportFee,
      nightMultiplier: RULES.nightMultiplier,
      hourlyMinimum: RULES.hourlyMinimum,
      hourlyMaximum: RULES.hourlyMaximum
    },
    vehicles: VEHICLES,
    zones: ZONES.map((zone) => ({
      id: zone.id,
      name: zone.name,
      short: zone.short,
      city: zone.city,
      airport: Boolean(zone.airport)
    })),
    services: SERVICES
  });
}

export async function handleBookings({ method, query, body }) {
  if (method === 'GET') {
    const bookings = listBookings();
    return ok({ bookings, stats: bookingStats(bookings), statuses: ['requested', 'confirmed', 'dispatched', 'completed', 'cancelled'] });
  }

  if (method === 'POST') {
    const booking = createBooking(body || {});
    return ok({ booking }, 201);
  }

  if (method === 'PATCH') {
    const id = (body && body.id) || (query && query.id);
    if (!id) throw new ApiError(400, 'missing_id', 'Send the booking id or reference to update.');
    const booking = updateBookingStatus(String(id), String((body && body.status) || ''));
    return ok({ booking });
  }

  throw new ApiError(405, 'method_not_allowed', 'Use GET, POST or PATCH on this endpoint.');
}

function inquiryPath() {
  return process.env.INQUIRIES_STORE || path.join(os.tmpdir(), 'northlane-inquiries.json');
}

function saveInquiry(inquiry) {
  const file = inquiryPath();
  let existing = [];
  try {
    if (existsSync(file)) {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      if (Array.isArray(parsed.inquiries)) existing = parsed.inquiries;
    }
  } catch {
    existing = [];
  }
  const next = [inquiry, ...existing].slice(0, 200);
  try {
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ updatedAt: new Date().toISOString(), inquiries: next }, null, 2), 'utf8');
  } catch {
    // Read-only filesystem: the prototype still answers, and the response says the follow-up is queued.
  }
}

export async function handleContact({ method, body }) {
  if (method !== 'POST') throw new ApiError(405, 'method_not_allowed', 'Use POST for contact requests.');
  const input = body || {};
  const fields = {};
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const message = String(input.message || '').trim();

  if (name.length < 2) fields.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fields.email = 'Enter a valid email address.';
  if (message.length < 10) fields.message = 'Tell us a little more about the trip or account.';

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'invalid_inquiry', 'Check the highlighted fields and try again.', fields);
  }

  const inquiry = {
    id: `inq_${Date.now().toString(36)}`,
    createdAt: new Date().toISOString(),
    name,
    email,
    company: String(input.company || '').trim().slice(0, 120),
    topic: String(input.topic || 'General enquiry').slice(0, 60),
    message: message.slice(0, 2000)
  };
  saveInquiry(inquiry);
  return ok({ received: true, reference: inquiry.id, replyWindow: 'Within one business hour, 7am to 9pm PT.' });
}
