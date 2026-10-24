# dancapitandeplai.ro

Photography portfolio for Dan Căpitan de Plai (Daniel Lupu), wedding photographer in Brașov.
Static site, Romanian at `/`, English at `/en/`. Hosted on Cloudflare Pages.

- Content (texts, events, blog posts, FAQ): `src/content.py`
- Templates: `src/build.py`
- Output (served as-is, no build step on Pages): `public/`

## Rebuild

```
python3 src/build.py
```

Items marked PLACEHOLDER in `src/content.py` (photos, testimonials, events) wait for Dan's real material.
Layout adapted from the reference design "Home 2" of the ThemeGoods Photography theme.
