// Admin panel for Dan's site. Talks to the REST API under /api.
(function () {
  var app = document.getElementById('app');

  var S = { content: null, email: '', tab: 'hero', edit: null, dirty: false, saving: false };

  // ---------- tiny DOM helper ----------
  function h(tag, attrs) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v == null || v === false) return;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) return c.forEach(function (x) { add(el, x); });
    el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  function toast(msg) {
    var t = h('div', { class: 'toast', role: 'status', text: msg });
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 2600);
  }

  // ---------- API ----------
  function api(method, path, body, raw) {
    var opts = { method: method, credentials: 'same-origin', headers: { 'x-admin': '1' } };
    if (body !== undefined) {
      if (raw) { opts.body = body; opts.headers['content-type'] = 'application/octet-stream'; }
      else { opts.body = JSON.stringify(body); opts.headers['content-type'] = 'application/json'; }
    }
    return fetch(path, opts).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok) { var e = new Error(d.error || ('HTTP ' + r.status)); e.status = r.status; throw e; }
        return d;
      });
    });
  }

  // ---------- images: resize in the browser, upload full + small ----------
  function resize(file, maxSide, quality) {
    return createImageBitmap(file).then(function (bmp) {
      var scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));
      var w = Math.round(bmp.width * scale), hgt = Math.round(bmp.height * scale);
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = hgt;
      cv.getContext('2d').drawImage(bmp, 0, 0, w, hgt);
      return new Promise(function (res) { cv.toBlob(function (b) { res({ blob: b, w: w, h: hgt }); }, 'image/jpeg', quality); });
    });
  }
  function uploadOne(file) {
    return resize(file, 2400, 0.84).then(function (full) {
      return api('POST', '/api/media?w=' + full.w + '&h=' + full.h, full.blob, true).then(function (d) {
        return resize(file, 900, 0.8).then(function (sm) {
          return api('POST', '/api/media?v=s&id=' + d.id, sm.blob, true);
        }).then(function () { return { url: d.url, w: full.w, h: full.h }; });
      });
    });
  }
  function pickFiles(multiple, cb) {
    var inp = h('input', { type: 'file', accept: 'image/*', multiple: multiple });
    inp.addEventListener('change', function () {
      var files = Array.prototype.slice.call(inp.files || []);
      if (!files.length) return;
      toast('Se încarcă ' + files.length + (files.length === 1 ? ' poză…' : ' poze…'));
      var results = [];
      // One at a time keeps memory low on phones
      files.reduce(function (p, f) {
        return p.then(function () { return uploadOne(f).then(function (r) { results.push(r); }); });
      }, Promise.resolve()).then(function () {
        cb(results); markDirty(); render(); toast('Gata! Nu uita să apeși Salvează.');
      }).catch(function (e) { toast('Eroare la încărcare: ' + e.message); if (results.length) { cb(results); markDirty(); render(); } });
    });
    inp.click();
  }
  // Orientation of uploaded images is remembered for the hero warning badge
  var dims = {};

  // ---------- state helpers ----------
  function markDirty() { S.dirty = true; updateStatus(); }
  function move(arr, i, d) { var j = i + d; if (j < 0 || j >= arr.length) return; var x = arr[i]; arr[i] = arr[j]; arr[j] = x; markDirty(); render(); }
  function removeAt(arr, i, ask) { if (ask && !confirm(ask)) return; arr.splice(i, 1); markDirty(); render(); }
  function uid() { return Math.random().toString(16).slice(2, 14); }
  var small = function (src) { return /^\/media\//.test(src) ? src.replace(/\.jpg$/, '-s.jpg') : src; };

  function save() {
    if (S.saving) return;
    S.saving = true; updateStatus();
    api('PUT', '/api/content', S.content).then(function (d) {
      S.content = d.content; S.dirty = false; S.saving = false; render(); toast('Salvat. Modificările sunt live pe site.');
    }).catch(function (e) {
      S.saving = false; updateStatus();
      if (e.status === 401) { toast('Sesiunea a expirat. Intră din nou.'); return showLogin(); }
      toast('Nu s-a putut salva: ' + e.message);
    });
  }
  window.addEventListener('beforeunload', function (e) { if (S.dirty) { e.preventDefault(); e.returnValue = ''; } });

  // ---------- field builders ----------
  function textField(label, obj, key, opts) {
    opts = opts || {};
    var input = opts.area ? h('textarea', { class: opts.tall ? 'tall' : '' }) : h('input', { type: opts.type || 'text' });
    input.value = obj[key] == null ? '' : obj[key];
    input.addEventListener('input', function () { obj[key] = input.value; markDirty(); });
    return h('label', { class: 'f' }, h('span', null, label, opts.lang ? h('em', { text: opts.lang }) : null), input);
  }
  function bilingual(label, obj, key, opts) {
    obj[key] = obj[key] || { ro: '', en: '' };
    var o = Object.assign({}, opts || {});
    return h('div', { class: 'grid2' },
      textField(label, obj[key], 'ro', Object.assign({}, o, { lang: 'RO' })),
      textField(label, obj[key], 'en', Object.assign({}, o, { lang: 'EN' })));
  }
  // Paragraph lists are edited as one textarea, paragraphs separated by an empty line
  function paragraphs(label, obj, key) {
    obj[key] = obj[key] || { ro: [], en: [] };
    function one(lang) {
      var ta = h('textarea', { class: 'tall' });
      ta.value = (obj[key][lang] || []).join('\n\n');
      ta.addEventListener('input', function () {
        obj[key][lang] = ta.value.split(/\n\s*\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        markDirty();
      });
      return h('label', { class: 'f' }, h('span', null, label, h('em', { text: lang.toUpperCase() })), ta);
    }
    return h('div', null, h('p', { class: 'hint', text: 'Lasă un rând liber între paragrafe.' }), h('div', { class: 'grid2' }, one('ro'), one('en')));
  }

  function imageGrid(list, opts) {
    opts = opts || {};
    var grid = h('div', { class: 'thumbs ' + (opts.shape || '') });
    list.forEach(function (src, i) {
      var d = dims[src], warn = null;
      if (d && opts.expect === 'landscape' && d.h > d.w) warn = 'vertical';
      if (d && opts.expect === 'portrait' && d.w > d.h) warn = 'orizontal';
      grid.appendChild(h('div', { class: 'thumb' },
        h('img', { src: small(src), alt: '', loading: 'lazy' }),
        h('span', { class: 'num', text: String(i + 1) }),
        warn ? h('span', { class: 'warn', title: 'Poza nu are orientarea potrivită', text: '⚠ ' + warn }) : null,
        opts.cover && opts.cover() === src ? h('span', { class: 'cover-badge', text: 'Copertă' }) : null,
        h('div', { class: 'tools' },
          h('button', { class: 'icon-btn', title: 'Mută stânga', 'aria-label': 'Mută stânga', onclick: function () { move(list, i, -1); } }, '←'),
          opts.cover ? h('button', { class: 'icon-btn', title: 'Setează copertă', 'aria-label': 'Setează copertă', onclick: function () { opts.setCover(src); markDirty(); render(); } }, '★') : null,
          h('button', { class: 'icon-btn', title: 'Șterge', 'aria-label': 'Șterge', onclick: function () { removeAt(list, i, 'Ștergi poza?'); } }, '×'),
          h('button', { class: 'icon-btn', title: 'Mută dreapta', 'aria-label': 'Mută dreapta', onclick: function () { move(list, i, 1); } }, '→'))));
    });
    grid.appendChild(h('button', { class: 'add-tile', onclick: function () {
      pickFiles(true, function (res) { res.forEach(function (r) { dims[r.url] = r; list.push(r.url); }); });
    } }, '+ Adaugă poze'));
    return grid;
  }

  // ---------- tabs ----------
  function heroTab() {
    var c = S.content;
    var lines = c.hero.lines;
    var linesBox = h('div');
    function renderLines() {
      linesBox.innerHTML = '';
      lines.ro.forEach(function (l, i) {
        lines.en[i] = lines.en[i] || { title: '', sub: '' };
        linesBox.appendChild(h('div', { class: 'faq-row' },
          h('div', { class: 'grid2' },
            h('div', null, textField('Titlu', l, 'title', { lang: 'RO' }), textField('Subtitlu', l, 'sub', { lang: 'RO' })),
            h('div', null, textField('Titlu', lines.en[i], 'title', { lang: 'EN' }), textField('Subtitlu', lines.en[i], 'sub', { lang: 'EN' }))),
          h('div', { class: 'row-tools' },
            h('button', { class: 'btn btn-sm btn-danger', onclick: function () { if (lines.ro.length < 2) return toast('Păstrează măcar un text.'); lines.ro.splice(i, 1); lines.en.splice(i, 1); markDirty(); render(); } }, 'Șterge'))));
      });
    }
    renderLines();
    return [
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Hero desktop (' + c.hero.desktop.length + ')' })),
        h('p', { class: 'hint', text: 'Poze orizontale (landscape). Apar pe laptop și calculator. Recomandat 20–30.' }),
        imageGrid(c.hero.desktop, { expect: 'landscape' })),
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Hero mobil (' + c.hero.mobile.length + ')' })),
        h('p', { class: 'hint', text: 'Poze verticale (portrait). Apar pe telefon. Recomandat 20–30.' }),
        imageGrid(c.hero.mobile, { expect: 'portrait', shape: 'portrait' })),
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Texte peste poze' }),
          h('button', { class: 'btn btn-sm', onclick: function () { lines.ro.push({ title: '', sub: '' }); lines.en.push({ title: '', sub: '' }); markDirty(); render(); } }, '+ Text nou')),
        h('p', { class: 'hint', text: 'Se rotesc împreună cu pozele.' }),
        linesBox),
    ];
  }

  // One photo slot: click to replace
  function singleImage(label, hint, obj, key, shape) {
    return h('div', { class: 'single' },
      h('div', { class: 'thumbs ' + (shape || '') },
        h('div', { class: 'thumb' },
          h('img', { src: small(obj[key] || ''), alt: '', loading: 'lazy' }),
          h('div', { class: 'tools' },
            h('button', { class: 'btn btn-sm', onclick: function () { pickFiles(false, function (res) { obj[key] = res[0].url; }); } }, 'Schimbă')))),
      h('strong', { text: label }),
      hint ? h('small', { text: hint }) : null);
  }

  function pageTab() {
    var c = S.content;
    var tileNames = { home: 'Acasă', portfolio: 'Portofoliu', blog: 'Blog', faq: 'Întrebări', contact: 'Contact' };
    return [
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Butoanele cu poze' })),
        h('p', { class: 'hint', text: 'Cele 5 butoane de sub hero.' }),
        h('div', { class: 'singles' }, c.tiles.map(function (t) { return singleImage(tileNames[t.key] || t.key, '', t, 'img', 'portrait'); }))),
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Poze din pagină' })),
        h('div', { class: 'singles' },
          singleImage('Despre (lângă text)', 'verticală', c, 'portrait', 'portrait'),
          singleImage('Poza ta', 'pătrată, apare și la Contact', c, 'profile', 'square'),
          singleImage('Banner jos', 'orizontală', c, 'cta_img'))),
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Bandă Instagram (' + c.instagram_imgs.length + ')' })),
        h('p', { class: 'hint', text: 'Pozele mici de jos, cu link spre Instagram. Ideal 6.' }),
        imageGrid(c.instagram_imgs, { shape: 'square' })),
    ];
  }

  function eventsTab() {
    var c = S.content, cats = c.categories.ro;
    if (S.edit != null && c.events[S.edit]) {
      var ev = c.events[S.edit];
      var catSel = h('select', { onchange: function () { ev.cat = catSel.value; markDirty(); } },
        Object.keys(cats).map(function (k) { return h('option', { value: k, selected: ev.cat === k }, cats[k]); }));
      return [
        h('button', { class: 'btn back', onclick: function () { S.edit = null; render(); } }, '← Toate evenimentele'),
        h('div', { class: 'panel' },
          h('div', { class: 'panel-head' }, h('h2', { text: ev.title.ro || 'Eveniment nou' }),
            ev.slug ? h('a', { class: 'btn btn-sm', href: '/portofoliu/' + ev.slug + '/', target: '_blank' }, 'Vezi pe site') : null),
          bilingual('Titlu', ev, 'title'),
          h('div', { class: 'grid2' },
            h('label', { class: 'f' }, h('span', { text: 'Categorie' }), catSel),
            textField('Locație', ev, 'venue')),
          bilingual('Data (ex. Septembrie 2026)', ev, 'date'),
          bilingual('Descriere scurtă', ev, 'intro', { area: true })),
        h('div', { class: 'panel' },
          h('div', { class: 'panel-head' }, h('h2', { text: 'Poze (' + ev.photos.length + ')' })),
          h('p', { class: 'hint', text: 'Apasă ★ ca să alegi coperta din portofoliu.' }),
          imageGrid(ev.photos, { shape: 'square', cover: function () { return ev.cover || ev.photos[0]; }, setCover: function (s) { ev.cover = s; } })),
        h('button', { class: 'btn btn-danger', onclick: function () { removeAt(c.events, S.edit, 'Ștergi tot evenimentul „' + (ev.title.ro || '') + '”?'); S.edit = null; render(); } }, 'Șterge evenimentul'),
      ];
    }
    return h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', { text: 'Evenimente (' + c.events.length + ')' }),
        h('button', { class: 'btn btn-primary btn-sm', onclick: function () {
          c.events.unshift({ id: uid(), slug: '', cat: Object.keys(cats)[0], venue: '', cover: '', photos: [], title: { ro: '', en: '' }, date: { ro: '', en: '' }, intro: { ro: '', en: '' } });
          S.edit = 0; markDirty(); render();
        } }, '+ Eveniment nou')),
      h('p', { class: 'hint', text: 'Fiecare eveniment are pagina lui. Ordinea de aici e ordinea de pe site.' }),
      h('div', { class: 'items' }, c.events.map(function (ev, i) {
        return h('div', { class: 'item' },
          h('img', { src: small(ev.cover || ev.photos[0] || '/assets/img/favicon.svg'), alt: '' }),
          h('div', { class: 'meta' }, h('strong', { text: ev.title.ro || '(fără titlu)' }), h('small', { text: (cats[ev.cat] || '') + ' · ' + ev.photos.length + ' poze' })),
          h('div', { class: 'acts' },
            h('button', { class: 'btn btn-sm', 'aria-label': 'Mută sus', onclick: function () { move(c.events, i, -1); } }, '↑'),
            h('button', { class: 'btn btn-sm', 'aria-label': 'Mută jos', onclick: function () { move(c.events, i, 1); } }, '↓'),
            h('button', { class: 'btn btn-sm', onclick: function () { S.edit = i; render(); window.scrollTo(0, 0); } }, 'Editează')));
      })));
  }

  function blogTab() {
    var c = S.content;
    if (S.edit != null && c.posts[S.edit]) {
      var p = c.posts[S.edit];
      var coverBox = h('div', { class: 'thumbs' },
        p.cover ? h('div', { class: 'thumb' }, h('img', { src: small(p.cover), alt: '' })) : null,
        h('button', { class: 'add-tile', onclick: function () { pickFiles(false, function (r) { if (r[0]) p.cover = r[0].url; }); } }, p.cover ? 'Schimbă coperta' : '+ Adaugă copertă'));
      return [
        h('button', { class: 'btn back', onclick: function () { S.edit = null; render(); } }, '← Toate articolele'),
        h('div', { class: 'panel' },
          h('div', { class: 'panel-head' }, h('h2', { text: p.title.ro || 'Articol nou' }),
            p.slug ? h('a', { class: 'btn btn-sm', href: '/blog/' + p.slug + '/', target: '_blank' }, 'Vezi pe site') : null),
          bilingual('Titlu', p, 'title'),
          textField('Data publicării', p, 'date', { type: 'date' }),
          bilingual('Rezumat (apare în listă)', p, 'excerpt', { area: true }),
          paragraphs('Conținut', p, 'body')),
        h('div', { class: 'panel' }, h('div', { class: 'panel-head' }, h('h2', { text: 'Copertă' })), coverBox),
        h('button', { class: 'btn btn-danger', onclick: function () { removeAt(c.posts, S.edit, 'Ștergi articolul?'); S.edit = null; render(); } }, 'Șterge articolul'),
      ];
    }
    return h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', { text: 'Articole (' + c.posts.length + ')' }),
        h('button', { class: 'btn btn-primary btn-sm', onclick: function () {
          c.posts.unshift({ id: uid(), slug: '', cover: '', date: new Date().toISOString().slice(0, 10), title: { ro: '', en: '' }, excerpt: { ro: '', en: '' }, body: { ro: [], en: [] } });
          S.edit = 0; markDirty(); render();
        } }, '+ Articol nou')),
      h('div', { class: 'items' }, c.posts.map(function (p, i) {
        return h('div', { class: 'item' },
          h('img', { src: small(p.cover || '/assets/img/favicon.svg'), alt: '' }),
          h('div', { class: 'meta' }, h('strong', { text: p.title.ro || '(fără titlu)' }), h('small', { text: p.date })),
          h('div', { class: 'acts' }, h('button', { class: 'btn btn-sm', onclick: function () { S.edit = i; render(); window.scrollTo(0, 0); } }, 'Editează')));
      })));
  }

  function faqTab() {
    var c = S.content;
    return h('div', { class: 'panel' },
      h('div', { class: 'panel-head' }, h('h2', { text: 'Întrebări frecvente (' + c.faq.length + ')' }),
        h('button', { class: 'btn btn-primary btn-sm', onclick: function () { c.faq.push({ q: { ro: '', en: '' }, a: { ro: '', en: '' } }); markDirty(); render(); } }, '+ Întrebare nouă')),
      c.faq.map(function (f, i) {
        return h('div', { class: 'faq-row' },
          bilingual('Întrebare', f, 'q'),
          bilingual('Răspuns', f, 'a', { area: true }),
          h('div', { class: 'row-tools' },
            h('button', { class: 'btn btn-sm', 'aria-label': 'Mută sus', onclick: function () { move(c.faq, i, -1); } }, '↑'),
            h('button', { class: 'btn btn-sm', 'aria-label': 'Mută jos', onclick: function () { move(c.faq, i, 1); } }, '↓'),
            h('button', { class: 'btn btn-sm btn-danger', onclick: function () { removeAt(c.faq, i, 'Ștergi întrebarea?'); } }, 'Șterge')));
      }));
  }

  function contactTab() {
    var k = S.content.contact;
    k.notes = k.notes || { ro: [], en: [] };
    return [
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Date de contact' })),
        h('div', { class: 'grid2' },
          textField('Telefon / WhatsApp', k, 'phone'),
          textField('Email', k, 'email', { type: 'email' })),
        h('div', { class: 'grid2' },
          textField('Link Facebook', k, 'facebook', { type: 'url' }),
          textField('Link Messenger', k, 'messenger', { type: 'url' })),
        h('div', { class: 'grid2' },
          textField('Link Instagram', k, 'instagram', { type: 'url' }),
          textField('Nume Instagram (ex. @dancapitandeplai.ro)', k, 'instagram_handle')),
        bilingual('Zonă', k, 'area'),
        bilingual('Text sub titlu', k, 'intro', { area: true })),
      h('div', { class: 'panel' },
        h('div', { class: 'panel-head' }, h('h2', { text: 'Bine de știut' })),
        paragraphs('Puncte', k, 'notes')),
    ];
  }

  var TABS = [['hero', 'Hero'], ['page', 'Pagina'], ['events', 'Portofoliu'], ['blog', 'Blog'], ['faq', 'Întrebări'], ['contact', 'Contact']];
  var statusEl, saveBtn;
  function updateStatus() {
    if (!statusEl) return;
    statusEl.className = 'status' + (S.dirty ? ' dirty' : '');
    statusEl.textContent = S.saving ? 'Se salvează…' : S.dirty ? 'Modificări nesalvate' : 'Totul e salvat';
    if (saveBtn) saveBtn.disabled = !S.dirty || S.saving;
  }

  function render() {
    var y = window.scrollY;
    statusEl = h('span', { class: 'status' });
    saveBtn = h('button', { class: 'btn btn-primary', onclick: save }, 'Salvează');
    var body = { hero: heroTab, page: pageTab, events: eventsTab, blog: blogTab, faq: faqTab, contact: contactTab }[S.tab]();
    app.innerHTML = '';
    add(app, [
      h('header', { class: 'topbar' },
        h('div', { class: 'topbar-in' },
          h('div', { class: 'brand' }, 'Dan Căpitan de Plai', h('small', { text: 'Admin · ' + S.email })),
          h('a', { class: 'btn btn-sm', href: '/', target: '_blank' }, 'Vezi site-ul'),
          h('button', { class: 'btn btn-sm', onclick: function () {
            if (S.dirty && !confirm('Ai modificări nesalvate. Ieși oricum?')) return;
            api('POST', '/api/auth/logout', {}).finally(function () { S.dirty = false; showLogin(); });
          } }, 'Ieși')),
        h('nav', { class: 'tabs', role: 'tablist' }, TABS.map(function (t) {
          return h('button', { role: 'tab', 'aria-selected': String(S.tab === t[0]), onclick: function () { S.tab = t[0]; S.edit = null; render(); window.scrollTo(0, 0); } }, t[1]);
        }))),
      h('main', null, body),
      h('div', { class: 'savebar' }, statusEl, saveBtn),
    ]);
    updateStatus();
    window.scrollTo(0, y);
  }

  // ---------- login ----------
  function showLogin(msg) {
    var info = h('p', { text: msg || 'Apasă butonul și ești înăuntru.' });
    var btn = h('button', { class: 'btn btn-primary btn-block' }, 'Login');
    btn.addEventListener('click', function () {
      btn.disabled = true;
      api('POST', '/api/auth/login', {}).then(start).catch(function (e) {
        btn.disabled = false;
        info.textContent = 'Ceva n-a mers: ' + e.message;
      });
    });
    app.innerHTML = '';
    add(app, h('div', { class: 'login' }, h('div', { class: 'login-card' },
      h('h1', { text: 'Admin' }), info, btn)));
  }

  function start() {
    history.replaceState(null, '', '/admin/');
    return Promise.all([api('GET', '/api/auth/me'), api('GET', '/api/content')]).then(function (r) {
      S.email = r[0].email; S.content = r[1]; S.dirty = false; render();
    });
  }

  start().catch(function () { showLogin(); });
})();
