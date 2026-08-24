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
                       science, ritual, applicator, turntable video,
                       signup)
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
a plain `<img class="hero-photo">` of the same file (no extra request), and
the `.spec-list` -- which lives inside `.hero-media`, not in a band of its
own -- appears directly beneath it carrying the same four details in the
same 01-04 order, each with a balloon number matching the desktop callout.
It is hidden above 900px, where the callouts already say all four things.
