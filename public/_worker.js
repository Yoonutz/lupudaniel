// src/worker/render.js
var SITE = {
  name: "Dan C\u0103pitan de Plai",
  tagline: { ro: "Fotograf de nunt\u0103 \xB7 Bra\u0219ov", en: "Wedding photographer \xB7 Bra\u0219ov" },
  url: "https://dancapitandeplai.pages.dev"
};
var ASSET_V = "4";
var ROUTES = {
  ro: { home: "/", portfolio: "/portofoliu/", blog: "/blog/", faq: "/intrebari-frecvente/", contact: "/contact/" },
  en: { home: "/en/", portfolio: "/en/portfolio/", blog: "/en/blog/", faq: "/en/faq/", contact: "/en/contact/" }
};
var NAV = {
  ro: [["home", "Acas\u0103"], ["portfolio", "Portofoliu"], ["blog", "Blog"], ["faq", "\xCEntreb\u0103ri"], ["contact", "Contact"]],
  en: [["home", "Home"], ["portfolio", "Portfolio"], ["blog", "Blog"], ["faq", "FAQ"], ["contact", "Contact"]]
};
var UI = {
  ro: {
    book: "Programeaz\u0103 o discu\u021Bie",
    wa_msg: "Bun\u0103, Dan! Am v\u0103zut site-ul \u0219i a\u0219 vrea s\u0103 vorbim despre o \u0219edin\u021B\u0103 foto.",
    scroll: "Deruleaz\u0103",
    view_work: "Vezi portofoliul",
    all: "Toate",
    photos: "fotografii",
    back_portfolio: "\xCEnapoi la portofoliu",
    read_more: "Cite\u0219te",
    back_blog: "\xCEnapoi la blog",
    next_event: "Urm\u0103torul eveniment",
    rights: "Toate drepturile rezervate.",
    top: "Sus",
    menu: "Meniu",
    close: "\xCEnchide",
    prev: "Anterioara",
    next: "Urm\u0103toarea",
    switch: "EN",
    switch_label: "English version",
    theme: "Schimb\u0103 tema (luminoas\u0103 / \xEEntunecat\u0103)"
  },
  en: {
    book: "Book a chat",
    wa_msg: "Hi Dan! I saw your website and I'd like to talk about a photo session.",
    scroll: "Scroll",
    view_work: "View portfolio",
    all: "All",
    photos: "photos",
    back_portfolio: "Back to portfolio",
    read_more: "Read",
    back_blog: "Back to blog",
    next_event: "Next event",
    rights: "All rights reserved.",
    top: "Top",
    menu: "Menu",
    close: "Close",
    prev: "Previous",
    next: "Next",
    switch: "RO",
    switch_label: "Versiunea \xEEn rom\xE2n\u0103",
    theme: "Switch theme (light / dark)"
  }
};
var MONTHS = {
  ro: ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};
var OTHER = { ro: "en", en: "ro" };
var ICON = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.3z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  sun: '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
var THEME_JS = "<script>(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();<\/script>";
var e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
var t = (o, lang) => o && typeof o === "object" ? o[lang] ?? o.ro ?? "" : o ?? "";
var r = (lang, key) => ROUTES[lang][key];
var eventUrl = (lang, ev) => `${r(lang, "portfolio")}${ev.slug}/`;
var postUrl = (lang, p) => `${r(lang, "blog")}${p.slug}/`;
var small = (src) => src && src.startsWith("/media/") ? src.replace(/\.jpg$/, "-s.jpg") : src;
var safeUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(u || "") ? u : "#";
var waLink = (c, lang) => `https://wa.me/${String(c.contact.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(UI[lang].wa_msg)}`;
function img(src, alt, { w, h, eager, cls } = {}) {
  const a = [`src="${e(src)}"`, `alt="${e(alt)}"`, 'decoding="async"', eager ? 'fetchpriority="high"' : 'loading="lazy"'];
  if (w && h) a.push(`width="${w}"`, `height="${h}"`);
  if (cls) a.push(`class="${cls}"`);
  return `<img ${a.join(" ")}>`;
}
function fmtDate(iso, lang) {
  const [y, m, d] = String(iso || "").split("-");
  if (!y || !m || !d) return e(iso);
  const month = MONTHS[lang][parseInt(m, 10) - 1] || "";
  return lang === "ro" ? `${parseInt(d, 10)} ${month} ${y}` : `${month} ${parseInt(d, 10)}, ${y}`;
}
function layout(c, lang, key, { title, desc, body, alt, hasHero = false, ogImage, schema, noindex = false }) {
  const ui = UI[lang];
  const navItems = NAV[lang].map(([k, label]) => `<li><a href="${r(lang, k)}"${k === key ? ' aria-current="page"' : ""}>${e(label)}</a></li>`).join("");
  const footerNav = NAV[lang].map(([k, label]) => `<li><a href="${r(lang, k)}">${e(label)}</a></li>`).join("");
  const canonical = SITE.url + alt[lang];
  const alternates = ["ro", "en"].map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE.url}${alt[l]}">`).join("") + `<link rel="alternate" hreflang="x-default" href="${SITE.url}${alt.ro}">`;
  const og = ogImage ? ogImage.startsWith("http") ? ogImage : SITE.url + ogImage : SITE.url + (c.hero && c.hero.desktop[0] || "/assets/img/hero-1.jpg");
  const schemaTag = schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}<\/script>` : "";
  const wa = waLink(c, lang);
  return `<!doctype html>
<html lang="${lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="canonical" href="${canonical}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:image" content="${e(og)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === "ro" ? "ro_RO" : "en_US"}">
<meta name="theme-color" content="#0f0f0f">
${THEME_JS}
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital@1&family=Inter:wght@400;500&family=Montserrat:wght@500;600;700&display=swap">
<link rel="stylesheet" href="/assets/css/style.css?v=${ASSET_V}">
${schemaTag}
</head>
<body class="${hasHero ? "has-hero" : ""}">
<a class="skip" href="#main">Skip</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${r(lang, "home")}">${e(SITE.name)}<small>${e(SITE.tagline[lang])}</small></a>
    <button class="menu-toggle" aria-controls="nav" aria-expanded="false" aria-label="${e(ui.menu)}">${ICON.menu}</button>
    <nav class="nav" id="nav" aria-label="Main">
      <ul>${navItems}</ul>
      <button class="theme-toggle" type="button" aria-label="${e(ui.theme)}" title="${e(ui.theme)}">${ICON.moon}${ICON.sun}</button>
      <a class="lang" href="${alt[OTHER[lang]]}" hreflang="${OTHER[lang]}" aria-label="${e(ui.switch_label)}">${ui.switch}</a>
      <a class="btn" href="${wa}" target="_blank" rel="noopener">${e(ui.book)}</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <a class="logo" href="${r(lang, "home")}">${e(SITE.name)}<small>${e(SITE.tagline[lang])}</small></a>
      <ul class="footer-nav">${footerNav}</ul>
      <div class="socials">
        <a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>
        <a href="${e(safeUrl(c.contact.facebook))}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>
        <a href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>\xA9 <span id="year">2026</span> ${e(SITE.name)} \xB7 ${e(ui.rights)}</span>
      <a href="#main">${e(ui.top)} \u2191</a>
    </div>
  </div>
</footer>
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
<script src="/assets/js/main.js?v=${ASSET_V}" defer><\/script>
</body>
</html>`;
}
function businessSchema(c, lang) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE.name,
    description: t(c.home, lang).desc,
    url: SITE.url + r(lang, "home"),
    image: SITE.url + (c.hero && c.hero.desktop[0] || "/assets/img/hero-1.jpg"),
    telephone: c.contact.phone,
    email: c.contact.email,
    priceRange: "\u20AC\u20AC",
    areaServed: "Romania",
    address: { "@type": "PostalAddress", addressLocality: "Bra\u0219ov", addressCountry: "RO" },
    sameAs: [c.contact.facebook, c.contact.instagram].filter(Boolean),
    founder: { "@type": "Person", name: "Daniel Lupu" }
  };
}
var pageHead = (title, intro) => `<section class="page-head"><div class="wrap"><h1 class="h-xl">${e(title)}</h1><p class="lead">${e(intro)}</p></div></section>`;
function home(c, lang) {
  const h = c.home[lang], ui = UI[lang];
  const desktop = c.hero.desktop.length ? c.hero.desktop : ["/assets/img/hero-1.jpg"];
  const mobile = c.hero.mobile.length ? c.hero.mobile : desktop;
  const lines = c.hero.lines[lang] && c.hero.lines[lang].length ? c.hero.lines[lang] : [{ title: SITE.name, sub: SITE.tagline[lang] }];
  const first = lines[0];
  const heroData = JSON.stringify({ desktop, mobile, lines }).replace(/</g, "\\u003c");
  const nav = NAV[lang].reduce((o, [k, l]) => (o[k] = l, o), {});
  const tiles = c.tiles.map((tl) => `<a class="tile reveal" href="${r(lang, tl.key)}">${img(small(tl.img), "", { w: 900, h: 1100 })}<div><span class="tile-label">${e(nav[tl.key])}</span><span class="tile-sub">${e(t(c.tile_sub, lang)[tl.key])}</span></div></a>`).join("");
  const services = c.services[lang].map((s) => `<div class="service"><h3>${e(s.title)}</h3><p>${e(s.text)}</p></div>`).join("");
  const stats = c.stats[lang].map((s) => `<div class="stat"><strong>${e(s.num)}</strong><span>${e(s.label)}</span></div>`).join("");
  const testi = c.testimonials[lang].map((x) => `<figure class="testimonial reveal">${img(small(x.img), "", { w: 300, h: 300 })}<blockquote>\u201E${e(x.quote)}\u201D</blockquote><cite>${e(x.who)}</cite></figure>`).join("");
  const ig = c.instagram_imgs.map((src) => `<a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener" aria-label="Instagram">${img(small(src), "", { w: 600, h: 600 })}</a>`).join("");
  const n = Math.max(desktop.length, 1);
  const body = `
<section class="hero" aria-label="${e(SITE.name)}" data-hero>
  <div class="hero-slide is-active" aria-hidden="false">
    <picture><source media="(orientation: portrait)" srcset="${e(mobile[0])}"><img src="${e(desktop[0])}" alt="" fetchpriority="high" decoding="async"></picture>
    <div class="hero-caption"><h1>${e(first.title)}</h1><p>${e(first.sub)}</p></div>
  </div>
  <script type="application/json" id="hero-data">${heroData}<\/script>
  <div class="hero-controls"><button class="hero-prev" aria-label="${e(ui.prev)}">${ICON.left}</button><span class="hero-count" aria-live="polite">01 / ${String(n).padStart(2, "0")}</span><button class="hero-next" aria-label="${e(ui.next)}">${ICON.right}</button></div>
  <a class="hero-scroll" href="#intro">${e(ui.scroll)}</a>
</section>

<section class="section" id="intro">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">${e(h.intro_eyebrow)}</span>
      <h2 class="h-xl">${e(h.intro_title)}</h2>
      ${(h.intro_p || []).map((p) => `<p>${e(p)}</p>`).join("")}
      <p class="signature">Dan</p>
    </div>
    <div class="split-media reveal">${img(c.portrait, SITE.name, { w: 900, h: 1200 })}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">${e(h.tiles_eyebrow)}</span><h2 class="h-lg">${e(h.tiles_title)}</h2></div>
    <div class="tiles">${tiles}</div>
  </div>
</section>

<section class="section">
  <div class="wrap center reveal">
    <blockquote class="quote">\u201E${e(h.quote)}\u201D<span class="quote-by">${e(h.quote_by)}</span></blockquote>
    <div class="stats">${stats}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">${e(h.services_eyebrow)}</span><h2 class="h-lg">${e(h.services_title)}</h2></div>
    <div class="services reveal">${services}</div>
  </div>
</section>

<section class="section">
  <div class="wrap split split--rev">
    <div class="reveal">
      <span class="eyebrow">${e(h.profile_eyebrow)}</span>
      <h2 class="h-xl">${e(h.profile_title)}</h2>
      ${(h.profile_p || []).map((p) => `<p>${e(p)}</p>`).join("")}
      <a class="btn" href="${r(lang, "portfolio")}">${e(ui.view_work)} ${ICON.arrow}</a>
    </div>
    <div class="split-media split-media--square reveal">${img(c.profile, "Daniel Lupu", { w: 900, h: 900 })}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <h2 class="h-lg center reveal">${e(h.testimonials_title)}</h2>
    <div class="testimonials">${testi}</div>
  </div>
</section>

<section class="section cta">
  ${img(c.cta_img, "", { w: 1600, h: 900 })}
  <div class="wrap narrow reveal">
    <h2 class="h-xl">${e(h.cta_title)}</h2>
    <p class="lead" style="color:inherit">${e(h.cta_p)}</p>
    <a class="btn btn--light" href="${waLink(c, lang)}" target="_blank" rel="noopener">${ICON.wa} ${e(ui.book)}</a>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="ig-head"><h2 class="h-lg" style="margin:0">${e(h.ig_title)}</h2><a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener">${e(c.contact.instagram_handle)}</a></div>
  </div>
  <div class="ig-grid">${ig}</div>
</section>`;
  const alt = { ro: r("ro", "home"), en: r("en", "home") };
  return layout(c, lang, "home", { title: h.title, desc: h.desc, body, alt, hasHero: true, ogImage: desktop[0], schema: businessSchema(c, lang) });
}
function portfolio(c, lang) {
  const [title, intro] = c.pages[lang].portfolio;
  const ui = UI[lang], cats = c.categories[lang];
  const used = Object.keys(cats).filter((k) => c.events.some((ev) => ev.cat === k));
  const filters = `<button data-filter="all" aria-pressed="true">${e(ui.all)}</button>` + used.map((k) => `<button data-filter="${e(k)}" aria-pressed="false">${e(cats[k])}</button>`).join("");
  const cards = c.events.map((ev) => `<a class="event-card reveal" href="${eventUrl(lang, ev)}" data-cat="${e(ev.cat)}">${img(small(ev.cover || ev.photos[0] || ""), t(ev.title, lang))}<div class="event-meta"><span class="eyebrow">${e(cats[ev.cat] || "")} \xB7 ${e(t(ev.date, lang))}</span><h2>${e(t(ev.title, lang))}</h2><span class="event-count">${ev.photos.length} ${e(ui.photos)} ${ICON.arrow}</span></div></a>`).join("");
  const body = `${pageHead(title, intro)}<section class="section" style="padding-top:0"><div class="wrap"><div class="filters" role="group">${filters}</div><div class="events">${cards}</div></div></section>`;
  return layout(c, lang, "portfolio", { title: `${title} \xB7 ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "portfolio"), en: r("en", "portfolio") } });
}
function event(c, lang, i) {
  const ev = c.events[i], ui = UI[lang], cats = c.categories[lang];
  const nxt = c.events[(i + 1) % c.events.length];
  const title = t(ev.title, lang);
  const photos = ev.photos.map((p, n) => `<a href="${e(p)}"><figure style="margin:0">${img(small(p), `${title} \xB7 ${n + 1}`)}</figure></a>`).join("");
  const nextBtn = c.events.length > 1 ? `<a class="btn btn--solid" href="${eventUrl(lang, nxt)}">${e(ui.next_event)}: ${e(t(nxt.title, lang))} ${ICON.arrow}</a>` : "";
  const body = `
<section class="page-head">
  <div class="wrap">
    <span class="eyebrow">${e(cats[ev.cat] || "")} \xB7 ${e(t(ev.date, lang))}</span>
    <h1 class="h-xl">${e(title)}</h1>
    <p class="lead">${e(t(ev.intro, lang))}</p>
    ${ev.venue ? `<p class="event-venue">${ICON.pin} ${e(ev.venue)}</p>` : ""}
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="gallery">${photos}</div>
    <div class="event-nav">
      <a class="btn" href="${r(lang, "portfolio")}">\u2190 ${e(ui.back_portfolio)}</a>
      ${nextBtn}
    </div>
  </div>
</section>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="${e(title)}">
  <button class="lb-close" aria-label="${e(ui.close)}">${ICON.x}</button>
  <button class="lb-prev" aria-label="${e(ui.prev)}">${ICON.left}</button>
  <img alt="">
  <button class="lb-next" aria-label="${e(ui.next)}">${ICON.right}</button>
  <span class="lb-count"></span>
</div>`;
  return layout(c, lang, "portfolio", {
    title: `${title} \xB7 ${SITE.name}`,
    desc: t(ev.intro, lang),
    body,
    alt: { ro: eventUrl("ro", ev), en: eventUrl("en", ev) },
    ogImage: ev.cover || ev.photos[0]
  });
}
function blog(c, lang) {
  const [title, intro] = c.pages[lang].blog;
  const ui = UI[lang];
  const posts = [...c.posts].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cards = posts.map((p) => `<a class="post-card reveal" href="${postUrl(lang, p)}">${img(small(p.cover), t(p.title, lang), { w: 1600, h: 1e3 })}<div><time datetime="${e(p.date)}">${fmtDate(p.date, lang)}</time><h2>${e(t(p.title, lang))}</h2><p>${e(t(p.excerpt, lang))}</p><span class="more">${e(ui.read_more)} ${ICON.arrow}</span></div></a>`).join("");
  const body = `${pageHead(title, intro)}<section class="section" style="padding-top:0"><div class="wrap"><div class="posts">${cards}</div></div></section>`;
  return layout(c, lang, "blog", { title: `${title} \xB7 ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "blog"), en: r("en", "blog") } });
}
function post(c, lang, i) {
  const p = c.posts[i], ui = UI[lang];
  const paras = (t(p.body, lang) || []).map((x) => `<p>${e(x)}</p>`).join("");
  const body = `
<article>
  <section class="page-head"><div class="wrap narrow">
    <time class="eyebrow" datetime="${e(p.date)}">${fmtDate(p.date, lang)}</time>
    <h1 class="h-xl">${e(t(p.title, lang))}</h1>
    <p class="lead">${e(t(p.excerpt, lang))}</p>
  </div></section>
  ${p.cover ? `<div class="wrap narrow">${img(p.cover, t(p.title, lang), { w: 1600, h: 1e3 })}</div>` : ""}
  <section class="section"><div class="wrap narrow prose">${paras}
    <p style="margin-top:48px"><a class="btn" href="${r(lang, "blog")}">\u2190 ${e(ui.back_blog)}</a></p>
  </div></section>
</article>`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: t(p.title, lang),
    datePublished: p.date,
    author: { "@type": "Person", name: "Daniel Lupu" },
    image: p.cover ? SITE.url + p.cover : void 0
  };
  return layout(c, lang, "blog", {
    title: `${t(p.title, lang)} \xB7 ${SITE.name}`,
    desc: t(p.excerpt, lang),
    body,
    alt: { ro: postUrl("ro", p), en: postUrl("en", p) },
    ogImage: p.cover,
    schema
  });
}
function faq(c, lang) {
  const [title, intro] = c.pages[lang].faq;
  const items = c.faq.map((f) => `<details class="faq-item"><summary>${e(t(f.q, lang))}</summary><p>${e(t(f.a, lang))}</p></details>`).join("");
  const body = `${pageHead(title, intro)}
<section class="section" style="padding-top:0"><div class="wrap narrow">
  <div class="faq">${items}</div>
  <p class="center" style="margin-top:48px"><a class="btn btn--solid" href="${waLink(c, lang)}" target="_blank" rel="noopener">${ICON.wa} ${e(UI[lang].book)}</a></p>
</div></section>`;
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map((f) => ({ "@type": "Question", name: t(f.q, lang), acceptedAnswer: { "@type": "Answer", text: t(f.a, lang) } })) };
  return layout(c, lang, "faq", { title: `${title} \xB7 ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "faq"), en: r("en", "faq") }, schema });
}
function contact(c, lang) {
  const P = c.pages[lang], ui = UI[lang], k = c.contact;
  const title = P.contact[0], intro = t(k.intro, lang) || P.contact[1];
  const tel = String(k.phone || "").replace(/[^\d+]/g, "");
  const wa = waLink(c, lang);
  const side = (t(k.notes, lang) || []).map((x) => `<li>${e(x)}</li>`).join("");
  const fbName = (String(k.facebook || "").match(/facebook\.com\/([^/?#]+)/) || [])[1] || "Facebook";
  const body = `${pageHead(title, intro)}
<section class="section" style="padding-top:0"><div class="wrap contact-grid">
  <div>
    <a class="btn btn--solid" href="${wa}" target="_blank" rel="noopener">${ICON.wa} ${e(ui.book)}</a>
    <ul class="contact-list">
      <li>${ICON.wa}<div><small>${e(P.wa_label)}</small><a href="${wa}" target="_blank" rel="noopener">${e(k.phone)}</a></div></li>
      <li>${ICON.phone}<div><small>${e(P.phone_label)}</small><a href="tel:${e(tel)}">${e(k.phone)}</a></div></li>
      <li>${ICON.mail}<div><small>${e(P.email_label)}</small><a href="mailto:${e(k.email)}">${e(k.email)}</a></div></li>
      <li>${ICON.fb}<div><small>${e(P.fb_label)}</small><a href="${e(safeUrl(k.messenger || k.facebook))}" target="_blank" rel="noopener">${e(fbName)}</a></div></li>
      <li>${ICON.ig}<div><small>${e(P.ig_label)}</small><a href="${e(safeUrl(k.instagram))}" target="_blank" rel="noopener">${e(k.instagram_handle)}</a></div></li>
      <li>${ICON.pin}<div><small>${e(P.area_label)}</small>${e(t(k.area, lang))}</div></li>
    </ul>
  </div>
  <div>
    <div class="split-media split-media--square" style="margin-bottom:32px">${img(c.profile, "Daniel Lupu", { w: 900, h: 900 })}</div>
    <div class="note"><h2 class="h-lg" style="font-size:20px">${e(P.contact_side_title)}</h2><ul>${side}</ul></div>
  </div>
</div></section>`;
  return layout(c, lang, "contact", { title: `${title} \xB7 ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "contact"), en: r("en", "contact") }, schema: businessSchema(c, lang) });
}
function notFound(c) {
  const body = `<section class="page-head" style="min-height:70vh;display:grid;place-content:center"><div class="wrap">
<h1 class="h-xl">404</h1><p class="lead">Pagina nu exist\u0103. \xB7 This page doesn't exist.</p>
<p><a class="btn" href="/">Acas\u0103</a> <a class="btn" href="/en/">Home</a></p></div></section>`;
  return layout(c, "ro", "", { title: `404 \xB7 ${SITE.name}`, desc: "404", body, alt: { ro: "/", en: "/en/" }, noindex: true });
}
function route(c, path) {
  for (const lang of ["ro", "en"]) {
    const R = ROUTES[lang];
    if (path === R.home) return home(c, lang);
    if (path === R.portfolio) return portfolio(c, lang);
    if (path === R.blog) return blog(c, lang);
    if (path === R.faq) return faq(c, lang);
    if (path === R.contact) return contact(c, lang);
    if (path.startsWith(R.portfolio)) {
      const i = c.events.findIndex((ev) => path === eventUrl(lang, ev));
      if (i >= 0) return event(c, lang, i);
    }
    if (path.startsWith(R.blog)) {
      const i = c.posts.findIndex((p) => path === postUrl(lang, p));
      if (i >= 0) return post(c, lang, i);
    }
  }
  return null;
}
function sitemap(c) {
  const urls = [];
  for (const lang of ["ro", "en"]) {
    for (const k of Object.keys(ROUTES[lang])) urls.push(ROUTES[lang][k]);
    c.events.forEach((ev) => urls.push(eventUrl(lang, ev)));
    c.posts.forEach((p) => urls.push(postUrl(lang, p)));
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE.url}${u}</loc></url>`).join("")}</urlset>`;
}

// src/worker/seed.json
var seed_default = {
  hero: {
    desktop: [
      "/assets/img/hero-1.jpg",
      "/assets/img/hero-2.jpg",
      "/assets/img/hero-3.jpg",
      "/assets/img/hero-4.jpg",
      "/assets/img/hero-5.jpg",
      "/assets/img/hero-6.jpg",
      "/assets/img/hero-7.jpg",
      "/assets/img/hero-8.jpg",
      "/assets/img/hero-9.jpg",
      "/assets/img/hero-10.jpg",
      "/assets/img/hero-11.jpg",
      "/assets/img/hero-12.jpg",
      "/assets/img/hero-13.jpg",
      "/assets/img/hero-14.jpg",
      "/assets/img/hero-15.jpg",
      "/assets/img/hero-16.jpg",
      "/assets/img/hero-17.jpg",
      "/assets/img/hero-18.jpg",
      "/assets/img/hero-19.jpg",
      "/assets/img/hero-20.jpg",
      "/assets/img/hero-21.jpg",
      "/assets/img/hero-22.jpg",
      "/assets/img/hero-23.jpg",
      "/assets/img/hero-24.jpg"
    ],
    mobile: [
      "/assets/img/hero-m-1.jpg",
      "/assets/img/hero-m-2.jpg",
      "/assets/img/hero-m-3.jpg",
      "/assets/img/hero-m-4.jpg",
      "/assets/img/hero-m-5.jpg",
      "/assets/img/hero-m-6.jpg",
      "/assets/img/hero-m-7.jpg",
      "/assets/img/hero-m-8.jpg",
      "/assets/img/hero-m-9.jpg",
      "/assets/img/hero-m-10.jpg",
      "/assets/img/hero-m-11.jpg",
      "/assets/img/hero-m-12.jpg"
    ],
    lines: {
      ro: [
        {
          title: "Momente reale, nu poze regizate",
          sub: "Fotografie documentar\u0103 de nunt\u0103 \xB7 Bra\u0219ov"
        },
        {
          title: "Fotografia nu e o list\u0103 de bifat",
          sub: "Las momentele s\u0103 se \xEEnt\xE2mple"
        },
        {
          title: "S\u0103 sim\u021Bi\u021Bi ziua din nou peste ani",
          sub: "Nun\u021Bi \xB7 Botezuri \xB7 Familie"
        }
      ],
      en: [
        {
          title: "Real moments, not staged photos",
          sub: "Documentary wedding photography \xB7 Bra\u0219ov"
        },
        {
          title: "Photography isn't a checklist",
          sub: "I let the moments unfold"
        },
        {
          title: "Feel the day again, years later",
          sub: "Weddings \xB7 Christenings \xB7 Family"
        }
      ]
    }
  },
  home: {
    ro: {
      title: "Dan C\u0103pitan de Plai \xB7 Fotograf de nunt\u0103 \xEEn Bra\u0219ov",
      desc: "Fotografie documentar\u0103 de nunt\u0103, botez \u0219i familie \xEEn Bra\u0219ov \u0219i oriunde vre\u021Bi voi. Momente reale, lumin\u0103 natural\u0103, f\u0103r\u0103 poze regizate.",
      intro_eyebrow: "Fotografie documentar\u0103",
      intro_title: "Las\u0103 obiectivul meu s\u0103 v\u0103 spun\u0103 povestea",
      intro_p: [
        "Fotografiez nun\u021Bi, botezuri \u0219i familii a\u0219a cum sunt ele: cu emo\u021Bie, cu r\xE2sete \u0219i cu momentele mici pe care nimeni nu le regizeaz\u0103. Lumina natural\u0103 \u0219i oamenii adev\u0103ra\u021Bi fac toat\u0103 treaba, eu doar sunt acolo la momentul potrivit.",
        "De la ceremonii descul\u021B prin iarb\u0103 p\xE2n\u0103 la nun\u021Bi elegante \xEEn ora\u0219, intervin c\xE2t mai pu\u021Bin \u0219i v\u0103 las s\u0103 v\u0103 bucura\u021Bi de zi. Dac\u0103 sunte\u021Bi timizi \xEEn fa\u021Ba aparatului, e perfect: nu trebuie s\u0103 poza\u021Bi."
      ],
      tiles_eyebrow: "Descoper\u0103",
      tiles_title: "Unde vrei s\u0103 mergi?",
      quote: "Fotografia nu e o list\u0103 de bifat. Vreau ca peste ani s\u0103 deschide\u021Bi albumul \u0219i s\u0103 sim\u021Bi\u021Bi ziua din nou.",
      quote_by: "Dan C\u0103pitan de Plai",
      services_eyebrow: "Ce fotografiez",
      services_title: "Pentru fiecare moment important",
      profile_eyebrow: "Capturez magia vie\u021Bii",
      profile_title: "Salut, sunt Dan",
      profile_p: [
        "Sunt fotograf \xEEn Bra\u0219ov \u0219i de aproape 8 ani fotografiez nun\u021Bi, botezuri \u0219i familii. Lucrez discret, cu lumin\u0103 natural\u0103, \u0219i caut momentele sincere dintre oameni.",
        "Merg oriunde m\u0103 cheam\u0103 povestea voastr\u0103: Conacul Albert, Naturalia Inn, Centrul Vechi sau o paji\u0219te f\u0103r\u0103 nume."
      ],
      testimonials_title: "Ce spun cuplurile",
      cta_title: "Hai s\u0103 v\u0103 p\u0103str\u0103m amintirile",
      cta_p: "Spune\u021Bi-mi data \u0219i locul, iar eu v\u0103 r\u0103spund cu o ofert\u0103 pe m\u0103sura voastr\u0103.",
      ig_title: "Pe Instagram"
    },
    en: {
      title: "Dan C\u0103pitan de Plai \xB7 Wedding photographer in Bra\u0219ov",
      desc: "Documentary wedding, christening and family photography in Bra\u0219ov and wherever you want. Real moments, natural light, no staged poses.",
      intro_eyebrow: "Documentary photography",
      intro_title: "Let my lens tell your story",
      intro_p: [
        "I photograph weddings, christenings and families as they really are: the emotion, the laughter and the small moments nobody stages. Natural light and real people do the work, I just make sure I'm there at the right moment.",
        "From barefoot ceremonies in the grass to elegant city weddings, I step in as little as possible and let you enjoy the day. Shy in front of a camera? Perfect, you don't need to pose."
      ],
      tiles_eyebrow: "Explore",
      tiles_title: "Where to next?",
      quote: "Photography isn't a checklist. I want you to open the album years from now and feel the day all over again.",
      quote_by: "Dan C\u0103pitan de Plai",
      services_eyebrow: "What I photograph",
      services_title: "For every moment that matters",
      profile_eyebrow: "Capturing life's magic",
      profile_title: "Hi, I'm Dan",
      profile_p: [
        "I'm a photographer based in Bra\u0219ov and I've been photographing weddings, christenings and families for almost 8 years. I work quietly, with natural light, looking for honest moments between people.",
        "I go wherever your story takes me: Conacul Albert, Naturalia Inn, the Old Town or a nameless meadow."
      ],
      testimonials_title: "What couples say",
      cta_title: "Let's keep your memories",
      cta_p: "Tell me your date and place, and I'll come back with a quote that fits you.",
      ig_title: "On Instagram"
    }
  },
  tiles: [
    {
      key: "home",
      img: "/assets/img/nav-1.jpg"
    },
    {
      key: "portfolio",
      img: "/assets/img/nav-2.jpg"
    },
    {
      key: "blog",
      img: "/assets/img/nav-3.jpg"
    },
    {
      key: "faq",
      img: "/assets/img/nav-4.jpg"
    },
    {
      key: "contact",
      img: "/assets/img/nav-5.jpg"
    }
  ],
  tile_sub: {
    ro: {
      home: "\xCEncepe de aici",
      portfolio: "Fiecare eveniment, povestea lui",
      blog: "Sfaturi \u0219i pove\u0219ti",
      faq: "Pre\u021Buri, deplasare, livrare",
      contact: "Hai s\u0103 vorbim"
    },
    en: {
      home: "Start here",
      portfolio: "Every event, its own story",
      blog: "Tips and stories",
      faq: "Pricing, travel, delivery",
      contact: "Let's talk"
    }
  },
  services: {
    ro: [
      {
        title: "Nun\u021Bi",
        text: "Toat\u0103 ziua, de la preg\u0103tiri p\xE2n\u0103 la petrecere, spus\u0103 ca o poveste."
      },
      {
        title: "Cununie civil\u0103",
        text: "Momentul oficial, simplu \u0219i emo\u021Bionant."
      },
      {
        title: "Botezuri",
        text: "Familia, na\u0219ii \u0219i cel mic, f\u0103r\u0103 agita\u021Bie."
      },
      {
        title: "Familie",
        text: "\u0218edin\u021Be relaxate, acas\u0103 sau \xEEn natur\u0103."
      },
      {
        title: "After-wedding & Trash The Dress",
        text: "O zi doar pentru voi doi, \xEEn locuri frumoase."
      },
      {
        title: "Nou-n\u0103scu\u021Bi",
        text: "Primele zile, cu bl\xE2nde\u021Be \u0219i r\u0103bdare."
      }
    ],
    en: [
      {
        title: "Weddings",
        text: "The whole day, from getting ready to the party, told as a story."
      },
      {
        title: "Civil ceremonies",
        text: "The official moment, simple and moving."
      },
      {
        title: "Christenings",
        text: "Family, godparents and the little one, without the fuss."
      },
      {
        title: "Family",
        text: "Relaxed sessions at home or outdoors."
      },
      {
        title: "After-wedding & Trash The Dress",
        text: "A day just for the two of you, somewhere beautiful."
      },
      {
        title: "Newborns",
        text: "The first days, gently and patiently."
      }
    ]
  },
  stats: {
    ro: [
      {
        num: "~8",
        label: "ani de fotografie"
      },
      {
        num: "6",
        label: "premii de portofoliu"
      },
      {
        num: "100%",
        label: "lumin\u0103 natural\u0103"
      },
      {
        num: "\u221E",
        label: "deplas\u0103ri oriunde"
      }
    ],
    en: [
      {
        num: "~8",
        label: "years behind the camera"
      },
      {
        num: "6",
        label: "portfolio awards"
      },
      {
        num: "100%",
        label: "natural light"
      },
      {
        num: "\u221E",
        label: "happy to travel"
      }
    ]
  },
  testimonials: {
    ro: [
      {
        img: "/assets/img/client-1.jpg",
        quote: "Dan a prins momente pe care nici nu \u0219tiam c\u0103 s-au \xEEnt\xE2mplat. Am uitat complet c\u0103 e acolo, \u0219i asta se vede \xEEn poze.",
        who: "Exemplu \xB7 Andreea & Mihai"
      },
      {
        img: "/assets/img/client-2.jpg",
        quote: "Super r\u0103bd\u0103tor \u0219i relaxat, chiar \u0219i cu noi, care suntem cei mai timizi oameni din lume. Pozele sunt superbe.",
        who: "Exemplu \xB7 Ioana & Radu"
      }
    ],
    en: [
      {
        img: "/assets/img/client-1.jpg",
        quote: "Dan caught moments we didn't even know happened. We completely forgot he was there, and it shows in the photos.",
        who: "Sample \xB7 Andreea & Mihai"
      },
      {
        img: "/assets/img/client-2.jpg",
        quote: "So patient and relaxed, even with us, the shyest people alive. The photos are gorgeous.",
        who: "Sample \xB7 Ioana & Radu"
      }
    ]
  },
  portrait: "/assets/img/portrait.jpg",
  profile: "/assets/img/profile.jpg",
  cta_img: "/assets/img/banner-1.jpg",
  instagram_imgs: [
    "/assets/img/ig-1.jpg",
    "/assets/img/ig-2.jpg",
    "/assets/img/ig-3.jpg",
    "/assets/img/ig-4.jpg",
    "/assets/img/ig-5.jpg",
    "/assets/img/ig-6.jpg"
  ],
  categories: {
    ro: {
      nunta: "Nun\u021Bi",
      cununie: "Cununie civil\u0103",
      botez: "Botezuri",
      familie: "Familie",
      after: "After-wedding"
    },
    en: {
      nunta: "Weddings",
      cununie: "Civil ceremonies",
      botez: "Christenings",
      familie: "Family",
      after: "After-wedding"
    }
  },
  events: [
    {
      id: "nunta-conacul-albert",
      slug: "nunta-conacul-albert",
      cat: "nunta",
      venue: "Conacul Albert",
      cover: "/assets/img/p-01.jpg",
      photos: [
        "/assets/img/p-01.jpg",
        "/assets/img/p-02.jpg",
        "/assets/img/p-03.jpg",
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg"
      ],
      title: {
        ro: "Nunt\u0103 la Conacul Albert",
        en: "Wedding at Conacul Albert"
      },
      date: {
        ro: "Septembrie 2026",
        en: "September 2026"
      },
      intro: {
        ro: "O zi cald\u0103 de toamn\u0103, o curte plin\u0103 de prieteni \u0219i multe lacrimi de bucurie.",
        en: "A warm autumn day, a courtyard full of friends and plenty of happy tears."
      }
    },
    {
      id: "nunta-naturalia-inn",
      slug: "nunta-naturalia-inn",
      cat: "nunta",
      venue: "Naturalia Inn",
      cover: "/assets/img/p-05.jpg",
      photos: [
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg",
        "/assets/img/p-12.jpg"
      ],
      title: {
        ro: "Nunt\u0103 la Naturalia Inn",
        en: "Wedding at Naturalia Inn"
      },
      date: {
        ro: "August 2026",
        en: "August 2026"
      },
      intro: {
        ro: "Ceremonie \xEEn aer liber, descul\u021Bi prin iarb\u0103, cu mun\u021Bii \xEEn spate.",
        en: "An outdoor ceremony, barefoot in the grass, with the mountains behind."
      }
    },
    {
      id: "cununie-centrul-vechi-brasov",
      slug: "cununie-centrul-vechi-brasov",
      cat: "cununie",
      venue: "Centrul Vechi, Bra\u0219ov",
      cover: "/assets/img/p-03.jpg",
      photos: [
        "/assets/img/p-03.jpg",
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg"
      ],
      title: {
        ro: "Cununie civil\u0103 \xEEn Centrul Vechi",
        en: "Civil ceremony in Bra\u0219ov Old Town"
      },
      date: {
        ro: "Iulie 2026",
        en: "July 2026"
      },
      intro: {
        ro: "Plimbare pe str\u0103du\u021Bele vechi ale Bra\u0219ovului, dup\u0103 cel mai important \u201EDa\u201D.",
        en: `A walk through Bra\u0219ov's old streets after the most important "I do".`
      }
    },
    {
      id: "botez-restaurant-adaggio",
      slug: "botez-restaurant-adaggio",
      cat: "botez",
      venue: "Restaurant Adaggio",
      cover: "/assets/img/p-08.jpg",
      photos: [
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg",
        "/assets/img/p-12.jpg",
        "/assets/img/p-01.jpg",
        "/assets/img/p-02.jpg"
      ],
      title: {
        ro: "Botez la Restaurant Adaggio",
        en: "Christening at Restaurant Adaggio"
      },
      date: {
        ro: "Iunie 2026",
        en: "June 2026"
      },
      intro: {
        ro: "Na\u0219ii emo\u021Biona\u021Bi, bunicii m\xE2ndri \u0219i un mic protagonist foarte curios.",
        en: "Emotional godparents, proud grandparents and a very curious little star."
      }
    },
    {
      id: "familie-in-natura",
      slug: "familie-in-natura",
      cat: "familie",
      venue: "Poiana Bra\u0219ov",
      cover: "/assets/img/p-10.jpg",
      photos: [
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg",
        "/assets/img/p-12.jpg",
        "/assets/img/p-02.jpg",
        "/assets/img/p-03.jpg",
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg"
      ],
      title: {
        ro: "\u0218edin\u021B\u0103 de familie \xEEn natur\u0103",
        en: "Family session outdoors"
      },
      date: {
        ro: "Mai 2026",
        en: "May 2026"
      },
      intro: {
        ro: "O dup\u0103-amiaz\u0103 f\u0103r\u0103 grab\u0103, cu jocuri, \xEEmbr\u0103\u021Bi\u0219\u0103ri \u0219i lumin\u0103 cald\u0103.",
        en: "An unhurried afternoon of games, hugs and warm light."
      }
    },
    {
      id: "trash-the-dress",
      slug: "trash-the-dress",
      cat: "after",
      venue: "Mun\u021Bii Bucegi",
      cover: "/assets/img/p-06.jpg",
      photos: [
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg"
      ],
      title: {
        ro: "Trash The Dress \xEEn mun\u021Bi",
        en: "Trash The Dress in the mountains"
      },
      date: {
        ro: "Octombrie 2026",
        en: "October 2026"
      },
      intro: {
        ro: "Rochia de mireas\u0103, un r\xE2u de munte \u0219i doi oameni care nu le pas\u0103 de noroi.",
        en: "A wedding dress, a mountain river and two people who don't mind the mud."
      }
    }
  ],
  posts: [
    {
      id: "ce-inseamna-fotografie-documentara-de-nunta",
      slug: "ce-inseamna-fotografie-documentara-de-nunta",
      cover: "/assets/img/blog-1.jpg",
      date: "2026-10-20",
      title: {
        ro: "Ce \xEEnseamn\u0103 fotografie documentar\u0103 de nunt\u0103",
        en: "What documentary wedding photography means"
      },
      excerpt: {
        ro: "F\u0103r\u0103 poze regizate, f\u0103r\u0103 liste de bifat. Doar ziua voastr\u0103, a\u0219a cum a fost.",
        en: "No staged poses, no checklists. Just your day, the way it really was."
      },
      body: {
        ro: [
          "Fotografia documentar\u0103 de nunt\u0103 \xEEnseamn\u0103 s\u0103 surprind ziua a\u0219a cum se \xEEnt\xE2mpl\u0103, nu cum ar trebui s\u0103 arate. Nu v\u0103 cer s\u0103 repeta\u021Bi intrarea \u0219i nu v\u0103 aranjez \xEEn pozi\u021Bii nefire\u0219ti.",
          "Stau aproape, dar discret. Urm\u0103resc privirile, gesturile mici, r\xE2sul nea\u0219teptat al bunicii. Momentele astea nu pot fi regizate, \u0219i tocmai ele conteaz\u0103 peste ani.",
          "Asta nu \xEEnseamn\u0103 c\u0103 nu facem deloc portrete. Facem, dar relaxat, \xEEn lumin\u0103 frumoas\u0103, f\u0103r\u0103 s\u0103 pierde\u021Bi jum\u0103tate de zi."
        ],
        en: [
          "Documentary wedding photography means capturing the day as it happens, not as it should look. I won't ask you to redo your entrance or put you in awkward poses.",
          "I stay close but quiet. I watch for glances, small gestures, grandma's unexpected laugh. Those moments can't be staged, and they're exactly what matters years later.",
          "That doesn't mean no portraits at all. We do them, but relaxed, in good light, without losing half your day."
        ]
      }
    },
    {
      id: "cum-alegi-fotograful-de-nunta",
      slug: "cum-alegi-fotograful-de-nunta",
      cover: "/assets/img/blog-2.jpg",
      date: "2026-10-10",
      title: {
        ro: "Cum alegi fotograful de nunt\u0103: 5 \xEEntreb\u0103ri utile",
        en: "Choosing your wedding photographer: 5 useful questions"
      },
      excerpt: {
        ro: "Ce s\u0103 \xEEntrebi \xEEnainte s\u0103 semnezi, ca s\u0103 nu ai surprize dup\u0103 nunt\u0103.",
        en: "What to ask before you sign, so there are no surprises after the wedding."
      },
      body: {
        ro: [
          "1. V\u0103 place stilul lui? Uita\u021Bi-v\u0103 la nun\u021Bi \xEEntregi, nu doar la cele mai bune 10 poze.",
          "2. Cum lucreaz\u0103 \xEEn ziua nun\u021Bii? Regizeaz\u0103 mult sau v\u0103 las\u0103 s\u0103 tr\u0103i\u021Bi momentul?",
          "3. Ce include oferta? Album, al doilea fotograf, deplasare: \xEEntreba\u021Bi clar ce e inclus \u0219i ce se pl\u0103te\u0219te separat.",
          "4. C\xE2nd primi\u021Bi fotografiile \u0219i \xEEn ce format?",
          "5. V\u0103 sim\u021Bi\u021Bi bine \xEEn preajma lui? Va fi l\xE2ng\u0103 voi toat\u0103 ziua, a\u0219a c\u0103 asta conteaz\u0103 enorm."
        ],
        en: [
          "1. Do you love their style? Look at full weddings, not just the best 10 shots.",
          "2. How do they work on the day? Lots of posing, or do they let you live the moment?",
          "3. What does the quote include? Album, second shooter, travel: ask clearly what's included and what's extra.",
          "4. When do you get the photos, and in what format?",
          "5. Do you feel comfortable around them? They'll be next to you all day, so this matters a lot."
        ]
      }
    }
  ],
  faq: [
    {
      q: {
        ro: "C\xE2t cost\u0103 fotografia de nunt\u0103?",
        en: "How much does wedding photography cost?"
      },
      a: {
        ro: "Nu am pachete fixe. O nunt\u0103 complet\u0103 porne\u0219te \xEEn jur de 1.000 EUR, iar oferta final\u0103 depinde de durat\u0103, loca\u021Bie \u0219i ce v\u0103 dori\u021Bi. Scrie\u021Bi-mi data \u0219i locul \u0219i v\u0103 trimit o ofert\u0103 personalizat\u0103.",
        en: "I don't do fixed packages. A full wedding starts at around 1,000 EUR, and the final quote depends on hours, location and what you'd like. Send me your date and place and I'll send a tailored quote."
      }
    },
    {
      q: {
        ro: "Ce nu e inclus \xEEn pre\u021B?",
        en: "What isn't included?"
      },
      a: {
        ro: "Albumul tip\u0103rit, \u0219edin\u021Bele suplimentare (after-wedding, Trash The Dress) \u0219i al doilea fotograf se adaug\u0103 separat.",
        en: "Printed albums, extra sessions (after-wedding, Trash The Dress) and a second photographer are added separately."
      }
    },
    {
      q: {
        ro: "V\u0103 deplasa\u021Bi \u0219i \xEEn afara Bra\u0219ovului?",
        en: "Do you travel outside Bra\u0219ov?"
      },
      a: {
        ro: "Da, merg oriunde vre\u021Bi voi. Pentru evenimentele din afara Bra\u0219ovului se adaug\u0103 transportul \u0219i cazarea.",
        en: "Yes, I'll go wherever you want. For events outside Bra\u0219ov, travel and accommodation are added."
      }
    },
    {
      q: {
        ro: "Suntem timizi \xEEn fa\u021Ba aparatului. E o problem\u0103?",
        en: "We're shy in front of the camera. Is that a problem?"
      },
      a: {
        ro: "Deloc. Stilul meu e documentar: nu trebuie s\u0103 poza\u021Bi. Majoritatea cuplurilor uit\u0103 de mine dup\u0103 primele minute.",
        en: "Not at all. My style is documentary: you don't need to pose. Most couples forget I'm there after the first few minutes."
      }
    },
    {
      q: {
        ro: "C\xE2nd primim fotografiile?",
        en: "When do we get the photos?"
      },
      a: {
        ro: "(De confirmat cu Dan) Termenul de livrare \u0219i num\u0103rul aproximativ de fotografii.",
        en: "(To confirm with Dan) Delivery time and approximate number of photos."
      }
    },
    {
      q: {
        ro: "Cum rezerv\u0103m data?",
        en: "How do we book a date?"
      },
      a: {
        ro: "Scrie\u021Bi-mi pe WhatsApp sau pe email cu data \u0219i locul. Stabilim o discu\u021Bie, apoi confirm\u0103m data.",
        en: "Message me on WhatsApp or email with your date and place. We'll have a quick chat, then confirm the date."
      }
    }
  ],
  pages: {
    ro: {
      portfolio: [
        "Portofoliu",
        "Fiecare eveniment are povestea lui. Alege unul \u0219i intr\u0103 \xEEn ziua respectiv\u0103."
      ],
      blog: [
        "Blog",
        "Sfaturi pentru miri, pove\u0219ti din spatele aparatului \u0219i idei pentru \u0219edin\u021Be foto."
      ],
      faq: [
        "\xCEntreb\u0103ri frecvente",
        "R\u0103spunsuri scurte la ce m\u0103 \xEEntreab\u0103 cel mai des cuplurile."
      ],
      contact: [
        "Contact",
        "Spune-mi data, locul \u0219i c\xE2teva cuvinte despre voi. R\u0103spund de obicei \xEEn aceea\u0219i zi."
      ],
      contact_side_title: "Bine de \u0219tiut",
      contact_side: [
        "Oferta e personalizat\u0103, f\u0103r\u0103 pachete fixe (\xEEn jur de 1.000 EUR pentru o nunt\u0103).",
        "Deplasez oriunde; \xEEn afara Bra\u0219ovului se adaug\u0103 transport \u0219i cazare.",
        "Album, \u0219edin\u021Be extra \u0219i al doilea fotograf se adaug\u0103 separat."
      ],
      wa_label: "WhatsApp (preferat)",
      phone_label: "Telefon",
      email_label: "Email",
      fb_label: "Facebook / Messenger",
      ig_label: "Instagram",
      area_label: "Zon\u0103",
      area: "Bra\u0219ov \u0219i oriunde vre\u021Bi voi"
    },
    en: {
      portfolio: [
        "Portfolio",
        "Every event has its own story. Pick one and step into that day."
      ],
      blog: [
        "Blog",
        "Tips for couples, stories from behind the camera and photo session ideas."
      ],
      faq: [
        "Frequently asked questions",
        "Short answers to what couples ask me most."
      ],
      contact: [
        "Contact",
        "Tell me your date, place and a few words about you. I usually reply the same day."
      ],
      contact_side_title: "Good to know",
      contact_side: [
        "Tailored quotes, no fixed packages (around 1,000 EUR for a wedding).",
        "Happy to travel; outside Bra\u0219ov, travel and accommodation are added.",
        "Albums, extra sessions and a second photographer are extra."
      ],
      wa_label: "WhatsApp (preferred)",
      phone_label: "Phone",
      email_label: "Email",
      fb_label: "Facebook / Messenger",
      ig_label: "Instagram",
      area_label: "Area",
      area: "Bra\u0219ov and wherever you want"
    }
  },
  contact: {
    phone: "+40 743 199 121",
    email: "lupudaniel.foto@gmail.com",
    facebook: "https://www.facebook.com/Lupu.D.Foto/",
    messenger: "https://m.me/Lupu.D.Foto",
    instagram: "https://www.instagram.com/dancapitandeplai.ro/",
    instagram_handle: "@dancapitandeplai.ro",
    area: {
      ro: "Bra\u0219ov \u0219i oriunde vre\u021Bi voi",
      en: "Bra\u0219ov and wherever you want"
    },
    notes: {
      ro: [
        "Oferta e personalizat\u0103, f\u0103r\u0103 pachete fixe (\xEEn jur de 1.000 EUR pentru o nunt\u0103).",
        "Deplasez oriunde; \xEEn afara Bra\u0219ovului se adaug\u0103 transport \u0219i cazare.",
        "Album, \u0219edin\u021Be extra \u0219i al doilea fotograf se adaug\u0103 separat."
      ],
      en: [
        "Tailored quotes, no fixed packages (around 1,000 EUR for a wedding).",
        "Happy to travel; outside Bra\u0219ov, travel and accommodation are added.",
        "Albums, extra sessions and a second photographer are extra."
      ]
    },
    intro: {
      ro: "Spune-mi data, locul \u0219i c\xE2teva cuvinte despre voi. R\u0103spund de obicei \xEEn aceea\u0219i zi.",
      en: "Tell me your date, place and a few words about you. I usually reply the same day."
    }
  }
};

// src/worker/api.js
var SESSION_TTL = 24 * 3600;
var MAX_IMAGE = 8 * 1024 * 1024;
var enc = new TextEncoder();
var hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
var randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
var json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
var adminEmails = (env) => String(env.ADMIN_EMAILS || "lupudaniel.foto@gmail.com").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
var CONTENT_URL = "https://cache.internal/site";
var memo = { at: 0, data: null };
async function getContent(env, ctx) {
  if (memo.data && Date.now() - memo.at < 3e4) return memo.data;
  const cache = caches.default;
  let saved = null;
  const hit = await cache.match(CONTENT_URL).catch(() => null);
  if (hit) saved = await hit.json();
  else {
    saved = await env.CONTENT.get("site", "json");
    const res = new Response(JSON.stringify(saved), { headers: { "content-type": "application/json", "cache-control": "max-age=60" } });
    const put = cache.put(CONTENT_URL, res).catch(() => {
    });
    ctx ? ctx.waitUntil(put) : await put;
  }
  const data = saved ? { ...seed_default, ...saved } : seed_default;
  memo = { at: Date.now(), data };
  return data;
}
async function forgetContent() {
  memo = { at: 0, data: null };
  await caches.default.delete(CONTENT_URL).catch(() => {
  });
}
function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function hmac(env, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(String(env.SESSION_SECRET || env.MOCK_LOGIN_KEY || "dev-secret")), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
async function session(req, env) {
  const sid = cookie(req, "sid");
  const m = sid && sid.match(/^(\d{1,16})\.([0-9a-f]{64})$/);
  if (!m || Number(m[1]) < Date.now()) return null;
  if (await hmac(env, m[1]) !== m[2]) return null;
  return { email: adminEmails(env)[0] };
}
async function readJson(req, max) {
  const text = await req.text();
  if (text.length > max) throw new Error("too_large");
  return JSON.parse(text);
}
async function quickLogin(req, env) {
  const email = adminEmails(env)[0];
  const exp = String(Date.now() + SESSION_TTL * 1e3);
  const sid = exp + "." + await hmac(env, exp);
  return json({ ok: true, email }, 200, {
    "set-cookie": `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`
  });
}
async function logout() {
  return json({ ok: true }, 200, { "set-cookie": "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
}
var IMG_RE = /^\/(media\/[0-9a-f]{24}\.jpg|assets\/img\/[\w.-]+)$/;
var str = (v, max = 4e3) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
var bi = (v, max) => ({ ro: str(v && v.ro, max), en: str(v && v.en, max) });
var biList = (v, max, n) => ({ ro: list(v && v.ro, n).map((x) => str(x, max)), en: list(v && v.en, n).map((x) => str(x, max)) });
var list = (v, n = 200) => Array.isArray(v) ? v.slice(0, n) : [];
var imgRef = (v) => IMG_RE.test(String(v || "")) ? String(v) : "";
var imgList = (v, n = 200) => list(v, n).map(imgRef).filter(Boolean);
var url = (v) => /^https?:\/\/[^\s"'<>]+$/i.test(String(v || "")) ? String(v).slice(0, 500) : "";
function slugify(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "pagina";
}
function uniqueSlugs(items) {
  const seen = /* @__PURE__ */ new Set();
  for (const it of items) {
    let base = slugify(it.slug || it.title.ro || it.title.en), s = base, n = 2;
    while (seen.has(s)) s = `${base}-${n++}`;
    seen.add(s);
    it.slug = s;
  }
  return items;
}
function cleanContent(c, base) {
  const out = { ...base };
  if (c.hero) out.hero = {
    desktop: imgList(c.hero.desktop, 40),
    mobile: imgList(c.hero.mobile, 40),
    lines: {
      ro: list(c.hero.lines && c.hero.lines.ro, 10).map((l) => ({ title: str(l.title, 140), sub: str(l.sub, 140) })),
      en: list(c.hero.lines && c.hero.lines.en, 10).map((l) => ({ title: str(l.title, 140), sub: str(l.sub, 140) }))
    }
  };
  const cats = Object.keys(base.categories.ro);
  if (c.events) out.events = uniqueSlugs(list(c.events, 200).map((ev) => ({
    id: str(ev.id, 40) || randomToken().slice(0, 12),
    slug: str(ev.slug, 80),
    cat: cats.includes(ev.cat) ? ev.cat : cats[0],
    venue: str(ev.venue, 120),
    cover: imgRef(ev.cover),
    photos: imgList(ev.photos, 300),
    title: bi(ev.title, 140),
    date: bi(ev.date, 60),
    intro: bi(ev.intro, 600)
  })));
  if (c.posts) out.posts = uniqueSlugs(list(c.posts, 300).map((p) => ({
    id: str(p.id, 40) || randomToken().slice(0, 12),
    slug: str(p.slug, 80),
    cover: imgRef(p.cover),
    date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    title: bi(p.title, 160),
    excerpt: bi(p.excerpt, 400),
    body: biList(p.body, 4e3, 60)
  })));
  if (c.tiles) out.tiles = list(base.tiles, 10).map((t2) => {
    const m = list(c.tiles, 10).find((x) => x && x.key === t2.key);
    return { ...t2, img: m && imgRef(m.img) || t2.img };
  });
  for (const k of ["portrait", "profile", "cta_img"]) if (k in c) out[k] = imgRef(c[k]) || base[k];
  if (c.instagram_imgs) out.instagram_imgs = imgList(c.instagram_imgs, 12);
  if (c.faq) out.faq = list(c.faq, 100).map((f) => ({ q: bi(f.q, 300), a: bi(f.a, 2e3) }));
  if (c.contact) out.contact = {
    phone: str(c.contact.phone, 40),
    email: str(c.contact.email, 120),
    facebook: url(c.contact.facebook),
    messenger: url(c.contact.messenger),
    instagram: url(c.contact.instagram),
    instagram_handle: str(c.contact.instagram_handle, 60),
    area: bi(c.contact.area, 200),
    intro: bi(c.contact.intro, 400),
    notes: biList(c.contact.notes, 400, 12)
  };
  return out;
}
function usedImages(c) {
  const s = JSON.stringify(c);
  return new Set((s.match(/\/media\/[0-9a-f]{24}\.jpg/g) || []).map((x) => x.slice(7, 31)));
}
async function saveContent(req, env) {
  let body;
  try {
    body = await readJson(req, 2e6);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const saved = await env.CONTENT.get("site", "json");
  const next = cleanContent(body, saved ? { ...seed_default, ...saved } : seed_default);
  await env.CONTENT.put("site", JSON.stringify(next));
  await forgetContent();
  const keep = usedImages(next);
  const listed = await env.CONTENT.list({ prefix: "img:" });
  await Promise.all(listed.keys.filter((k) => !keep.has(k.name.slice(4, 28))).map((k) => env.CONTENT.delete(k.name)));
  return json({ ok: true, content: next });
}
function isImage(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  const jpg = b[0] === 255 && b[1] === 216;
  const png = b[0] === 137 && b[1] === 80;
  const webp = String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  return jpg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
}
async function storeImage(env, id, variant, buf, meta = {}) {
  const type = isImage(buf);
  if (!type || buf.byteLength > MAX_IMAGE) return false;
  await env.CONTENT.put(`img:${id}${variant}`, buf, { metadata: { type, ...meta } });
  return true;
}
async function uploadMedia(req, env, params) {
  const buf = await req.arrayBuffer();
  const v = params.get("v") === "s" ? "-s" : "";
  let id = params.get("id");
  if (v) {
    if (!/^[0-9a-f]{24}$/.test(id || "")) return json({ error: "bad_id" }, 400);
  } else id = randomToken().slice(0, 24);
  const w = parseInt(params.get("w") || "0", 10), h = parseInt(params.get("h") || "0", 10);
  if (!await storeImage(env, id, v, buf, { w, h })) return json({ error: "bad_image" }, 400);
  return json({ ok: true, id, url: `/media/${id}.jpg` });
}
async function importMedia(req, env) {
  let body;
  try {
    body = await readJson(req, 4e3);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const src = url(body.url);
  if (!src) return json({ error: "bad_url" }, 400);
  const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) return json({ error: "fetch_failed", status: res.status }, 502);
  const buf = await res.arrayBuffer();
  const id = randomToken().slice(0, 24);
  if (!await storeImage(env, id, "", buf)) return json({ error: "bad_image" }, 400);
  return json({ ok: true, id, url: `/media/${id}.jpg` });
}
async function serveMedia(env, path, ctx, req) {
  const m = path.match(/^\/media\/([0-9a-f]{24})(-s)?\.jpg$/);
  if (!m) return null;
  const cache = caches.default;
  const hit = await cache.match(req);
  if (hit) return hit;
  let { value, metadata } = await env.CONTENT.getWithMetadata(`img:${m[1]}${m[2] || ""}`, "arrayBuffer");
  if (!value && m[2]) ({ value, metadata } = await env.CONTENT.getWithMetadata(`img:${m[1]}`, "arrayBuffer"));
  if (!value) return new Response("Not found", { status: 404 });
  const res = new Response(value, { headers: { "content-type": metadata && metadata.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}
async function handleApi(req, env, url2) {
  const p = url2.pathname, m = req.method;
  if (m === "POST" && p === "/api/auth/login") return quickLogin(req, env);
  if (m === "POST" && p === "/api/auth/logout") return logout(req, env);
  if (m === "GET" && p === "/api/content/public") return json(await getContent(env));
  const s = await session(req, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  if (m !== "GET" && req.headers.get("x-admin") !== "1") return json({ error: "forbidden" }, 403);
  if (m === "GET" && p === "/api/auth/me") return json({ email: s.email });
  if (m === "GET" && p === "/api/content") return json(await getContent(env));
  if (m === "PUT" && p === "/api/content") return saveContent(req, env);
  if (m === "POST" && p === "/api/media") return uploadMedia(req, env, url2.searchParams);
  if (m === "POST" && p === "/api/media/import") return importMedia(req, env);
  return json({ error: "not_found" }, 404);
}

// src/worker/index.js
var SEC_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};
var html = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SEC_HEADERS } });
var worker_default = {
  async fetch(req, env, ctx) {
    const url2 = new URL(req.url);
    const p = url2.pathname;
    try {
      if (p.startsWith("/api/")) return await handleApi(req, env, url2);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const media = await serveMedia(env, p, ctx, req);
      if (media) return media;
      if (p.startsWith("/assets/") || p.startsWith("/admin") || p === "/robots.txt") {
        if (p === "/admin") return Response.redirect(url2.origin + "/admin/", 301);
        const res = await env.ASSETS.fetch(req);
        const out = new Response(res.body, res);
        if (p.startsWith("/assets/")) out.headers.set("cache-control", "public, max-age=31536000, immutable");
        if (p.startsWith("/admin")) {
          out.headers.set("cache-control", "no-store");
          out.headers.set("x-robots-tag", "noindex");
          out.headers.set("x-frame-options", "DENY");
        }
        return out;
      }
      const c = await getContent(env, ctx);
      if (p === "/sitemap.xml") return new Response(sitemap(c), { headers: { "content-type": "application/xml" } });
      if (!p.endsWith("/") && !p.includes(".")) return Response.redirect(url2.origin + p + "/" + url2.search, 301);
      const page = route(c, p);
      return page ? html(page) : html(notFound(c), 404);
    } catch (err) {
      if (p.startsWith("/api/")) return json({ error: "server_error" }, 500);
      return new Response("Something went wrong", { status: 500 });
    }
  }
};
export {
  worker_default as default
};
