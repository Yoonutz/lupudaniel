// REST API for the admin panel: email-link login, content, media.
// Bindings: CONTENT (KV), MAILER (service -> dancapitandeplai-mailer); vars: ADMIN_EMAILS (comma separated).
import SEED from "./seed.json";

const SESSION_TTL = 24 * 3600; // Dan logs in once a day
const MAX_IMAGE = 8 * 1024 * 1024;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

const adminEmails = env => String(env.ADMIN_EMAILS || "lupudaniel.foto@gmail.com,ionut.filea@gmail.com").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);

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
  // Old saves still carry the sample reviews; show the real ones from the seed instead
  if (saved && /"(Exemplu|Sample) · /.test(JSON.stringify(saved.testimonials || ""))) data.testimonials = SEED.testimonials;
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
  const m = sid && sid.match(/^(\d{1,16})\.(\d{1,2})\.([0-9a-f]{64})$/);
  if (!m || Number(m[1]) < Date.now()) return null;
  const email = adminEmails(env)[Number(m[2])];
  if (!email || await hmac(env, m[1] + "." + email) !== m[3]) return null;
  return { email };
}

async function readJson(req, max) {
  const text = await req.text();
  if (text.length > max) throw new Error("too_large");
  return JSON.parse(text);
}

// ---------- login ----------
// Main login: magic link by email. Dan types his address, gets a link to
// /admin/#t=TOKEN (hash, so mail scanners never send it to the server), the
// admin page posts the token here and gets a 1-day session cookie.
// Token = nonce.exp.signature, valid 15 min, single use (nonce kept in KV).
// Emails go out through the MAILER service binding (Worker with send_email).
const LINK_TTL = 15 * 60;
const MAIL_COOLDOWN = 120; // one email per 2 min, caps KV writes and inbox spam

async function startSession(env, email) {
  const idx = adminEmails(env).indexOf(email);
  const exp = String(Date.now() + SESSION_TTL * 1000);
  const sid = exp + "." + idx + "." + await hmac(env, exp + "." + email);
  const res = json({ ok: true, email });
  res.headers.append("set-cookie", `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`);
  res.headers.append("set-cookie", NOSTATS_COOKIE);
  return res;
}

// Devices that have logged into admin (Dan, Ionut) are not counted in the visitor stats:
// public pages skip the analytics beacon while this cookie is there (1 year).
export const NOSTATS_COOKIE = "nostats=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000";
export const isInternal = req =>
  /(?:^|;\s*)nostats=1/.test(req.headers.get("cookie") || "") ||
  /HeadlessChrome|Playwright|Puppeteer|Lighthouse|PageSpeed|bot|crawler|spider/i.test(req.headers.get("user-agent") || "");

async function requestLink(req, env, url) {
  const body = await readJson(req, 1000).catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  // Same answer for unknown addresses, so the form doesn't reveal who is admin
  if (!adminEmails(env).includes(email)) return json({ ok: true });
  if (!env.MAILER) return json({ error: "mail_off" }, 503);
  if (await env.CONTENT.get("auth:cooldown")) return json({ error: "wait" }, 429);
  await env.CONTENT.put("auth:cooldown", "1", { expirationTtl: MAIL_COOLDOWN });
  const nonce = randomToken().slice(0, 32);
  const exp = String(Date.now() + LINK_TTL * 1000);
  const token = `${nonce}.${exp}.${await hmac(env, "link:" + nonce + "." + exp + "." + email)}`;
  const link = `${url.origin}/admin/#t=${token}`;
  const res = await env.MAILER.fetch("https://mailer/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: email,
      subject: "Link de intrare în admin · Dan Căpitan de Plai",
      text: `Salut,\n\nApasă linkul de mai jos ca să intri în panoul de admin al site-ului:\n\n${link}\n\nLinkul merge o singură dată și expiră în 15 minute. Dacă nu ai cerut tu linkul, ignoră acest email.\n`,
    }),
  });
  if (!res.ok) return json({ error: "mail_failed" }, 502);
  return json({ ok: true });
}

async function verifyLink(req, env) {
  const body = await readJson(req, 1000).catch(() => ({}));
  const m = String(body.token || "").match(/^([0-9a-f]{32})\.(\d{1,16})\.([0-9a-f]{64})$/);
  if (!m || Number(m[2]) < Date.now()) return json({ error: "bad_link" }, 403);
  let email = null;
  for (const e of adminEmails(env)) if (await hmac(env, "link:" + m[1] + "." + m[2] + "." + e) === m[3]) email = e;
  if (!email) return json({ error: "bad_link" }, 403);
  if (await env.CONTENT.get("auth:used:" + m[1])) return json({ error: "bad_link" }, 403);
  await env.CONTENT.put("auth:used:" + m[1], "1", { expirationTtl: LINK_TTL + 60 });
  return startSession(env, email);
}

// Backup login from a private link (/admin/#key=...), only while the ADMIN_KEY
// secret exists. Delete ADMIN_KEY in Cloudflare to turn it off.
async function quickLogin(req, env) {
  const body = await readJson(req, 1000).catch(() => ({}));
  const given = await sha256(String(body.key || ""));
  const want = String(env.ADMIN_KEY || ""), dev = String(env.DEV_LOGIN_KEY || "");
  if (want && given === await sha256(want)) return startSession(env, adminEmails(env)[0]);
  // Developer login (Claude checking changes live) without emailing anyone. DEV_LOGIN_KEY is a
  // Pages secret, rotated whenever needed; delete it in Cloudflare to turn this off.
  if (dev.length >= 32 && given === await sha256(dev)) {
    const list = adminEmails(env), who = list.includes("ionut.filea@gmail.com") ? "ionut.filea@gmail.com" : list[0];
    return startSession(env, who);
  }
  return json({ error: "bad_key" }, 403);
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
  if (m) return { kind: "vimeo", id: m[1], hash: m[2] || "", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1${m[2] ? "&h=" + m[2] : ""}` };
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
  if (c.testimonials) {
    const tl = v => list(v, 30).map(x => ({ img: imgRef(x && x.img), quote: str(x && x.quote, 800), who: str(x && x.who, 120) })).filter(x => x.quote);
    out.testimonials = { ro: tl(c.testimonials.ro), en: tl(c.testimonials.en) };
  }
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

// ---------- own visitor counter (D1, binding VISITORS) ----------
// One row per real page view in table `views`: Romanian day, time, an anonymous visitor id
// (HMAC of IP + browser, never stored raw), whether it entered from outside (= a visit),
// English or not, page, where the visit came from, country and device type.
// EVERY number on the Statistici tab comes from this table, so tiles, chart and the four
// breakdowns always add up. (Table `hits` = the first rows, before the details were kept.)
// D1 free tier: 100k writes/day, separate from the KV limits.
const VIEWS_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS views (day TEXT NOT NULL, ts INTEGER NOT NULL, vid TEXT NOT NULL, entry INTEGER NOT NULL, en INTEGER NOT NULL, path TEXT NOT NULL, ref TEXT NOT NULL, country TEXT NOT NULL, device TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS views_day ON views(day)",
];
let viewsReady = false;
async function ensureViews(db) {
  if (viewsReady) return;
  await db.batch(VIEWS_SCHEMA.map(q => db.prepare(q)));
  viewsReady = true;
}
const roDay = d => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
// Link previews and scripts fetch pages too, but they aren't people
const NOT_A_PERSON = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|telegram|discord|skype|curl|wget|python|httpx|go-http|java\/|okhttp|node-fetch|axios|undici|headless|playwright|puppeteer|lighthouse|pagespeed/i;
const deviceOf = ua =>
  /iPad|Tablet|Kindle|Silk|PlayBook|Android(?!.*Mobile)/i.test(ua) ? "tablet" : /Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua) ? "mobile" : "desktop";

export async function recordHit(env, req, url) {
  if (!env.VISITORS) return;
  const purpose = req.headers.get("sec-purpose") || req.headers.get("purpose") || "";
  if (/prefetch|prerender/i.test(purpose)) return;
  const ip = req.headers.get("cf-connecting-ip") || "", ua = req.headers.get("user-agent") || "";
  if (!ip || !ua || NOT_A_PERSON.test(ua)) return;
  // Real browsers ask for a web page; scripts usually ask for "anything"
  if (!/text\/html/.test(req.headers.get("accept") || "")) return;
  const vid = (await hmac(env, "visitor:" + ip + "|" + ua)).slice(0, 20);
  let refHost = "";
  try { refHost = new URL(req.headers.get("referer") || "").hostname.toLowerCase(); } catch {}
  const inside = /(^|\.)dancapitandeplai\.(ro|pages\.dev)$/.test(refHost);
  const entry = inside ? 0 : 1;
  const en = /^\/en(\/|$)/.test(url.pathname) ? 1 : 0;
  const now = new Date();
  const db = env.VISITORS;
  try {
    await ensureViews(db);
    await db.prepare("INSERT INTO views (day, ts, vid, entry, en, path, ref, country, device) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)")
      .bind(roDay(now), now.getTime(), vid, entry, en, url.pathname.slice(0, 300), inside ? "" : refHost.slice(0, 100),
        String(req.cf?.country || "").slice(0, 2), deviceOf(ua)).run();
  } catch (e) { console.error("record_hit_failed", e); }
}

async function ownStats(env, days, since) {
  if (!env.VISITORS) return null;
  const db = env.VISITORS;
  await ensureViews(db);
  const now = Date.now(), d = n => roDay(new Date(now - n * 864e5));
  const from = d(days - 1), prevFrom = d(2 * days - 1), sinceMs = Date.parse(since) || 0;
  // Old rows (table hits) have no page/country/device: they show up as "(necunoscut)"
  const ALL = `(SELECT day, ts, vid, entry, en, path, ref, country, device FROM views WHERE ts >= ${sinceMs}
    UNION ALL SELECT day, NULL, vid, entry, en, '(necunoscut)', '(necunoscut)', '(necunoscut)', '(necunoscut)' FROM hits)`;
  const q = (sql, ...args) => db.prepare(sql.replace("ALL", ALL)).bind(...args);
  const by = (col, metric, limit) =>
    q(`SELECT ${col} AS key, count(*) AS views, sum(entry) AS visits FROM ALL WHERE day >= ?1 GROUP BY ${col} HAVING ${metric} > 0 ORDER BY ${metric} DESC, views DESC LIMIT ${limit}`, from);
  const res = await db.batch([
    q("SELECT day, count(*) AS views, sum(entry) AS visits, count(DISTINCT vid) AS uniques FROM ALL WHERE day >= ?1 GROUP BY day", from),
    q("SELECT count(*) AS views, coalesce(sum(entry),0) AS visits, count(DISTINCT vid) AS uniques, coalesce(sum(en),0) AS en FROM ALL WHERE day >= ?1", from),
    q("SELECT count(*) AS views, coalesce(sum(entry),0) AS visits, count(DISTINCT vid) AS uniques FROM ALL WHERE day >= ?1 AND day < ?2", prevFrom, from),
    by("path", "views", 10),
    by("ref", "visits", 8),
    by("country", "visits", 8),
    by("device", "visits", 10),
  ]);
  const [byDay, tot, prev, pages, refs, countries, devices] = res.map(r => r.results);
  const map = new Map(byDay.map(r => [r.day, r]));
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = d(i), r = map.get(k);
    daily.push({ key: k, views: r ? r.views : 0, visits: r ? r.visits : 0, uniques: r ? r.uniques : 0 });
  }
  const t = tot[0], p = prev[0];
  return {
    days, from, to: d(0), since, own: true,
    daily,
    total: { views: t.views, visits: t.visits, uniques: t.uniques },
    prev: { views: p.views, visits: p.visits, uniques: p.uniques },
    lang: { ro: t.views - t.en, en: t.en },
    pages, refs, countries, devices,
    at: new Date().toISOString(),
  };
}

// ---------- visitor stats (admin tab Statistici) ----------
// Cloudflare Web Analytics (cookieless beacon on every public page), read via the
// GraphQL API with a read-only token. Needs CF_ANALYTICS_TOKEN (Account Analytics: Read)
// and CF_ACCOUNT_ID. Cached 15 min at the edge per range: no KV operations at all.
const RUM_SITE_TAG = "82c2176da79d4d8189e726ad2152c15d"; // dancapitandeplai.ro
const SITE_HOST = "dancapitandeplai.ro";
const DEFAULT_SINCE = "2026-11-02T14:45:00Z";
const day = d => d.toISOString().slice(0, 10);

async function rumQuery(env, days) {
  const now = new Date();
  const from = new Date(now.getTime() - (days - 1) * 864e5);
  const prevFrom = new Date(from.getTime() - days * 864e5);
  // Test browsers (headless Chrome, used to check the site after changes) are left out.
  // Cloudflare samples long ranges more coarsely (30 days came back lower than 7),
  // so ask in 7-day pieces and add them up. All pieces go in one request
  // (30 days = 30 sub-queries; the API allows ~300 per 5 min, and results are cached 15 min).
  // Only the real domain (pages.dev only served tests before launch) and only from
  // STATS_SINCE on: everything before was us testing the launch, not visitors.
  const since = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(env.STATS_SINCE || "") ? env.STATS_SINCE : DEFAULT_SINCE;
  const pieces = start => {
    const out = [];
    for (let i = 0; i < days; i += 7) {
      const a = new Date(start.getTime() + i * 864e5), b = new Date(start.getTime() + Math.min(i + 6, days - 1) * 864e5);
      if (since && since.slice(0, 10) > day(b)) { out.push(null); continue; } // whole piece before the start
      out.push(`{siteTag:$s, requestHost:"${SITE_HOST}", date_geq:"${day(a)}", date_leq:"${day(b)}", datetime_geq:"${since}", userAgentBrowser_neq:"ChromeHeadless"}`);
    }
    return out;
  };
  const g = (alias, f, dims, order, limit) =>
    `${alias}: rumPageloadEventsAdaptiveGroups(limit:${limit}, filter:${f}${order ? `, orderBy:[${order}]` : ""}){count sum{visits}${dims ? ` dimensions{${dims}}` : ""}}`;
  const parts = [];
  pieces(prevFrom).forEach((f, i) => f && parts.push(g(`prev${i}`, f, "", "", 1)));
  pieces(from).forEach((f, i) => f && parts.push(
    g(`daily${i}`, f, "date", "date_ASC", 10),
    g(`pages${i}`, f, "requestPath", "count_DESC", 500),
    g(`countries${i}`, f, "countryName", "sum_visits_DESC", 50),
    g(`devices${i}`, f, "deviceType", "sum_visits_DESC", 10),
    g(`refs${i}`, f, "refererHost", "sum_visits_DESC", 50)));
  const query = `query($a:String!,$s:String!){viewer{accounts(filter:{accountTag:$a}){\n${parts.join("\n")}\n}}}`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: "Bearer " + env.CF_ANALYTICS_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { a: env.CF_ACCOUNT_ID, s: env.CF_RUM_SITE_TAG || RUM_SITE_TAG } }),
  });
  const d = await res.json().catch(() => ({}));
  const acc = d?.data?.viewer?.accounts?.[0];
  if (!acc) throw new Error((d?.errors?.[0]?.message || "HTTP " + res.status).slice(0, 200));
  // Glue the pieces back together: rows with the same key (date, page, country…) are added up
  const n = Math.ceil(days / 7), a = {};
  for (const name of ["prev", "daily", "pages", "countries", "devices", "refs"]) {
    const merged = new Map();
    for (let i = 0; i < n; i++) for (const r of acc[name + i] || []) {
      const k = JSON.stringify(r.dimensions || {});
      const m = merged.get(k) || { dimensions: r.dimensions, count: 0, sum: { visits: 0 } };
      m.count += r.count; m.sum.visits += r.sum.visits; merged.set(k, m);
    }
    a[name] = [...merged.values()];
  }
  // Total = sum of the days, so the chart and the big number always agree
  a.total = [a.daily.reduce((t, r) => ({ count: t.count + r.count, sum: { visits: t.sum.visits + r.sum.visits } }), { count: 0, sum: { visits: 0 } })];
  const bySum = (x, y) => y.sum.visits - x.sum.visits || y.count - x.count;
  a.pages.sort((x, y) => y.count - x.count);
  for (const k of ["countries", "devices", "refs"]) a[k].sort(bySum);
  const sum = rows => ({ views: rows?.[0]?.count || 0, visits: rows?.[0]?.sum?.visits || 0 });
  const rows = (list, key) => (list || []).map(r => ({ key: r.dimensions[key] || "", views: r.count, visits: r.sum.visits }));
  // Every day in the range, zero when nobody came
  const byDate = new Map(rows(a.daily, "date").map(r => [r.key, r]));
  const daily = [];
  for (let t = from.getTime(); t <= now.getTime() + 1; t += 864e5) {
    const k = day(new Date(t));
    daily.push(byDate.get(k) || { key: k, views: 0, visits: 0 });
  }
  const pages = rows(a.pages, "requestPath");
  const lang = { ro: 0, en: 0 };
  for (const p of pages) lang[/^\/en(\/|$)/.test(p.key) ? "en" : "ro"] += p.views;
  return {
    days, from: day(from), to: day(now), since,
    total: sum(a.total), prev: sum(a.prev), daily, lang,
    pages: pages.slice(0, 10),
    // Visits only start on a page opened from outside, so rows with 0 visits are clicks inside the site
    countries: rows(a.countries, "countryName").filter(r => r.visits).slice(0, 8),
    devices: rows(a.devices, "deviceType").filter(r => r.visits),
    refs: rows(a.refs, "refererHost").filter(r => r.visits && !/(^|\.)dancapitandeplai\.(ro|pages\.dev)$/.test(r.key)).slice(0, 8),
    at: new Date().toISOString(),
  };
}

const lastStats = {};
async function analytics(env, params) {
  const days = params.get("days") === "30" ? 30 : 7;
  const since = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(env.STATS_SINCE || "") ? env.STATS_SINCE : DEFAULT_SINCE;
  // Own counter (D1) is the one source for every number. Cloudflare Web Analytics is
  // only the fallback when the D1 binding is missing.
  if (env.VISITORS) {
    try { return json(await ownStats(env, days, since)); }
    catch (e) { console.error("own_stats_failed", e); return json({ error: "analytics_failed" }, 502); }
  }
  if (!env.CF_ANALYTICS_TOKEN || !env.CF_ACCOUNT_ID) return json({ error: "not_configured" }, 503);
  const key = `https://cache.internal/analytics-v2-${days}`;
  const cache = caches.default;
  if (params.get("fresh") !== "1") {
    const hit = await cache.match(key).catch(() => null);
    if (hit) return json(await hit.json());
  }
  let data;
  try {
    data = await rumQuery(env, days);
    lastStats[days] = data;
  }
  catch (e) {
    // e.g. Cloudflare's rate limit: show the last numbers this worker had rather than an error
    if (lastStats[days]) return json(lastStats[days]);
    // Details go to the worker log only, never to the browser.
    console.error("analytics_failed", e);
    return json({ error: "analytics_failed" }, 502);
  }
  await cache.put(key, new Response(JSON.stringify(data), { headers: { "cache-control": "max-age=300" } })).catch(() => {});
  return json(data);
}

// ---------- router ----------

export async function handleApi(req, env, url) {
  const p = url.pathname, m = req.method;
  if (m === "POST" && p === "/api/auth/login") return quickLogin(req, env);
  if (m === "POST" && p === "/api/auth/request") return requestLink(req, env, url);
  if (m === "POST" && p === "/api/auth/verify") return verifyLink(req, env);
  if (m === "POST" && p === "/api/auth/logout") return logout(req, env);
  if (m === "GET" && p === "/api/content/public") return json(await getContent(env));

  const s = await session(req, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  // Mutations need a custom header, which cross-site forms can't send
  if (m !== "GET" && req.headers.get("x-admin") !== "1") return json({ error: "forbidden" }, 403);

  if (m === "GET" && p === "/api/auth/me") return json({ email: s.email }, 200, { "set-cookie": NOSTATS_COOKIE });
  if (m === "GET" && p === "/api/content") return json(await getContent(env));
  if (m === "GET" && p === "/api/storage") return storage(env, url.searchParams);
  if (m === "GET" && p === "/api/analytics") return analytics(env, url.searchParams);
  if (m === "PUT" && p === "/api/content") { await forgetStorage(); return saveContent(req, env); }
  if (m === "POST" && p === "/api/media") return uploadMedia(req, env, url.searchParams);
  if (m === "POST" && p === "/api/media/import") return importMedia(req, env);
  return json({ error: "not_found" }, 404);
}
