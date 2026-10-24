// Header, mobile menu, hero slider, scroll reveal, portfolio filter + lightbox
(function () {
  document.documentElement.classList.remove('no-js');

  // Light / dark theme: initial value set inline in <head>; this handles the toggle
  var root = document.documentElement;
  var themeBtn = document.querySelector('.theme-toggle');
  var setTheme = function (t, save) {
    root.setAttribute('data-theme', t);
    if (themeBtn) themeBtn.setAttribute('aria-pressed', String(t === 'dark'));
    if (save) { try { localStorage.setItem('theme', t); } catch (e) {} }
  };
  setTheme(root.getAttribute('data-theme') || 'light', false);
  if (themeBtn) themeBtn.addEventListener('click', function () {
    setTheme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
  });
  // Follow the device setting until the visitor picks one
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var onChange = function (ev) {
    var saved; try { saved = localStorage.getItem('theme'); } catch (e) {}
    if (!saved) setTheme(ev.matches ? 'dark' : 'light', false);
  };
  mq.addEventListener ? mq.addEventListener('change', onChange) : mq.addListener(onChange);

  // Header turns solid after the hero
  var header = document.querySelector('.site-header');
  var onScroll = function () {
    if (header) header.classList.toggle('is-solid', window.scrollY > 60);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  var toggle = document.querySelector('.menu-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      header.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('is-open');
        header.classList.remove('menu-open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // Hero slider: separate photo sets for landscape screens (desktop) and portrait screens (phones).
  // The first slide is in the HTML; the rest are built here from #hero-data.
  var hero = document.querySelector('[data-hero]');
  var dataEl = document.getElementById('hero-data');
  if (hero && dataEl) {
    var data = JSON.parse(dataEl.textContent);
    var counter = hero.querySelector('.hero-count');
    var portraitMq = window.matchMedia('(orientation: portrait)');
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var slides = [], current = 0, upNext = 1, timer;
    // Auto-play jumps to a random other photo; it is picked one step ahead so it can preload
    var pickNext = function () {
      if (slides.length < 2) return 0;
      var n; do { n = Math.floor(Math.random() * slides.length) } while (n === current);
      return n;
    };
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var esc = function (s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
    var load = function (i) {
      var im = slides[i] && slides[i].querySelector('img[data-src]');
      if (im) {
        if (im.dataset.srcset) { im.srcset = im.dataset.srcset; im.removeAttribute('data-srcset'); }
        im.src = im.dataset.src; im.removeAttribute('data-src');
      }
    };
    var build = function () {
      var portrait = portraitMq.matches && data.mobile.length;
      var set = portrait ? data.mobile : data.desktop;
      // Phones get the 900px variant; wide screens pick between 900px and full via srcset
      var sm = function (u) { return /^\/media\//.test(u) ? u.replace(/\.jpg$/, '-s.jpg') : u; };
      hero.querySelectorAll('.hero-slide').forEach(function (s) { s.remove(); });
      slides = set.map(function (src, i) {
        var line = data.lines[i % data.lines.length];
        var tag = i === 0 ? 'h1' : 'h2';
        var el = document.createElement('div');
        el.className = 'hero-slide' + (i === 0 ? ' is-active' : '');
        el.setAttribute('aria-hidden', i === 0 ? 'false' : 'true');
        var ss = portrait ? '' : ' ' + (i === 0 ? 'srcset' : 'data-srcset') + '="' + esc(sm(src)) + ' 900w, ' + esc(src) + ' 2400w" sizes="100vw"';
        var real = portrait ? sm(src) : src;
        el.innerHTML = '<img ' + (i === 0 ? 'src' : 'data-src') + '="' + esc(real) + '" alt="" decoding="async"' + ss +
          (i === 0 ? '' : ' src="data:image/gif;base64,R0lGODlhAQABAAAAACw="') + '>' +
          '<div class="hero-caption"><' + tag + '>' + esc(line.title) + '</' + tag + '><p>' + esc(line.sub) + '</p></div>';
        hero.insertBefore(el, dataEl);
        return el;
      });
      current = 0;
      if (counter) counter.textContent = '01 / ' + pad(slides.length);
      upNext = pickNext();
      load(upNext);
      load(1);
    };
    var show = function (i) {
      if (slides.length < 2) return;
      var n = (i + slides.length) % slides.length;
      load(n);
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      current = n;
      slides[current].classList.add('is-active');
      slides[current].setAttribute('aria-hidden', 'false');
      if (counter) counter.textContent = pad(current + 1) + ' / ' + pad(slides.length);
      upNext = pickNext();
      load(upNext);
      load((current + 1) % slides.length);
    };
    var start = function () { clearInterval(timer); if (!reduce) timer = setInterval(function () { show(upNext); }, 2000); };
    var prev = hero.querySelector('.hero-prev'), next = hero.querySelector('.hero-next');
    prev && prev.addEventListener('click', function () { show(current - 1); start(); });
    next && next.addEventListener('click', function () { show(current + 1); start(); });
    build();
    start();
    // Rotating the phone or resizing the window swaps to the other set
    var onFlip = function () { build(); start(); };
    portraitMq.addEventListener ? portraitMq.addEventListener('change', onFlip) : portraitMq.addListener(onFlip);
  }

  // Reveal on scroll
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  // Portfolio filter
  var filterBtns = document.querySelectorAll('.filters button');
  var cards = document.querySelectorAll('.events [data-cat]');
  filterBtns.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var cat = btn.dataset.filter;
      filterBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(b === btn)); });
      cards.forEach(function (c) { c.hidden = cat !== 'all' && c.dataset.cat !== cat; });
    });
  });
  var items = Array.prototype.slice.call(document.querySelectorAll('.gallery a'));

  // Lightbox
  var lb = document.querySelector('.lightbox');
  if (lb && items.length) {
    var lbImg = lb.querySelector('img');
    var lbCount = lb.querySelector('.lb-count');
    var visible = [], idx = 0, lastFocus;
    var render = function () {
      var a = visible[idx];
      lbImg.src = a.href;
      lbImg.alt = a.querySelector('img').alt;
      lbCount.textContent = (idx + 1) + ' / ' + visible.length;
    };
    var open = function (a) {
      visible = items.filter(function (it) { return !it.hidden; });
      idx = visible.indexOf(a);
      lastFocus = document.activeElement;
      render();
      lb.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      lb.querySelector('.lb-close').focus();
    };
    var close = function () {
      lb.classList.remove('is-open');
      document.body.style.overflow = '';
      lastFocus && lastFocus.focus();
    };
    var step = function (n) { idx = (idx + n + visible.length) % visible.length; render(); };
    items.forEach(function (a) {
      a.addEventListener('click', function (e) { e.preventDefault(); open(a); });
    });
    lb.querySelector('.lb-close').addEventListener('click', close);
    lb.querySelector('.lb-prev').addEventListener('click', function () { step(-1); });
    lb.querySelector('.lb-next').addEventListener('click', function () { step(1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
    document.addEventListener('keydown', function (e) {
      if (!lb.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    });
    // Swipe on phones
    var x0 = null;
    lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1);
      x0 = null;
    });
  }

  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
})();
