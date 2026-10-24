#!/usr/bin/env python3
"""Export the starting content (src/content.py) as JSON for the worker.

The live site reads its content from Cloudflare KV; this seed is only used
until Dan saves something in the admin panel.
Usage: python3 src/make_seed.py  ->  src/worker/seed.json
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import content as C  # noqa: E402

A = "/assets/img/"


def both(d):
    return {"ro": d["ro"], "en": d["en"]}


seed = {
    "hero": {
        "desktop": [A + n for n in C.HERO_SLIDES],
        "mobile": [A + f"hero-m-{i}.jpg" for i in range(1, 13)],
        "interval": 5,
        "lines": {l: [{"title": t, "sub": s} for t, s in C.HERO_LINES[l]] for l in ("ro", "en")},
    },
    "home": both(C.HOME),
    "tiles": [{"key": k, "img": A + p} for k, p in C.TILES],
    "tile_sub": both(C.TILE_SUB),
    "services": {l: [{"title": t, "text": d} for t, d in C.SERVICES[l]] for l in ("ro", "en")},
    "stats": {l: [{"num": n, "label": t} for n, t in C.STATS[l]] for l in ("ro", "en")},
    "testimonials": {l: [{"img": A + p, "quote": q, "who": w} for p, q, w in C.TESTIMONIALS[l]] for l in ("ro", "en")},
    "portrait": A + "portrait.jpg",
    "profile": A + "profile.jpg",
    "cta_img": A + "banner-1.jpg",
    "instagram_imgs": [A + f"ig-{i}.jpg" for i in range(1, 7)],
    "categories": both(C.CATEGORIES),
    "events": [
        {
            "id": ev["slug"], "slug": ev["slug"], "cat": ev["cat"], "venue": ev["venue"],
            "cover": A + ev["cover"], "photos": [A + p for p in ev["photos"]],
            "title": ev["title"], "date": ev["date"], "intro": ev["intro"],
        }
        for ev in C.EVENTS
    ],
    "posts": [
        {
            "id": p["slug"], "slug": p["slug"], "cover": A + p["cover"], "date": p["date"],
            "title": p["title"], "excerpt": p["excerpt"], "body": p["body"],
        }
        for p in C.POSTS
    ],
    "faq": [
        {"q": {"ro": qr, "en": qe}, "a": {"ro": ar, "en": ae}}
        for (qr, ar), (qe, ae) in zip(C.FAQ["ro"], C.FAQ["en"])
    ],
    "pages": both(C.PAGES),
    "contact": {
        "phone": C.SITE["phone"],
        "email": C.SITE["email"],
        "facebook": C.SITE["facebook"],
        "messenger": C.SITE["messenger"],
        "instagram": C.SITE["instagram"],
        "instagram_handle": C.SITE["instagram_handle"],
        "area": {"ro": C.PAGES["ro"]["area"], "en": C.PAGES["en"]["area"]},
        "notes": {"ro": C.PAGES["ro"]["contact_side"], "en": C.PAGES["en"]["contact_side"]},
        "intro": {"ro": C.PAGES["ro"]["contact"][1], "en": C.PAGES["en"]["contact"][1]},
    },
}

out = os.path.join(os.path.dirname(__file__), "worker", "seed.json")
os.makedirs(os.path.dirname(out), exist_ok=True)
with open(out, "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=1)
print("wrote", out)
