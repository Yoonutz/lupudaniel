// Cloudflare Pages advanced-mode worker for lupudaniel.pages.dev.
// Serves the page with content from KV, and the admin API (login, password change, save).
// Bindings: CONTENT (KV), INIT_USER, INIT_PASS_SHA256, SESSION_SECRET (secrets).
const PAGE = __PAGE__;
const DEFAULT_STATE = __STATE__;
const IMAGES = __IMAGES__;
const CVS = __CVS__;
const SESSION_TTL = 4 * 3600;
const PBKDF2_ITER = 100000;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const b64u = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))) }
async function pbkdf2(pass, saltHex) {
  const key = await crypto.subtle.importKey("raw", enc.encode(pass), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16)));
  return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: PBKDF2_ITER }, key, 256));
}
function same(a, b) { if (a.length !== b.length) return false; let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i); return d === 0 }
async function hmac(env, data) {
  const key = await crypto.subtle.importKey("raw", enc.encode(env.SESSION_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64u(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}
async function makeToken(env) {
  const body = b64u(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + SESSION_TTL })));
  return body + "." + await hmac(env, body);
}
async function checkToken(env, req) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  const [body, sig] = t.split(".");
  if (!body || !sig || !same(sig, await hmac(env, body))) return false;
  try { return JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/"))).exp > Date.now() / 1000 } catch { return false }
}
async function getAuth(env) {
  const a = await env.CONTENT.get("auth", "json");
  return a || { user: env.INIT_USER, initial: true, mustChange: true };
}
async function readJson(req, max) {
  const text = await req.text();
  if (text.length > max) throw new Error("too_large");
  return JSON.parse(text);
}

async function login(req, env) {
  const ip = req.headers.get("cf-connecting-ip") || "unknown";
  const rlKey = "rl:" + ip;
  const tries = parseInt(await env.CONTENT.get(rlKey) || "0", 10);
  if (tries >= 10) return json({ error: "rate_limited" }, 429);
  let body; try { body = await readJson(req, 2000) } catch { return json({ error: "bad_request" }, 400) }
  const user = String(body.user || "").trim().toLowerCase(), pass = String(body.pass || "");
  const auth = await getAuth(env);
  let ok = user === auth.user;
  if (auth.initial) ok = ok && same(await sha256(pass.trim()), env.INIT_PASS_SHA256);
  else ok = ok && same(await pbkdf2(pass, auth.salt), auth.hash);
  if (!ok) { await env.CONTENT.put(rlKey, String(tries + 1), { expirationTtl: 900 }); return json({ error: "bad_credentials" }, 401) }
  return json({ token: await makeToken(env), mustChange: !!auth.mustChange });
}
async function changePassword(req, env) {
  if (!await checkToken(env, req)) return json({ error: "unauthorized" }, 401);
  let body; try { body = await readJson(req, 2000) } catch { return json({ error: "bad_request" }, 400) }
  const pass = String(body.pass || "");
  if (pass.length < 8) return json({ error: "short" }, 400);
  const auth = await getAuth(env);
  if (auth.initial && same(await sha256(pass.trim()), env.INIT_PASS_SHA256)) return json({ error: "same" }, 400);
  const salt = hex(crypto.getRandomValues(new Uint8Array(16)));
  await env.CONTENT.put("auth", JSON.stringify({ user: auth.user, salt, hash: await pbkdf2(pass, salt), mustChange: false }));
  return json({ ok: true });
}
// Text may only carry <strong>, <span> and filter marks <mark data-f="p|d|pd">; everything else is escaped. Links must be http(s).
function clean(v, key) {
  if (typeof v === "string") {
    if (key === "url") return /^https?:\/\/[^\s"'<>]+$/i.test(v) ? v : "#";
    return v.replace(/<(?!\/?(strong|span|mark)>|mark data-f="(p|d|pd)">)/gi, "&lt;").slice(0, 2000);
  }
  if (Array.isArray(v)) return v.slice(0, 100).map(x => clean(x));
  if (v && typeof v === "object") { const o = {}; for (const k of Object.keys(v).slice(0, 50)) o[k] = clean(v[k], k); return o }
  return v;
}
async function uploadCv(req, env, lang) {
  if (!await checkToken(env, req)) return json({ error: "unauthorized" }, 401);
  if ((await getAuth(env)).mustChange) return json({ error: "must_change" }, 403);
  if (lang !== "ro" && lang !== "en") return json({ error: "bad_lang" }, 400);
  const buf = await req.arrayBuffer();
  const head = new Uint8Array(buf.slice(0, 5));
  if (buf.byteLength > 5e6 || String.fromCharCode(...head) !== "%PDF-") return json({ error: "not_pdf" }, 400);
  await env.CONTENT.put("cv:" + lang, buf);
  return json({ ok: true });
}
async function save(req, env) {
  if (!await checkToken(env, req)) return json({ error: "unauthorized" }, 401);
  if ((await getAuth(env)).mustChange) return json({ error: "must_change" }, 403);
  let state; try { state = await readJson(req, 400000) } catch { return json({ error: "bad_request" }, 400) }
  if (!state || typeof state !== "object" || !state.hero || !state.exp || !state.contact) return json({ error: "bad_shape" }, 400);
  await env.CONTENT.put("state", JSON.stringify(clean(state)));
  return json({ ok: true });
}

const SEC_HEADERS = { "x-content-type-options": "nosniff", "referrer-policy": "strict-origin-when-cross-origin", "x-frame-options": "DENY" };
export default {
  async fetch(req, env) {
    const url = new URL(req.url), p = url.pathname;
    try {
      if (req.method === "POST") {
        if (p === "/api/login") return await login(req, env);
        if (p === "/api/password") return await changePassword(req, env);
        if (p === "/api/save") return await save(req, env);
        if (p === "/api/cv") return await uploadCv(req, env, url.searchParams.get("lang"));
        return json({ error: "not_found" }, 404);
      }
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      if (IMAGES[p]) {
        const [type, data] = IMAGES[p];
        const bin = Uint8Array.from(atob(data), c => c.charCodeAt(0));
        return new Response(bin, { headers: { "content-type": type, "cache-control": p === "/og.jpg" ? "public, max-age=86400" : "public, max-age=31536000, immutable", ...SEC_HEADERS } });
      }
      const cv = p.match(/^\/cv\/(ro|en)\.pdf$/);
      if (cv) {
        const stored = await env.CONTENT.get("cv:" + cv[1], "arrayBuffer");
        const bin = stored || Uint8Array.from(atob(CVS[cv[1]]), c => c.charCodeAt(0));
        return new Response(bin, { headers: { "content-type": "application/pdf", "content-disposition": `inline; filename="CV-Daniel-Lupu-${cv[1].toUpperCase()}.pdf"`, "cache-control": "no-cache", ...SEC_HEADERS } });
      }
      if (p !== "/" && p !== "/index.html") return Response.redirect(url.origin + "/", 302);
      const state = (await env.CONTENT.get("state")) || JSON.stringify(DEFAULT_STATE);
      const html = PAGE.replace("__STATE_JSON__", () => state.replace(/</g, "\\u003c"));
      return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", ...SEC_HEADERS } });
    } catch (e) {
      return json({ error: "server_error" }, 500);
    }
  }
};
