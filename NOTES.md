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
index.html          — the landing page (hero, stats, science, ritual,
                       applicator, turntable video, signup)
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

- `tube-front.png` / `tube-angle.png` — hero and general use
- `applicator.png` — a close macro of the comb-tip rim. It reads more
  abstract than a straight product shot; if it needs to read more
  clearly as "the applicator" at a glance, re-render a wider framing
  from `CAM_Comb` with `SHOW_CAP = False`.

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
