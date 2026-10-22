// Catalog for Northlane: vehicle classes, the zones it serves, and the services it sells.
// Prices are illustrative seed data for the prototype, not a published tariff.

export const CURRENCY = 'USD';
export const COMPANY = {
  name: 'Northlane',
  legalName: 'Northlane Chauffeur Services',
  phone: '+1 (415) 555-0142',
  phoneHref: '+14155550142',
  email: 'reservations@northlanemobility.com',
  base: 'Pier 33, San Francisco, CA',
  hours: 'Reservations answered 24/7',
  founded: 2014
};

export const VEHICLES = [
  {
    id: 'sedan',
    name: 'Executive Sedan',
    examples: 'Mercedes-Benz E-Class or similar',
    pax: 3,
    bags: 2,
    baseFare: 18,
    perMile: 3.9,
    minimum: 65,
    hourly: 95,
    popular: true,
    tagline: 'The everyday standard for airport runs and client meetings.',
    features: [
      'Chauffeur in a suit, meet-and-greet inside arrivals',
      'Still and sparkling water, chargers for every seat',
      'Flight tracking, 60 minutes of complimentary wait time'
    ]
  },
  {
    id: 'suv',
    name: 'Premium SUV',
    examples: 'Cadillac Escalade or similar',
    pax: 5,
    bags: 4,
    baseFare: 24,
    perMile: 4.8,
    minimum: 85,
    hourly: 120,
    tagline: 'More room, more luggage, same discreet service.',
    features: [
      'Elevated seating with a quiet, isolated cabin',
      'Fits four large cases plus carry-ons',
      'Rear climate control and privacy glass'
    ]
  },
  {
    id: 'van',
    name: 'Business Van',
    examples: 'Mercedes-Benz V-Class or similar',
    pax: 6,
    bags: 6,
    baseFare: 30,
    perMile: 5.6,
    minimum: 100,
    hourly: 140,
    tagline: 'Built for small teams and roadshow days.',
    features: [
      'Conference seating and a working table',
      'Six full-size cases in the rear',
      'Onboard Wi-Fi and USB-C at every seat'
    ]
  },
  {
    id: 'sprinter',
    name: 'Sprinter Coach',
    examples: 'Mercedes-Benz Sprinter or similar',
    pax: 12,
    bags: 12,
    baseFare: 45,
    perMile: 7.2,
    minimum: 140,
    hourly: 175,
    tagline: 'Group transfers without splitting the party.',
    features: [
      'Twelve seats, twelve cases, one invoice',
      'Stand-up aisle and luggage partition',
      'Ideal for wedding parties and production crews'
    ]
  }
];

export const ZONES = [
  { id: 'sfo', name: 'San Francisco International (SFO)', short: 'SFO', city: 'San Francisco', lat: 37.6213, lng: -122.379, airport: true },
  { id: 'oak', name: 'Oakland International (OAK)', short: 'OAK', city: 'Oakland', lat: 37.7213, lng: -122.2207, airport: true },
  { id: 'sjc', name: 'San Jose International (SJC)', short: 'SJC', city: 'San Jose', lat: 37.3639, lng: -121.9289, airport: true },
  { id: 'sf-downtown', name: 'Downtown San Francisco', short: 'SoMa / FiDi', city: 'San Francisco', lat: 37.7858, lng: -122.4064 },
  { id: 'sf-mission', name: 'Mission District', short: 'Mission', city: 'San Francisco', lat: 37.7599, lng: -122.4148 },
  { id: 'sf-marina', name: 'Marina and the Presidio', short: 'Marina', city: 'San Francisco', lat: 37.8021, lng: -122.4434 },
  { id: 'oakland', name: 'Downtown Oakland', short: 'Oakland', city: 'Oakland', lat: 37.8044, lng: -122.2712 },
  { id: 'berkeley', name: 'Berkeley', short: 'Berkeley', city: 'Berkeley', lat: 37.8715, lng: -122.273 },
  { id: 'palo-alto', name: 'Palo Alto', short: 'Palo Alto', city: 'Palo Alto', lat: 37.4419, lng: -122.143 },
  { id: 'mountain-view', name: 'Mountain View', short: 'Mountain View', city: 'Mountain View', lat: 37.3861, lng: -122.0839 },
  { id: 'menlo-park', name: 'Menlo Park', short: 'Menlo Park', city: 'Menlo Park', lat: 37.453, lng: -122.1817 },
  { id: 'sausalito', name: 'Sausalito', short: 'Sausalito', city: 'Sausalito', lat: 37.8591, lng: -122.4853 },
  { id: 'napa', name: 'Napa Valley', short: 'Napa', city: 'Napa', lat: 38.2975, lng: -122.2869 },
  { id: 'half-moon-bay', name: 'Half Moon Bay', short: 'Half Moon Bay', city: 'Half Moon Bay', lat: 37.4636, lng: -122.4286 }
];

export const SERVICES = [
  {
    id: 'airport-transfers',
    number: '01',
    name: 'Airport transfers',
    summary: 'A driver who watches your flight, not the clock.',
    description:
      'Meet-and-greet inside the terminal, live flight tracking, and sixty minutes of complimentary wait time on arrivals. If your flight lands early or late, the car moves with it.',
    from: 65,
    unit: 'from',
    highlights: ['SFO, OAK and SJC', 'Meet-and-greet included', 'Flight tracking and free wait time'],
    note: 'Curbside or in-terminal meet at all three Bay Area airports.'
  },
  {
    id: 'corporate-travel',
    number: '02',
    name: 'Corporate travel',
    summary: 'One account, one invoice, every ride on policy.',
    description:
      'Centralised billing, cost centres, and a booking desk your assistants can reach by phone or email. Travel policies are applied at booking, not discovered at month end.',
    from: 490,
    unit: 'monthly minimum',
    highlights: ['Centralised billing', 'Cost-centre reporting', 'Priority dispatch'],
    note: 'Accounts are reviewed monthly; no card details are stored by the booking engine.'
  },
  {
    id: 'executive-chauffeur',
    number: '03',
    name: 'Executive chauffeur',
    summary: 'Your car and driver, held for the day.',
    description:
      'Hourly chauffeur service for roadshows, site visits, and days when the schedule changes twice before lunch. Three-hour minimum, up to twelve hours, one professional throughout.',
    from: 95,
    unit: 'per hour',
    highlights: ['Three-hour minimum', 'Same chauffeur all day', 'Discreet, vetted drivers'],
    note: 'Popular for investor days, client hosting, and multi-stop site visits.'
  },
  {
    id: 'events-and-groups',
    number: '04',
    name: 'Events and groups',
    summary: 'Everyone arrives together, and on time.',
    description:
      'Coaches and convoys for weddings, conferences, and production crews. A single coordinator owns the manifest, the timings, and the departures so nobody is left behind.',
    from: 120,
    unit: 'per vehicle hour',
    highlights: ['Up to 12 per vehicle', 'Convoy coordination', 'On-site dispatcher'],
    note: 'Weddings, conferences, film and production, and hotel guest movements.'
  },
  {
    id: 'hotel-and-concierge',
    number: '05',
    name: 'Hotel and concierge',
    summary: 'The car your front desk can promise.',
    description:
      'A dedicated reservations line for concierge teams, guaranteed response times, and a discreet uniform standard guests notice but never mention. Billing reconciles to the property.',
    from: 65,
    unit: 'from',
    highlights: ['Concierge hotline', 'Guaranteed response times', 'Monthly reconciliation'],
    note: 'Partner rates available for properties booking ten or more rides a month.'
  }
];
