// Commits a new JSON file into a data folder via the GitHub Contents
// API, using a repo-scoped personal access token (GITHUB_TOKEN).
// Same pattern as the Avartan site: submissions are triggered
// anonymously by public visitors, so there's no user to run an OAuth
// handshake for. Each submission lands as its own file so concurrent
// submissions never race/overwrite each other, and each shows up as a
// normal commit to main.
const REPO = process.env.SIGNUPS_REPO || 'wizkenpvtltd/BiomeiaSite';
const BRANCH = process.env.SIGNUPS_BRANCH || 'main';

function slugify(input) {
  return (
    String(input || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'anon'
  );
}

async function commitJsonFile(folder, data) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error('Missing GITHUB_TOKEN environment variable.');
  }

  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${slugify(data.email || data.name)}.json`;
  const filePath = `${folder}/${filename}`;
  const content = Buffer.from(JSON.stringify(data, null, 2), 'utf8').toString('base64');

  const res = await fetch(`https://api.github.com/repos/${REPO}/contents/${filePath}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: `New signup: ${filePath}`,
      content,
      branch: BRANCH,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GitHub commit failed (${res.status}): ${body}`);
  }
}

module.exports = { commitJsonFile };
