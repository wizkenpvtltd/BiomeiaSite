/* One flower, falling down the page as you scroll.
 *
 * It is released from behind the menu bar at the top of each section and drifts
 * down the margin beside the text column, reaching the bottom of the screen just
 * as the next section arrives; there it fades and the next flower is released.
 * Only one is ever on screen, and it stays in the empty margin, so it cannot
 * cross any copy.
 *
 * Position is a pure function of scroll offset (no timers), so scrolling back up
 * plays it in reverse and it never drifts out of step with the page.
 *
 * Hidden when there is no margin wide enough to hold it (narrow windows and
 * phones, where the text runs nearly edge to edge) and when the visitor has
 * asked for reduced motion.
 */
(function () {
  var nav = document.querySelector('.nav-inner');
  if (!nav) return;

  var NAV_H = 76;                 // the fixed menu bar's height
  var MAX = 46, MIN_LANE = 60;    // flower size ceiling; narrowest margin worth using
  var TAU = Math.PI * 2;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  var NS = 'http://www.w3.org/2000/svg';

  // Five notched petals, a blush gradient, a gold centre. Inline so it costs no request.
  var el = document.createElement('div');
  el.className = 'falling-flower';
  el.setAttribute('aria-hidden', 'true');
  el.innerHTML =
    '<svg viewBox="0 0 100 100" width="100%" height="100%">' +
    '<defs><radialGradient id="ffp" cx="50%" cy="80%" r="75%">' +
    '<stop offset="0" stop-color="#E9A3B4"/><stop offset="0.55" stop-color="#F3C6D0"/><stop offset="1" stop-color="#FBE6EA"/>' +
    '</radialGradient></defs>' +
    '<g id="ffg" fill="url(#ffp)" stroke="#E7A9B8" stroke-width="0.8" stroke-linejoin="round">' +
    '<path id="ffpet" d="M50 53 C33 41 28 15 43 7 L50 14 L57 7 C72 15 67 41 50 53 Z"/>' +
    '<use href="#ffpet" transform="rotate(72 50 50)"/><use href="#ffpet" transform="rotate(144 50 50)"/>' +
    '<use href="#ffpet" transform="rotate(216 50 50)"/><use href="#ffpet" transform="rotate(288 50 50)"/>' +
    '</g>' +
    '<g fill="#E58AA0"><circle cx="50" cy="40" r="1.6"/><circle cx="59" cy="46" r="1.6"/><circle cx="55" cy="57" r="1.6"/>' +
    '<circle cx="45" cy="57" r="1.6"/><circle cx="41" cy="46" r="1.6"/></g>' +
    '<circle cx="50" cy="50" r="5" fill="#F2C94C"/><circle cx="50" cy="50" r="2.2" fill="#D9A21B"/>' +
    '</svg>';

  var tops = [], lastEnd = 0, vw = 0, vh = 0, lane = 0, laneLeft = 0, size = 0, on = false, queued = false;

  function measure() {
    vw = document.documentElement.clientWidth;
    vh = window.innerHeight;
    var cs = window.getComputedStyle(nav);
    // left edge of the text column: the nav's content box, which every page shares
    laneLeft = nav.getBoundingClientRect().left + parseFloat(cs.paddingLeft);
    lane = laneLeft;                                   // width of the empty margin on each side
    size = Math.max(0, Math.min(MAX, lane - 28));
    el.style.width = el.style.height = size + 'px';

    var y = window.pageYOffset;
    var nodes = document.querySelectorAll('.hero-band, .page-hero, .section, .signup-section, .article');
    tops = [];
    for (var i = 0; i < nodes.length; i++) {
      var t = nodes[i].getBoundingClientRect().top + y;
      if (!tops.length || t > tops[tops.length - 1] + 40) tops.push(t);   // skip anything stacked on the last
    }
    lastEnd = Math.max(tops.length ? tops[tops.length - 1] : 0, document.documentElement.scrollHeight - vh);
  }

  function smooth(t) { return t * t * (3 - 2 * t); }

  function render() {
    queued = false;
    if (!on) return;
    if (lane < MIN_LANE || !tops.length) { el.style.opacity = '0'; return; }

    var s = window.pageYOffset;
    // which section's fall are we in? the last one whose release point has passed
    var k = 0;
    for (var i = 0; i < tops.length; i++) { if (s >= Math.max(0, tops[i] - NAV_H)) k = i; }
    var a = Math.max(0, tops[k] - NAV_H);
    var b = k + 1 < tops.length ? Math.max(0, tops[k + 1] - NAV_H) : lastEnd;
    var u = b > a ? Math.min(1, Math.max(0, (s - a) / (b - a))) : 1;

    // alternate sides so it does not hug one edge of the page
    var left = k % 2 === 0;
    var cx = left ? lane / 2 : vw - lane / 2;
    var room = Math.max(0, lane / 2 - size / 2 - 8);
    var sway = Math.sin(u * TAU * 2.3 + k) * room;

    var y0 = NAV_H - size * 0.9;                       // starts tucked behind the menu bar
    var y1 = vh - size - 24;                           // lands near the bottom of the screen
    var y = y0 + (y1 - y0) * (u * 0.82 + 0.18 * smooth(u));

    var rz = u * 340 + Math.sin(u * TAU * 3) * 22 + k * 40;
    var rx = Math.sin(u * TAU * 2.6 + 1) * 38;
    var ry = Math.sin(u * TAU * 1.7) * 52;

    // fade in as it clears the bar, fade out as it settles
    var fin = Math.min(1, u / 0.06), fout = Math.min(1, (1 - u) / 0.1);
    el.style.opacity = String(Math.max(0, Math.min(fin, fout)) * 0.95);
    el.style.transform = 'translate3d(' + (cx + sway - size / 2).toFixed(1) + 'px,' + y.toFixed(1) + 'px,0) ' +
      'perspective(520px) rotateX(' + rx.toFixed(1) + 'deg) rotateY(' + ry.toFixed(1) + 'deg) rotate(' + rz.toFixed(1) + 'deg)';
    el.setAttribute('data-section', String(k));
  }

  function request() { if (!queued) { queued = true; window.requestAnimationFrame(render); } }
  function remeasure() { measure(); request(); }

  function enable() {
    if (on) return;
    on = true;
    document.body.appendChild(el);
    measure(); render();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', remeasure);
    window.addEventListener('load', remeasure);
    if ('ResizeObserver' in window) { window._ffRO = new ResizeObserver(remeasure); window._ffRO.observe(document.body); }
  }

  function disable() {
    if (!on) return;
    on = false;
    if (el.parentNode) el.parentNode.removeChild(el);
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', remeasure);
    window.removeEventListener('load', remeasure);
    if (window._ffRO) { window._ffRO.disconnect(); window._ffRO = null; }
  }

  function evaluate() { if (still.matches) disable(); else enable(); }
  evaluate();
  if (still.addEventListener) still.addEventListener('change', evaluate);
  else if (still.addListener) still.addListener(evaluate);
})();
