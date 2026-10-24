# dancapitandeplai.ro

Photography portfolio for Dan Căpitan de Plai (Daniel Lupu), wedding photographer in Brașov.
Romanian at `/`, English at `/en/`. Hosted on Cloudflare Pages (project `dancapitandeplai`, this branch).

## How it works

- `public/_worker.js` (Pages advanced mode, bundled from `src/worker/`) renders every page from the
  content JSON stored in KV (`CONTENT` binding, key `site`). Until the first save it uses `src/worker/seed.json`.
- `/admin/` is the admin panel (static files) talking to a JSON REST API under `/api/`:
  - `POST /api/auth/login` → one-click 24 h session cookie (no email/password while the site is in preview; replace before launch)
  - `GET|PUT /api/content`, `POST /api/media` (image bytes), `POST /api/media/import` (from URL)
  - Images live in KV as `img:<id>` (full, max 2400 px) and `img:<id>-s` (900 px), served at `/media/<id>.jpg`.
- Hero has two photo sets: `desktop` (landscape) and `mobile` (portrait); the page picks by screen orientation.

## Settings (Pages project)

- `CONTENT` KV namespace
- `ADMIN_EMAILS`: who may log in (comma separated)

## Develop

```
npm install
npm run build   # seed.json + bundle public/_worker.js (commit the result; Pages has no build step)
npx wrangler pages dev public --kv CONTENT --binding MOCK_LOGIN_KEY=devkey --port 8788
```

Starting content lives in `src/content.py` (exported by `src/make_seed.py`).
