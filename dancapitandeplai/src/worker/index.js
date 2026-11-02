// Cloudflare Pages advanced-mode worker for Dan's site.
// Public pages are rendered from KV content; /api is the admin REST API;
// everything else (CSS, JS, placeholder images, /admin) is a static asset.
import { route, sitemap, notFound, BEACON } from "./render.js";
import { handleApi, getContent, serveMedia, json, isInternal, NOSTATS_COOKIE, recordHit } from "./api.js";

const SEC_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
};

const PREVIEW_HOST = "dancapitandeplai.pages.dev";
const CANONICAL_ORIGIN = "https://dancapitandeplai.ro";

const html = (body, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SEC_HEADERS } });

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const p = url.pathname;
    // Public pages on the old preview host move to the real domain (admin, API, media stay)
    if (url.hostname === PREVIEW_HOST && !/^\/(api|admin|assets|media)(\/|$)/.test(p)) {
      return Response.redirect(CANONICAL_ORIGIN + p + url.search, 301);
    }
    try {
      // Any page + ?nostats=1 stops counting this browser in the visitor stats (?nostats=0 undoes it)
      const ns = url.searchParams.get("nostats");
      if (ns === "1" || ns === "0") {
        url.searchParams.delete("nostats");
        return new Response(null, { status: 302, headers: { location: url.pathname + url.search, "set-cookie": ns === "1" ? NOSTATS_COOKIE : "nostats=; Path=/; Max-Age=0", "cache-control": "no-store" } });
      }
      if (p.startsWith("/api/")) return await handleApi(req, env, url);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });

      const media = await serveMedia(env, p, ctx, req);
      if (media) return media;

      if (p.startsWith("/assets/") || p.startsWith("/admin") || p === "/robots.txt" || p === "/favicon.ico") {
        if (p === "/admin") return Response.redirect(url.origin + "/admin/", 301);
        const res = await env.ASSETS.fetch(req);
        const out = new Response(res.body, res);
        if (p.startsWith("/assets/")) out.headers.set("cache-control", "public, max-age=31536000, immutable");
        if (p.startsWith("/admin")) { out.headers.set("cache-control", "no-store"); out.headers.set("x-robots-tag", "noindex"); out.headers.set("x-frame-options", "DENY"); }
        return out;
      }

      const c = await getContent(env, ctx);
      if (p === "/sitemap.xml") return new Response(sitemap(c), { headers: { "content-type": "application/xml" } });
      // Paths without a trailing slash go to the slash version
      if (!p.endsWith("/") && !p.includes(".")) return Response.redirect(url.origin + p + "/" + url.search, 301);
      const page = route(c, p);
      // Admin devices and test browsers get the page without the analytics beacon
      const strip = s => (isInternal(req) ? s.split(BEACON).join("") : s);
      if (page && req.method === "GET" && !isInternal(req)) ctx.waitUntil(recordHit(env, req, url));
      return page ? html(strip(page)) : html(strip(notFound(c)), 404);
    } catch (err) {
      if (p.startsWith("/api/")) return json({ error: "server_error" }, 500);
      return new Response("Something went wrong", { status: 500 });
    }
  },
};
