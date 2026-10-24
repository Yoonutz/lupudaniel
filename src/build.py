#!/usr/bin/env python3
"""Render the static site into public/ (RO at /, EN at /en/).

Usage: python3 src/build.py
"""
import html
import json
import os
import shutil
import sys
from urllib.parse import quote

sys.path.insert(0, os.path.dirname(__file__))
from content import (CATEGORIES, EVENTS, FAQ, HERO_LINES, HERO_SLIDES, HOME, NAV, PAGES, POSTS,  # noqa: E402
                     ROUTES, SERVICES, SITE, STATS, TESTIMONIALS, TILE_SUB, TILES, UI)

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public")
IMG = "/assets/img/"
ASSET_V = "2"

e = html.escape

# Runs before CSS so the page paints in the right theme (saved choice, else device setting)
THEME_JS = ("<script>(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}"
            "if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}"
            "document.documentElement.setAttribute('data-theme',t)})();</script>")

ICON = {
    "menu": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
    "wa": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.3z"/></svg>',
    "phone": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
    "mail": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
    "fb": '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/></svg>',
    "ig": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor"/></svg>',
    "pin": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    "x": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    "left": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
    "right": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
    "sun": '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
    "moon": '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
    "arrow": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
}

OTHER = {"ro": "en", "en": "ro"}


def wa_link(lang):
    return f"https://wa.me/{SITE['phone_raw']}?text={quote(UI[lang]['wa_msg'])}"


def r(lang, key):
    return ROUTES[lang][key]


def event_url(lang, ev):
    return f"{r(lang, 'portfolio')}{ev['slug']}/"


def post_url(lang, p):
    return f"{r(lang, 'blog')}{p['slug']}/"


def img(name, alt, cls="", w=None, h=None, eager=False, sizes=None):
    attrs = [f'src="{IMG}{name}"', f'alt="{e(alt)}"', 'decoding="async"']
    attrs.append('fetchpriority="high"' if eager else 'loading="lazy"')
    if w and h:
        attrs += [f'width="{w}"', f'height="{h}"']
    if cls:
        attrs.append(f'class="{cls}"')
    return f"<img {' '.join(attrs)}>"


def page(lang, key, title, desc, body, alt_path, has_hero=False, og_image="hero-1.jpg", schema=None):
    ui = UI[lang]
    nav_items = "".join(
        f'<li><a href="{r(lang, k)}"{" aria-current=\"page\"" if k == key else ""}>{e(label)}</a></li>'
        for k, label in NAV[lang]
    )
    footer_nav = "".join(f'<li><a href="{r(lang, k)}">{e(label)}</a></li>' for k, label in NAV[lang])
    canonical = SITE["url"] + (alt_path[lang])
    alternates = "".join(
        f'<link rel="alternate" hreflang="{l}" href="{SITE["url"]}{alt_path[l]}">' for l in ("ro", "en")
    ) + f'<link rel="alternate" hreflang="x-default" href="{SITE["url"]}{alt_path["ro"]}">'
    schema_tag = f'<script type="application/ld+json">{json.dumps(schema, ensure_ascii=False)}</script>' if schema else ""
    return f"""<!doctype html>
<html lang="{lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{e(title)}</title>
<meta name="description" content="{e(desc)}">
<link rel="canonical" href="{canonical}">
{alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="{e(title)}">
<meta property="og:description" content="{e(desc)}">
<meta property="og:image" content="{SITE['url']}{IMG}{og_image}">
<meta property="og:url" content="{canonical}">
<meta property="og:locale" content="{'ro_RO' if lang == 'ro' else 'en_US'}">
<meta name="theme-color" content="#0f0f0f">
{THEME_JS}
<link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital@1&family=Inter:wght@400;500&family=Montserrat:wght@500;600;700&display=swap">
<link rel="stylesheet" href="/assets/css/style.css?v={ASSET_V}">
{schema_tag}
</head>
<body class="{'has-hero' if has_hero else ''}">
<a class="skip" href="#main">Skip</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="{r(lang, 'home')}">{e(SITE['name'])}<small>{e(SITE['tagline'][lang])}</small></a>
    <button class="menu-toggle" aria-controls="nav" aria-expanded="false" aria-label="{e(ui['menu'])}">{ICON['menu']}</button>
    <nav class="nav" id="nav" aria-label="Main">
      <ul>{nav_items}</ul>
      <button class="theme-toggle" type="button" aria-label="{e(ui['theme'])}" title="{e(ui['theme'])}">{ICON['moon']}{ICON['sun']}</button>
      <a class="lang" href="{alt_path[OTHER[lang]]}" hreflang="{OTHER[lang]}" aria-label="{e(ui['switch_label'])}">{ui['switch']}</a>
      <a class="btn" href="{wa_link(lang)}" target="_blank" rel="noopener">{e(ui['book'])}</a>
    </nav>
  </div>
</header>
<main id="main">
{body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <a class="logo" href="{r(lang, 'home')}">{e(SITE['name'])}<small>{e(SITE['tagline'][lang])}</small></a>
      <ul class="footer-nav">{footer_nav}</ul>
      <div class="socials">
        <a href="{SITE['instagram']}" target="_blank" rel="noopener" aria-label="Instagram">{ICON['ig']}</a>
        <a href="{SITE['facebook']}" target="_blank" rel="noopener" aria-label="Facebook">{ICON['fb']}</a>
        <a href="{wa_link(lang)}" target="_blank" rel="noopener" aria-label="WhatsApp">{ICON['wa']}</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>© <span id="year">2026</span> {e(SITE['name'])} · {e(ui['rights'])}</span>
      <a href="#main">{e(ui['top'])} ↑</a>
    </div>
  </div>
</footer>
<a class="wa-float" href="{wa_link(lang)}" target="_blank" rel="noopener" aria-label="WhatsApp">{ICON['wa']}</a>
<script src="/assets/js/main.js?v={ASSET_V}" defer></script>
</body>
</html>
"""


def business_schema(lang):
    return {
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        "name": SITE["name"],
        "description": HOME[lang]["desc"],
        "url": SITE["url"] + r(lang, "home"),
        "image": SITE["url"] + IMG + "hero-1.jpg",
        "telephone": SITE["phone"],
        "email": SITE["email"],
        "priceRange": "€€",
        "areaServed": "Romania",
        "address": {"@type": "PostalAddress", "addressLocality": "Brașov", "addressCountry": "RO"},
        "sameAs": [SITE["facebook"], SITE["instagram"]],
        "founder": {"@type": "Person", "name": "Daniel Lupu"},
    }


def home(lang):
    h, ui = HOME[lang], UI[lang]
    lines = HERO_LINES[lang]
    slides = []
    for i, name in enumerate(HERO_SLIDES):
        t, sub = lines[i % len(lines)]
        tag = "h1" if i == 0 else "h2"
        src = f'src="{IMG}{name}" fetchpriority="high"' if i == 0 else f'data-src="{IMG}{name}" src="data:image/gif;base64,R0lGODlhAQABAAAAACw="'
        slides.append(
            f'<div class="hero-slide{" is-active" if i == 0 else ""}" aria-hidden="{"false" if i == 0 else "true"}">'
            f'<img {src} alt="" width="1920" height="1080" decoding="async">'
            f'<div class="hero-caption"><{tag}>{e(t)}</{tag}><p>{e(sub)}</p></div></div>'
        )
    n = len(HERO_SLIDES)
    controls = (f'<div class="hero-controls"><button class="hero-prev" aria-label="{e(ui["prev"])}">{ICON["left"]}</button>'
                f'<span class="hero-count" aria-live="polite">01 / {n:02d}</span>'
                f'<button class="hero-next" aria-label="{e(ui["next"])}">{ICON["right"]}</button></div>')
    tiles = "".join(
        f'<a class="tile reveal" href="{r(lang, k)}">{img(pic, "", w=900, h=1100)}'
        f'<div><span class="tile-label">{e(dict(NAV[lang])[k])}</span><span class="tile-sub">{e(TILE_SUB[lang][k])}</span></div></a>'
        for k, pic in TILES
    )
    services = "".join(f'<div class="service"><h3>{e(t)}</h3><p>{e(d)}</p></div>' for t, d in SERVICES[lang])
    stats = "".join(f'<div class="stat"><strong>{e(n)}</strong><span>{e(l)}</span></div>' for n, l in STATS[lang])
    testi = "".join(
        f'<figure class="testimonial reveal">{img(pic, "", w=300, h=300)}<blockquote>„{e(q)}”</blockquote><cite>{e(who)}</cite></figure>'
        for pic, q, who in TESTIMONIALS[lang]
    )
    ig = "".join(
        f'<a href="{SITE["instagram"]}" target="_blank" rel="noopener" aria-label="Instagram">{img(f"ig-{i}.jpg", "", w=600, h=600)}</a>'
        for i in range(1, 7)
    )
    intro_p = "".join(f"<p>{e(p)}</p>" for p in h["intro_p"])
    profile_p = "".join(f"<p>{e(p)}</p>" for p in h["profile_p"])
    body = f"""
<section class="hero" aria-label="{e(SITE['name'])}">
  {''.join(slides)}
  {controls}
  <a class="hero-scroll" href="#intro">{e(ui['scroll'])}</a>
</section>

<section class="section" id="intro">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">{e(h['intro_eyebrow'])}</span>
      <h2 class="h-xl">{e(h['intro_title'])}</h2>
      {intro_p}
      <p class="signature">Dan</p>
    </div>
    <div class="split-media reveal">{img('portrait.jpg', 'Dan Căpitan de Plai', w=900, h=1200)}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">{e(h['tiles_eyebrow'])}</span><h2 class="h-lg">{e(h['tiles_title'])}</h2></div>
    <div class="tiles">{tiles}</div>
  </div>
</section>

<section class="section">
  <div class="wrap center reveal">
    <blockquote class="quote">„{e(h['quote'])}”<span class="quote-by">{e(h['quote_by'])}</span></blockquote>
    <div class="stats">{stats}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">{e(h['services_eyebrow'])}</span><h2 class="h-lg">{e(h['services_title'])}</h2></div>
    <div class="services reveal">{services}</div>
  </div>
</section>

<section class="section">
  <div class="wrap split split--rev">
    <div class="reveal">
      <span class="eyebrow">{e(h['profile_eyebrow'])}</span>
      <h2 class="h-xl">{e(h['profile_title'])}</h2>
      {profile_p}
      <a class="btn" href="{r(lang, 'portfolio')}">{e(ui['view_work'])} {ICON['arrow']}</a>
    </div>
    <div class="split-media split-media--square reveal">{img('profile.jpg', 'Daniel Lupu', w=900, h=900)}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <h2 class="h-lg center reveal">{e(h['testimonials_title'])}</h2>
    <div class="testimonials">{testi}</div>
  </div>
</section>

<section class="section cta">
  {img('banner-1.jpg', '', w=1600, h=900)}
  <div class="wrap narrow reveal">
    <h2 class="h-xl">{e(h['cta_title'])}</h2>
    <p class="lead" style="color:inherit">{e(h['cta_p'])}</p>
    <a class="btn btn--light" href="{wa_link(lang)}" target="_blank" rel="noopener">{ICON['wa']} {e(ui['book'])}</a>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="ig-head"><h2 class="h-lg" style="margin:0">{e(h['ig_title'])}</h2><a href="{SITE['instagram']}" target="_blank" rel="noopener">{e(SITE['instagram_handle'])}</a></div>
  </div>
  <div class="ig-grid">{ig}</div>
</section>
"""
    alt = {l: r(l, "home") for l in ("ro", "en")}
    return page(lang, "home", h["title"], h["desc"], body, alt, has_hero=True, schema=business_schema(lang))


def page_head(title, intro):
    return f'<section class="page-head"><div class="wrap"><h1 class="h-xl">{e(title)}</h1><p class="lead">{e(intro)}</p></div></section>'


def portfolio(lang):
    t, intro = PAGES[lang]["portfolio"]
    ui = UI[lang]
    cats = CATEGORIES[lang]
    used = [c for c in cats if any(ev["cat"] == c for ev in EVENTS)]
    filters = f'<button data-filter="all" aria-pressed="true">{e(ui["all"])}</button>' + "".join(
        f'<button data-filter="{c}" aria-pressed="false">{e(cats[c])}</button>' for c in used
    )
    cards = "".join(
        f'<a class="event-card reveal" href="{event_url(lang, ev)}" data-cat="{ev["cat"]}">'
        f'{img(ev["cover"], ev["title"][lang])}'
        f'<div class="event-meta"><span class="eyebrow">{e(cats[ev["cat"]])} · {e(ev["date"][lang])}</span>'
        f'<h2>{e(ev["title"][lang])}</h2><span class="event-count">{len(ev["photos"])} {e(ui["photos"])} {ICON["arrow"]}</span></div></a>'
        for ev in EVENTS
    )
    body = f'{page_head(t, intro)}<section class="section" style="padding-top:0"><div class="wrap"><div class="filters" role="group">{filters}</div><div class="events">{cards}</div></div></section>'
    alt = {l: r(l, "portfolio") for l in ("ro", "en")}
    return page(lang, "portfolio", f"{t} · {SITE['name']}", intro, body, alt)


def event(lang, i, ev):
    ui = UI[lang]
    cats = CATEGORIES[lang]
    nxt = EVENTS[(i + 1) % len(EVENTS)]
    title = ev["title"][lang]
    photos = "".join(
        f'<a href="{IMG}{p}" data-cat="all"><figure style="margin:0">{img(p, f"{title} · {n + 1}")}</figure></a>'
        for n, p in enumerate(ev["photos"])
    )
    body = f"""
<section class="page-head">
  <div class="wrap">
    <span class="eyebrow">{e(cats[ev['cat']])} · {e(ev['date'][lang])}</span>
    <h1 class="h-xl">{e(title)}</h1>
    <p class="lead">{e(ev['intro'][lang])}</p>
    <p class="event-venue">{ICON['pin']} {e(ev['venue'])}</p>
  </div>
</section>
<section class="section" style="padding-top:0">
  <div class="wrap">
    <div class="gallery">{photos}</div>
    <div class="event-nav">
      <a class="btn" href="{r(lang, 'portfolio')}">← {e(ui['back_portfolio'])}</a>
      <a class="btn btn--solid" href="{event_url(lang, nxt)}">{e(ui['next_event'])}: {e(nxt['title'][lang])} {ICON['arrow']}</a>
    </div>
  </div>
</section>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="{e(title)}">
  <button class="lb-close" aria-label="{e(ui['close'])}">{ICON['x']}</button>
  <button class="lb-prev" aria-label="{e(ui['prev'])}">{ICON['left']}</button>
  <img alt="">
  <button class="lb-next" aria-label="{e(ui['next'])}">{ICON['right']}</button>
  <span class="lb-count"></span>
</div>
"""
    alt = {l: event_url(l, ev) for l in ("ro", "en")}
    return page(lang, "portfolio", f"{title} · {SITE['name']}", ev["intro"][lang], body, alt, og_image=ev["cover"])


def blog(lang):
    t, intro = PAGES[lang]["blog"]
    ui = UI[lang]
    cards = "".join(
        f'<a class="post-card reveal" href="{post_url(lang, p)}">{img(p["cover"], p["title"][lang], w=1600, h=1000)}'
        f'<div><time datetime="{p["date"]}">{fmt_date(p["date"], lang)}</time><h2>{e(p["title"][lang])}</h2>'
        f'<p>{e(p["excerpt"][lang])}</p><span class="more">{e(ui["read_more"])} {ICON["arrow"]}</span></div></a>'
        for p in POSTS
    )
    body = f'{page_head(t, intro)}<section class="section" style="padding-top:0"><div class="wrap"><div class="posts">{cards}</div></div></section>'
    alt = {l: r(l, "blog") for l in ("ro", "en")}
    return page(lang, "blog", f"{t} · {SITE['name']}", intro, body, alt)


MONTHS = {
    "ro": ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"],
    "en": ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
}


def fmt_date(iso, lang):
    y, m, d = iso.split("-")
    month = MONTHS[lang][int(m) - 1]
    return f"{int(d)} {month} {y}" if lang == "ro" else f"{month} {int(d)}, {y}"


def post(lang, p):
    ui = UI[lang]
    paras = "".join(f"<p>{e(x)}</p>" for x in p["body"][lang])
    body = f"""
<article>
  <section class="page-head"><div class="wrap narrow">
    <time class="eyebrow" datetime="{p['date']}">{fmt_date(p['date'], lang)}</time>
    <h1 class="h-xl">{e(p['title'][lang])}</h1>
    <p class="lead">{e(p['excerpt'][lang])}</p>
  </div></section>
  <div class="wrap narrow">{img(p['cover'], p['title'][lang], w=1600, h=1000)}</div>
  <section class="section"><div class="wrap narrow prose">{paras}
    <p style="margin-top:48px"><a class="btn" href="{r(lang, 'blog')}">← {e(ui['back_blog'])}</a></p>
  </div></section>
</article>
"""
    alt = {l: post_url(l, p) for l in ("ro", "en")}
    schema = {"@context": "https://schema.org", "@type": "BlogPosting", "headline": p["title"][lang],
              "datePublished": p["date"], "author": {"@type": "Person", "name": "Daniel Lupu"},
              "image": SITE["url"] + IMG + p["cover"]}
    return page(lang, "blog", f"{p['title'][lang]} · {SITE['name']}", p["excerpt"][lang], body, alt,
                og_image=p["cover"], schema=schema)


def faq(lang):
    t, intro = PAGES[lang]["faq"]
    items = "".join(
        f'<details class="faq-item"><summary>{e(q)}</summary><p>{e(a)}</p></details>' for q, a in FAQ[lang]
    )
    ui = UI[lang]
    body = f"""{page_head(t, intro)}
<section class="section" style="padding-top:0"><div class="wrap narrow">
  <div class="faq">{items}</div>
  <p class="center" style="margin-top:48px"><a class="btn btn--solid" href="{wa_link(lang)}" target="_blank" rel="noopener">{ICON['wa']} {e(ui['book'])}</a></p>
</div></section>"""
    schema = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ[lang]
    ]}
    alt = {l: r(l, "faq") for l in ("ro", "en")}
    return page(lang, "faq", f"{t} · {SITE['name']}", intro, body, alt, schema=schema)


def contact(lang):
    P, ui = PAGES[lang], UI[lang]
    t, intro = P["contact"]
    tel = SITE["phone"].replace(" ", "")
    side = "".join(f"<li>{e(x)}</li>" for x in P["contact_side"])
    body = f"""{page_head(t, intro)}
<section class="section" style="padding-top:0"><div class="wrap contact-grid">
  <div>
    <a class="btn btn--solid" href="{wa_link(lang)}" target="_blank" rel="noopener">{ICON['wa']} {e(ui['book'])}</a>
    <ul class="contact-list">
      <li>{ICON['wa']}<div><small>{e(P['wa_label'])}</small><a href="{wa_link(lang)}" target="_blank" rel="noopener">{e(SITE['phone'])}</a></div></li>
      <li>{ICON['phone']}<div><small>{e(P['phone_label'])}</small><a href="tel:{tel}">{e(SITE['phone'])}</a></div></li>
      <li>{ICON['mail']}<div><small>{e(P['email_label'])}</small><a href="mailto:{SITE['email']}">{e(SITE['email'])}</a></div></li>
      <li>{ICON['fb']}<div><small>{e(P['fb_label'])}</small><a href="{SITE['messenger']}" target="_blank" rel="noopener">Lupu.D.Foto</a></div></li>
      <li>{ICON['ig']}<div><small>{e(P['ig_label'])}</small><a href="{SITE['instagram']}" target="_blank" rel="noopener">{e(SITE['instagram_handle'])}</a></div></li>
      <li>{ICON['pin']}<div><small>{e(P['area_label'])}</small>{e(P['area'])}</div></li>
    </ul>
  </div>
  <div>
    <div class="split-media split-media--square" style="margin-bottom:32px">{img('profile.jpg', 'Daniel Lupu', w=900, h=900)}</div>
    <div class="note"><h2 class="h-lg" style="font-size:20px">{e(P['contact_side_title'])}</h2><ul>{side}</ul></div>
  </div>
</div></section>"""
    alt = {l: r(l, "contact") for l in ("ro", "en")}
    return page(lang, "contact", f"{t} · {SITE['name']}", intro, body, alt, schema=business_schema(lang))


def not_found():
    body = f"""<section class="page-head" style="min-height:70vh;display:grid;place-content:center"><div class="wrap">
<h1 class="h-xl">404</h1><p class="lead">Pagina nu există. · This page doesn't exist.</p>
<p><a class="btn" href="/">Acasă</a> <a class="btn" href="/en/">Home</a></p></div></section>"""
    return page("ro", "", f"404 · {SITE['name']}", "404", body, {"ro": "/", "en": "/en/"})


def write(path, text):
    full = os.path.join(OUT, path.lstrip("/"))
    if full.endswith("/"):
        full += "index.html"
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with open(full, "w", encoding="utf-8") as f:
        f.write(text)
    return path


def clean():
    # Remove generated HTML, keep assets and static files
    for name in os.listdir(OUT):
        p = os.path.join(OUT, name)
        if name in ("assets", "_headers", "_redirects", "robots.txt"):
            continue
        if os.path.isdir(p):
            shutil.rmtree(p)
        elif name.endswith(".html") or name == "sitemap.xml":
            os.remove(p)


def main():
    clean()
    urls = []
    for lang in ("ro", "en"):
        urls.append(write(r(lang, "home"), home(lang)))
        urls.append(write(r(lang, "portfolio"), portfolio(lang)))
        for i, ev in enumerate(EVENTS):
            urls.append(write(event_url(lang, ev), event(lang, i, ev)))
        urls.append(write(r(lang, "blog"), blog(lang)))
        for p in POSTS:
            urls.append(write(post_url(lang, p), post(lang, p)))
        urls.append(write(r(lang, "faq"), faq(lang)))
        urls.append(write(r(lang, "contact"), contact(lang)))
    write("/404.html", not_found())
    sitemap = "".join(f"<url><loc>{SITE['url']}{u}</loc></url>" for u in urls)
    write("/sitemap.xml", f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{sitemap}</urlset>')
    print(f"Built {len(urls)} pages into {OUT}")


if __name__ == "__main__":
    main()
