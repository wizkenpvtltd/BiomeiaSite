# Biomeia Pre-Launch Site — Build Notes

Static site (no framework, no build step), for Biomeia — pre-launch signup
page for the Singapore market. Same stack pattern as the Avartan site:
plain HTML/CSS/JS, Vercel serverless functions under `/api` for form
handling, submissions committed as JSON into `data/` via the GitHub
Contents API rather than a database.

Reference for look and feel: hydropeptide.com — white ground, black type,
Avenir-family geometric sans, square corners, restrained accent colour.
Biomeia's brand indigo (`#333D74`) stands in for HydroPeptide's black-on-
white minimalism as the one accent.

## File map

```
index.html          — the landing page (hero with engineering callouts,
                       problem, science, ritual, applicator, turntable
                       video, signup)
story.html           — founder's-story page, drawn from the brand
                       guidelines' founder narrative (§3)
privacy.html         — PDPA-oriented privacy policy (draft, flagged for
                       legal review before launch)
terms.html           — terms of use (draft, same caveat)
css/base.css          — tokens, reset, nav, buttons, forms, footer
css/sections.css       — hero, statline, logic, ritual, applicator,
                       turntable, signup section layout
css/detail-pages.css   — shared long-form layout for story/privacy/terms
js/nav.js             — glass-on-scroll nav (mirrors Avartan's js/nav.js)
js/reveal.js          — scroll-reveal via IntersectionObserver
js/signup.js          — signup form -> POST /api/subscribe
api/subscribe.js      — validates + commits signups to data/signups/
api/_lib/github-write.js — GitHub Contents API commit helper (same
                       pattern as Avartan's api/_lib/github-write.js)
api/auth.js           — GitHub OAuth step 1 for the CMS (redirect)
api/callback.js       — GitHub OAuth step 2 (token exchange)
admin/index.html      — Decap CMS shell
admin/config.yml      — CMS backend + collections
robots.txt            — allows all, disallows /admin
assets/product/        — Blender renders of the 200 ml tube (transparent
                       PNG, shadow-caught)
assets/video/turntable-white.mp4 — 360° turntable on white, Blender
```

## Product imagery

All three product images and the turntable video are Cycles renders from
`04_Blender_Tube_Build.py` (see the Biomeia_Label_Templates project),
built to the tube geometry solved from the 200 ml declared fill — not
stock photography. Transparent background with `is_shadow_catcher` on
the floor, so the tube drops onto the page without a studio backdrop
fighting the white ground.

- `tube-front.png` — straight-on, still a transparent PNG.
- `tube-angle.png` — the hero three-quarter. Re-rendered onto **white**
  (`scratchpad/hero_white.py`), not transparent: the shadow-catcher floor
  carried its soft shadow to the frame edge, which showed on the page as a
  faint grey rectangle behind the tube. Same Is Camera Ray world as the
  turntable. Its framing is load-bearing — the hero callout SVG anchors
  leader lines to features by coordinate, so re-render with the same
  camera, the same 38 degree spin and the same 1400x1750, or the leaders
  will point at nothing.
- `applicator.png` — the applicator head, re-framed wide
  (`scratchpad/applicator_wide.py`) from a 70 mm lens at f/5.6 so the whole
  ring of teeth plus the lower tube body read at a glance. The first pass
  was a tight macro that looked like abstract texture.

## Signups

Same operational pattern as Avartan: `POST /api/subscribe` validates
(name, valid email, honeypot check) and commits each submission as its
own timestamped JSON file into `data/signups/` via a GitHub commit — no
database, no email service. Requires a `GITHUB_TOKEN` env var (repo-
scoped PAT) set in the Vercel project.

**This is a stopgap, matching what Avartan already runs — not a mailing
list.** At launch, export `data/signups/*.json` and import into whatever
sends the actual launch email (Mailchimp, Klaviyo, etc.), or wire
`api/subscribe.js` directly to one of those instead.

## Content status — what's real vs. placeholder

- Product copy, ritual steps, ingredients messaging, and the founder
  story are drawn directly from `Biomeia_Brand_Strategy_Guidelines_2.pdf`.
- Contact email (`hello@biomeia.com`) and Instagram handle
  (`@biomeia.lab`) are placeholders from the guidelines' press note —
  confirm these are live before pointing traffic at the site.
- Privacy Policy and Terms are working drafts scoped to the pre-launch
  signup flow only. Both are flagged in-page as needing review by
  Singapore-qualified counsel before the public launch (PDPA compliance,
  cross-border data handling, and — once checkout exists — Legal
  Metrology / advertising-standards language).
- No launch date is stated anywhere on the site, per instruction — the
  copy says "launching soon" throughout.

## Deploying

**Live:** https://biomeia-website.vercel.app
**Vercel project:** `wiz-ken/biomeia-website`, linked to this GitHub repo.

Unlike Avartan, this project *is* Git-connected, so pushing to `main`
triggers a deploy automatically. `vercel --prod` from this folder still
works for an out-of-band deploy.

`GITHUB_TOKEN` is already set as a Sensitive env var in Production (a
repo-scoped PAT with contents:write). It is encrypted and cannot be read
back out — to rotate it, generate a new PAT and `vercel env rm` /
`vercel env add` it.

## Blender render gotchas (5.x)

The product renders come from `04_Blender_Tube_Build.py`. Several things
bit hard on Blender 5.2 and are worth knowing before re-rendering:

- `image_settings.media_type` must be set to `VIDEO` **before**
  `file_format = "FFMPEG"` — the format enum is filtered by media type,
  so FFMPEG is not in the list until then.
- VSE colour strips render black in background mode, and the compositor
  moved from `scene.node_tree` to `scene.compositing_node_group` with no
  `CompositorNodeComposite`. Compositing transparent frames onto white
  headless is not worth the fight — render the white backdrop in 3D.
- A plain white world floods the scene with ambient and washes the indigo
  out to periwinkle. Gate it on a Light Path `Is Camera Ray` so the
  backdrop is white to camera only.
- The floor is set `visible_camera = False` so it lights and shadows the
  product without rendering a grey horizon band across the frame.

## The hero callouts

The hero product is drawn *inside* an SVG (`.hero-callouts`) rather than as
an `<img>` behind an overlay. That is deliberate: the balloons, leader lines
and the features they point at then share one coordinate space and stay
registered at every viewport width, where an absolutely-positioned overlay
drifts as soon as the container aspect changes.

Anchor coordinates are in the SVG's 560x470 user space, with the render
placed at `x=200 y=12 w=340 h=425`. **They are tied to this exact render.**
Changing the camera, the 38 degree spin, or the 1400x1750 output in
`hero_white.py` moves the features out from under the leader lines.

Below 900px the labels would scale past readable, so the SVG is swapped for
a plain `<img class="hero-photo">` of the same file (no extra request).

The four specs live in one place: `.spec-list` inside `.hero-media`,
shown only below 900px. Above that the callouts on the product already say
all four, so the band that used to repeat them under the hero is gone — the
statline section carries just the J-Beauty positioning line. The hero copy
carries balloon numbers matching the callouts, same 01-04 order.

The J-Beauty line under the hero is centred in the white gap by tying its
`padding-top` to `var(--section)`: the section below already supplies that
much air, the hero above supplies only its 24px bottom padding, so the
statline makes up the difference and the line sits mid-gap at any width.
Do not swap that calc for a fixed clamp — it would drift out of centre as
`--section` scales.

The hero itself sits on the same page grid as `.nav-inner` and `.wrap`
(`max-width: var(--page)` plus gutter). It used to carry the gutter alone,
which left the BIOMEIA wordmark and the "Launching in Singapore" eyebrow on
different left edges. `.hero h1` is scoped a size smaller than the global
`h1` because the narrower copy column broke the headline to three lines at
the global 76px cap.

## The admin (/admin)

Decap CMS, same setup as the Avartan site: `admin/index.html` loads Decap
from unpkg and reads `admin/config.yml`.

**One collection: Pre-Launch Signups**, pointed at `data/signups` with
`create: false`. Entries are written by `api/subscribe.js`, never by hand,
so the "New" button is hidden. Delete stays enabled — that is what honours
a PDPA removal request without going into the repo, and it clears test and
spam entries. `data/signups/.gitkeep` exists because Decap lists the folder
through the GitHub API, which 404s on a folder that is not there.

There is **no content collection**. Unlike Avartan, this site's copy is
inline in the HTML rather than rendered from `data/*.json` by a build
script, and Decap cannot edit arbitrary markup. Making the page copy
editable would mean extracting it into JSON and adding a build step — a
real piece of work, not a config change.

### Auth — needs a GitHub OAuth App

Decap's github backend defaults to Netlify's hosted OAuth proxy, which only
exists for Netlify-hosted sites. This site is on Vercel, so `config.yml`
points `auth_endpoint` at `api/auth` and the handshake runs through
`api/auth.js` (redirect to GitHub) and `api/callback.js` (server-side token
exchange, then postMessage back to the CMS tab). The client secret never
reaches the browser, which is the whole reason the proxy exists.

**`/admin` will show "Login with GitHub" but cannot complete the login
until a GitHub OAuth App exists and its credentials are set in Vercel:**

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
   - Homepage URL: `https://biomeia-website.vercel.app`
   - Authorization callback URL:
     `https://biomeia-website.vercel.app/api/callback`
2. Set `OAUTH_CLIENT_ID` and `OAUTH_CLIENT_SECRET` in the Vercel project
   (Production, Sensitive), then redeploy.

Access is whoever has write access to `wizkenpvtltd/BiomeiaSite` — the CMS
acts as the signed-in GitHub user, so there is no separate password to
manage or leak. Deleting a signup in the CMS is a real commit to `main`.

### If the CMS login fails

`api/auth.js` and `api/callback.js` both `.trim()` the credentials, because
a value pasted into the Vercel dashboard routinely carries a trailing
newline and GitHub reports that as **incorrect_client_credentials** — a
message that blames the credentials rather than the whitespace. That cost a
round of pointless secret rotation during setup. Do not remove the trims.

Probe the handshake without logging in:

    curl -s https://biomeia-website.vercel.app/api/callback?code=0123456789abcdef0123

- `The code passed is incorrect or expired` — **credentials are good.** That
  is just the fake code being rejected, which is the expected result.
- `The client_id and/or client_secret passed are incorrect` — the ID/secret
  pair is wrong, or one of them has stray whitespace.
- `Missing OAUTH_CLIENT_ID / OAUTH_CLIENT_SECRET` — not set on the
  deployment. Note that env vars only reach builds made *after* they are
  set, so a change needs a redeploy.

Generating a new client secret on the GitHub OAuth App page immediately
invalidates the previous one, so anything already sitting in Vercel stops
working the moment you click that button.

## Page copy voice

**story.html is written in the founder's first person throughout.** It used
to alternate between third-person brand narration and first-person pull
quotes, and that switching was most of what made it read like a press
release. The facts are unchanged — all of them come from §3 of
`Biomeia_Brand_Strategy_Guidelines_2.pdf`; nothing was invented to make it
flow. Attribution now sits once at the end as a `.signature` sign-off
rather than as a `<cite>` on every quote, and the blockquotes are pull
quotes lifted from the surrounding prose.

**The problem band (#problem)** sits between the J-Beauty line and #logic,
and is deliberately experiential — the frustration the reader has lived —
because #logic already carries the biology and the myth-vs-fact pairs in
`.bridge-list`. Repeating the argument in both would just make the reader
hear it twice. It reads: problem, then explanation, then ritual.

Note the coupling: #problem is on `--bone`, and the J-Beauty line above it
is centred in a *white* gap. `.statline` therefore owns its own
`padding-bottom: var(--section)` — it used to be `0`, relying on the next
section's top padding for that space, which stopped working the moment the
next section stopped being white. If a section is ever inserted between
them, check the line is still centred and still sitting on white.
