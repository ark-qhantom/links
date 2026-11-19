/* Qhantom console preview: hash router and realm entry. Makes no network calls. */
(function () {
  'use strict';

  var views = {};
  document.querySelectorAll('.view').forEach(function (v) { views[v.dataset.view] = v; });
  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var menuBtn = document.getElementById('menu-btn');
  var menuPanel = document.getElementById('menu-panel');
  var first = true;

  function current() {
    var name = (location.hash || '').replace(/^#/, '');
    return views[name] ? name : 'home';
  }

  function closeMenu() {
    menuPanel.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  function show() {
    var name = current();
    var view = views[name];
    Object.keys(views).forEach(function (k) { views[k].hidden = k !== name; });
    if (view.dataset.realm) body.dataset.realm = view.dataset.realm;
    else delete body.dataset.realm;
    body.dataset.view = name;

    document.querySelectorAll('[data-nav]').forEach(function (a) {
      var target = a.getAttribute('href').slice(1);
      var inRealmRunners = !a.hasAttribute('data-exact') && target === 'realm-runners' && /^(qigana|celestara|archive|sonics)$/.test(name);
      if (target === name || inRealmRunners) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });

    closeMenu();
    if (!first) {
      window.scrollTo(0, 0);
      var h = view.querySelector('h1');
      if (h) h.focus({ preventScroll: true });
      if (!reduced.matches && view.animate) {
        view.animate([{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
          { duration: 320, easing: 'ease-out' });
      }
    }
    first = false;
  }

  window.addEventListener('hashchange', show);
  show();

  /* menu */
  menuBtn.addEventListener('click', function () {
    var open = menuPanel.hidden;
    menuPanel.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menuPanel.hidden) { closeMenu(); menuBtn.focus(); }
  });

  /* realm entry: move through the glass, then the sky takes over.
     With reduced motion the link behaves as a plain link. */
  document.querySelectorAll('[data-realm-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var img = a.querySelector('img');
      if (reduced.matches || !img || !img.animate) return;
      e.preventDefault();
      var realm = a.dataset.realmLink;
      body.dataset.realm = realm;               // sky starts cross-fading now
      body.classList.add('entering');
      var anim = img.animate(
        [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(2.6)', opacity: 0 }],
        { duration: 650, easing: 'cubic-bezier(.5,0,.8,.4)' });
      var done = function () { body.classList.remove('entering'); location.hash = realm; };
      anim.onfinish = done; anim.oncancel = done;
    });
  });

  /* hero stars: seeded so the sky is the same on every load */
  var stars = document.getElementById('stars');
  if (stars) {
    var seed = 7, ns = 'http://www.w3.org/2000/svg';
    var rnd = function () { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (var i = 0; i < 90; i++) {
      var r = document.createElementNS(ns, 'rect');
      var s = rnd() < .15 ? 3 : 2;
      r.setAttribute('x', Math.round(rnd() * 1600));
      r.setAttribute('y', Math.round(rnd() * 420));
      r.setAttribute('width', s); r.setAttribute('height', s);
      r.setAttribute('opacity', (0.25 + rnd() * 0.6).toFixed(2));
      stars.appendChild(r);
    }
  }
  /* on narrow screens frame the base itself */
  var scene = document.getElementById('base-scene');
  var narrow = window.matchMedia('(max-width: 760px)');
  function frame() {
    if (scene) scene.setAttribute('viewBox', narrow.matches ? '520 290 860 430' : '0 0 1600 900');
  }
  frame();
  if (narrow.addEventListener) narrow.addEventListener('change', frame);

  /* copy buttons */
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      var text = b.dataset.copy;
      var ok = function () { b.textContent = 'Copied'; setTimeout(function () { b.textContent = 'Copy'; }, 1600); };
      var fallback = function () {
        var addr = b.parentNode.querySelector('.addr');
        if (!addr) return;
        var range = document.createRange(); range.selectNodeContents(addr);
        var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
        b.textContent = 'Selected';
      };
      try { navigator.clipboard.writeText(text).then(ok, fallback); } catch (err) { fallback(); }
    });
  });

  /* review notes toggle */
  var notesBtn = document.getElementById('notes-btn');
  if (notesBtn) {
    notesBtn.addEventListener('click', function () {
      var hide = !body.classList.contains('no-notes');
      body.classList.toggle('no-notes', hide);
      notesBtn.setAttribute('aria-pressed', String(!hide));
      notesBtn.textContent = hide ? 'Show review notes' : 'Hide review notes';
    });
  }
})();
