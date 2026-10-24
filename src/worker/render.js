// HTML rendering for every public page. Content comes from the KV "site" JSON
// (seed.json until Dan saves in the admin panel). All text is escaped here.

export const SITE = {
  name: "Dan Căpitan de Plai",
  tagline: { ro: "Fotograf de nuntă · Brașov", en: "Wedding photographer · Brașov" },
  url: "https://dancapitandeplai.pages.dev",
};
const ASSET_V = "6";
// style.css is inlined in <head> (no render-blocking request); bundled as text by esbuild
import CSS from "../../public/assets/css/style.css";

export const ROUTES = {
  ro: { home: "/", portfolio: "/portofoliu/", blog: "/blog/", faq: "/intrebari-frecvente/", contact: "/contact/" },
  en: { home: "/en/", portfolio: "/en/portfolio/", blog: "/en/blog/", faq: "/en/faq/", contact: "/en/contact/" },
};
const NAV = {
  ro: [["home", "Acasă"], ["portfolio", "Portofoliu"], ["blog", "Blog"], ["faq", "Întrebări"], ["contact", "Contact"]],
  en: [["home", "Home"], ["portfolio", "Portfolio"], ["blog", "Blog"], ["faq", "FAQ"], ["contact", "Contact"]],
};
const UI = {
  ro: {
    book: "Programează o discuție", wa_msg: "Bună, Dan! Am văzut site-ul și aș vrea să vorbim despre o ședință foto.",
    scroll: "Derulează", view_work: "Vezi portofoliul", all: "Toate", photos: "fotografii",
    back_portfolio: "Înapoi la portofoliu", read_more: "Citește", back_blog: "Înapoi la blog", next_event: "Următorul eveniment",
    rights: "Toate drepturile rezervate.", top: "Sus", menu: "Meniu", close: "Închide", prev: "Anterioara", next: "Următoarea",
    switch: "EN", switch_label: "English version", theme: "Schimbă tema (luminoasă / întunecată)",
  },
  en: {
    book: "Book a chat", wa_msg: "Hi Dan! I saw your website and I'd like to talk about a photo session.",
    scroll: "Scroll", view_work: "View portfolio", all: "All", photos: "photos",
    back_portfolio: "Back to portfolio", read_more: "Read", back_blog: "Back to blog", next_event: "Next event",
    rights: "All rights reserved.", top: "Top", menu: "Menu", close: "Close", prev: "Previous", next: "Next",
    switch: "RO", switch_label: "Versiunea în română", theme: "Switch theme (light / dark)",
  },
};
const MONTHS = {
  ro: ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
};
const OTHER = { ro: "en", en: "ro" };

const ICON = {
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
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
};

// Runs before CSS so the page paints in the right theme (saved choice, else device setting)
const THEME_JS = "<script>(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}" +
  "if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}" +
  "document.documentElement.setAttribute('data-theme',t)})();</script>";

export const e = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const t = (o, lang) => (o && typeof o === "object" ? (o[lang] ?? o.ro ?? "") : o ?? "");
const r = (lang, key) => ROUTES[lang][key];
const eventUrl = (lang, ev) => `${r(lang, "portfolio")}${ev.slug}/`;
const postUrl = (lang, p) => `${r(lang, "blog")}${p.slug}/`;
// Uploaded images have a small variant for grids; static placeholders don't
const small = src => (src && src.startsWith("/media/") ? src.replace(/\.jpg$/, "-s.jpg") : src);
const safeUrl = u => (/^https?:\/\/[^\s"'<>]+$/i.test(u || "") ? u : "#");
const waLink = (c, lang) => `https://wa.me/${String(c.contact.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(UI[lang].wa_msg)}`;

// Uploaded photos exist in two sizes (900px "-s" and up to 2400px), so a full-size
// src gets a srcset and the browser picks; callers pass small(src) to force the 900px one.
// eager: LCP candidate (high priority); above: in the first screen, so not lazy-loaded
function img(src, alt, { w, h, eager, above, cls, sizes } = {}) {
  const a = [`src="${e(src)}"`, `alt="${e(alt)}"`, 'decoding="async"', eager ? 'fetchpriority="high"' : above ? "" : 'loading="lazy"'].filter(Boolean);
  if (/^\/media\/[0-9a-f]{24}\.jpg$/.test(src)) a.push(`srcset="${e(small(src))} 900w, ${e(src)} 2400w"`, `sizes="${sizes || "100vw"}"`);
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
  const alternates = ["ro", "en"].map(l => `<link rel="alternate" hreflang="${l}" href="${SITE.url}${alt[l]}">`).join("") +
    `<link rel="alternate" hreflang="x-default" href="${SITE.url}${alt.ro}">`;
  const og = ogImage ? (ogImage.startsWith("http") ? ogImage : SITE.url + ogImage) : SITE.url + ((c.hero && c.hero.desktop[0]) || "/assets/img/hero-1.jpg");
  const schemaTag = schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}</script>` : "";
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
<link rel="preload" href="/assets/fonts/montserrat-600.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<style>${CSS}</style>
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
      <a class="lang" href="${alt[OTHER[lang]]}" hreflang="${OTHER[lang]}" aria-label="${ui.switch} · ${e(ui.switch_label)}">${ui.switch}</a>
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
      <span>© <span id="year">2026</span> ${e(SITE.name)} · ${e(ui.rights)}</span>
      <a href="#main">${e(ui.top)} ↑</a>
    </div>
  </div>
</footer>
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
<script src="/assets/js/main.js?v=${ASSET_V}" defer></script>
</body>
</html>`;
}

function businessSchema(c, lang) {
  return {
    "@context": "https://schema.org", "@type": "ProfessionalService", name: SITE.name,
    description: t(c.home, lang).desc, url: SITE.url + r(lang, "home"), image: SITE.url + ((c.hero && c.hero.desktop[0]) || "/assets/img/hero-1.jpg"),
    telephone: c.contact.phone, email: c.contact.email, priceRange: "€€", areaServed: "Romania",
    address: { "@type": "PostalAddress", addressLocality: "Brașov", addressCountry: "RO" },
    sameAs: [c.contact.facebook, c.contact.instagram].filter(Boolean), founder: { "@type": "Person", name: "Daniel Lupu" },
  };
}

const pageHead = (title, intro) => `<section class="page-head"><div class="wrap"><h1 class="h-xl">${e(title)}</h1><p class="lead">${e(intro)}</p></div></section>`;

export function home(c, lang) {
  const h = c.home[lang], ui = UI[lang];
  const desktop = c.hero.desktop.length ? c.hero.desktop : ["/assets/img/hero-1.jpg"];
  const mobile = c.hero.mobile.length ? c.hero.mobile : desktop;
  const lines = c.hero.lines[lang] && c.hero.lines[lang].length ? c.hero.lines[lang] : [{ title: SITE.name, sub: SITE.tagline[lang] }];
  // First slide is real markup (fast first paint, picks the right set via <picture>); main.js builds the rest
  const first = lines[0];
  const heroData = JSON.stringify({ desktop, mobile, lines, interval: c.hero.interval || 5 }).replace(/</g, "\\u003c");
  const nav = NAV[lang].reduce((o, [k, l]) => (o[k] = l, o), {});
  const tiles = c.tiles.map(tl => `<a class="tile reveal" href="${r(lang, tl.key)}">${img(small(tl.img), "", { w: 900, h: 1100 })}` +
    `<div><span class="tile-label">${e(nav[tl.key])}</span><span class="tile-sub">${e(t(c.tile_sub, lang)[tl.key])}</span></div></a>`).join("");
  const services = c.services[lang].map(s => `<div class="service"><h3>${e(s.title)}</h3><p>${e(s.text)}</p></div>`).join("");
  const stats = c.stats[lang].map(s => `<div class="stat"><strong>${e(s.num)}</strong><span>${e(s.label)}</span></div>`).join("");
  const testi = c.testimonials[lang].map(x => `<figure class="testimonial reveal">${img(small(x.img), "", { w: 300, h: 300 })}<blockquote>„${e(x.quote)}”</blockquote><cite>${e(x.who)}</cite></figure>`).join("");
  const ig = c.instagram_imgs.map(src => `<a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener" aria-label="Instagram">${img(small(src), "", { w: 600, h: 600 })}</a>`).join("");
  const n = Math.max(desktop.length, 1);
  const body = `
<section class="hero" aria-label="${e(SITE.name)}" data-hero>
  <div class="hero-slide is-active" aria-hidden="false">
    <picture><source media="(orientation: portrait)" srcset="${e(small(mobile[0]))}"><img src="${e(desktop[0])}" srcset="${e(small(desktop[0]))} 900w, ${e(desktop[0])} 2400w" sizes="100vw" alt="" fetchpriority="high" decoding="async"></picture>
    <div class="hero-caption"><h1>${e(first.title)}</h1><p>${e(first.sub)}</p></div>
  </div>
  <script type="application/json" id="hero-data">${heroData}</script>
  <div class="hero-controls"><button class="hero-prev" aria-label="${e(ui.prev)}">${ICON.left}</button><span class="hero-count" aria-live="polite">01 / ${String(n).padStart(2, "0")}</span><button class="hero-next" aria-label="${e(ui.next)}">${ICON.right}</button></div>
  <a class="hero-scroll" href="#intro">${e(ui.scroll)}</a>
</section>

<section class="section" id="intro">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">${e(h.intro_eyebrow)}</span>
      <h2 class="h-xl">${e(h.intro_title)}</h2>
      ${(h.intro_p || []).map(p => `<p>${e(p)}</p>`).join("")}
      <p class="signature">Dan</p>
    </div>
    <div class="split-media reveal">${img(c.portrait, SITE.name, { w: 900, h: 1200, sizes: "(min-width: 900px) 45vw, 100vw" })}</div>
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
    <blockquote class="quote">„${e(h.quote)}”<span class="quote-by">${e(h.quote_by)}</span></blockquote>
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
      ${(h.profile_p || []).map(p => `<p>${e(p)}</p>`).join("")}
      <a class="btn" href="${r(lang, "portfolio")}">${e(ui.view_work)} ${ICON.arrow}</a>
    </div>
    <div class="split-media split-media--square reveal">${img(c.profile, "Daniel Lupu", { w: 900, h: 900, sizes: "(min-width: 900px) 40vw, 100vw" })}</div>
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

export function portfolio(c, lang) {
  const [title, intro] = c.pages[lang].portfolio;
  const ui = UI[lang], cats = c.categories[lang];
  const used = Object.keys(cats).filter(k => c.events.some(ev => ev.cat === k));
  const filters = `<button data-filter="all" aria-pressed="true">${e(ui.all)}</button>` +
    used.map(k => `<button data-filter="${e(k)}" aria-pressed="false">${e(cats[k])}</button>`).join("");
  const cards = c.events.map((ev, n) => `<a class="event-card${n < 4 ? "" : " reveal"}" href="${eventUrl(lang, ev)}" data-cat="${e(ev.cat)}">` +
    `${img(small(ev.cover || ev.photos[0] || ""), t(ev.title, lang), { eager: n === 0, above: n < 4 })}` +
    `<div class="event-meta"><span class="eyebrow">${e(cats[ev.cat] || "")} · ${e(t(ev.date, lang))}</span>` +
    `<h2>${e(t(ev.title, lang))}</h2><span class="event-count">${ev.photos.length} ${e(ui.photos)} ${ICON.arrow}</span></div></a>`).join("");
  const body = `${pageHead(title, intro)}<section class="section" style="padding-top:0"><div class="wrap"><div class="filters" role="group">${filters}</div><div class="events">${cards}</div></div></section>`;
  return layout(c, lang, "portfolio", { title: `${title} · ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "portfolio"), en: r("en", "portfolio") } });
}

export function event(c, lang, i) {
  const ev = c.events[i], ui = UI[lang], cats = c.categories[lang];
  const nxt = c.events[(i + 1) % c.events.length];
  const title = t(ev.title, lang);
  const photos = ev.photos.map((p, n) => `<a href="${e(p)}"><figure style="margin:0">${img(small(p), `${title} · ${n + 1}`, { eager: n < 2, above: n < 6 })}</figure></a>`).join("");
  const nextBtn = c.events.length > 1 ? `<a class="btn btn--solid" href="${eventUrl(lang, nxt)}">${e(ui.next_event)}: ${e(t(nxt.title, lang))} ${ICON.arrow}</a>` : "";
  const body = `
<section class="page-head">
  <div class="wrap">
    <span class="eyebrow">${e(cats[ev.cat] || "")} · ${e(t(ev.date, lang))}</span>
    <h1 class="h-xl">${e(title)}</h1>
    <p class="lead">${e(t(ev.intro, lang))}</p>
    ${ev.venue ? `<p class="event-venue">${ICON.pin} ${e(ev.venue)}</p>` : ""}
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="gallery">${photos}</div>
    <div class="event-nav">
      <a class="btn" href="${r(lang, "portfolio")}">← ${e(ui.back_portfolio)}</a>
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
  return layout(c, lang, "portfolio", { title: `${title} · ${SITE.name}`, desc: t(ev.intro, lang), body,
    alt: { ro: eventUrl("ro", ev), en: eventUrl("en", ev) }, ogImage: ev.cover || ev.photos[0] });
}

export function blog(c, lang) {
  const [title, intro] = c.pages[lang].blog;
  const ui = UI[lang];
  const posts = [...c.posts].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cards = posts.map(p => `<a class="post-card reveal" href="${postUrl(lang, p)}">${img(small(p.cover), t(p.title, lang), { w: 1600, h: 1000 })}` +
    `<div><time datetime="${e(p.date)}">${fmtDate(p.date, lang)}</time><h2>${e(t(p.title, lang))}</h2>` +
    `<p>${e(t(p.excerpt, lang))}</p><span class="more">${e(ui.read_more)} ${ICON.arrow}</span></div></a>`).join("");
  const body = `${pageHead(title, intro)}<section class="section" style="padding-top:0"><div class="wrap"><div class="posts">${cards}</div></div></section>`;
  return layout(c, lang, "blog", { title: `${title} · ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "blog"), en: r("en", "blog") } });
}

export function post(c, lang, i) {
  const p = c.posts[i], ui = UI[lang];
  const paras = (t(p.body, lang) || []).map(x => `<p>${e(x)}</p>`).join("");
  const body = `
<article>
  <section class="page-head"><div class="wrap narrow">
    <time class="eyebrow" datetime="${e(p.date)}">${fmtDate(p.date, lang)}</time>
    <h1 class="h-xl">${e(t(p.title, lang))}</h1>
    <p class="lead">${e(t(p.excerpt, lang))}</p>
  </div></section>
  ${p.cover ? `<div class="wrap narrow">${img(p.cover, t(p.title, lang), { w: 1600, h: 1000, sizes: "(min-width: 900px) 800px, 100vw" })}</div>` : ""}
  <section class="section"><div class="wrap narrow prose">${paras}
    <p style="margin-top:48px"><a class="btn" href="${r(lang, "blog")}">← ${e(ui.back_blog)}</a></p>
  </div></section>
</article>`;
  const schema = { "@context": "https://schema.org", "@type": "BlogPosting", headline: t(p.title, lang), datePublished: p.date,
    author: { "@type": "Person", name: "Daniel Lupu" }, image: p.cover ? SITE.url + p.cover : undefined };
  return layout(c, lang, "blog", { title: `${t(p.title, lang)} · ${SITE.name}`, desc: t(p.excerpt, lang), body,
    alt: { ro: postUrl("ro", p), en: postUrl("en", p) }, ogImage: p.cover, schema });
}

export function faq(c, lang) {
  const [title, intro] = c.pages[lang].faq;
  const items = c.faq.map(f => `<details class="faq-item"><summary>${e(t(f.q, lang))}</summary><p>${e(t(f.a, lang))}</p></details>`).join("");
  const body = `${pageHead(title, intro)}
<section class="section" style="padding-top:0"><div class="wrap narrow">
  <div class="faq">${items}</div>
  <p class="center" style="margin-top:48px"><a class="btn btn--solid" href="${waLink(c, lang)}" target="_blank" rel="noopener">${ICON.wa} ${e(UI[lang].book)}</a></p>
</div></section>`;
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map(f => ({ "@type": "Question", name: t(f.q, lang), acceptedAnswer: { "@type": "Answer", text: t(f.a, lang) } })) };
  return layout(c, lang, "faq", { title: `${title} · ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "faq"), en: r("en", "faq") }, schema });
}

export function contact(c, lang) {
  const P = c.pages[lang], ui = UI[lang], k = c.contact;
  const title = P.contact[0], intro = t(k.intro, lang) || P.contact[1];
  const tel = String(k.phone || "").replace(/[^\d+]/g, "");
  const wa = waLink(c, lang);
  const side = (t(k.notes, lang) || []).map(x => `<li>${e(x)}</li>`).join("");
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
    <div class="split-media split-media--square" style="margin-bottom:32px">${img(c.profile, "Daniel Lupu", { w: 900, h: 900, sizes: "(min-width: 900px) 40vw, 100vw" })}</div>
    <div class="note"><h2 class="h-lg" style="font-size:20px">${e(P.contact_side_title)}</h2><ul>${side}</ul></div>
  </div>
</div></section>`;
  return layout(c, lang, "contact", { title: `${title} · ${SITE.name}`, desc: intro, body, alt: { ro: r("ro", "contact"), en: r("en", "contact") }, schema: businessSchema(c, lang) });
}

export function notFound(c) {
  const body = `<section class="page-head" style="min-height:70vh;display:grid;place-content:center"><div class="wrap">
<h1 class="h-xl">404</h1><p class="lead">Pagina nu există. · This page doesn't exist.</p>
<p><a class="btn" href="/">Acasă</a> <a class="btn" href="/en/">Home</a></p></div></section>`;
  return layout(c, "ro", "", { title: `404 · ${SITE.name}`, desc: "404", body, alt: { ro: "/", en: "/en/" }, noindex: true });
}

// Map a path to its page. Returns null when nothing matches.
export function route(c, path) {
  for (const lang of ["ro", "en"]) {
    const R = ROUTES[lang];
    if (path === R.home) return home(c, lang);
    if (path === R.portfolio) return portfolio(c, lang);
    if (path === R.blog) return blog(c, lang);
    if (path === R.faq) return faq(c, lang);
    if (path === R.contact) return contact(c, lang);
    if (path.startsWith(R.portfolio)) {
      const i = c.events.findIndex(ev => path === eventUrl(lang, ev));
      if (i >= 0) return event(c, lang, i);
    }
    if (path.startsWith(R.blog)) {
      const i = c.posts.findIndex(p => path === postUrl(lang, p));
      if (i >= 0) return post(c, lang, i);
    }
  }
  return null;
}

export function sitemap(c) {
  const urls = [];
  for (const lang of ["ro", "en"]) {
    for (const k of Object.keys(ROUTES[lang])) urls.push(ROUTES[lang][k]);
    c.events.forEach(ev => urls.push(eventUrl(lang, ev)));
    c.posts.forEach(p => urls.push(postUrl(lang, p)));
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u => `<url><loc>${SITE.url}${u}</loc></url>`).join("")}</urlset>`;
}
