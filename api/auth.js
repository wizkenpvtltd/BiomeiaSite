// Step 1 of the GitHub OAuth handshake Decap CMS needs. Decap's
// default `github` backend points at Netlify's hosted OAuth proxy
// (api.netlify.com), which only exists for sites actually hosted on
// Netlify -- this site is on Vercel, so admin/config.yml's
// backend.auth_endpoint points here instead. Just redirects the
// browser to GitHub's own authorize screen; the actual token exchange
// happens in api/callback.js once GitHub redirects back.
module.exports = (req, res) => {
  const clientId = process.env.OAUTH_CLIENT_ID;
  if (!clientId) {
    res.status(500).send('Missing OAUTH_CLIENT_ID environment variable.');
    return;
  }

  const proto = req.headers['x-forwarded-proto'] || 'https';
  const redirectUri = `${proto}://${req.headers.host}/api/callback`;
  const scope = 'repo,user';

  const authorizeUrl =
    'https://github.com/login/oauth/authorize' +
    `?client_id=${encodeURIComponent(clientId)}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${encodeURIComponent(scope)}`;

  res.writeHead(302, { Location: authorizeUrl });
  res.end();
};
