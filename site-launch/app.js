/* Multi-page Qhantom site. Menu, copy buttons, current-page highlight,
   and the realm-entry zoom. Old preview hashes are handled by a small
   script in <head>. Makes no network calls. */
(function () {
  'use strict';

  var body = document.body;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var menuBtn = document.getElementById('menu-btn');
  var menuPanel = document.getElementById('menu-panel');
  var name = body.dataset.view || 'home';

  var PATH_TO_VIEW = {
    '/': 'home',
    '/qonvergence': 'qonvergence',
    '/realm-runners': 'realm-runners',
    '/realm-runners/qigana': 'qigana',
    '/realm-runners/celestara': 'celestara',
    '/realm-runners/archive': 'archive',
    '/sonics': 'sonics',
    '/fashion': 'shop',
    '/company': 'about',
    '/careers': 'careers'
  };

  function norm(path) {
    if (path.endsWith('/index.html')) path = path.slice(0, -'/index.html'.length);
    if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);
    if (path === '') path = '/';
    return path;
  }

  function viewFromHref(href) {
    try {
      return PATH_TO_VIEW[norm(new URL(href, location.origin).pathname)] || '';
    } catch (err) {
      return '';
    }
  }

  function closeMenu() {
    menuPanel.hidden = true;
    menuBtn.setAttribute('aria-expanded', 'false');
  }

  document.querySelectorAll('[data-nav]').forEach(function (a) {
    var target = viewFromHref(a.getAttribute('href'));
    var inRealmRunners = !a.hasAttribute('data-exact') && target === 'realm-runners' && /^(qigana|celestara|archive|sonics)$/.test(name);
    if (target === name || inRealmRunners) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  });

  closeMenu();

  /* The preview faded the view in on hash changes, after the first load.
     A full page load is that later navigation when it came from this site. */
  if (!reduced.matches && document.referrer) {
    try {
      var ref = new URL(document.referrer);
      if (ref.origin === location.origin && norm(ref.pathname) !== norm(location.pathname)) {
        var view = document.querySelector('.view');
        if (view && view.animate) {
          view.animate(
            [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }],
            { duration: 320, easing: 'ease-out' }
          );
        }
        /* A fragment such as #papers has to keep the browser's scroll. */
        if (!location.hash && view) {
          var h = view.querySelector('h1');
          if (h) h.focus({ preventScroll: true });
        }
      }
    } catch (err) { /* referrer was not a URL */ }
  }

  menuBtn.addEventListener('click', function () {
    var open = menuPanel.hidden;
    menuPanel.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !menuPanel.hidden) { closeMenu(); menuBtn.focus(); }
  });

  /* Realm entry: move through the glass, then the sky takes over.
     With reduced motion the link behaves as a plain link. */
  document.querySelectorAll('[data-realm-link]').forEach(function (a) {
    a.addEventListener('click', function (e) {
      var img = a.querySelector('img');
      if (reduced.matches || !img || !img.animate) return;
      e.preventDefault();
      body.dataset.realm = a.dataset.realmLink;
      body.classList.add('entering');
      var anim = img.animate(
        [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(2.6)', opacity: 0 }],
        { duration: 650, easing: 'cubic-bezier(.5,0,.8,.4)' });
      var done = function () {
        body.classList.remove('entering');
        location.href = a.href;
      };
      anim.onfinish = done;
      anim.oncancel = done;
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
})();
