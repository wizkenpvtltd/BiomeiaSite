// Step 2 of the GitHub OAuth handshake: GitHub redirects here with a
// one-time `code` after the user approves. Exchanges it server-side
// for an access token (this is why a proxy is needed at all -- the
// client secret can never be exposed to the browser), then hands the
// token back to the Decap CMS tab via the postMessage handshake it
// expects, using the origin it opened the popup from.
module.exports = async (req, res) => {
  const { code, error, error_description } = req.query;

  if (error) {
    res.status(400).send(`GitHub OAuth error: ${error_description || error}`);
    return;
  }
  if (!code) {
    res.status(400).send('Missing authorization code from GitHub.');
    return;
  }

  // See the note in auth.js: trailing whitespace on a pasted secret comes
  // back from GitHub as incorrect_client_credentials, which sends you
  // hunting for the wrong bug.
  const clientId = (process.env.OAUTH_CLIENT_ID || '').trim();
  const clientSecret = (process.env.OAUTH_CLIENT_SECRET || '').trim();
  if (!clientId || !clientSecret) {
    res.status(500).send('Missing OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET environment variables.');
    return;
  }

  let tokenData;
  try {
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
    });
    tokenData = await tokenRes.json();
  } catch (e) {
    res.status(502).send('Failed to reach GitHub to exchange the authorization code.');
    return;
  }

  if (tokenData.error) {
    res.status(400).send(`GitHub token exchange failed: ${tokenData.error_description || tokenData.error}`);
    return;
  }

  const payload = JSON.stringify({ token: tokenData.access_token, provider: 'github' });

  res.setHeader('Content-Type', 'text/html');
  res.send(`<!DOCTYPE html>
<html><body>
<script>
  (function () {
    function receiveMessage(message) {
      window.opener.postMessage(
        'authorization:github:success:${payload.replace(/</g, '\\u003c')}',
        message.origin
      );
      window.removeEventListener('message', receiveMessage, false);
    }
    window.addEventListener('message', receiveMessage, false);
    window.opener.postMessage('authorizing:github', '*');
  })();
</script>
</body></html>`);
};
