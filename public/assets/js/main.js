// Header, mobile menu, hero slider, scroll reveal, portfolio filter + lightbox
(function () {
  document.documentElement.classList.remove('no-js');

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

  // Hero slider (20-30 shots): counter + arrows, autoplay
  var slides = document.querySelectorAll('.hero-slide');
  var counter = document.querySelector('.hero-count');
  if (slides.length > 1) {
    var current = 0, timer;
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var pad = function (n) { return (n < 10 ? '0' : '') + n; };
    var load = function (i) {
      var im = slides[i].querySelector('img[data-src]');
      if (im) { im.src = im.dataset.src; im.removeAttribute('data-src'); }
    };
    var show = function (i) {
      var nextI = (i + slides.length) % slides.length;
      load(nextI);
      slides[current].classList.remove('is-active');
      slides[current].setAttribute('aria-hidden', 'true');
      current = nextI;
      slides[current].classList.add('is-active');
      slides[current].setAttribute('aria-hidden', 'false');
      if (counter) counter.textContent = pad(current + 1) + ' / ' + pad(slides.length);
      load((current + 1) % slides.length);
    };
    var start = function () { if (!reduce) timer = setInterval(function () { show(current + 1); }, 5000); };
    var restart = function () { clearInterval(timer); start(); };
    var prev = document.querySelector('.hero-prev'), next = document.querySelector('.hero-next');
    prev && prev.addEventListener('click', function () { show(current - 1); restart(); });
    next && next.addEventListener('click', function () { show(current + 1); restart(); });
    window.addEventListener('load', function () { load(1); start(); });
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
