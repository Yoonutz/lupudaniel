// REST API for the admin panel: one-click login, content, media.
// Bindings: CONTENT (KV); vars: ADMIN_EMAILS (comma separated).
import SEED from "./seed.json";

const SESSION_TTL = 24 * 3600; // Dan logs in once a day
const MAX_IMAGE = 8 * 1024 * 1024;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

const adminEmails = env => String(env.ADMIN_EMAILS || "lupudaniel.foto@gmail.com").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);

// ---------- content ----------

// KV free tier counts every read, so the content JSON is cached in the isolate
// (30 s) and in the edge cache (60 s). Saving clears both for this location;
// other locations catch up within a minute.
const CONTENT_URL = "https://cache.internal/site";
let memo = { at: 0, data: null };
export async function getContent(env, ctx) {
  if (memo.data && Date.now() - memo.at < 30_000) return memo.data;
  const cache = caches.default;
  let saved = null;
  const hit = await cache.match(CONTENT_URL).catch(() => null);
  if (hit) saved = await hit.json();
  else {
    saved = await env.CONTENT.get("site", "json");
    const res = new Response(JSON.stringify(saved), { headers: { "content-type": "application/json", "cache-control": "max-age=60" } });
    const put = cache.put(CONTENT_URL, res).catch(() => {});
    ctx ? ctx.waitUntil(put) : await put;
  }
  const data = saved ? { ...SEED, ...saved } : SEED;
  memo = { at: Date.now(), data };
  return data;
}
async function forgetContent() {
  memo = { at: 0, data: null };
  await caches.default.delete(CONTENT_URL).catch(() => {});
}

// ---------- sessions ----------

function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

// Sessions are signed cookies (exp.signature), so logging in costs no KV writes
async function hmac(env, msg) {
  const secret = env.SESSION_SECRET || env.MOCK_LOGIN_KEY || env.ADMIN_KEY;
  if (!secret) throw new Error("no_session_secret");
  const key = await crypto.subtle.importKey("raw", enc.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
export async function session(req, env) {
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

// One-click login, but only from the private admin link (/admin/#key=...).
// The key is the ADMIN_KEY secret in the Pages project settings; without it nobody can log in.
// Swap for a real login (email link) before launch.
async function quickLogin(req, env) {
  const body = await readJson(req, 1000).catch(() => ({}));
  const given = String(body.key || ""), want = String(env.ADMIN_KEY || "");
  if (!want || await sha256(given) !== await sha256(want)) return json({ error: "bad_key" }, 403);
  const email = adminEmails(env)[0];
  const exp = String(Date.now() + SESSION_TTL * 1000);
  const sid = exp + "." + await hmac(env, exp);
  return json({ ok: true, email }, 200, {
    "set-cookie": `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
  });
}

async function logout() {
  return json({ ok: true }, 200, { "set-cookie": "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
}

// ---------- content validation ----------

const IMG_RE = /^\/(media\/[0-9a-f]{24}\.jpg|assets\/img\/[\w.-]+)$/;
const str = (v, max = 4000) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
const bi = (v, max) => ({ ro: str(v && v.ro, max), en: str(v && v.en, max) });
const biList = (v, max, n) => ({ ro: list(v && v.ro, n).map(x => str(x, max)), en: list(v && v.en, n).map(x => str(x, max)) });
const list = (v, n = 200) => (Array.isArray(v) ? v.slice(0, n) : []);
const imgRef = v => (IMG_RE.test(String(v || "")) ? String(v) : "");
const imgList = (v, n = 200) => list(v, n).map(imgRef).filter(Boolean);
const url = v => (/^https?:\/\/[^\s"'<>]+$/i.test(String(v || "")) ? String(v).slice(0, 500) : "");

// YouTube or Vimeo link → privacy-friendly player URL (null if it's neither)
export function videoEmbed(link) {
  const s = String(link || "").trim();
  let m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return { kind: "youtube", id: m[1], src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0` };
  m = s.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:\/([0-9a-f]{6,20}))?/i);
  if (m) return { kind: "vimeo", id: m[1], src: `https://player.vimeo.com/video/${m[1]}?autoplay=1${m[2] ? "&h=" + m[2] : ""}` };
  return null;
}

export function slugify(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "pagina";
}
function uniqueSlugs(items) {
  const seen = new Set();
  for (const it of items) {
    let base = slugify(it.slug || it.title.ro || it.title.en), s = base, n = 2;
    while (seen.has(s)) s = `${base}-${n++}`;
    seen.add(s); it.slug = s;
  }
  return items;
}

export function cleanContent(c, base) {
  const out = { ...base };
  if (c.hero) out.hero = {
    desktop: imgList(c.hero.desktop, 40), mobile: imgList(c.hero.mobile, 40),
    interval: Math.min(20, Math.max(5, Math.round(+c.hero.interval) || 5)),
    lines: { ro: list(c.hero.lines && c.hero.lines.ro, 10).map(l => ({ title: str(l.title, 140), sub: str(l.sub, 140) })),
             en: list(c.hero.lines && c.hero.lines.en, 10).map(l => ({ title: str(l.title, 140), sub: str(l.sub, 140) })) },
  };
  const cats = Object.keys(base.categories.ro);
  if (c.events) out.events = uniqueSlugs(list(c.events, 200).map(ev => ({
    id: str(ev.id, 40) || randomToken().slice(0, 12), slug: str(ev.slug, 80),
    cat: cats.includes(ev.cat) ? ev.cat : cats[0], venue: str(ev.venue, 120),
    cover: imgRef(ev.cover), photos: imgList(ev.photos, 300),
    video: videoEmbed(ev.video) ? url(ev.video) : "",
    title: bi(ev.title, 140), date: bi(ev.date, 60), intro: bi(ev.intro, 600),
  })));
  if (c.posts) out.posts = uniqueSlugs(list(c.posts, 300).map(p => ({
    id: str(p.id, 40) || randomToken().slice(0, 12), slug: str(p.slug, 80), cover: imgRef(p.cover),
    date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : new Date().toISOString().slice(0, 10),
    title: bi(p.title, 160), excerpt: bi(p.excerpt, 400), body: biList(p.body, 4000, 60),
  })));
  // Single photos on the home page: section tiles, about, profile, banner, Instagram strip
  if (c.tiles) out.tiles = list(base.tiles, 10).map(t => {
    const m = list(c.tiles, 10).find(x => x && x.key === t.key);
    return { ...t, img: (m && imgRef(m.img)) || t.img };
  });
  for (const k of ["portrait", "profile", "cta_img"]) if (k in c) out[k] = imgRef(c[k]) || base[k];
  if (c.instagram_imgs) out.instagram_imgs = imgList(c.instagram_imgs, 12);
  if (c.faq) out.faq = list(c.faq, 100).map(f => ({ q: bi(f.q, 300), a: bi(f.a, 2000) }));
  if (c.contact) out.contact = {
    phone: str(c.contact.phone, 40), email: str(c.contact.email, 120),
    facebook: url(c.contact.facebook), messenger: url(c.contact.messenger), instagram: url(c.contact.instagram),
    instagram_handle: str(c.contact.instagram_handle, 60),
    area: bi(c.contact.area, 200), intro: bi(c.contact.intro, 400), notes: biList(c.contact.notes, 400, 12),
  };
  return out;
}

// Images referenced anywhere in the content
function usedImages(c) {
  const s = JSON.stringify(c);
  return new Set((s.match(/\/media\/[0-9a-f]{24}\.jpg/g) || []).map(x => x.slice(7, 31)));
}

async function saveContent(req, env) {
  let body; try { body = await readJson(req, 2_000_000) } catch { return json({ error: "bad_request" }, 400) }
  const saved = await env.CONTENT.get("site", "json"); // fresh, not the cached copy
  const next = cleanContent(body, saved ? { ...SEED, ...saved } : SEED);
  await env.CONTENT.put("site", JSON.stringify(next));
  await forgetContent();
  // Drop uploaded images nothing points to any more
  const keep = usedImages(next);
  const listed = await env.CONTENT.list({ prefix: "img:" });
  await Promise.all(listed.keys.filter(k => !keep.has(k.name.slice(4, 28))).map(k => env.CONTENT.delete(k.name)));
  return json({ ok: true, content: next });
}

// ---------- media ----------

function isImage(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  const jpg = b[0] === 0xff && b[1] === 0xd8;
  const png = b[0] === 0x89 && b[1] === 0x50;
  const webp = String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  return jpg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
}

async function storeImage(env, id, variant, buf, meta = {}) {
  const type = isImage(buf);
  if (!type || buf.byteLength > MAX_IMAGE) return false;
  // size in metadata lets the storage meter add up bytes from one list call
  await env.CONTENT.put(`img:${id}${variant}`, buf, { metadata: { type, size: buf.byteLength, ...meta } });
  return true;
}

// Body = image bytes. ?id=<id>&v=s uploads the small variant for an existing id.
async function uploadMedia(req, env, params) {
  const buf = await req.arrayBuffer();
  const v = params.get("v") === "s" ? "-s" : "";
  let id = params.get("id");
  if (v) { if (!/^[0-9a-f]{24}$/.test(id || "")) return json({ error: "bad_id" }, 400) } else id = randomToken().slice(0, 24);
  const w = parseInt(params.get("w") || "0", 10), h = parseInt(params.get("h") || "0", 10);
  if (!await storeImage(env, id, v, buf, { w, h })) return json({ error: "bad_image" }, 400);
  return json({ ok: true, id, url: `/media/${id}.jpg` });
}

// Server-side import from a public image URL (used to seed from Instagram)
async function importMedia(req, env) {
  let body; try { body = await readJson(req, 4000) } catch { return json({ error: "bad_request" }, 400) }
  const src = url(body.url);
  if (!src) return json({ error: "bad_url" }, 400);
  const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) return json({ error: "fetch_failed", status: res.status }, 502);
  const buf = await res.arrayBuffer();
  const id = randomToken().slice(0, 24);
  if (!await storeImage(env, id, "", buf)) return json({ error: "bad_image" }, 400);
  return json({ ok: true, id, url: `/media/${id}.jpg` });
}

export async function serveMedia(env, path, ctx, req) {
  const m = path.match(/^\/media\/([0-9a-f]{24})(-s)?\.jpg$/);
  if (!m) return null;
  const cache = caches.default;
  const hit = await cache.match(req);
  if (hit) return hit;
  let { value, metadata } = await env.CONTENT.getWithMetadata(`img:${m[1]}${m[2] || ""}`, "arrayBuffer");
  if (!value && m[2]) ({ value, metadata } = await env.CONTENT.getWithMetadata(`img:${m[1]}`, "arrayBuffer"));
  if (!value) return new Response("Not found", { status: 404 });
  const res = new Response(value, { headers: { "content-type": (metadata && metadata.type) || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}

// ---------- storage meter ----------

// Free tier: 1 GB stored, 1,000 writes+deletes+lists a day (whole account), resets 00:00 UTC.
const KV_LIMIT_BYTES = 1e9, KV_LIMIT_WRITES = 1000;
const STATS_URL = "https://cache.internal/storage";

// Bytes of photos uploaded before sizes went into metadata, measured once (reads only)
// and kept in one KV key, so later refreshes cost a single list.
async function storageStats(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CONTENT.list({ prefix: "img:", cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  const known = (await env.CONTENT.get("sizes", "json")) || {};
  const missing = keys.filter(k => !(k.metadata && k.metadata.size) && !(k.name in known));
  // Stay well under the per-request KV call limit; any rest is measured on the next refresh
  const batch = missing.slice(0, 400);
  for (let i = 0; i < batch.length; i += 20) {
    await Promise.all(batch.slice(i, i + 20).map(async k => {
      const v = await env.CONTENT.get(k.name, "arrayBuffer");
      known[k.name] = v ? v.byteLength : 0;
    }));
  }
  const names = new Set(keys.map(k => k.name));
  for (const n of Object.keys(known)) if (!names.has(n)) delete known[n];
  if (batch.length) await env.CONTENT.put("sizes", JSON.stringify(known));
  const site = await env.CONTENT.get("site");
  let bytes = site ? enc.encode(site).byteLength : 0, photoBytes = 0;
  for (const k of keys) photoBytes += (k.metadata && k.metadata.size) || known[k.name] || 0;
  bytes += photoBytes;
  const photos = keys.filter(k => !k.name.endsWith("-s")).length;
  return {
    bytes, limit: KV_LIMIT_BYTES, photos,
    perPhoto: photos ? Math.round(photoBytes / photos) : 0, // full + small together
    pending: missing.length - batch.length,
    at: new Date().toISOString(),
  };
}

// Today's KV operations for the whole account, from Cloudflare's analytics API.
// Needs CF_API_TOKEN (Account Analytics: Read) and CF_ACCOUNT_ID; without them we skip it.
async function todaysOps(env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return null;
  const date = new Date().toISOString().slice(0, 10);
  const query = `query($a:String!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){
    kvOperationsAdaptiveGroups(limit:20,filter:{date:$d}){sum{requests} dimensions{actionType}}}}}`;
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { authorization: "Bearer " + env.CF_API_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { a: env.CF_ACCOUNT_ID, d: date } }),
    });
    const d = await res.json();
    const rows = d?.data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups;
    if (!rows) return null;
    const ops = { read: 0, write: 0, delete: 0, list: 0 };
    for (const r of rows) ops[r.dimensions.actionType] = (ops[r.dimensions.actionType] || 0) + r.sum.requests;
    return { ...ops, used: ops.write + ops.delete + ops.list, limit: KV_LIMIT_WRITES, date };
  } catch { return null; }
}

// Cached 10 minutes at the edge so opening the admin doesn't spend list operations.
// ?fresh=1 (the Refresh button) recounts.
async function storage(env, params) {
  const cache = caches.default;
  let stats = null;
  if (params.get("fresh") !== "1") {
    const hit = await cache.match(STATS_URL).catch(() => null);
    if (hit) stats = await hit.json();
  }
  if (!stats) {
    stats = await storageStats(env);
    await cache.put(STATS_URL, new Response(JSON.stringify(stats), { headers: { "cache-control": "max-age=600" } })).catch(() => {});
  }
  return json({ ...stats, ops: await todaysOps(env) });
}
const forgetStorage = () => caches.default.delete(STATS_URL).catch(() => {});

// ---------- router ----------

export async function handleApi(req, env, url) {
  const p = url.pathname, m = req.method;
  if (m === "POST" && p === "/api/auth/login") return quickLogin(req, env);
  if (m === "POST" && p === "/api/auth/logout") return logout(req, env);
  if (m === "GET" && p === "/api/content/public") return json(await getContent(env));

  const s = await session(req, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  // Mutations need a custom header, which cross-site forms can't send
  if (m !== "GET" && req.headers.get("x-admin") !== "1") return json({ error: "forbidden" }, 403);

  if (m === "GET" && p === "/api/auth/me") return json({ email: s.email });
  if (m === "GET" && p === "/api/content") return json(await getContent(env));
  if (m === "GET" && p === "/api/storage") return storage(env, url.searchParams);
  if (m === "PUT" && p === "/api/content") { await forgetStorage(); return saveContent(req, env); }
  if (m === "POST" && p === "/api/media") return uploadMedia(req, env, url.searchParams);
  if (m === "POST" && p === "/api/media/import") return importMedia(req, env);
  return json({ error: "not_found" }, 404);
}
