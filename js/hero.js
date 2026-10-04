/* Hero colourway carousel.
 *
 * The video has no autoplay attribute on purpose. Playback starts here only
 * when the visitor has not asked for reduced motion, so a system-level
 * "minimise animation" setting leaves the poster frame standing instead of
 * looping a 13-second slide behind the headline. Without JavaScript the poster
 * shows and nothing moves, which is a fine floor.
 *
 * It also pauses while the hero is off screen -- there is no reason to decode
 * frames for a video nobody is looking at.
 */
(function () {
  var video = document.querySelector('.hero-video');
  if (!video) return;

  var still = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (still.matches) return;

  function play() {
    var p = video.play();
    // Browsers reject autoplay in some states; the poster is the fallback and
    // a rejected promise here is not an error worth surfacing.
    if (p && typeof p.catch === 'function') p.catch(function () {});
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) play(); else video.pause();
      });
    }, { threshold: 0.1 }).observe(video);
  } else {
    play();
  }
})();
