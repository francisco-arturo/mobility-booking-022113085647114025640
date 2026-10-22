// Shared site behaviour: header state, mobile navigation, reveals, and the quick-quote handoff.

(function () {
  const body = document.body;

  // Mobile navigation
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.getElementById('site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = body.classList.toggle('nav-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', () => {
        body.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
      });
    });
  }

  // Header background after the hero
  const header = document.querySelector('.site-header');
  if (header) {
    const update = () => header.classList.toggle('is-scrolled', window.scrollY > 24);
    update();
    window.addEventListener('scroll', update, { passive: true });
  }

  // Reveal on scroll
  const reveals = document.querySelectorAll('.reveal');
  if (reveals.length) {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry, index) => {
            if (!entry.isIntersecting) return;
            const delay = Number(entry.target.dataset.delay || index * 60);
            window.setTimeout(() => entry.target.classList.add('is-visible'), Math.min(delay, 320));
            observer.unobserve(entry.target);
          });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
      );
      reveals.forEach((item) => observer.observe(item));
    } else {
      reveals.forEach((item) => item.classList.add('is-visible'));
    }
  }

  // Footer year
  document.querySelectorAll('[data-year]').forEach((node) => {
    node.textContent = String(new Date().getFullYear());
  });

  // Home quick quote -> booking page
  const quickForm = document.querySelector('[data-quick-quote]');
  if (quickForm) {
    const dateField = quickForm.querySelector('[name="date"]');
    const timeField = quickForm.querySelector('[name="time"]');
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const iso = (date) =>
      `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

    if (dateField) {
      dateField.min = iso(today);
      if (!dateField.value) dateField.value = iso(tomorrow);
    }
    if (timeField && !timeField.value) timeField.value = '09:00';

    quickForm.addEventListener('submit', (event) => {
      event.preventDefault();
      const error = quickForm.querySelector('.quote-error');
      const data = new FormData(quickForm);
      const from = String(data.get('from') || '').trim();
      const to = String(data.get('to') || '').trim();

      if (!from || !to || from.toLowerCase() === to.toLowerCase()) {
        if (error) {
          error.textContent = 'Choose two different locations to get a price.';
          error.hidden = false;
        }
        return;
      }
      if (error) error.hidden = true;

      const params = new URLSearchParams();
      ['from', 'to', 'date', 'time', 'passengers'].forEach((key) => {
        const value = data.get(key);
        if (value) params.set(key, String(value));
      });
      window.location.href = `/booking?${params.toString()}`;
    });
  }

  // Contact form
  const contactForm = document.querySelector('[data-contact-form]');
  if (contactForm) {
    const alertBox = contactForm.querySelector('[data-form-alert]');
    const success = document.querySelector('[data-contact-success]');
    contactForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = contactForm.querySelector('button[type="submit"]');
      const payload = Object.fromEntries(new FormData(contactForm).entries());
      if (button) {
        button.disabled = true;
        button.dataset.label = button.textContent;
        button.textContent = 'Sending...';
      }
      if (alertBox) alertBox.classList.remove('is-visible');

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ? data.error.message : 'Could not send that message.');
        contactForm.hidden = true;
        if (success) {
          success.hidden = false;
          success.classList.add('is-visible');
        }
      } catch (error) {
        if (alertBox) {
          alertBox.textContent = error.message;
          alertBox.classList.add('is-visible');
        }
        if (button) {
          button.disabled = false;
          button.textContent = button.dataset.label || 'Send message';
        }
      }
    });
  }
})();
