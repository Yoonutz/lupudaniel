# dancapitandeplai.ro

Photography portfolio for Dan Căpitan de Plai (Daniel Lupu), wedding photographer in Brașov.
Romanian at `/`, English at `/en/`. Hosted on Cloudflare Pages (project `dancapitandeplai`, this branch).

## How it works

- `public/_worker.js` (Pages advanced mode, bundled from `src/worker/`) renders every page from the
  content JSON stored in KV (`CONTENT` binding, key `site`). Until the first save it uses `src/worker/seed.json`.
- `/admin/` is the admin panel (static files) talking to a JSON REST API under `/api/`:
  - `POST /api/auth/login` → one-click 24 h session cookie, HMAC-signed (no KV ops). Only works from the private admin link `/admin/#key=<ADMIN_KEY>`; replace with email-link login before launch
  - `GET|PUT /api/content`, `POST /api/media` (image bytes), `POST /api/media/import` (from URL)
  - Images live in KV as `img:<id>` (full, max 2400 px) and `img:<id>-s` (900 px), served at `/media/<id>.jpg`.
- Hero has two photo sets: `desktop` (landscape) and `mobile` (portrait); the page picks by screen orientation.

## Settings (Pages project)

- `CONTENT` KV namespace
- `ADMIN_EMAILS`: who may log in (comma separated)
- `ADMIN_KEY` (secret): key in the private admin link. Change it to lock everyone out.

## Develop

```
npm install
npm run build   # seed.json + bundle public/_worker.js (commit the result; Pages has no build step)
npx wrangler pages dev public --kv CONTENT --binding ADMIN_KEY=devkey --port 8788
```

Starting content lives in `src/content.py` (exported by `src/make_seed.py`).

## KV free-tier budget

Workers KV free tier: 1,000 writes/deletes/lists per day, 100,000 reads per day, 1 GB.
The worker keeps KV traffic low: content JSON is cached in the isolate (30 s) and edge cache (60 s), sessions are signed cookies, images are served through the edge cache. Each uploaded photo costs 2 writes (full + small); saving costs 1 write + 1 list + a delete per orphaned image. Avoid bulk imports of more than ~400 photos per day.

## PageSpeed

Rule: PageSpeed scores stay above 90 on mobile and desktop. Check with `tools/pagespeed.sh` after every change.
Keep in mind: fonts are self-hosted (`/assets/fonts`, latin + Romanian subset) and CSS is inlined into `<head>`;
don't add render-blocking third-party CSS/JS, don't fade in or rebuild anything in the first screen,
and give images a size (attributes or `aspect-ratio`) so lazy ones don't pile into the first screen.
