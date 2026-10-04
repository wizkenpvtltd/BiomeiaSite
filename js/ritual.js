/* The Pre-Wash Ritual as a deck.
 *
 * Five cards pin in a sticky stage and are positioned by scroll progress. At
 * any moment the current card is whole, earlier cards have collapsed to a
 * number-and-title strip stacked above it, and later cards show only their top
 * edges, fanned out below. Scrolling slides the next card up over the current
 * one, and the current one drops into the strip stack.
 *
 * It is an enhancement: wide screens without reduced motion only. Anywhere else
 * the section stays the plain list of cards (which rise in via reveal.js), and
 * if this file never runs, so does the list.
 */
(function () {
  var track = document.querySelector('.ritual-track');
  if (!track) return;
  var stage = track.querySelector('.ritual-stage');
  var list = stage.querySelector('.ritual-list');
  var cards = Array.prototype.slice.call(list.children);
  var N = cards.length;
  if (N < 2) return;

  var STRIP = 48;        // height of a collapsed card: its number and title
  var PEEK0 = 10;        // gap between the current card and the first card below
  var PEEK_GAP = 12;     // how much of each further card's top edge shows
  var SCALE_STEP = 0.028;// each card further down is a touch narrower: a deck, not a list

  var mq = window.matchMedia('(min-width: 761px) and (prefers-reduced-motion: no-preference)');
  var on = false, H = 0, step = 0, stackTop = 0, queued = false;

  // Resting position of card i when card c is the current one. Cards up to and
  // including c are in their strip slots; the rest hang below the current card.
  function Y(i, c) { return i <= c ? i * STRIP : c * STRIP + H + PEEK0 + (i - c - 1) * PEEK_GAP; }
  function S(i, c) { return i <= c ? 1 : 1 - SCALE_STEP * (i - c); }
  // How much of card i shows when card c is current: all of it once it has
  // been reached, otherwise just a top-edge sliver. Without this the last card,
  // which sits on top of the sliver cards before it, shows its whole body below
  // the current one -- a card, where a glimpse of an edge was wanted.
  function Vis(i, c) { return i <= c ? H : PEEK_GAP; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }

  function lerp(a, b, t) { return a + (b - a) * t; }

  function measure() {
    H = cards[0].offsetHeight;
    var stageH = H + (N - 1) * STRIP + 24;
    stage.style.height = stageH + 'px';
    list.style.height = stageH + 'px';
    // how far you scroll to move from one card to the next
    step = Math.max(360, Math.round(window.innerHeight * 0.5));
    track.style.height = (stageH + (N - 1) * step) + 'px';
    // Centre the pinned deck in the viewport rather than hanging it from the top:
    // the deck is only about half a screen tall, so on a tall window a fixed top
    // offset leaves a large empty band below it for the whole length of the scroll.
    // 96px is the floor so it never slides under the nav.
    stackTop = Math.max(96, Math.round((window.innerHeight - stageH) / 2));
    stage.style.top = stackTop + 'px';
  }

  function render() {
    queued = false;
    if (!on) return;
    var p = (stackTop - track.getBoundingClientRect().top) / step;
    p = Math.min(N - 1, Math.max(0, p));
    var a = Math.min(N - 2, Math.floor(p));      // the card we are leaving
    var f = p - a;
    var e = f * f * (3 - 2 * f);                 // ease the hand-over
    for (var i = 0; i < N; i++) {
      var y = lerp(Y(i, a), Y(i, a + 1), e);
      var s = lerp(S(i, a), S(i, a + 1), e);
      cards[i].style.transform = 'translate3d(0,' + y.toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
      // the card arriving unfurls from an edge to its full height as it rises;
      // the ones still waiting stay slivers
      var v = (i === a + 1)
        ? lerp(PEEK_GAP, H, clamp01(f * 3))
        : lerp(Vis(i, a), Vis(i, a + 1), e);
      // negative insets leave the shadow showing on top and sides; only the
      // bottom is cut
      cards[i].style.clipPath = v >= H - 0.5 ? "" : "inset(-40px -40px " + (H - v).toFixed(1) + "px -40px)";
      cards[i].style.zIndex = String(i + 1);     // later cards slide over earlier ones
    }
    track.setAttribute('data-step', String(Math.round(p) + 1));
  }

  function request() { if (!queued) { queued = true; window.requestAnimationFrame(render); } }

  function enable() {
    if (on) return;
    on = true;
    cards.forEach(function (c) { c.classList.remove('reveal'); c.classList.add('in'); });
    track.classList.add('is-stack');
    measure();
    render();
    window.addEventListener('scroll', request, { passive: true });
    window.addEventListener('resize', onResize);
  }

  function disable() {
    if (!on) return;
    on = false;
    track.classList.remove('is-stack');
    track.style.height = stage.style.height = list.style.height = stage.style.top = '';
    cards.forEach(function (c) { c.style.transform = ''; c.style.zIndex = ''; c.style.clipPath = ''; });
    track.removeAttribute('data-step');
    window.removeEventListener('scroll', request);
    window.removeEventListener('resize', onResize);
  }

  function onResize() { measure(); request(); }

  function evaluate() { if (mq.matches) enable(); else disable(); }

  evaluate();
  if (mq.addEventListener) mq.addEventListener('change', evaluate);
  else if (mq.addListener) mq.addListener(evaluate);
})();
