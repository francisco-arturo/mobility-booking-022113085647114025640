// Quoting rules for Northlane. One place computes distance, fare and availability so the browser,
// the API and the tests can never disagree about a price.

import { VEHICLES, ZONES, CURRENCY } from './catalog.js';

export const RULES = {
  roadFactor: 1.27,
  averageMph: 31,
  airportFee: 15,
  nightMultiplier: 1.18,
  nightStartsHour: 22,
  nightEndsHour: 6,
  maxPassengers: 12,
  maxBags: 14,
  hourlyMinimum: 3,
  hourlyMaximum: 12
};

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields || null;
  }
}

export function haversineMiles(a, b) {
  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 3958.8;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(h));
}

function normalise(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Accepts a zone id, a full zone name, or a partial name such as "sfo" or "palo alto". */
export function resolveZone(input) {
  if (!input) return null;
  const needle = normalise(input);
  if (!needle) return null;

  const exactId = ZONES.find((zone) => zone.id === String(input).trim().toLowerCase());
  if (exactId) return exactId;

  const exactName = ZONES.find((zone) => normalise(zone.name) === needle);
  if (exactName) return exactName;

  const shortName = ZONES.find((zone) => normalise(zone.short) === needle);
  if (shortName) return shortName;

  const partial = ZONES.find(
    (zone) =>
      normalise(zone.name).includes(needle) ||
      normalise(zone.city).includes(needle) ||
      needle.includes(normalise(zone.short))
  );
  return partial || null;
}

export function distanceBetween(from, to) {
  const straight = haversineMiles(from, to);
  return Math.max(1.5, Math.round(straight * RULES.roadFactor * 10) / 10);
}

export function minutesFor(miles) {
  return Math.max(12, Math.round((miles / RULES.averageMph) * 60) + 7);
}

export function isNight(time) {
  const hour = Number(String(time || '00:00').split(':')[0]);
  return hour >= RULES.nightStartsHour || hour < RULES.nightEndsHour;
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

/**
 * Deterministic demo availability: the same date always yields the same capacity, so a client can
 * be shown the same page twice. Real deployments swap this for the provider's availability feed.
 */
export function availabilityFor(date, vehicleId, bookings = []) {
  const seed = hash(`${date}:${vehicleId}`);
  let remaining = 1 + (seed % 4);
  // The sedan is never sold out, so the demo's happy path is always bookable.
  if (vehicleId !== 'sedan' && seed % 7 === 0) remaining = 0;
  for (const booking of bookings) {
    if (
      booking &&
      booking.date === date &&
      booking.vehicleId === vehicleId &&
      booking.status !== 'cancelled'
    ) {
      remaining = Math.max(0, remaining - 1);
    }
  }
  return remaining;
}

function roundCurrency(value) {
  return Math.round(value);
}

export function fareFor(vehicle, trip) {
  const { miles, service, time } = trip;
  const night = isNight(time);
  let fare;
  let airportFee = 0;
  let nightFee = 0;

  if (service === 'hourly') {
    const hours = Math.max(RULES.hourlyMinimum, Math.min(RULES.hourlyMaximum, trip.hours || 4));
    fare = vehicle.hourly * hours;
    if (night) nightFee = roundCurrency(fare * (RULES.nightMultiplier - 1));
  } else {
    fare = Math.max(vehicle.minimum, vehicle.baseFare + vehicle.perMile * miles);
    fare = roundCurrency(fare);
    if (trip.airport) airportFee = RULES.airportFee;
    if (night) nightFee = roundCurrency(fare * (RULES.nightMultiplier - 1));
  }

  const total = roundCurrency(fare + airportFee + nightFee);
  return { fare, airportFee, nightFee, total, night };
}

export function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function requireDate(value) {
  const text = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    throw new ApiError(400, 'invalid_date', 'Choose a travel date in the format YYYY-MM-DD.', {
      date: 'Use YYYY-MM-DD.'
    });
  }
  const parsed = new Date(`${text}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    throw new ApiError(400, 'invalid_date', 'That date does not exist.', { date: 'Pick a real date.' });
  }
  if (text < todayIso()) {
    throw new ApiError(400, 'past_date', 'The travel date is in the past.', {
      date: 'Pick today or a later date.'
    });
  }
  return text;
}

function requireTime(value) {
  const text = String(value || '').trim();
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(text)) {
    throw new ApiError(400, 'invalid_time', 'Choose a pick-up time in the format HH:MM.', {
      time: 'Use a 24-hour time such as 14:30.'
    });
  }
  return text;
}

/**
 * Normalises a raw request (query string or JSON body) into the canonical trip shape.
 * Throws ApiError with a field map when anything is missing or out of range.
 */
export function parseTripRequest(source = {}) {
  const service = source.service === 'hourly' ? 'hourly' : 'transfer';

  const from = resolveZone(source.from);
  if (!from) {
    throw new ApiError(400, 'unknown_pickup', 'We do not recognise that pick-up location yet.', {
      from: 'Choose a served location from the suggestions.'
    });
  }

  const to = resolveZone(source.to);
  if (!to) {
    throw new ApiError(400, 'unknown_dropoff', 'We do not recognise that drop-off location yet.', {
      to: 'Choose a served location from the suggestions.'
    });
  }

  if (from.id === to.id) {
    throw new ApiError(400, 'same_locations', 'Pick-up and drop-off need to be different places.', {
      to: 'Choose a different drop-off.'
    });
  }

  const date = requireDate(source.date);
  const time = requireTime(source.time);

  const passengers = Number(source.passengers || 1);
  if (!Number.isInteger(passengers) || passengers < 1 || passengers > RULES.maxPassengers) {
    throw new ApiError(400, 'invalid_passengers', 'Passenger count is out of range.', {
      passengers: `Enter between 1 and ${RULES.maxPassengers} passengers.`
    });
  }

  const bags = Number(source.bags || 0);
  if (!Number.isInteger(bags) || bags < 0 || bags > RULES.maxBags) {
    throw new ApiError(400, 'invalid_bags', 'Luggage count is out of range.', {
      bags: `Enter between 0 and ${RULES.maxBags} bags.`
    });
  }

  const hours = service === 'hourly' ? Number(source.hours || 4) : null;
  if (service === 'hourly' && (!Number.isInteger(hours) || hours < RULES.hourlyMinimum || hours > RULES.hourlyMaximum)) {
    throw new ApiError(400, 'invalid_hours', 'Charter length is out of range.', {
      hours: `Choose between ${RULES.hourlyMinimum} and ${RULES.hourlyMaximum} hours.`
    });
  }

  const miles = distanceBetween(from, to);
  return {
    service,
    from,
    to,
    date,
    time,
    passengers,
    bags,
    hours,
    miles,
    minutes: minutesFor(miles),
    airport: Boolean(from.airport || to.airport),
    night: isNight(time)
  };
}

/** Builds the public quote: every class priced for this trip, with availability for the date. */
export function buildQuote(rawInput, bookings = []) {
  const trip = parseTripRequest(rawInput);

  const options = VEHICLES.map((vehicle) => {
    const remaining = availabilityFor(trip.date, vehicle.id, bookings);
    const fits = trip.passengers <= vehicle.pax && trip.bags <= vehicle.bags;
    const price = fareFor(vehicle, trip);
    return {
      vehicleId: vehicle.id,
      name: vehicle.name,
      examples: vehicle.examples,
      tagline: vehicle.tagline,
      pax: vehicle.pax,
      bags: vehicle.bags,
      features: vehicle.features,
      popular: Boolean(vehicle.popular),
      price: price.total,
      currency: CURRENCY,
      breakdown: price,
      available: remaining > 0 && fits,
      remaining,
      fits,
      note: fits ? null : `Fits ${vehicle.pax} passengers and ${vehicle.bags} bags.`
    };
  });

  return {
    trip: {
      service: trip.service,
      from: { id: trip.from.id, name: trip.from.name, short: trip.from.short, airport: Boolean(trip.from.airport) },
      to: { id: trip.to.id, name: trip.to.name, short: trip.to.short, airport: Boolean(trip.to.airport) },
      date: trip.date,
      time: trip.time,
      passengers: trip.passengers,
      bags: trip.bags,
      hours: trip.hours,
      miles: trip.miles,
      minutes: trip.minutes,
      airport: trip.airport,
      night: trip.night
    },
    options,
    pricing: {
      currency: CURRENCY,
      airportFee: trip.airport && trip.service === 'transfer' ? RULES.airportFee : 0,
      nightSurchargePercent: trip.night ? Math.round((RULES.nightMultiplier - 1) * 100) : 0,
      includes: 'Tolls, fuel, and a licensed chauffeur. Gratuity is not included.'
    }
  };
}

/** Re-prices on the server at booking time; never trusts a price sent by the browser. */
export function priceSelection(rawInput, vehicleId, bookings = []) {
  const quote = buildQuote(rawInput, bookings);
  const option = quote.options.find((item) => item.vehicleId === vehicleId);
  if (!option) {
    throw new ApiError(400, 'unknown_vehicle', 'That vehicle class is not part of this quote.', {
      vehicleId: 'Choose one of the offered classes.'
    });
  }
  if (!option.fits) {
    throw new ApiError(400, 'capacity', 'That class cannot carry this party.', { vehicleId: option.note });
  }
  if (!option.available) {
    throw new ApiError(409, 'sold_out', 'That class is fully booked for this date.', {
      vehicleId: 'Choose another class or change the date.'
    });
  }
  return { quote, option };
}
