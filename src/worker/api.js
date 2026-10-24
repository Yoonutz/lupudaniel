// REST API for the admin panel: one-click login, content, media.
// Bindings: CONTENT (KV); vars: ADMIN_EMAILS (comma separated).
import SEED from "./seed.json";

const SESSION_TTL = 24 * 3600; // Dan logs in once a day
const MAX_IMAGE = 8 * 1024 * 1024;

const enc = new TextEncoder();
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
const randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const sha256 = async s => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));

export const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });

const adminEmails = env => String(env.ADMIN_EMAILS || "lupudaniel.foto@gmail.com").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);

// ---------- content ----------

export async function getContent(env) {
  const saved = await env.CONTENT.get("site", "json");
  return saved ? { ...SEED, ...saved } : SEED;
}

// ---------- sessions ----------

function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}

export async function session(req, env) {
  const sid = cookie(req, "sid");
  if (!sid || !/^[0-9a-f]{64}$/.test(sid)) return null;
  return env.CONTENT.get("sess:" + await sha256(sid), "json");
}

async function readJson(req, max) {
  const text = await req.text();
  if (text.length > max) throw new Error("too_large");
  return JSON.parse(text);
}

// One-click login while the site is being built: no email, no password.
// Swap for a real login (email link or password) before launch.
async function quickLogin(req, env) {
  const email = adminEmails(env)[0];
  const sid = randomToken();
  await env.CONTENT.put("sess:" + await sha256(sid), JSON.stringify({ email, at: Date.now() }), { expirationTtl: SESSION_TTL });
  return json({ ok: true, email }, 200, {
    "set-cookie": `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`,
  });
}

async function logout(req, env) {
  const sid = cookie(req, "sid");
  if (sid && /^[0-9a-f]{64}$/.test(sid)) await env.CONTENT.delete("sess:" + await sha256(sid));
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
    lines: { ro: list(c.hero.lines && c.hero.lines.ro, 10).map(l => ({ title: str(l.title, 140), sub: str(l.sub, 140) })),
             en: list(c.hero.lines && c.hero.lines.en, 10).map(l => ({ title: str(l.title, 140), sub: str(l.sub, 140) })) },
  };
  const cats = Object.keys(base.categories.ro);
  if (c.events) out.events = uniqueSlugs(list(c.events, 200).map(ev => ({
    id: str(ev.id, 40) || randomToken().slice(0, 12), slug: str(ev.slug, 80),
    cat: cats.includes(ev.cat) ? ev.cat : cats[0], venue: str(ev.venue, 120),
    cover: imgRef(ev.cover), photos: imgList(ev.photos, 300),
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
  const current = await getContent(env);
  const next = cleanContent(body, current);
  await env.CONTENT.put("site", JSON.stringify(next));
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
  await env.CONTENT.put(`img:${id}${variant}`, buf, { metadata: { type, ...meta } });
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
  if (m === "PUT" && p === "/api/content") return saveContent(req, env);
  if (m === "POST" && p === "/api/media") return uploadMedia(req, env, url.searchParams);
  if (m === "POST" && p === "/api/media/import") return importMedia(req, env);
  return json({ error: "not_found" }, 404);
}
