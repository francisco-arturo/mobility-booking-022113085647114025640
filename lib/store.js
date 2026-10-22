// Booking persistence for the prototype.
//
// Vercel's filesystem is read-only outside /tmp, so the store lives in the OS temp directory and
// falls back to ./data when that is not writable. That is deliberate: a real deployment replaces
// this module with a database or the booking provider's API, not with a bigger JSON file.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { ApiError, priceSelection } from './pricing.js';

const STATUSES = ['requested', 'confirmed', 'dispatched', 'completed', 'cancelled'];
const MAX_BOOKINGS = 500;

function defaultPath() {
  return path.join(os.tmpdir(), 'northlane-bookings.json');
}

function fallbackPath() {
  return path.join(process.cwd(), 'data', 'bookings.json');
}

function storePath() {
  return process.env.BOOKINGS_STORE || defaultPath();
}

function isoDate(offsetDays) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function seedBookings() {
  return [
    {
      id: 'bkg_seed_airport_01',
      reference: 'NL-4KQ7M2',
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      service: 'transfer',
      from: 'San Francisco International (SFO)',
      to: 'Palo Alto',
      date: isoDate(2),
      time: '09:15',
      passengers: 2,
      bags: 2,
      vehicleId: 'sedan',
      vehicleName: 'Executive Sedan',
      price: 122,
      currency: 'USD',
      customer: { name: 'Elena Marsh', email: 'elena.marsh@example.com', phone: '+1 415 555 0118' },
      flight: 'UA 512',
      notes: 'Meet inside Terminal 3 arrivals, name board.',
      channel: 'web'
    },
    {
      id: 'bkg_seed_meeting_02',
      reference: 'NL-9BF31C',
      status: 'requested',
      createdAt: new Date().toISOString(),
      service: 'transfer',
      from: 'Downtown Oakland',
      to: 'San Francisco International (SFO)',
      date: isoDate(1),
      time: '05:40',
      passengers: 1,
      bags: 1,
      vehicleId: 'suv',
      vehicleName: 'Premium SUV',
      price: 121,
      currency: 'USD',
      customer: { name: 'Daniel Okafor', email: 'd.okafor@example.com', phone: '+1 510 555 0176' },
      flight: 'DL 1207',
      notes: '',
      channel: 'web'
    },
    {
      id: 'bkg_seed_dispatch_03',
      reference: 'NL-77XMQA',
      status: 'dispatched',
      createdAt: new Date().toISOString(),
      service: 'transfer',
      from: 'Marina and the Presidio',
      to: 'San Francisco International (SFO)',
      date: isoDate(0),
      time: '18:20',
      passengers: 3,
      bags: 3,
      vehicleId: 'van',
      vehicleName: 'Business Van',
      price: 104,
      currency: 'USD',
      customer: { name: 'Priya Raman', email: 'priya.raman@example.com', phone: '+1 415 555 0193' },
      flight: 'SQ 2',
      notes: 'Client travelling with two colleagues.',
      channel: 'web'
    },
    {
      id: 'bkg_seed_complete_04',
      reference: 'NL-2HD8LZ',
      status: 'completed',
      createdAt: new Date().toISOString(),
      service: 'transfer',
      from: 'Napa Valley',
      to: 'Downtown San Francisco',
      date: isoDate(-1),
      time: '16:00',
      passengers: 4,
      bags: 4,
      vehicleId: 'suv',
      vehicleName: 'Premium SUV',
      price: 341,
      currency: 'USD',
      customer: { name: 'Thomas Reed', email: 'thomas.reed@example.com', phone: '+1 707 555 0121' },
      flight: '',
      notes: '',
      channel: 'web'
    }
  ];
}

let memoryCache = null;

function readStore() {
  if (memoryCache) return memoryCache;
  for (const candidate of [storePath(), fallbackPath()]) {
    try {
      if (existsSync(candidate)) {
        const parsed = JSON.parse(readFileSync(candidate, 'utf8'));
        if (Array.isArray(parsed.bookings)) {
          memoryCache = parsed.bookings;
          return memoryCache;
        }
      }
    } catch {
      // Corrupt or unreadable store: keep trying, then seed a fresh one.
    }
  }
  memoryCache = seedBookings();
  persist(memoryCache);
  return memoryCache;
}

function persist(bookings) {
  const payload = JSON.stringify({ updatedAt: new Date().toISOString(), bookings }, null, 2);
  for (const candidate of [storePath(), fallbackPath()]) {
    try {
      mkdirSync(path.dirname(candidate), { recursive: true });
      writeFileSync(candidate, payload, 'utf8');
      return;
    } catch {
      // Read-only filesystem: fall through to the next candidate, then memory only.
    }
  }
}

export function listBookings() {
  return [...readStore()].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export function bookingStats(bookings) {
  const active = bookings.filter((booking) => booking.status !== 'cancelled');
  const revenue = active.reduce((sum, booking) => sum + Number(booking.price || 0), 0);
  return {
    total: bookings.length,
    requested: bookings.filter((booking) => booking.status === 'requested').length,
    confirmed: bookings.filter((booking) => booking.status === 'confirmed').length,
    dispatched: bookings.filter((booking) => booking.status === 'dispatched').length,
    completed: bookings.filter((booking) => booking.status === 'completed').length,
    cancelled: bookings.filter((booking) => booking.status === 'cancelled').length,
    revenue
  };
}

function assertCustomer(input) {
  const fields = {};
  const name = String(input.name || '').trim();
  const email = String(input.email || '').trim();
  const phone = String(input.phone || '').trim();

  if (name.length < 2) fields.name = 'Enter the passenger name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) fields.email = 'Enter a valid email address.';
  if (phone.replace(/\D/g, '').length < 7) fields.phone = 'Enter a phone number the driver can reach.';

  if (Object.keys(fields).length > 0) {
    throw new ApiError(400, 'invalid_customer', 'Check the passenger details and try again.', fields);
  }
  return { name, email, phone };
}

function reference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = randomBytes(6);
  let code = '';
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `NL-${code}`;
}

export function createBooking(input = {}) {
  const bookings = readStore();
  const customer = assertCustomer(input.customer || input);
  const vehicleId = String(input.vehicleId || '');

  const { quote, option } = priceSelection(input, vehicleId, bookings);

  const booking = {
    id: `bkg_${Date.now().toString(36)}_${randomBytes(3).toString('hex')}`,
    reference: reference(),
    status: 'requested',
    createdAt: new Date().toISOString(),
    service: quote.trip.service,
    from: quote.trip.from.name,
    to: quote.trip.to.name,
    date: quote.trip.date,
    time: quote.trip.time,
    passengers: quote.trip.passengers,
    bags: quote.trip.bags,
    vehicleId: option.vehicleId,
    vehicleName: option.name,
    price: option.price,
    currency: option.currency,
    breakdown: option.breakdown,
    customer,
    flight: String(input.flight || '').trim().slice(0, 24),
    notes: String(input.notes || '').trim().slice(0, 500),
    channel: 'web'
  };

  const next = [booking, ...bookings].slice(0, MAX_BOOKINGS);
  memoryCache = next;
  persist(next);
  return booking;
}

export function updateBookingStatus(id, status) {
  if (!STATUSES.includes(status)) {
    throw new ApiError(400, 'invalid_status', 'That status is not recognised.', {
      status: `Use one of: ${STATUSES.join(', ')}.`
    });
  }
  const bookings = readStore();
  const booking = bookings.find((item) => item.id === id || item.reference === id);
  if (!booking) {
    throw new ApiError(404, 'not_found', 'No booking matches that reference.');
  }
  booking.status = status;
  booking.updatedAt = new Date().toISOString();
  persist(bookings);
  return booking;
}

export function resetStoreForTests() {
  memoryCache = null;
}

export { STATUSES };
