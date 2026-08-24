// Handles the pre-launch signup form (index.html #signup-form).
// Commits each submission into data/signups/ as its own JSON file.
const { commitJsonFile } = require('./_lib/github-write');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, error: 'Method not allowed.' });
    return;
  }

  const { name, email, market, company } = req.body || {};

  // Honeypot: real visitors never fill this hidden field. Pretend
  // success so bots don't learn to probe further.
  if (company) {
    res.status(200).json({ ok: true });
    return;
  }

  if (!name || !String(name).trim()) {
    res.status(400).json({ ok: false, error: 'A name is required.' });
    return;
  }
  if (!email || !EMAIL_RE.test(email)) {
    res.status(400).json({ ok: false, error: 'A valid email is required.' });
    return;
  }

  try {
    await commitJsonFile('data/signups', {
      name: String(name).trim().slice(0, 200),
      email: String(email).trim().slice(0, 200),
      market: String(market || 'Singapore').trim().slice(0, 100),
      submittedAt: new Date().toISOString(),
    });
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(502).json({ ok: false, error: 'Could not save your submission. Please try again.' });
  }
};
