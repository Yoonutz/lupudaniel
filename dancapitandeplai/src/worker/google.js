// Google Analytics 4 + Search Console numbers for the admin Statistici tab.
// Read-only service account, key JSON in Pages secret GOOGLE_SA_KEY. The service account
// is a Viewer on the GA4 property and a (restricted) user on the Search Console property.
// Results are cached at the edge for 15 minutes; Google is never called from public pages.

const GA4_PROPERTY = "561949087";
const GSC_SITE = "https://dancapitandeplai.ro/";
const SCOPES = "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly";

const b64url = buf => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
const b64urlStr = s => b64url(new TextEncoder().encode(s));

let tokenCache = null; // { token, exp } per isolate
async function accessToken(env) {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const sa = JSON.parse(env.GOOGLE_SA_KEY);
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64urlStr(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + unsigned + "." + b64url(sig),
  });
  if (!res.ok) throw new Error("google_token_" + res.status);
  const j = await res.json();
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

async function gpost(token, url, body) {
  const res = await fetch(url, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("google_api_" + res.status + "_" + (await res.text()).slice(0, 200));
  return res.json();
}

// Romanian calendar date, n days back
const roDate = n => new Date(Date.now() - n * 86400000).toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });

async function ga4(token, days) {
  const url = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:batchRunReports`;
  const range = { startDate: `${days - 1}daysAgo`, endDate: "today" };
  const prev = { startDate: `${2 * days - 1}daysAgo`, endDate: `${days}daysAgo` };
  const M = ["activeUsers", "sessions", "screenPageViews", "averageSessionDuration"].map(name => ({ name }));
  const r = await gpost(token, url, { requests: [
    { dateRanges: [range, prev], metrics: M },
    { dateRanges: [range], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
    { dateRanges: [range], dimensions: [{ name: "sessionSourceMedium" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: [range], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 },
  ] });
  const [tot, daily, src, pages] = r.reports;
  // Last 30 minutes (reports above lag a few hours behind)
  const rt = await gpost(token, `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runRealtimeReport`, { metrics: [{ name: "activeUsers" }] }).catch(() => null);
  const now30 = Number(rt?.rows?.[0]?.metricValues?.[0]?.value || 0);
  const pick = i => {
    // with two date ranges GA adds a dateRange dimension; rows may be missing when empty
    const row = (tot.rows || []).find(x => (x.dimensionValues || [])[0]?.value === `date_range_${i}`) || (i === 0 && !(tot.rows || [])[0]?.dimensionValues ? (tot.rows || [])[0] : null);
    const v = k => Number(row?.metricValues?.[k]?.value || 0);
    return { users: v(0), sessions: v(1), views: v(2), duration: Math.round(v(3)) };
  };
  const byDay = {};
  (daily.rows || []).forEach(x => { const d = x.dimensionValues[0].value; byDay[`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`] = { users: +x.metricValues[0].value, sessions: +x.metricValues[1].value }; });
  const dailyRows = [];
  for (let i = days - 1; i >= 0; i--) { const k = roDate(i); dailyRows.push({ key: k, users: byDay[k]?.users || 0, sessions: byDay[k]?.sessions || 0 }); }
  const list = (rep, metric) => (rep.rows || []).map(x => ({ key: x.dimensionValues[0].value, [metric]: +x.metricValues[0].value }));
  return { now30, total: pick(0), prev: pick(1), daily: dailyRows, sources: list(src, "sessions"), pages: list(pages, "views") };
}

async function gsc(token, days) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  // Search Console data arrives 2-3 days late; ask for the same number of days ending today
  const body = (dims, rowLimit) => ({ startDate: roDate(days - 1), endDate: roDate(0), dimensions: dims, rowLimit, dataState: "all" });
  const [tot, queries, pages, daily] = await Promise.all([
    gpost(token, url, body([], 1)),
    gpost(token, url, body(["query"], 10)),
    gpost(token, url, body(["page"], 8)),
    gpost(token, url, body(["date"], days)),
  ]);
  const t = (tot.rows || [])[0] || {};
  const row = x => ({ key: x.keys[0], clicks: x.clicks, impressions: x.impressions, position: Math.round(x.position * 10) / 10 });
  return {
    total: { clicks: t.clicks || 0, impressions: t.impressions || 0, ctr: t.ctr || 0, position: t.position ? Math.round(t.position * 10) / 10 : null },
    queries: (queries.rows || []).map(row),
    pages: (pages.rows || []).map(row),
    lastDay: (daily.rows || []).map(x => x.keys[0]).sort().pop() || null,
  };
}

export async function googleStats(env, params, json) {
  if (!env.GOOGLE_SA_KEY) return json({ error: "not_configured" }, 503);
  const days = params.get("days") === "30" ? 30 : 7;
  const key = `https://cache.internal/google-v1-${days}`;
  const cache = caches.default;
  if (params.get("fresh") !== "1") {
    const hit = await cache.match(key).catch(() => null);
    if (hit) return json(await hit.json());
  }
  const token = await accessToken(env);
  const [a, s] = await Promise.allSettled([ga4(token, days), gsc(token, days)]);
  // Details only in the worker log; the browser gets a short error per source
  if (a.status === "rejected") console.error("ga4_failed", a.reason);
  if (s.status === "rejected") console.error("gsc_failed", s.reason);
  const data = {
    ga4: a.status === "fulfilled" ? a.value : { error: "ga4_failed" },
    gsc: s.status === "fulfilled" ? s.value : { error: "gsc_failed" },
    at: new Date().toISOString(),
  };
  if (a.status === "fulfilled" && s.status === "fulfilled")
    await cache.put(key, new Response(JSON.stringify(data), { headers: { "cache-control": "max-age=900" } })).catch(() => {});
  return json(data);
}
