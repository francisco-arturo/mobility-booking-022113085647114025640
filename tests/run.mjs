// Verification for the Northlane prototype. No dependencies: `node tests/run.mjs`.
//
// Covers the pricing engine, the booking API, and the static site (structure, links, assets,
// duplicate ids, and the brand tokens). Exits non-zero on the first failed section summary.

import { existsSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
process.env.BOOKINGS_STORE = path.join(root, 'data', 'test-bookings.json');
process.env.INQUIRIES_STORE = path.join(root, 'data', 'test-inquiries.json');

rmSync(path.join(root, 'data'), { recursive: true, force: true });

const { call, handleQuote, handleBookings, handleCatalog, handleContact } = await import('../lib/api.js');
const { availabilityFor, haversineMiles } = await import('../lib/pricing.js');

let passed = 0;
const failures = [];

function assert(condition, message) {
  if (condition) {
    passed += 1;
  } else {
    failures.push(message);
    console.log(`  FAIL  ${message}`);
  }
}

function equal(actual, expected, message) {
  assert(
    actual === expected,
    `${message} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`
  );
}

function section(name) {
  console.log(`\n${name}`);
}

function isoOffset(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

const trip = {
  from: 'San Francisco International (SFO)',
  to: 'Downtown San Francisco',
  date: isoOffset(5),
  time: '14:30',
  passengers: '2',
  bags: '2',
  service: 'transfer'
};

section('Pricing engine');

{
  const result = await call(handleQuote, { method: 'GET', query: trip, body: {} });
  equal(result.status, 200, 'SFO to Downtown SF quotes successfully');
  const body = result.body;
  equal(body.options.length, 4, 'four vehicle classes are priced');
  equal(body.trip.miles, 14.6, 'SFO to Downtown is 14.6 road miles');
  assert(body.trip.minutes >= 30 && body.trip.minutes <= 45, 'trip duration is plausible');
  const sedan = body.options.find((option) => option.vehicleId === 'sedan');
  equal(sedan.price, 90, 'executive sedan total is $90 including airport access');
  equal(sedan.breakdown.airportFee, 15, 'airport access fee is applied');
  equal(sedan.breakdown.fare, 75, 'sedan distance fare is $75');
  assert(body.options.every((option) => option.available), 'all classes are available on an ordinary date');
  const sprinter = body.options.find((option) => option.vehicleId === 'sprinter');
  assert(sprinter.price > sedan.price, 'larger classes cost more');
}

{
  const night = await call(handleQuote, {
    method: 'GET',
    query: { ...trip, time: '23:30' },
    body: {}
  });
  const day = await call(handleQuote, { method: 'GET', query: trip, body: {} });
  const nightSedan = night.body.options.find((option) => option.vehicleId === 'sedan');
  const daySedan = day.body.options.find((option) => option.vehicleId === 'sedan');
  assert(nightSedan.price > daySedan.price, 'night service adds a surcharge');
  equal(night.body.pricing.nightSurchargePercent, 18, 'night surcharge is disclosed as 18%');
}

{
  const hourly = await call(handleQuote, {
    method: 'GET',
    query: { ...trip, service: 'hourly', hours: '4' },
    body: {}
  });
  equal(hourly.status, 200, 'hourly charters quote successfully');
  const sedan = hourly.body.options.find((option) => option.vehicleId === 'sedan');
  equal(sedan.price, 380, 'four hours of sedan charter is $380');
}

{
  const same = await call(handleQuote, { method: 'GET', query: { ...trip, to: trip.from }, body: {} });
  equal(same.status, 400, 'identical pick-up and drop-off are rejected');
  equal(same.body.error.code, 'same_locations', 'rejection carries a machine-readable code');

  const past = await call(handleQuote, { method: 'GET', query: { ...trip, date: '2020-01-01' }, body: {} });
  equal(past.status, 400, 'a past date is rejected');
  equal(past.body.error.code, 'past_date', 'past-date rejection is specific');

  const unknown = await call(handleQuote, { method: 'GET', query: { ...trip, from: 'Atlantis' }, body: {} });
  equal(unknown.status, 400, 'an unserved location is rejected');

  const crowd = await call(handleQuote, { method: 'GET', query: { ...trip, passengers: '12', bags: '2' }, body: {} });
  const small = crowd.body.options.find((option) => option.vehicleId === 'sedan');
  equal(small.fits, false, 'classes too small for the party are marked as not fitting');
  equal(small.available, false, 'a class that cannot fit the party is not bookable');
}

{
  assert(haversineMiles({ lat: 37.6213, lng: -122.379 }, { lat: 37.7858, lng: -122.4064 }) > 11, 'haversine distance is sane');
  let sedanAlwaysAvailable = true;
  for (let day = 0; day < 40; day += 1) {
    if (availabilityFor(isoOffset(day), 'sedan') < 1) sedanAlwaysAvailable = false;
  }
  assert(sedanAlwaysAvailable, 'the sedan class is never sold out, protecting the demo path');
}

section('Booking API');

let created = null;
{
  const quote = await call(handleQuote, { method: 'GET', query: trip, body: {} });
  const sedan = quote.body.options.find((option) => option.vehicleId === 'sedan');

  const result = await call(handleBookings, {
    method: 'POST',
    query: {},
    body: {
      ...trip,
      vehicleId: 'sedan',
      price: 1,
      customer: { name: 'Test Traveller', email: 'test@example.com', phone: '+1 415 555 0199' },
      flight: 'UA 512',
      notes: 'Automated verification booking.'
    }
  });
  equal(result.status, 201, 'a valid booking is created');
  created = result.body.booking;
  assert(/^NL-[A-Z0-9]{6}$/.test(created.reference), 'booking reference uses the NL- prefix');
  equal(created.status, 'requested', 'new bookings start as requested');
  equal(created.price, sedan.price, 'the server re-prices the booking and ignores the client price');
  assert(created.price !== 1, 'a tampered client price is discarded');
  equal(created.vehicleName, 'Executive Sedan', 'the booking records the class name');
}

{
  const list = await call(handleBookings, { method: 'GET', query: {}, body: {} });
  equal(list.status, 200, 'the bookings list loads');
  assert(list.body.bookings.some((booking) => booking.reference === created.reference), 'the new booking appears in the list');
  assert(list.body.stats.total >= 5, 'seeded bookings plus the new one are counted');
  assert(list.body.bookings.find((booking) => booking.reference === created.reference).price === created.price, 'the stored price matches the quote');
}

{
  const update = await call(handleBookings, {
    method: 'PATCH',
    query: {},
    body: { id: created.id, status: 'confirmed' }
  });
  equal(update.status, 200, 'a status update succeeds');
  equal(update.body.booking.status, 'confirmed', 'the status is written back');

  const badStatus = await call(handleBookings, {
    method: 'PATCH',
    query: {},
    body: { id: created.id, status: 'teleported' }
  });
  equal(badStatus.status, 400, 'an unknown status is rejected');

  const missing = await call(handleBookings, {
    method: 'PATCH',
    query: {},
    body: { id: 'bkg_nope', status: 'confirmed' }
  });
  equal(missing.status, 404, 'an unknown booking id returns 404');
}

{
  const badEmail = await call(handleBookings, {
    method: 'POST',
    query: {},
    body: {
      ...trip,
      vehicleId: 'sedan',
      customer: { name: 'No Email', email: 'not-an-email', phone: '+1 415 555 0100' }
    }
  });
  equal(badEmail.status, 400, 'invalid passenger details are rejected');
  assert(badEmail.body.error.fields && badEmail.body.error.fields.email, 'the rejection names the offending field');

  const noVehicle = await call(handleBookings, {
    method: 'POST',
    query: {},
    body: { ...trip, vehicleId: 'helicopter', customer: { name: 'Test', email: 'a@b.co', phone: '4155550100' } }
  });
  equal(noVehicle.status, 400, 'an unknown vehicle class is rejected');
}

{
  let soldOutDate = null;
  for (let day = 1; day < 60 && !soldOutDate; day += 1) {
    const candidate = isoOffset(day);
    if (availabilityFor(candidate, 'sprinter') === 0) soldOutDate = candidate;
  }
  assert(Boolean(soldOutDate), 'the demo availability model produces a sold-out class');

  if (soldOutDate) {
    const quote = await call(handleQuote, {
      method: 'GET',
      query: { ...trip, date: soldOutDate, passengers: '8', bags: '8' },
      body: {}
    });
    const sprinter = quote.body.options.find((option) => option.vehicleId === 'sprinter');
    equal(sprinter.available, false, `sprinter is shown as sold out on ${soldOutDate}`);
    const attempt = await call(handleBookings, {
      method: 'POST',
      query: {},
      body: {
        ...trip,
        date: soldOutDate,
        passengers: '8',
        bags: '8',
        vehicleId: 'sprinter',
        customer: { name: 'Group Test', email: 'group@example.com', phone: '+1 415 555 0111' }
      }
    });
    equal(attempt.status, 409, 'booking a sold-out class is refused with a conflict');
  }
}

{
  const catalog = await call(handleCatalog, { method: 'GET', query: {}, body: {} });
  equal(catalog.status, 200, 'the catalog endpoint answers');
  equal(catalog.body.vehicles.length, 4, 'catalog exposes four classes');
  equal(catalog.body.zones.length, 14, 'catalog exposes fourteen served zones');
  equal(catalog.body.services.length, 5, 'catalog exposes five services');
}

{
  const contact = await call(handleContact, {
    method: 'POST',
    query: {},
    body: { name: 'Test Lead', email: 'lead@example.com', company: 'Acme', message: 'We need a monthly corporate account for twelve travellers.' }
  });
  equal(contact.status, 200, 'a contact enquiry is accepted');
  assert(contact.body.received === true, 'contact response confirms receipt');

  const invalid = await call(handleContact, { method: 'POST', query: {}, body: { name: 'x', email: 'nope', message: 'short' } });
  equal(invalid.status, 400, 'an incomplete enquiry is rejected');
}

section('Site structure');

const pages = [
  { file: 'index.html', title: true, description: true, footer: true },
  { file: 'services.html', title: true, description: true, footer: true },
  { file: 'fleet.html', title: true, description: true, footer: true },
  { file: 'booking.html', title: true, description: true, footer: false },
  { file: 'about.html', title: true, description: true, footer: true },
  { file: 'contact.html', title: true, description: true, footer: true },
  { file: 'ops.html', title: true, description: false, footer: true },
  { file: '404.html', title: true, description: false, footer: false }
];

const html = {};
for (const page of pages) {
  const file = path.join(root, page.file);
  assert(existsSync(file), `${page.file} exists`);
  if (!existsSync(file)) continue;
  const contents = readFileSync(file, 'utf8');
  html[page.file] = contents;

  if (page.title) assert(/<title>[^<]{5,}<\/title>/.test(contents), `${page.file} has a real title`);
  if (page.description) assert(/<meta name="description" content="[^"]{40,}"/.test(contents), `${page.file} has a meta description`);
  if (page.footer) assert(contents.includes('site-footer'), `${page.file} has a footer`);
  assert(contents.includes('name="viewport"'), `${page.file} is mobile-ready`);
  assert(contents.includes('assets/css/site.css'), `${page.file} loads the design system`);
  assert(/<main[^>]*id="main"/.test(contents), `${page.file} has a main landmark`);
  assert((contents.match(/<h1[\s>]/g) || []).length === 1, `${page.file} has exactly one h1`);
  assert(!/lorem ipsum/i.test(contents), `${page.file} contains no placeholder copy`);
  assert(!/\bTODO\b/.test(contents), `${page.file} has no TODO markers`);

  const ids = [...contents.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert(duplicates.length === 0, `${page.file} has unique element ids${duplicates.length ? ` (duplicates: ${[...new Set(duplicates)].join(', ')})` : ''}`);

  const assetRefs = [...contents.matchAll(/(?:src|href)="(\/assets\/[^"#?]+)"/g)].map((match) => match[1]);
  for (const ref of new Set(assetRefs)) {
    assert(existsSync(path.join(root, ref)), `${page.file} asset ${ref} exists`);
  }

  const pageLinks = [...contents.matchAll(/href="(\/[^"#?]*)(?:[#?][^"]*)?"/g)]
    .map((match) => match[1])
    .filter((link) => link && !link.startsWith('/api/'));
  for (const link of new Set(pageLinks)) {
    const target = link === '/' ? path.join(root, 'index.html') : path.join(root, `${link.replace(/^\//, '')}.html`);
    const direct = path.join(root, link.replace(/^\//, ''));
    assert(existsSync(target) || (existsSync(direct) && statSync(direct).isFile()), `${page.file} link ${link} resolves`);
  }
}

assert(html['booking.html'].includes('booking.js'), 'booking page loads its flow script');
assert(html['booking.html'].includes('zone-options'), 'booking page offers location suggestions');
assert(html['ops.html'].includes('ops.js'), 'operations page loads its board script');
assert(html['index.html'].includes('data-quick-quote'), 'home page carries the quick quote');
assert(html['services.html'].includes('id="airport-transfers"'), 'services page deep-links to airport transfers');

section('Design system');

{
  const css = readFileSync(path.join(root, 'assets', 'css', 'site.css'), 'utf8');
  for (const token of ['--ink:', '--bone:', '--signal:', '--serif:', '--sans:']) {
    assert(css.includes(token), `design tokens define ${token}`);
  }
  assert(css.includes('.skip-link'), 'design system styles the skip link');
  assert(css.includes('@media (max-width: 960px)'), 'design system has a mobile breakpoint');
  assert(css.includes('prefers-reduced-motion'), 'design system respects reduced motion');
  assert(/--signal:\s*#d94f2b/i.test(css), 'the signal accent is the documented brand orange');
  assert(css.includes('grid-template-columns'), 'layout uses a real grid');
}

section('Repository hygiene');

{
  const ignore = existsSync(path.join(root, '.gitignore')) ? readFileSync(path.join(root, '.gitignore'), 'utf8') : '';
  assert(ignore.includes('node_modules'), '.gitignore excludes node_modules');
  assert(ignore.includes('data/'), '.gitignore excludes the local store');
  assert(existsSync(path.join(root, '.vercelignore')), '.vercelignore keeps local-only files out of the deployment');
  const vercelIgnore = readFileSync(path.join(root, '.vercelignore'), 'utf8');
  assert(vercelIgnore.includes('dev-server.mjs'), 'dev-server.mjs is excluded from Vercel');
}

console.log(`\n${'-'.repeat(56)}`);
if (failures.length) {
  console.log(`FAILED: ${failures.length} check${failures.length === 1 ? '' : 's'} failed, ${passed} passed.`);
  process.exitCode = 1;
} else {
  console.log(`PASSED: ${passed} checks.`);
}
