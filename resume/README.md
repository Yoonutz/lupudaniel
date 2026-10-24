# lupudaniel.pages.dev

Resume site for Daniel Lupu (Pages project `lupudaniel`, root directory `resume/` on `main`), served by a Cloudflare Pages advanced-mode worker (`public/_worker.js`).

- Content lives in Cloudflare KV (`CONTENT` binding, key `state`). `src/state.default.json` is only the starting content.
- Admin: click the hero photo 5 times, sign in. First sign-in forces a password change (stored hashed in KV, key `auth`).
- CV PDFs: `/cv/ro.pdf`, `/cv/en.pdf`. Defaults are built in; the admin can replace them (stored in KV `cv:ro` / `cv:en`).
- Secrets (Pages project settings): `INIT_USER`, `INIT_PASS_SHA256`, `SESSION_SECRET`.

## Rebuild

```
(CV PDFs: generated in the browser by cvDoc() in src/main.js; src/cv-*.pdf are the fallback copies.)
cd resume && python3 src/build.py public
```
