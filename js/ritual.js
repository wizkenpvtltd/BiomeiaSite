/* The Pre-Wash Ritual as an accordion.
 *
 * The markup is a plain list of five full cards. This turns it into an
 * accordion: one step open at a time, the rest collapsed to labelled strips.
 * Without JavaScript every card simply stays open, so nothing is lost.
 *
 * Each heading is wrapped in a real <button> (the WAI-ARIA accordion pattern),
 * with aria-expanded and aria-controls. The open step cannot be closed: in the
 * wide layout that would leave five strips and nothing to read.
 */
(function () {
  var list = document.querySelector('.ritual-list');
  if (!list) return;
  var items = Array.prototype.slice.call(list.children);
  if (items.length < 2) return;

  var buttons = [];
  var current = 0;

  items.forEach(function (li, i) {
    var head = li.querySelector('.rc-head');
    var body = li.querySelector('.rc-body');
    var no = li.querySelector('.rc-no');
    var title = li.querySelector('.rc-title');
    if (!head || !body || !no || !title) return;

    // the real control: the heading's own contents, moved into a button
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'rc-toggle';
    btn.id = 'rc-t-' + i;
    btn.setAttribute('aria-controls', 'rc-b-' + i);
    while (head.firstChild) btn.appendChild(head.firstChild);
    var chev = document.createElement('span');
    chev.className = 'rc-chev';
    chev.setAttribute('aria-hidden', 'true');
    btn.appendChild(chev);
    head.appendChild(btn);

    body.id = 'rc-b-' + i;
    body.setAttribute('role', 'region');
    body.setAttribute('aria-labelledby', btn.id);

    // the rotated label shown when this step is collapsed; decorative, because
    // the button already carries the accessible name
    var tab = document.createElement('span');
    tab.className = 'rc-tab';
    tab.setAttribute('aria-hidden', 'true');
    tab.innerHTML = '<span class="rc-no"></span><span class="rc-title"></span>';
    tab.firstChild.textContent = no.textContent;
    tab.lastChild.textContent = title.textContent;
    li.insertBefore(tab, head);

    btn.addEventListener('click', function () { open(i); });
    btn.addEventListener('keydown', function (e) { onKey(e, i); });
    buttons.push(btn);
  });

  function open(i) {
    current = i;
    items.forEach(function (li, k) {
      var on = k === i;
      li.classList.toggle('is-open', on);
      if (buttons[k]) buttons[k].setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  }

  // arrows move between the headings, Home/End jump; Enter and Space are the
  // button's own behaviour
  function onKey(e, i) {
    var n = buttons.length, to = -1;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') to = (i + 1) % n;
    else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') to = (i - 1 + n) % n;
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = n - 1;
    if (to < 0) return;
    e.preventDefault();
    buttons[to].focus();
  }

  list.classList.add('is-acc');
  open(0);
})();
