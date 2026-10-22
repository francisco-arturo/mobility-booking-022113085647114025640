// Operations board: reads the same bookings API the site writes to, and updates status inline.

(function () {
  const tableBody = document.getElementById('bookings-body');
  if (!tableBody) return;

  const kpis = {
    requested: document.querySelector('[data-kpi="requested"]'),
    confirmed: document.querySelector('[data-kpi="confirmed"]'),
    revenue: document.querySelector('[data-kpi="revenue"]'),
    total: document.querySelector('[data-kpi="total"]')
  };
  const updated = document.getElementById('ops-updated');
  const empty = document.getElementById('ops-empty');

  const money = (value) => `$${Number(value).toLocaleString('en-US')}`;

  function prettyDate(value) {
    if (!value) return '--';
    return new Date(`${value}T12:00:00`).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  }

  async function load() {
    try {
      const response = await fetch('/api/bookings');
      if (!response.ok) throw new Error('Could not load bookings');
      const data = await response.json();
      render(data.bookings, data.stats, data.statuses);
      if (updated) updated.textContent = `Updated ${new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
    } catch (error) {
      tableBody.innerHTML = `<tr><td colspan="7" class="ops-empty">The bookings API is not responding. ${error.message}.</td></tr>`;
    }
  }

  function render(bookings, stats, statuses) {
    kpis.requested.textContent = String(stats.requested);
    kpis.confirmed.textContent = String(stats.confirmed);
    kpis.revenue.textContent = money(stats.revenue);
    kpis.total.textContent = String(stats.total);

    if (!bookings.length) {
      empty.hidden = false;
      tableBody.innerHTML = '';
      return;
    }
    empty.hidden = true;

    tableBody.innerHTML = bookings
      .map(
        (booking) => `
      <tr>
        <td>
          <span class="ref">${booking.reference}</span>
          <small style="display:block;color:var(--muted)">${booking.customer.name}</small>
        </td>
        <td class="route-cell">
          ${booking.from}
          <small>to ${booking.to}</small>
        </td>
        <td>${prettyDate(booking.date)}<br><small style="color:var(--muted)">${booking.time}</small></td>
        <td>${booking.vehicleName}<br><small style="color:var(--muted)">${booking.passengers} pax / ${booking.bags} bags</small></td>
        <td>${money(booking.price)}</td>
        <td>
          <select class="status-select" data-id="${booking.id}" data-status="${booking.status}" aria-label="Status for ${booking.reference}">
            ${statuses
              .map(
                (status) =>
                  `<option value="${status}" ${status === booking.status ? 'selected' : ''}>${status}</option>`
              )
              .join('')}
          </select>
        </td>
        <td>${booking.flight || '--'}</td>
      </tr>`
      )
      .join('');

    tableBody.querySelectorAll('.status-select').forEach((select) => {
      select.addEventListener('change', async () => {
        const id = select.dataset.id;
        const status = select.value;
        select.disabled = true;
        try {
          const response = await fetch('/api/bookings', {
            method: 'PATCH',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ id, status })
          });
          if (!response.ok) throw new Error('Update failed');
          select.dataset.status = status;
          const data = await response.json();
          if (data.booking) select.dataset.status = data.booking.status;
          load();
        } catch {
          select.value = select.dataset.status;
        } finally {
          select.disabled = false;
        }
      });
    });
  }

  const refresh = document.getElementById('ops-refresh');
  if (refresh) refresh.addEventListener('click', load);

  load();
  window.setInterval(load, 30000);
})();
