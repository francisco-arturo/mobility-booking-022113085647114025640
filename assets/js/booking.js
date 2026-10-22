// Booking flow: one quote request, then one booking request. All money is recomputed on the server.

(function () {
  const params = new URLSearchParams(window.location.search);
  const form = document.getElementById('trip-form');
  if (!form) return;

  const state = {
    trip: null,
    quote: null,
    vehicle: null,
    step: 1
  };

  const els = {
    steps: Array.from(document.querySelectorAll('.steps .step')),
    panels: Array.from(document.querySelectorAll('.step-panel')),
    options: document.getElementById('ride-options'),
    optionsStatus: document.getElementById('ride-status'),
    quoteAlert: document.getElementById('quote-alert'),
    bookingAlert: document.getElementById('booking-alert'),
    breakdown: document.getElementById('fare-breakdown'),
    summary: {
      route: document.querySelector('[data-summary="route"]'),
      when: document.querySelector('[data-summary="when"]'),
      party: document.querySelector('[data-summary="party"]'),
      vehicle: document.querySelector('[data-summary="vehicle"]'),
      total: document.querySelector('[data-summary="total"]')
    },
    form: document.getElementById('passenger-form'),
    submit: document.getElementById('confirm-booking'),
    confirmation: document.getElementById('confirmation')
  };

  const money = (value) => `$${Number(value).toLocaleString('en-US')}`;

  function setStep(step) {
    state.step = step;
    els.steps.forEach((node) => {
      const value = Number(node.dataset.step);
      node.classList.toggle('is-active', value === step);
      node.classList.toggle('is-done', value < step);
      const dot = node.querySelector('.dot');
      if (dot) dot.textContent = value < step ? '\u2713' : String(value);
    });
    els.panels.forEach((panel) => panel.classList.toggle('is-active', Number(panel.dataset.step) === step));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function isoToday() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }

  function isoTomorrow() {
    const date = new Date(Date.now() + 86400000);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function prettyDate(value) {
    if (!value) return '--';
    const date = new Date(`${value}T12:00:00`);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }

  function prettyTime(value) {
    if (!value) return '';
    const [hours, minutes] = value.split(':').map(Number);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour = hours % 12 || 12;
    return `${hour}:${String(minutes).padStart(2, '0')} ${suffix}`;
  }

  // Prefill from the home page quick quote, with a working default for a cold visit.
  const dateField = form.elements.namedItem('date');
  const timeField = form.elements.namedItem('time');
  if (dateField) dateField.min = isoToday();
  if (dateField && !dateField.value) dateField.value = params.get('date') || isoTomorrow();
  if (timeField && !timeField.value) timeField.value = params.get('time') || '09:00';

  ['from', 'to', 'passengers'].forEach((key) => {
    const field = form.elements.namedItem(key);
    if (field && params.get(key)) field.value = params.get(key);
  });
  if (!form.elements.namedItem('from').value) form.elements.namedItem('from').value = 'San Francisco International (SFO)';
  if (!form.elements.namedItem('to').value) form.elements.namedItem('to').value = 'Downtown San Francisco';

  // Normalise a typed location to its catalogue name when it matches.
  const zones = Array.from(document.querySelectorAll('#zone-options option')).map((option) => option.value);
  form.querySelectorAll('input[list="zone-options"]').forEach((input) => {
    input.addEventListener('blur', () => {
      const match = zones.find((zone) => zone.toLowerCase() === input.value.trim().toLowerCase());
      if (match) input.value = match;
    });
  });

  function tripPayload() {
    return {
      from: form.elements.namedItem('from').value,
      to: form.elements.namedItem('to').value,
      date: form.elements.namedItem('date').value,
      time: form.elements.namedItem('time').value,
      passengers: form.elements.namedItem('passengers').value,
      bags: form.elements.namedItem('bags').value,
      service: 'transfer'
    };
  }

  function updateSummary() {
    if (!state.trip) {
      const draft = tripPayload();
      els.summary.route.textContent = `${draft.from || '--'} to ${draft.to || '--'}`;
      els.summary.when.textContent = `${prettyDate(draft.date)} at ${prettyTime(draft.time)}`;
      els.summary.party.textContent = `${draft.passengers} passenger${Number(draft.passengers) === 1 ? '' : 's'} / ${draft.bags} bag${Number(draft.bags) === 1 ? '' : 's'}`;
      return;
    }
    const trip = state.trip;
    els.summary.route.textContent = `${trip.from.name} to ${trip.to.name}`;
    els.summary.when.textContent = `${prettyDate(trip.date)} at ${prettyTime(trip.time)}`;
    els.summary.party.textContent = `${trip.passengers} passenger${trip.passengers === 1 ? '' : 's'} / ${trip.bags} bag${trip.bags === 1 ? '' : 's'}`;
    els.summary.vehicle.textContent = state.vehicle ? state.vehicle.name : 'Choose at step 2';
    els.summary.total.textContent = state.vehicle ? money(state.vehicle.price) : '--';
  }

  function showAlert(node, message) {
    if (!node) return;
    if (message) {
      node.textContent = message;
      node.classList.add('is-visible');
    } else {
      node.classList.remove('is-visible');
    }
  }

  function clearFieldErrors(container) {
    container.querySelectorAll('.field.has-error').forEach((field) => field.classList.remove('has-error'));
  }

  function mapFieldErrors(container, fields) {
    if (!fields) return;
    Object.entries(fields).forEach(([key, message]) => {
      const input = container.querySelector(`[name="${key}"]`);
      if (!input) return;
      const wrapper = input.closest('.field');
      if (!wrapper) return;
      wrapper.classList.add('has-error');
      const error = wrapper.querySelector('.field-error');
      if (error) error.textContent = message;
    });
  }

  // Step 1: quote
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showAlert(els.quoteAlert, '');
    clearFieldErrors(form);
    const button = form.querySelector('button[type="submit"]');
    const label = button ? button.textContent : '';
    if (button) {
      button.disabled = true;
      button.textContent = 'Checking availability...';
    }

    try {
      const response = await fetch(`/api/quote?${new URLSearchParams(tripPayload()).toString()}`);
      const data = await response.json();
      if (!response.ok) {
        const error = data.error || {};
        showAlert(els.quoteAlert, error.message || 'We could not price that trip.');
        mapFieldErrors(form, error.fields);
        return;
      }
      state.quote = data;
      state.trip = data.trip;
      state.vehicle = null;
      renderOptions(data);
      updateSummary();
      setStep(2);
    } catch (error) {
      showAlert(els.quoteAlert, 'The quote service did not answer. Check your connection and try again.');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = label;
      }
    }
  });

  function renderOptions(quote) {
    els.options.innerHTML = '';
    els.breakdown.classList.remove('is-visible');

    quote.options.forEach((option) => {
      const wrapper = document.createElement('label');
      wrapper.className = 'ride-option';
      if (!option.available) wrapper.classList.add('is-unavailable');

      const disabled = option.available ? '' : 'disabled';
      const badge = option.popular
        ? '<span class="badge badge--signal">Most booked</span>'
        : '';
      const status = option.available
        ? `<span class="badge badge--muted">${option.remaining} left</span>`
        : `<span class="badge" style="background:#fbeae5;color:#a83a1c">${option.fits ? 'Sold out' : 'Too small'}</span>`;

      wrapper.innerHTML = `
        <input type="radio" name="vehicleId" value="${option.vehicleId}" ${disabled}>
        <div>
          <div class="ride-head">
            <h3>${option.name}</h3>
            ${badge}
            ${status}
          </div>
          <div class="ride-examples">${option.examples}</div>
        </div>
        <div class="ride-price">
          ${money(option.price)}
          <small>total, all in</small>
        </div>
        <div class="ride-meta">
          <span>${seatIcon()}${option.pax} seats</span>
          <span>${bagIcon()}${option.bags} bags</span>
          <span>${clockIcon()}${quote.trip.minutes} min</span>
          <span>${quote.trip.miles} miles</span>
        </div>
      `;

      const input = wrapper.querySelector('input');
      if (option.available) {
        input.addEventListener('change', () => {
          document.querySelectorAll('.ride-option').forEach((node) => node.classList.remove('is-selected'));
          wrapper.classList.add('is-selected');
          state.vehicle = option;
          renderBreakdown(quote, option);
          updateSummary();
        });
      }

      els.options.appendChild(wrapper);
    });

    const available = quote.options.filter((option) => option.available);
    els.optionsStatus.textContent = available.length
      ? `${quote.trip.miles} miles, about ${quote.trip.minutes} minutes. ${available.length} classes available on ${prettyDate(quote.trip.date)}.`
      : 'Every class is booked for that date. Try a different day.';
  }

  function renderBreakdown(quote, option) {
    const parts = [];
    parts.push(`<div><span>${option.name} base fare</span><span>${money(option.breakdown.fare)}</span></div>`);
    if (option.breakdown.airportFee) {
      parts.push(`<div><span>Airport access</span><span>${money(option.breakdown.airportFee)}</span></div>`);
    }
    if (option.breakdown.nightFee) {
      parts.push(`<div><span>Night service (${quote.pricing.nightSurchargePercent}%)</span><span>${money(option.breakdown.nightFee)}</span></div>`);
    }
    parts.push(`<div><span>Tolls and fees</span><span>Included</span></div>`);
    parts.push(`<div class="total"><span>Total</span><span>${money(option.price)}</span></div>`);
    els.breakdown.innerHTML = parts.join('');
    els.breakdown.classList.add('is-visible');
  }

  document.getElementById('to-step-2').addEventListener('click', () => setStep(2));

  document.getElementById('to-step-3').addEventListener('click', () => {
    if (!state.vehicle) {
      els.optionsStatus.textContent = 'Select a vehicle class to continue.';
      return;
    }
    const trip = state.trip;
    const passengerName = els.form.elements.namedItem('name');
    if (passengerName && !passengerName.value) passengerName.focus();
    document.getElementById('selected-vehicle').value = state.vehicle.name;
    document.getElementById('selected-vehicle-label').textContent = `${state.vehicle.name} - ${money(state.vehicle.price)} including tolls and fees`;
    setStep(3);
  });

  document.querySelectorAll('[data-back]').forEach((button) => {
    button.addEventListener('click', () => setStep(Number(button.dataset.back)));
  });

  // Step 3: book
  els.form.addEventListener('submit', async (event) => {
    event.preventDefault();
    showAlert(els.bookingAlert, '');
    clearFieldErrors(els.form);
    if (!state.vehicle || !state.trip) {
      showAlert(els.bookingAlert, 'Choose a vehicle before confirming.');
      return;
    }

    const payload = {
      ...tripPayload(),
      vehicleId: state.vehicle.vehicleId,
      customer: {
        name: els.form.elements.namedItem('name').value,
        email: els.form.elements.namedItem('email').value,
        phone: els.form.elements.namedItem('phone').value
      },
      flight: els.form.elements.namedItem('flight').value,
      notes: els.form.elements.namedItem('notes').value
    };

    const button = els.submit;
    button.disabled = true;
    const label = button.textContent;
    button.textContent = 'Reserving your car...';

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        const error = data.error || {};
        showAlert(els.bookingAlert, error.message || 'We could not complete that booking.');
        mapFieldErrors(els.form, error.fields);
        return;
      }
      showConfirmation(data.booking);
    } catch (error) {
      showAlert(els.bookingAlert, 'The booking service did not answer. Nothing was charged. Try again.');
    } finally {
      button.disabled = false;
      button.textContent = label;
    }
  });

  function showConfirmation(booking) {
    document.getElementById('step-1').classList.remove('is-active');
    document.getElementById('step-2').classList.remove('is-active');
    document.getElementById('step-3').classList.remove('is-active');
    document.getElementById('booking-topbar').hidden = true;
    els.confirmation.hidden = false;

    document.getElementById('confirm-ref').textContent = booking.reference;
    document.getElementById('confirm-name').textContent = booking.customer.name.split(' ')[0];
    document.getElementById('confirm-vehicle').textContent = booking.vehicleName;
    document.getElementById('confirm-route').textContent = `${booking.from} to ${booking.to}`;
    document.getElementById('confirm-when').textContent = `${prettyDate(booking.date)} at ${prettyTime(booking.time)}`;
    document.getElementById('confirm-party').textContent = `${booking.passengers} passenger${booking.passengers === 1 ? '' : 's'}`;
    document.getElementById('confirm-price').textContent = money(booking.price);
    document.getElementById('confirm-email').textContent = booking.customer.email;

    els.summary.vehicle.textContent = booking.vehicleName;
    els.summary.total.textContent = money(booking.price);
    els.summary.when.textContent = `${prettyDate(booking.date)} at ${prettyTime(booking.time)}`;
    els.summary.route.textContent = `${booking.from} to ${booking.to}`;

    const reset = document.getElementById('book-another');
    if (reset) {
      reset.addEventListener('click', (event) => {
        event.preventDefault();
        window.location.href = '/booking';
      });
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function seatIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 10V7a3 3 0 0 1 3-3h2a3 3 0 0 1 3 3v3"/><path d="M5 10h11a3 3 0 0 1 3 3v4H8a3 3 0 0 1-3-3z"/><path d="M8 17v3M16 17v3"/></svg>';
  }

  function bagIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="5" y="7" width="14" height="13" rx="2"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>';
  }

  function clockIcon() {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>';
  }

  updateSummary();
})();
