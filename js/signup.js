// Pre-launch signup form -> POST /api/subscribe.
// Same pattern as Avartan's contact form: honeypot field, client-side
// sanity checks, server does the real validation and commit.
(() => {
  const form = document.getElementById('signup-form');
  if (!form) return;
  const note = document.getElementById('signup-note');
  const submitBtn = document.getElementById('signup-submit');
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setNote(text, kind) {
    note.textContent = text;
    note.className = 'form-note' + (kind ? ' ' + kind : '');
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());

    if (!data.name || !data.name.trim()) {
      setNote('Please enter your name.', 'bad');
      return;
    }
    if (!data.email || !EMAIL_RE.test(data.email)) {
      setNote('Please enter a valid email address.', 'bad');
      return;
    }
    if (!form.consent.checked) {
      setNote('Please confirm you would like to hear from us.', 'bad');
      return;
    }

    submitBtn.disabled = true;
    setNote('Submitting…');

    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name.trim().slice(0, 200),
          email: data.email.trim().slice(0, 200),
          market: 'Singapore',
          hp_check: data.hp_check || '', // honeypot
        }),
      });
      const body = await res.json().catch(() => ({}));

      if (res.ok && body.ok) {
        form.reset();
        setNote("You're on the list — we'll be in touch before launch.", 'ok');
        submitBtn.textContent = 'Added';
      } else {
        setNote(body.error || 'Something went wrong. Please try again.', 'bad');
        submitBtn.disabled = false;
      }
    } catch (err) {
      setNote('Network error — please try again.', 'bad');
      submitBtn.disabled = false;
    }
  });
})();
