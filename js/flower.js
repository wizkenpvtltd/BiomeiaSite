/* A few flowers, falling continuously down the page margins as you scroll.
 *
 * Four blossoms, and Bima the mascot, of different sizes and speeds drift down the empty margins beside
 * the text column, on both sides. Each keeps to its own side, so none has to
 * cross any copy, and they fall straight through section changes with no reset.
 * They appear from behind the menu bar and leave off the bottom of the screen.
 *
 * In the last section (the early-access form) the lead flower is timed to arrive
 * at the top just as that section starts. The others drift away, and it comes down
 * the right margin, glides along the row of the submit button and settles in the
 * empty space beside it, then rides with the page like something that has landed
 * there. It rests with a slow nod, and the button gives a soft pulse to say "this
 * is the next thing to do" until the visitor starts typing.
 *
 * Every position is a pure function of scroll offset (no timers), so scrolling
 * back up plays it in reverse and nothing drifts out of step with the page.
 *
 * Hidden when there is no margin wide enough to hold them (narrow windows and
 * phones, where the text runs nearly edge to edge) and when the visitor has
 * asked for reduced motion.
 */
(function () {
  var nav = document.querySelector('.nav-inner');
  if (!nav) return;

  var NAV_H = 76;                 // the fixed menu bar's height
  var MAX = 46, MIN_LANE = 16;    // flower size ceiling; narrowest margin worth using (a phone's is 20px)
  var TAU = Math.PI * 2;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  // side: +1 right margin, -1 left. rate: how fast it falls per pixel of scroll.
  // mul: size relative to the largest. at: where in its cycle it starts, so they are spread out.
  // The first is the lead, the one that lands by the form.
  var specs = [
    { side:  1, rate: 0.70, mul: 1.00, at: 0.00 },
    { side: -1, rate: 0.55, mul: 0.80, at: 0.50 },
    { side:  1, rate: 0.88, mul: 0.62, at: 0.30 },
    { side: -1, rate: 0.66, mul: 0.92, at: 0.82 },
    // Bima, the mascot: falls slowest, rocks instead of spinning, and needs a wider margin
    // than a petal does (below minLane she would only be a smudge)
    { side: -1, rate: 0.48, mul: 1.15, at: 0.62, kind: 'mascot', minLane: 44 }
  ];

  // Five notched petals, a blush gradient, a gold centre. Inline so it costs no request;
  // ids are numbered because several of these share one page.
  function build(i, kind) {
    var el = document.createElement('div');
    el.className = 'falling-flower' + (i === 0 ? ' ff-lead' : '') + (kind === 'mascot' ? ' ff-mascot' : '');
    el.setAttribute('aria-hidden', 'true');
    if (kind === 'mascot') {
      el.innerHTML = '<img src="/assets/images/bima-fall.png" alt="" width="83" height="112" decoding="async">';
      return el;
    }
    el.innerHTML =
      '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
      '<defs><radialGradient id="ffp' + i + '" cx="50%" cy="80%" r="75%">' +
      '<stop offset="0" stop-color="#E9A3B4"/><stop offset="0.55" stop-color="#F3C6D0"/><stop offset="1" stop-color="#FBE6EA"/>' +
      '</radialGradient></defs>' +
      '<g fill="url(#ffp' + i + ')" stroke="#E7A9B8" stroke-width="0.8" stroke-linejoin="round">' +
      '<path id="ffpet' + i + '" d="M50 53 C33 41 28 15 43 7 L50 14 L57 7 C72 15 67 41 50 53 Z"/>' +
      '<use href="#ffpet' + i + '" transform="rotate(72 50 50)"/><use href="#ffpet' + i + '" transform="rotate(144 50 50)"/>' +
      '<use href="#ffpet' + i + '" transform="rotate(216 50 50)"/><use href="#ffpet' + i + '" transform="rotate(288 50 50)"/>' +
      '</g>' +
      '<g fill="#E58AA0"><circle cx="50" cy="40" r="1.6"/><circle cx="59" cy="46" r="1.6"/><circle cx="55" cy="57" r="1.6"/>' +
      '<circle cx="45" cy="57" r="1.6"/><circle cx="41" cy="46" r="1.6"/></g>' +
      '<circle cx="50" cy="50" r="5" fill="#F2C94C"/><circle cx="50" cy="50" r="2.2" fill="#D9A21B"/>' +
      '</svg>';
    return el;
  }

  var flowers = specs.map(function (sp, i) {
    return { el: build(i, sp.kind), idx: i, kind: sp.kind, minLane: sp.minLane || 0, side: sp.side, rate: sp.rate, mul: sp.mul, at: sp.at,
             size: 0, box: 0, phase: 0, span: 1, top: 0 };
  });
  var lead = flowers[0];

  var tops = [], vw = 0, vh = 0, lane = 0, laneLeft = 0, lastA = 0, on = false, queued = false;
  var btn = null, landX = 0, landDocY = 0, landBox = 0;   // the submit button the lead flower lands beside, and its size there
  var landed = false, beckoned = false;

  function mod(n, m) { return ((n % m) + m) % m; }
  function smooth(t) { return t * t * (3 - 2 * t); }
  function clamp01(t) { return Math.min(1, Math.max(0, t)); }

  function measure() {
    var w = document.documentElement.clientWidth, h = window.innerHeight;
    // on phones the address bar showing and hiding changes the height by a few dozen pixels as you
    // scroll; keep the tallest height seen so the flowers do not jump (a rotation resets it)
    vh = (w === vw && vh && Math.abs(h - vh) < 160) ? Math.max(vh, h) : h;
    vw = w;
    var cs = window.getComputedStyle(nav);
    // left edge of the text column: the nav's content box, which every page shares
    laneLeft = nav.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
    lane = laneLeft;                                   // width of the empty margin on each side
    // as big as the margin comfortably allows: full size on wide screens, a small petal in a phone's gutter
    var base = Math.max(0, Math.min(MAX, Math.max(lane * 0.6, lane - 28)));

    var y = window.pageYOffset;
    var nodes = document.querySelectorAll('.hero-band, .page-hero, .section, .signup-section, .article');
    tops = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].getBoundingClientRect().top + y;
      if (!tops.length || t > tops[tops.length - 1] + 40) tops.push(t);   // skip anything stacked on the last
    }
    lastA = tops.length ? Math.max(0, tops[tops.length - 1] - NAV_H) : 0;

    // landing spot: the empty space just right of the submit button, inside the form
    btn = null;
    var sb = document.getElementById('signup-submit'), form = sb && sb.form;
    landBox = 0;
    if (sb && form && sb.offsetWidth) {
      var br = sb.getBoundingClientRect(), fr = form.getBoundingClientRect();
      // the space beside the button is roomier than the margin, so the lead can grow as it lands:
      // up to full size, as big as that space allows (a phone leaves about 60-90px)
      var lb = Math.min(MAX, Math.max(base, fr.right - br.right - 36));
      var lx = Math.min(br.right + 24 + lb / 2, fr.right - lb / 2 - 4);
      if (lb >= 12 && lx - lb / 2 >= br.right + 8) { btn = sb; landX = lx; landDocY = br.top + y + br.height / 2; landBox = lb; }
    }

    flowers.forEach(function (f) {
      f.size = base * f.mul;
      f.box = f === lead ? Math.max(f.size, landBox) : f.size;     // the element is sized for the biggest it gets
      f.el.style.width = f.el.style.height = f.box + 'px';
      f.top = NAV_H - f.size * 0.9;                    // tucked behind the menu bar
      f.span = vh + 10 - f.top;                        // from there to just off the bottom of the screen
    });
    // time the lead so its cycle restarts (at the top, out of sight) exactly as the last section begins
    lead.phase = mod(-lastA * lead.rate, lead.span);
    flowers.forEach(function (f) { if (f !== lead) f.phase = lead.phase + f.at * f.span; });
  }

  // the nudge stops as soon as the visitor engages with the form
  function untouched() {
    var f = btn && btn.form;
    if (!f) return false;
    if (f.contains(document.activeElement) && document.activeElement !== document.body) return false;
    var n = f.elements.name, m = f.elements.email;
    return !((n && n.value) || (m && m.value));
  }

  function setLanded(now) {
    if (landed !== now) { landed = now; lead.el.classList.toggle('landed', now); }
    var want = now && untouched();
    if (beckoned !== want && btn) { beckoned = want; btn.classList.toggle('is-beckoned', want); }
  }

  // x is the flower's centre, y the top of it at its current painted size; the element may be
  // bigger than that (the lead grows as it lands), so it is scaled about its own centre
  function place(f, x, y, rx, ry, rz, opacity, cur) {
    cur = cur || f.size;
    f.el.style.opacity = String(opacity);
    f.el.style.transform = 'translate3d(' + (x - f.box / 2).toFixed(1) + 'px,' + (y + cur / 2 - f.box / 2).toFixed(1) + 'px,0) ' +
      'scale(' + (cur / f.box).toFixed(3) + ') ' +
      'perspective(520px) rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg) rotate(' + rz.toFixed(1) + 'deg)';
  }

  // one flower's ordinary fall: round and round its cycle as the page scrolls
  function renderFree(f, s, visible) {
    var p = mod(s * f.rate + f.phase, f.span) / f.span;             // 0 at the menu bar, 1 off the bottom
    var cx = f.side > 0 ? vw - lane / 2 : lane / 2;
    var room = Math.max(0, lane / 2 - f.size / 2 - 8);
    var x = cx + Math.sin(p * TAU * 2.3 + f.idx) * room;
    var y = f.top + p * f.span;
    var rz = p * 340 + Math.sin(p * TAU * 3) * 22 + f.idx * 70;
    var rx = Math.sin(p * TAU * 2.6 + 1) * 38;
    var ry = Math.sin(p * TAU * 1.7 + f.idx) * 52;
    if (f.kind === 'mascot') {                        // she rocks side to side and turns a little; she does not tumble
      rz = Math.sin(p * TAU * 2.2 + f.idx) * 13;
      rx = 0;
      ry = Math.sin(p * TAU * 1.3) * 16;
    }
    place(f, x, y, rx, ry, rz, 0.95 * visible);
  }

  // the lead flower in the last section: fall down the right margin, then glide along the button's row and settle
  function renderLanding(s, a) {
    var f = lead, size = f.size;
    var V = 2.5;                                         // the descent runs about 2.5x as fast as the scroll
    var y0 = f.top;
    var cy = landDocY - size / 2;                        // flower top when its centre sits on the button row
    var sT = Math.max(a + 60, (cy - y0 + V * a) / (V + 1));   // scroll offset where the descent meets the row
    var u = clamp01((s - a) / (sT - a));
    var h = smooth(clamp01((s - sT) / Math.max(100, vh * 0.15)));  // 0 in the margin, 1 once settled

    var laneX = vw - lane / 2;                           // always the right margin: the button is on the right
    var room = Math.max(0, lane / 2 - size / 2 - 8);
    var sway = Math.sin(u * TAU * 2.3) * room * (1 - u);

    var cur = size + (f.box - size) * h;                 // grows from its margin size to its landing size as it glides in
    var rowY = landDocY - cur / 2 - s;                   // top of the flower when centred on the button row, as it is on screen now
    var e = u * 0.8 + 0.2 * smooth(u);
    var y = y0 + (rowY - y0) * e;
    var x = laneX + sway + (landX - laneX - sway) * h;

    var F = -14 + 360 * Math.round((340 + 14) / 360);    // rest tilted a little, as if leaning on the button
    var rz = u * 340 + Math.sin(u * TAU * 3) * 22 + (F - 340) * h + Math.sin(h * TAU * 2) * 9 * (1 - h);
    var rx = Math.sin(u * TAU * 2.6 + 1) * 38 * (1 - h);
    var ry = Math.sin(u * TAU * 1.7) * 52 * (1 - h);

    place(f, x, y, rx, ry, rz, Math.min(1, u / 0.06) * 0.95, cur);   // no fade-out: it stays where it lands
    setLanded(h >= 0.999 && y > NAV_H - cur && y < vh);
  }

  function render() {
    queued = false;
    if (!on) return;
    if (lane < MIN_LANE || !tops.length) {
      flowers.forEach(function (f) { f.el.style.opacity = '0'; });
      setLanded(false);
      return;
    }
    var s = window.pageYOffset;
    var arrive = clamp01(s / (vh * 0.3));                // none at the very top of the page; they begin as you scroll
    var landing = !!btn && s >= lastA;
    var others = landing ? 1 - clamp01((s - lastA) / (vh * 0.3)) : 1;   // the rest drift away as the lead heads for the form

    flowers.forEach(function (f) {
      if (f.minLane && lane < f.minLane) { f.el.style.opacity = '0'; return; }
      if (f === lead && landing) renderLanding(s, lastA);
      else renderFree(f, s, f === lead ? arrive : arrive * others);
    });
    if (!landing) setLanded(false);
  }

  function request() { if (!queued) { queued = true; window.requestAnimationFrame(render); } }
  function remeasure() { measure(); request(); }

  function enable() {
    if (on) return;
    on = true;
    flowers.forEach(function (f) { document.body.appendChild(f.el); });
    measure(); render();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    document.addEventListener('input', request);
    document.addEventListener('focusin', request);
    document.addEventListener('focusout', request);
    if ('ResizeObserver' in window) { window._ffRO = new ResizeObserver(remeasure); window._ffRO.observe(document.body); }
  }

  function disable() {
    if (!on) return;
    on = false;
    setLanded(false);
    flowers.forEach(function (f) { if (f.el.parentNode) f.el.parentNode.removeChild(f.el); });
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', remeasure);
    window.removeEventListener('load', remeasure);
    document.removeEventListener('input', request);
    document.removeEventListener('focusin', request);
    document.removeEventListener('focusout', request);
    if (window._ffRO) { window._ffRO.disconnect(); window._ffRO = null; }
  }

  function evaluate() { if (still.matches) disable(); else enable(); }
  evaluate();
  if (still.addEventListener) still.addEventListener('change', evaluate);
  else if (still.addListener) still.addListener(evaluate);
})();
