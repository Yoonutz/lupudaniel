// src/worker/google.js
var GA4_PROPERTY = "561949087";
var GSC_SITE = "https://dancapitandeplai.ro/";
var SCOPES = "https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/webmasters.readonly";
var b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
var b64urlStr = (s) => b64url(new TextEncoder().encode(s));
var tokenCache = null;
async function accessToken(env) {
  if (tokenCache && tokenCache.exp > Date.now() + 6e4) return tokenCache.token;
  const sa = JSON.parse(env.GOOGLE_SA_KEY);
  const pem = sa.private_key.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  const der = Uint8Array.from(atob(pem), (c) => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("pkcs8", der, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1e3);
  const unsigned = b64urlStr(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." + b64urlStr(JSON.stringify({ iss: sa.client_email, scope: SCOPES, aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(unsigned));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: "grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=" + unsigned + "." + b64url(sig)
  });
  if (!res.ok) throw new Error("google_token_" + res.status);
  const j = await res.json();
  tokenCache = { token: j.access_token, exp: Date.now() + (j.expires_in || 3600) * 1e3 };
  return tokenCache.token;
}
async function gpost(token, url2, body) {
  const res = await fetch(url2, { method: "POST", headers: { authorization: "Bearer " + token, "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("google_api_" + res.status + "_" + (await res.text()).slice(0, 200));
  return res.json();
}
var roDate = (n) => new Date(Date.now() - n * 864e5).toLocaleDateString("en-CA", { timeZone: "Europe/Bucharest" });
async function ga4(token, days) {
  const url2 = `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:batchRunReports`;
  const range = { startDate: `${days - 1}daysAgo`, endDate: "today" };
  const prev = { startDate: `${2 * days - 1}daysAgo`, endDate: `${days}daysAgo` };
  const M = ["activeUsers", "sessions", "screenPageViews", "averageSessionDuration"].map((name) => ({ name }));
  const r2 = await gpost(token, url2, { requests: [
    { dateRanges: [range, prev], metrics: M },
    { dateRanges: [range], dimensions: [{ name: "date" }], metrics: [{ name: "activeUsers" }, { name: "sessions" }], orderBys: [{ dimension: { dimensionName: "date" } }] },
    { dateRanges: [range], dimensions: [{ name: "sessionSourceMedium" }], metrics: [{ name: "sessions" }], orderBys: [{ metric: { metricName: "sessions" }, desc: true }], limit: 8 },
    { dateRanges: [range], dimensions: [{ name: "pagePath" }], metrics: [{ name: "screenPageViews" }], orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }], limit: 8 }
  ] });
  const [tot, daily, src, pages] = r2.reports;
  const rt = await gpost(token, `https://analyticsdata.googleapis.com/v1beta/properties/${GA4_PROPERTY}:runRealtimeReport`, { metrics: [{ name: "activeUsers" }] }).catch(() => null);
  const now30 = Number(rt?.rows?.[0]?.metricValues?.[0]?.value || 0);
  const pick = (i) => {
    const row = (tot.rows || []).find((x) => (x.dimensionValues || [])[0]?.value === `date_range_${i}`) || (i === 0 && !(tot.rows || [])[0]?.dimensionValues ? (tot.rows || [])[0] : null);
    const v = (k) => Number(row?.metricValues?.[k]?.value || 0);
    return { users: v(0), sessions: v(1), views: v(2), duration: Math.round(v(3)) };
  };
  const byDay = {};
  (daily.rows || []).forEach((x) => {
    const d = x.dimensionValues[0].value;
    byDay[`${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6)}`] = { users: +x.metricValues[0].value, sessions: +x.metricValues[1].value };
  });
  const dailyRows = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = roDate(i);
    dailyRows.push({ key: k, users: byDay[k]?.users || 0, sessions: byDay[k]?.sessions || 0 });
  }
  const list2 = (rep, metric) => (rep.rows || []).map((x) => ({ key: x.dimensionValues[0].value, [metric]: +x.metricValues[0].value }));
  return { now30, total: pick(0), prev: pick(1), daily: dailyRows, sources: list2(src, "sessions"), pages: list2(pages, "views") };
}
async function gsc(token, days) {
  const url2 = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`;
  const body = (dims, rowLimit) => ({ startDate: roDate(days - 1), endDate: roDate(0), dimensions: dims, rowLimit, dataState: "all" });
  const [tot, queries, pages, daily] = await Promise.all([
    gpost(token, url2, body([], 1)),
    gpost(token, url2, body(["query"], 10)),
    gpost(token, url2, body(["page"], 8)),
    gpost(token, url2, body(["date"], days))
  ]);
  const t2 = (tot.rows || [])[0] || {};
  const row = (x) => ({ key: x.keys[0], clicks: x.clicks, impressions: x.impressions, position: Math.round(x.position * 10) / 10 });
  return {
    total: { clicks: t2.clicks || 0, impressions: t2.impressions || 0, ctr: t2.ctr || 0, position: t2.position ? Math.round(t2.position * 10) / 10 : null },
    queries: (queries.rows || []).map(row),
    pages: (pages.rows || []).map(row),
    lastDay: (daily.rows || []).map((x) => x.keys[0]).sort().pop() || null
  };
}
async function googleStats(env, params, json2) {
  if (!env.GOOGLE_SA_KEY) return json2({ error: "not_configured" }, 503);
  const days = params.get("days") === "30" ? 30 : 7;
  const key = `https://cache.internal/google-v1-${days}`;
  const cache = caches.default;
  if (params.get("fresh") !== "1") {
    const hit = await cache.match(key).catch(() => null);
    if (hit) return json2(await hit.json());
  }
  const token = await accessToken(env);
  const [a, s] = await Promise.allSettled([ga4(token, days), gsc(token, days)]);
  if (a.status === "rejected") console.error("ga4_failed", a.reason);
  if (s.status === "rejected") console.error("gsc_failed", s.reason);
  const data = {
    ga4: a.status === "fulfilled" ? a.value : { error: "ga4_failed" },
    gsc: s.status === "fulfilled" ? s.value : { error: "gsc_failed" },
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
  if (a.status === "fulfilled" && s.status === "fulfilled")
    await cache.put(key, new Response(JSON.stringify(data), { headers: { "cache-control": "max-age=900" } })).catch(() => {
    });
  return json2(data);
}

// src/worker/seed.json
var seed_default = {
  hero: {
    desktop: [
      "/assets/img/hero-1.jpg",
      "/assets/img/hero-2.jpg",
      "/assets/img/hero-3.jpg",
      "/assets/img/hero-4.jpg",
      "/assets/img/hero-5.jpg",
      "/assets/img/hero-6.jpg",
      "/assets/img/hero-7.jpg",
      "/assets/img/hero-8.jpg",
      "/assets/img/hero-9.jpg",
      "/assets/img/hero-10.jpg",
      "/assets/img/hero-11.jpg",
      "/assets/img/hero-12.jpg",
      "/assets/img/hero-13.jpg",
      "/assets/img/hero-14.jpg",
      "/assets/img/hero-15.jpg",
      "/assets/img/hero-16.jpg",
      "/assets/img/hero-17.jpg",
      "/assets/img/hero-18.jpg",
      "/assets/img/hero-19.jpg",
      "/assets/img/hero-20.jpg",
      "/assets/img/hero-21.jpg",
      "/assets/img/hero-22.jpg",
      "/assets/img/hero-23.jpg",
      "/assets/img/hero-24.jpg"
    ],
    mobile: [
      "/assets/img/hero-m-1.jpg",
      "/assets/img/hero-m-2.jpg",
      "/assets/img/hero-m-3.jpg",
      "/assets/img/hero-m-4.jpg",
      "/assets/img/hero-m-5.jpg",
      "/assets/img/hero-m-6.jpg",
      "/assets/img/hero-m-7.jpg",
      "/assets/img/hero-m-8.jpg",
      "/assets/img/hero-m-9.jpg",
      "/assets/img/hero-m-10.jpg",
      "/assets/img/hero-m-11.jpg",
      "/assets/img/hero-m-12.jpg"
    ],
    interval: 5,
    lines: {
      ro: [
        {
          title: "Momente reale, nu poze regizate",
          sub: "Fotografie documentar\u0103 de nunt\u0103 \xB7 Bra\u0219ov"
        },
        {
          title: "Fotografia nu e o list\u0103 de bifat",
          sub: "Las momentele s\u0103 se \xEEnt\xE2mple"
        },
        {
          title: "S\u0103 sim\u021Bi\u021Bi ziua din nou peste ani",
          sub: "Nun\u021Bi \xB7 Botezuri \xB7 Familie"
        }
      ],
      en: [
        {
          title: "Real moments, not staged photos",
          sub: "Documentary wedding photography \xB7 Bra\u0219ov"
        },
        {
          title: "Photography isn't a checklist",
          sub: "I let the moments unfold"
        },
        {
          title: "Feel the day again, years later",
          sub: "Weddings \xB7 Christenings \xB7 Family"
        }
      ]
    }
  },
  home: {
    ro: {
      title: "Dan C\u0103pitan de Plai \xB7 Fotograf de nunt\u0103 \xEEn Bra\u0219ov",
      desc: "Fotografie documentar\u0103 de nunt\u0103, botez \u0219i familie \xEEn Bra\u0219ov \u0219i oriunde vre\u021Bi voi. Momente reale, lumin\u0103 natural\u0103, f\u0103r\u0103 poze regizate.",
      intro_eyebrow: "Fotografie documentar\u0103",
      intro_title: "Las\u0103 obiectivul meu s\u0103 v\u0103 spun\u0103 povestea",
      intro_p: [
        "Fotografiez nun\u021Bi, botezuri \u0219i familii a\u0219a cum sunt ele: cu emo\u021Bie, cu r\xE2sete \u0219i cu momentele mici pe care nimeni nu le regizeaz\u0103. Lumina natural\u0103 \u0219i oamenii adev\u0103ra\u021Bi fac toat\u0103 treaba, eu doar sunt acolo la momentul potrivit.",
        "De la ceremonii descul\u021B prin iarb\u0103 p\xE2n\u0103 la nun\u021Bi elegante \xEEn ora\u0219, intervin c\xE2t mai pu\u021Bin \u0219i v\u0103 las s\u0103 v\u0103 bucura\u021Bi de zi. Dac\u0103 sunte\u021Bi timizi \xEEn fa\u021Ba aparatului, e perfect: nu trebuie s\u0103 poza\u021Bi."
      ],
      tiles_eyebrow: "Descoper\u0103",
      tiles_title: "Unde vre\u021Bi s\u0103 merge\u021Bi?",
      quote: "Fotografia nu e o list\u0103 de bifat. Vreau ca peste ani s\u0103 deschide\u021Bi albumul \u0219i s\u0103 sim\u021Bi\u021Bi ziua din nou.",
      quote_by: "Dan C\u0103pitan de Plai",
      services_eyebrow: "Ce fotografiez",
      services_title: "Pentru fiecare moment important",
      profile_eyebrow: "Capturez magia vie\u021Bii",
      profile_title: "Salut, sunt Dan",
      profile_p: [
        "Sunt fotograf \xEEn Bra\u0219ov \u0219i de aproape 8 ani fotografiez nun\u021Bi, botezuri \u0219i familii. Lucrez discret, cu lumin\u0103 natural\u0103, \u0219i caut momentele sincere dintre oameni.",
        "Merg oriunde m\u0103 cheam\u0103 povestea voastr\u0103: Conacul Albert, Naturalia Inn, Centrul Vechi sau o paji\u0219te f\u0103r\u0103 nume."
      ],
      testimonials_title: "Ce spun cuplurile",
      cta_title: "Hai s\u0103 v\u0103 p\u0103str\u0103m amintirile",
      cta_p: "Spune\u021Bi-mi data \u0219i locul, iar eu v\u0103 r\u0103spund cu o ofert\u0103 pe m\u0103sura voastr\u0103.",
      ig_title: "Pe Instagram"
    },
    en: {
      title: "Dan C\u0103pitan de Plai \xB7 Wedding photographer in Bra\u0219ov",
      desc: "Documentary wedding, christening and family photography in Bra\u0219ov and wherever you want. Real moments, natural light, no staged poses.",
      intro_eyebrow: "Documentary photography",
      intro_title: "Let my lens tell your story",
      intro_p: [
        "I photograph weddings, christenings and families as they really are: the emotion, the laughter and the small moments nobody stages. Natural light and real people do the work, I just make sure I'm there at the right moment.",
        "From barefoot ceremonies in the grass to elegant city weddings, I step in as little as possible and let you enjoy the day. Shy in front of a camera? Perfect, you don't need to pose."
      ],
      tiles_eyebrow: "Explore",
      tiles_title: "Where to next?",
      quote: "Photography isn't a checklist. I want you to open the album years from now and feel the day all over again.",
      quote_by: "Dan C\u0103pitan de Plai",
      services_eyebrow: "What I photograph",
      services_title: "For every moment that matters",
      profile_eyebrow: "Capturing life's magic",
      profile_title: "Hi, I'm Dan",
      profile_p: [
        "I'm a photographer based in Bra\u0219ov and I've been photographing weddings, christenings and families for almost 8 years. I work quietly, with natural light, looking for honest moments between people.",
        "I go wherever your story takes me: Conacul Albert, Naturalia Inn, the Old Town or a nameless meadow."
      ],
      testimonials_title: "What couples say",
      cta_title: "Let's keep your memories",
      cta_p: "Tell me your date and place, and I'll come back with a quote that fits you.",
      ig_title: "On Instagram"
    }
  },
  tiles: [
    {
      key: "home",
      img: "/assets/img/nav-1.jpg"
    },
    {
      key: "portfolio",
      img: "/assets/img/nav-2.jpg"
    },
    {
      key: "blog",
      img: "/assets/img/nav-3.jpg"
    },
    {
      key: "faq",
      img: "/assets/img/nav-4.jpg"
    },
    {
      key: "contact",
      img: "/assets/img/nav-5.jpg"
    }
  ],
  tile_sub: {
    ro: {
      home: "\xCEncepe de aici",
      portfolio: "Fiecare eveniment, povestea lui",
      blog: "Sfaturi \u0219i pove\u0219ti",
      faq: "Pre\u021Buri, deplasare, livrare",
      contact: "Hai s\u0103 vorbim"
    },
    en: {
      home: "Start here",
      portfolio: "Every event, its own story",
      blog: "Tips and stories",
      faq: "Pricing, travel, delivery",
      contact: "Let's talk"
    }
  },
  services: {
    ro: [
      {
        title: "Nun\u021Bi",
        text: "Toat\u0103 ziua, de la preg\u0103tiri p\xE2n\u0103 la petrecere, spus\u0103 ca o poveste."
      },
      {
        title: "Cununie civil\u0103",
        text: "Momentul oficial, simplu \u0219i emo\u021Bionant."
      },
      {
        title: "Botezuri",
        text: "Familia, na\u0219ii \u0219i cel mic, f\u0103r\u0103 agita\u021Bie."
      },
      {
        title: "Familie",
        text: "\u0218edin\u021Be relaxate, acas\u0103 sau \xEEn natur\u0103."
      },
      {
        title: "After-wedding & Trash The Dress",
        text: "O zi doar pentru voi doi, \xEEn locuri frumoase."
      },
      {
        title: "Nou-n\u0103scu\u021Bi",
        text: "Primele zile, cu bl\xE2nde\u021Be \u0219i r\u0103bdare."
      }
    ],
    en: [
      {
        title: "Weddings",
        text: "The whole day, from getting ready to the party, told as a story."
      },
      {
        title: "Civil ceremonies",
        text: "The official moment, simple and moving."
      },
      {
        title: "Christenings",
        text: "Family, godparents and the little one, without the fuss."
      },
      {
        title: "Family",
        text: "Relaxed sessions at home or outdoors."
      },
      {
        title: "After-wedding & Trash The Dress",
        text: "A day just for the two of you, somewhere beautiful."
      },
      {
        title: "Newborns",
        text: "The first days, gently and patiently."
      }
    ]
  },
  stats: {
    ro: [
      {
        num: "~8",
        label: "ani de fotografie"
      },
      {
        num: "6",
        label: "premii de portofoliu"
      },
      {
        num: "100%",
        label: "lumin\u0103 natural\u0103"
      },
      {
        num: "\u221E",
        label: "deplas\u0103ri oriunde"
      }
    ],
    en: [
      {
        num: "~8",
        label: "years behind the camera"
      },
      {
        num: "6",
        label: "portfolio awards"
      },
      {
        num: "100%",
        label: "natural light"
      },
      {
        num: "\u221E",
        label: "happy to travel"
      }
    ]
  },
  testimonials: {
    ro: [
      {
        img: "",
        quote: "Fotografiile, de la sosirea la prim\u0103rie \u0219i p\xE2n\u0103 la \u0219edin\u021Ba foto al\u0103turi de invita\u021Bi, au ie\u0219it absolut superbe. A reu\u0219it s\u0103 surprind\u0103\u2026 gesturi \u0219i priviri spontane pe care noi nici m\u0103car nu le-am observat. Nu suntem persoane foarte confortabile \xEEn fa\u021Ba camerei, \xEEns\u0103 a creat o atmosfer\u0103 relaxat\u0103 \u0219i natural\u0103.",
        who: "Laura \u0218tefania \xB7 Cununie civil\u0103, Bra\u0219ov"
      },
      {
        img: "",
        quote: "Heei! \xCE\u021Bi mul\u021Bumim din suflet! Am apreciat mult acest set de poze \u0219i cat de rapid te-ai mi\u0219cat! Au ie\u0219it suuuper",
        who: "Felicia si Calin \xB7 Cununie civil\u0103, Bra\u0219ov"
      },
      {
        img: "",
        quote: "Sunt superbe \u{1F929} mul\u021Bumim din suflet ca ai fost al\u0103turi de noi din nou. Ne vedem la evenimentul urm\u0103tor, cu siguran\u021B\u0103",
        who: "Lori \xB7 Botez, Bra\u0219ov"
      }
    ],
    en: [
      {
        img: "",
        quote: "The photos, from arriving at the town hall to the shoot with our guests, came out absolutely beautiful. He caught\u2026 spontaneous gestures and looks we didn't even notice. We're not comfortable in front of the camera, but he made it relaxed and natural.",
        who: "Laura \u0218tefania \xB7 Civil ceremony, Bra\u0219ov"
      },
      {
        img: "",
        quote: "Heyy! Thank you from the bottom of our hearts! We loved this set of photos, and how quickly you worked! They came out suuuper",
        who: "Felicia and Calin \xB7 Civil ceremony, Bra\u0219ov"
      },
      {
        img: "",
        quote: "They're gorgeous \u{1F929} thank you so much for being there with us again. We'll definitely see you at the next event",
        who: "Lori \xB7 Christening, Bra\u0219ov"
      }
    ]
  },
  portrait: "/assets/img/portrait.jpg",
  profile: "/assets/img/profile.jpg",
  cta_img: "/assets/img/banner-1.jpg",
  instagram_imgs: [
    "/assets/img/ig-1.jpg",
    "/assets/img/ig-2.jpg",
    "/assets/img/ig-3.jpg",
    "/assets/img/ig-4.jpg",
    "/assets/img/ig-5.jpg",
    "/assets/img/ig-6.jpg"
  ],
  categories: {
    ro: {
      nunta: "Nun\u021Bi",
      cununie: "Cununie civil\u0103",
      botez: "Botezuri",
      familie: "Familie",
      after: "After-wedding"
    },
    en: {
      nunta: "Weddings",
      cununie: "Civil ceremonies",
      botez: "Christenings",
      familie: "Family",
      after: "After-wedding"
    }
  },
  events: [
    {
      id: "nunta-conacul-albert",
      slug: "nunta-conacul-albert",
      cat: "nunta",
      venue: "Conacul Albert",
      cover: "/assets/img/p-01.jpg",
      photos: [
        "/assets/img/p-01.jpg",
        "/assets/img/p-02.jpg",
        "/assets/img/p-03.jpg",
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg"
      ],
      title: {
        ro: "Nunt\u0103 la Conacul Albert",
        en: "Wedding at Conacul Albert"
      },
      date: {
        ro: "Septembrie 2026",
        en: "September 2026"
      },
      intro: {
        ro: "O zi cald\u0103 de toamn\u0103, o curte plin\u0103 de prieteni \u0219i multe lacrimi de bucurie.",
        en: "A warm autumn day, a courtyard full of friends and plenty of happy tears."
      }
    },
    {
      id: "nunta-naturalia-inn",
      slug: "nunta-naturalia-inn",
      cat: "nunta",
      venue: "Naturalia Inn",
      cover: "/assets/img/p-05.jpg",
      photos: [
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg",
        "/assets/img/p-12.jpg"
      ],
      title: {
        ro: "Nunt\u0103 la Naturalia Inn",
        en: "Wedding at Naturalia Inn"
      },
      date: {
        ro: "August 2026",
        en: "August 2026"
      },
      intro: {
        ro: "Ceremonie \xEEn aer liber, descul\u021Bi prin iarb\u0103, cu mun\u021Bii \xEEn spate.",
        en: "An outdoor ceremony, barefoot in the grass, with the mountains behind."
      }
    },
    {
      id: "cununie-centrul-vechi-brasov",
      slug: "cununie-centrul-vechi-brasov",
      cat: "cununie",
      venue: "Centrul Vechi, Bra\u0219ov",
      cover: "/assets/img/p-03.jpg",
      photos: [
        "/assets/img/p-03.jpg",
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg"
      ],
      title: {
        ro: "Cununie civil\u0103 \xEEn Centrul Vechi",
        en: "Civil ceremony in Bra\u0219ov Old Town"
      },
      date: {
        ro: "Iulie 2026",
        en: "July 2026"
      },
      intro: {
        ro: "Plimbare pe str\u0103du\u021Bele vechi ale Bra\u0219ovului, dup\u0103 cel mai important \u201EDa\u201D.",
        en: `A walk through Bra\u0219ov's old streets after the most important "I do".`
      }
    },
    {
      id: "botez-restaurant-adaggio",
      slug: "botez-restaurant-adaggio",
      cat: "botez",
      venue: "Restaurant Adaggio",
      cover: "/assets/img/p-08.jpg",
      photos: [
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg",
        "/assets/img/p-12.jpg",
        "/assets/img/p-01.jpg",
        "/assets/img/p-02.jpg"
      ],
      title: {
        ro: "Botez la Restaurant Adaggio",
        en: "Christening at Restaurant Adaggio"
      },
      date: {
        ro: "Iunie 2026",
        en: "June 2026"
      },
      intro: {
        ro: "Na\u0219ii emo\u021Biona\u021Bi, bunicii m\xE2ndri \u0219i un mic protagonist foarte curios.",
        en: "Emotional godparents, proud grandparents and a very curious little star."
      }
    },
    {
      id: "familie-in-natura",
      slug: "familie-in-natura",
      cat: "familie",
      venue: "Poiana Bra\u0219ov",
      cover: "/assets/img/p-10.jpg",
      photos: [
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg",
        "/assets/img/p-12.jpg",
        "/assets/img/p-02.jpg",
        "/assets/img/p-03.jpg",
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg"
      ],
      title: {
        ro: "\u0218edin\u021B\u0103 de familie \xEEn natur\u0103",
        en: "Family session outdoors"
      },
      date: {
        ro: "Mai 2026",
        en: "May 2026"
      },
      intro: {
        ro: "O dup\u0103-amiaz\u0103 f\u0103r\u0103 grab\u0103, cu jocuri, \xEEmbr\u0103\u021Bi\u0219\u0103ri \u0219i lumin\u0103 cald\u0103.",
        en: "An unhurried afternoon of games, hugs and warm light."
      }
    },
    {
      id: "trash-the-dress",
      slug: "trash-the-dress",
      cat: "after",
      venue: "Mun\u021Bii Bucegi",
      cover: "/assets/img/p-06.jpg",
      photos: [
        "/assets/img/p-04.jpg",
        "/assets/img/p-05.jpg",
        "/assets/img/p-06.jpg",
        "/assets/img/p-07.jpg",
        "/assets/img/p-08.jpg",
        "/assets/img/p-09.jpg",
        "/assets/img/p-10.jpg",
        "/assets/img/p-11.jpg"
      ],
      title: {
        ro: "Trash The Dress \xEEn mun\u021Bi",
        en: "Trash The Dress in the mountains"
      },
      date: {
        ro: "Octombrie 2026",
        en: "October 2026"
      },
      intro: {
        ro: "Rochia de mireas\u0103, un r\xE2u de munte \u0219i doi oameni care nu le pas\u0103 de noroi.",
        en: "A wedding dress, a mountain river and two people who don't mind the mud."
      }
    }
  ],
  posts: [
    {
      id: "ce-inseamna-fotografie-documentara-de-nunta",
      slug: "ce-inseamna-fotografie-documentara-de-nunta",
      cover: "/assets/img/blog-1.jpg",
      date: "2026-10-20",
      title: {
        ro: "Ce \xEEnseamn\u0103 fotografie documentar\u0103 de nunt\u0103",
        en: "What documentary wedding photography means"
      },
      excerpt: {
        ro: "F\u0103r\u0103 poze regizate, f\u0103r\u0103 liste de bifat. Doar ziua voastr\u0103, a\u0219a cum a fost.",
        en: "No staged poses, no checklists. Just your day, the way it really was."
      },
      body: {
        ro: [
          "Fotografia documentar\u0103 de nunt\u0103 \xEEnseamn\u0103 s\u0103 surprind ziua a\u0219a cum se \xEEnt\xE2mpl\u0103, nu cum ar trebui s\u0103 arate. Nu v\u0103 cer s\u0103 repeta\u021Bi intrarea \u0219i nu v\u0103 aranjez \xEEn pozi\u021Bii nefire\u0219ti.",
          "Stau aproape, dar discret. Urm\u0103resc privirile, gesturile mici, r\xE2sul nea\u0219teptat al bunicii. Momentele astea nu pot fi regizate, \u0219i tocmai ele conteaz\u0103 peste ani.",
          "Asta nu \xEEnseamn\u0103 c\u0103 nu facem deloc portrete. Facem, dar relaxat, \xEEn lumin\u0103 frumoas\u0103, f\u0103r\u0103 s\u0103 pierde\u021Bi jum\u0103tate de zi."
        ],
        en: [
          "Documentary wedding photography means capturing the day as it happens, not as it should look. I won't ask you to redo your entrance or put you in awkward poses.",
          "I stay close but quiet. I watch for glances, small gestures, grandma's unexpected laugh. Those moments can't be staged, and they're exactly what matters years later.",
          "That doesn't mean no portraits at all. We do them, but relaxed, in good light, without losing half your day."
        ]
      }
    },
    {
      id: "cum-alegi-fotograful-de-nunta",
      slug: "cum-alegi-fotograful-de-nunta",
      cover: "/assets/img/blog-2.jpg",
      date: "2026-10-10",
      title: {
        ro: "Cum alegi fotograful de nunt\u0103: 5 \xEEntreb\u0103ri utile",
        en: "Choosing your wedding photographer: 5 useful questions"
      },
      excerpt: {
        ro: "Ce s\u0103 \xEEntreba\u021Bi \xEEnainte s\u0103 semna\u021Bi, ca s\u0103 nu ave\u021Bi surprize dup\u0103 nunt\u0103.",
        en: "What to ask before you sign, so there are no surprises after the wedding."
      },
      body: {
        ro: [
          "1. V\u0103 place stilul lui? Uita\u021Bi-v\u0103 la nun\u021Bi \xEEntregi, nu doar la cele mai bune 10 poze.",
          "2. Cum lucreaz\u0103 \xEEn ziua nun\u021Bii? Regizeaz\u0103 mult sau v\u0103 las\u0103 s\u0103 tr\u0103i\u021Bi momentul?",
          "3. Ce include oferta? Album, al doilea fotograf, deplasare: \xEEntreba\u021Bi clar ce e inclus \u0219i ce se pl\u0103te\u0219te separat.",
          "4. C\xE2nd primi\u021Bi fotografiile \u0219i \xEEn ce format?",
          "5. V\u0103 sim\u021Bi\u021Bi bine \xEEn preajma lui? Va fi l\xE2ng\u0103 voi toat\u0103 ziua, a\u0219a c\u0103 asta conteaz\u0103 enorm."
        ],
        en: [
          "1. Do you love their style? Look at full weddings, not just the best 10 shots.",
          "2. How do they work on the day? Lots of posing, or do they let you live the moment?",
          "3. What does the quote include? Album, second shooter, travel: ask clearly what's included and what's extra.",
          "4. When do you get the photos, and in what format?",
          "5. Do you feel comfortable around them? They'll be next to you all day, so this matters a lot."
        ]
      }
    }
  ],
  faq: [
    {
      q: {
        ro: "Cum se stabile\u0219te oferta?",
        en: "How is the quote worked out?"
      },
      a: {
        ro: "Nu am pachete fixe. Oferta depinde de durat\u0103, de loca\u021Bie \u0219i de ce v\u0103 dori\u021Bi. Scrie\u021Bi-mi data \u0219i locul, iar eu v\u0103 trimit o ofert\u0103 personalizat\u0103.",
        en: "I don't do fixed packages. The quote depends on hours, location and what you'd like. Send me your date and place and I'll send you a tailored quote."
      }
    },
    {
      q: {
        ro: "Ce nu este inclus \xEEn ofert\u0103?",
        en: "What isn't included in the quote?"
      },
      a: {
        ro: "Albumul tip\u0103rit, \u0219edin\u021Bele suplimentare (after-wedding, Trash The Dress) \u0219i al doilea fotograf sunt op\u021Bionale \u0219i se pl\u0103tesc separat.",
        en: "Printed albums, extra sessions (after-wedding, Trash The Dress) and a second photographer are optional and charged separately."
      }
    },
    {
      q: {
        ro: "V\u0103 deplasa\u021Bi \u0219i \xEEn afara Bra\u0219ovului?",
        en: "Do you travel outside Bra\u0219ov?"
      },
      a: {
        ro: "Da, merg oriunde vre\u021Bi voi. Pentru evenimentele din afara Bra\u0219ovului, transportul \u0219i cazarea se pl\u0103tesc separat.",
        en: "Yes, I'll go wherever you want. For events outside Bra\u0219ov, travel and accommodation are charged separately."
      }
    },
    {
      q: {
        ro: "Suntem timizi \xEEn fa\u021Ba aparatului. E o problem\u0103?",
        en: "We're shy in front of the camera. Is that a problem?"
      },
      a: {
        ro: "Deloc. Stilul meu este documentar, a\u0219a c\u0103 nu trebuie s\u0103 poza\u021Bi. Majoritatea cuplurilor uit\u0103 de mine dup\u0103 primele minute.",
        en: "Not at all. My style is documentary: you don't need to pose. Most couples forget I'm there after the first few minutes."
      }
    },
    {
      q: {
        ro: "C\xE2nd primim fotografiile?",
        en: "When do we get the photos?"
      },
      a: {
        ro: "(De confirmat cu Dan) Termenul de livrare \u0219i num\u0103rul aproximativ de fotografii.",
        en: "(To confirm with Dan) Delivery time and approximate number of photos."
      }
    },
    {
      q: {
        ro: "Cum rezerv\u0103m data?",
        en: "How do we book a date?"
      },
      a: {
        ro: "Scrie\u021Bi-mi pe WhatsApp sau pe email data \u0219i locul. Stabilim o discu\u021Bie, apoi confirm\u0103m data.",
        en: "Message me on WhatsApp or email with your date and place. We'll have a quick chat, then confirm the date."
      }
    }
  ],
  pages: {
    ro: {
      portfolio: [
        "Portofoliu",
        "Fiecare eveniment are povestea lui. Alege\u021Bi unul \u0219i intra\u021Bi \xEEn ziua respectiv\u0103."
      ],
      blog: [
        "Blog",
        "Sfaturi pentru miri, pove\u0219ti din spatele aparatului \u0219i idei pentru \u0219edin\u021Be foto."
      ],
      faq: [
        "\xCEntreb\u0103ri frecvente",
        "R\u0103spunsuri scurte la ce m\u0103 \xEEntreab\u0103 cel mai des cuplurile."
      ],
      contact: [
        "Contact",
        "Spune\u021Bi-mi data, locul \u0219i c\xE2teva cuvinte despre voi. De obicei r\u0103spund \xEEn aceea\u0219i zi."
      ],
      contact_side_title: "Bine de \u0219tiut",
      contact_side: [
        "Fiecare ofert\u0103 este personalizat\u0103, f\u0103r\u0103 pachete fixe.",
        "Merg oriunde; \xEEn afara Bra\u0219ovului, transportul \u0219i cazarea se pl\u0103tesc separat.",
        "Albumul, \u0219edin\u021Bele suplimentare \u0219i al doilea fotograf sunt op\u021Bionale \u0219i se pl\u0103tesc separat."
      ],
      wa_label: "WhatsApp (preferat)",
      phone_label: "Telefon",
      email_label: "Email",
      fb_label: "Facebook / Messenger",
      ig_label: "Instagram",
      area_label: "Zon\u0103",
      area: "Bra\u0219ov \u0219i oriunde vre\u021Bi voi"
    },
    en: {
      portfolio: [
        "Portfolio",
        "Every event has its own story. Pick one and step into that day."
      ],
      blog: [
        "Blog",
        "Tips for couples, stories from behind the camera and photo session ideas."
      ],
      faq: [
        "Frequently asked questions",
        "Short answers to what couples ask me most."
      ],
      contact: [
        "Contact",
        "Tell me your date, place and a few words about you. I usually reply the same day."
      ],
      contact_side_title: "Good to know",
      contact_side: [
        "Every quote is tailored; no fixed packages.",
        "Happy to travel; outside Bra\u0219ov, travel and accommodation are charged separately.",
        "Albums, extra sessions and a second photographer are optional and charged separately."
      ],
      wa_label: "WhatsApp (preferred)",
      phone_label: "Phone",
      email_label: "Email",
      fb_label: "Facebook / Messenger",
      ig_label: "Instagram",
      area_label: "Area",
      area: "Bra\u0219ov and wherever you want"
    }
  },
  contact: {
    phone: "+40 743 199 121",
    email: "lupudaniel.foto@gmail.com",
    facebook: "https://www.facebook.com/Lupu.D.Foto/",
    messenger: "https://m.me/Lupu.D.Foto",
    instagram: "https://www.instagram.com/dancapitandeplai.ro/",
    instagram_handle: "@dancapitandeplai.ro",
    area: {
      ro: "Bra\u0219ov \u0219i oriunde vre\u021Bi voi",
      en: "Bra\u0219ov and wherever you want"
    },
    notes: {
      ro: [
        "Fiecare ofert\u0103 este personalizat\u0103, f\u0103r\u0103 pachete fixe.",
        "Merg oriunde; \xEEn afara Bra\u0219ovului, transportul \u0219i cazarea se pl\u0103tesc separat.",
        "Albumul, \u0219edin\u021Bele suplimentare \u0219i al doilea fotograf sunt op\u021Bionale \u0219i se pl\u0103tesc separat."
      ],
      en: [
        "Every quote is tailored; no fixed packages.",
        "Happy to travel; outside Bra\u0219ov, travel and accommodation are charged separately.",
        "Albums, extra sessions and a second photographer are optional and charged separately."
      ]
    },
    intro: {
      ro: "Spune\u021Bi-mi data, locul \u0219i c\xE2teva cuvinte despre voi. De obicei r\u0103spund \xEEn aceea\u0219i zi.",
      en: "Tell me your date, place and a few words about you. I usually reply the same day."
    }
  }
};

// src/worker/posts-v2.json
var posts_v2_default = {
  "pregatirile-de-dimineata": {
    was: "Sigur, ceremonia \u0219i petrecerea sunt miezul unei nun\u021Bi. Dar dac\u0103 m\u0103 \xEEntreba\u021Bi pe mine, cele mai sincere cadre se ascund diminea\u021Ba, acas\u0103, \xEEn orele de preg\u0103tiri. Acolo nimeni nu pozeaz\u0103. Toat\u0103 lumea doar simte.",
    title: {
      ro: "Partea mea preferat\u0103 din nunt\u0103? Preg\u0103tirile \u{1F605}",
      en: "My favourite part of a wedding? Getting ready \u{1F605}"
    },
    excerpt: {
      ro: "Dac\u0103 m\u0103 \xEEntreba\u021Bi pe mine, cele mai sincere cadre se ascund diminea\u021Ba, acas\u0103. Plus c\xE2teva trucuri mici ca s\u0103 le tr\u0103i\u021Bi lini\u0219ti\u021Bi.",
      en: "If you ask me, the most honest frames hide in the morning, at home. Plus a few small tricks to enjoy it calmly."
    },
    body: {
      ro: [
        "Sigur, ceremonia \u0219i petrecerea sunt miezul unei nun\u021Bi. Dar dac\u0103 m\u0103 \xEEntreba\u021Bi pe mine, partea mea preferat\u0103 sunt preg\u0103tirile de acas\u0103. E momentul \u0103la de lini\u0219te (relativ\u0103 \u{1F605}) \xEEn care nimeni nu pozeaz\u0103. Toat\u0103 lumea doar simte.",
        "\u201ENu m\u0103 poza acum, ar\u0103t groaznic!\u201D Aud asta aproape la fiecare nunt\u0103, pe jum\u0103tate \xEEn glum\u0103. Lini\u0219ti\u021Bi-v\u0103. Eu nu caut perfec\u021Biunea, caut oamenii. Machiajul care \xEEnt\xE2rzie, butoniera care nu vrea s\u0103 stea, telefonul care sun\u0103 \xEEntruna: toate fac parte din poveste.",
        "Fotografia nu e un checklist de bifat. Nu v\u0103 opresc, nu v\u0103 cer s\u0103 z\xE2mbi\u021Bi la comand\u0103 \u0219i nici s\u0103 v\u0103 uita\u021Bi la aparat. Voi v\u0103 tr\u0103i\u021Bi diminea\u021Ba, eu stau pe aproape \u0219i o documentez. Asta e toat\u0103 \xEEn\u021Belegerea dintre noi. \u{1F90D}",
        "C\xE2teva lucruri mici, adunate din multe dimine\u021Bi de nunt\u0103, care fac o diferen\u021B\u0103 mare:",
        "Alege\u021Bi camera cu cea mai mare fereastr\u0103. Lumina natural\u0103 de la geam e cel mai frumos lucru care i se poate \xEEnt\xE2mpla unei poze de preg\u0103tiri.",
        "Face\u021Bi ordine doar \xEEntr-un col\u021B. Nu toat\u0103 casa, doar locul unde v\u0103 \xEEmbr\u0103ca\u021Bi. Crede\u021Bi-m\u0103, pungile \u0219i sticlele de ap\u0103 apar \xEEn poze mai des dec\xE2t v-a\u021Bi imagina.",
        "Pune\u021Bi deoparte detaliile: inelele, invita\u021Bia, parfumul, pantofii, buchetul. Le fotografiez \xEEn primele minute, c\xE2t voi \xEEnc\u0103 v\u0103 be\u021Bi cafeaua.",
        "L\u0103sa\u021Bi-v\u0103 o jum\u0103tate de or\u0103 \xEEn plus \xEEn program. Nu pentru mine, pentru voi. \xCEnt\xE2rzierile de diminea\u021B\u0103 sunt aproape garantate \u0219i e mult mai fain s\u0103 le tr\u0103i\u021Bi r\xE2z\xE2nd dec\xE2t alerg\xE2nd.",
        "La botez e la fel: bebelu\u0219ul \xEEn bra\u021Be, bunicii \xEEn jur, lumina de la fereastr\u0103. Peste ani, la pozele astea o s\u0103 v\u0103 \xEEntoarce\u021Bi cel mai des. Voi care e momentul preferat din ziua voastr\u0103? Scrie\u021Bi-mi \u0219i stabilim \xEEmpreun\u0103 cum arat\u0103 ziua."
      ],
      en: [
        "Sure, the ceremony and the party are the heart of a wedding. But if you ask me, my favourite part is getting ready at home. It's that moment of (relative \u{1F605}) calm when nobody poses. Everybody just feels.",
        `"Don't shoot me now, I look terrible!" I hear it at almost every wedding, half joking. Relax. I'm not looking for perfection, I'm looking for people. Make-up running late, a boutonniere that won't stay put, a phone that never stops ringing: it's all part of the story.`,
        "Photography isn't a checklist to tick off. I won't stop you, ask you to smile on cue or look at the camera. You live your morning, I stay close and document it. That's the whole deal between us. \u{1F90D}",
        "A few small things, collected over many wedding mornings, that make a big difference:",
        "Pick the room with the biggest window. Natural window light is the best thing that can happen to getting-ready photos.",
        "Tidy up just one corner. Not the whole house, only the spot where you get dressed. Trust me, bags and water bottles end up in photos more often than you'd think.",
        "Set the details aside: rings, invitation, perfume, shoes, bouquet. I photograph them in the first few minutes while you're still drinking your coffee.",
        "Add an extra half hour to the schedule. Not for me, for you. Morning delays are almost guaranteed, and it's much nicer to live them laughing than running.",
        "Christenings are the same: the baby in someone's arms, grandparents around, light from the window. Years from now, these are the photos you'll come back to most. What's your favourite moment of the day? Write to me and we'll plan yours together."
      ]
    }
  },
  "primul-premiu-selectia-editorilor": {
    was: "\xCEn iunie 2026 am primit primul meu premiu la Selec\u021Bia Editorilor, concursul de fotografie de nunt\u0103 organizat de fotografi-cameramani.ro. La o s\u0103pt\u0103m\xE2n\u0103 distan\u021B\u0103 a venit a doua imagine premiat\u0103, apoi \xEEnc\u0103 c\xE2teva men\u021Biuni. Recunosc, m-am bucurat ca un copil.",
    title: {
      ro: "Primul meu premiu: editorii au vorbit, eu n-am nimic de ad\u0103ugat \u{1F90D}",
      en: "My first award: the editors have spoken, I have nothing to add \u{1F90D}"
    },
    excerpt: {
      ro: "Selec\u021Bia Editorilor, dou\u0103 imagini premiate \u0219i c\xE2teva men\u021Biuni. Plus sfaturi sincere despre cum s\u0103 v\u0103 alege\u021Bi fotograful.",
      en: "The Editors' Selection, two awarded images and a few mentions. Plus honest advice on choosing your photographer."
    },
    body: {
      ro: [
        "Mul\u021Bumesc, fotografi-cameramani.ro! \xCEn iunie 2026 am primit primul meu premiu la Selec\u021Bia Editorilor, concursul dedicat fotografiei de nunt\u0103. Editorii au vorbit, eu n-am nimic de ad\u0103ugat. \u{1F90D}",
        "Apoi a venit a doua imagine premiat\u0103. Apoi \xEEnc\u0103 dou\u0103 men\u021Biuni. Cred c\u0103 sunt pe val! \u{1F30A} Dac\u0103 fac un mic bilan\u021B, prind \u0219i mai mult curaj. E un sentiment super fain s\u0103 \u0219tii c\u0103 ceea ce faci ajunge la oameni \u0219i chiar le atrage aten\u021Bia.",
        "Partea de care sunt cel mai m\xE2ndru: niciuna dintre imaginile premiate nu e regizat\u0103. Sunt momente din nun\u021Bi reale, din Bra\u0219ov \u0219i din jur, prinse exact cum s-au \xEEnt\xE2mplat. Nimeni nu a stat la pozat pentru ele.",
        "Pentru c\u0103 mul\u021Bi dintre voi sunte\u021Bi acum \xEEn plin proces de ales fotograful, v\u0103 las c\xE2teva sfaturi sincere, care conteaz\u0103 mai mult dec\xE2t orice diplom\u0103 (da, \u0219tiu, chiar eu zic asta \u{1F605}):",
        "Cere\u021Bi o galerie complet\u0103, nu doar cele mai bune zece poze. Orice fotograf are c\xE2teva cadre spectaculoase. O nunt\u0103 \xEEntreag\u0103, de diminea\u021Ba p\xE2n\u0103 la ultimul dans, v\u0103 arat\u0103 cum lucreaz\u0103 cu adev\u0103rat.",
        "Fi\u021Bi aten\u021Bi la cum comunic\u0103. V\u0103 \xEEntreab\u0103 despre voi sau doar despre dat\u0103? Felul \xEEn care vorbe\u0219te cu voi \xEEnainte de nunt\u0103 e felul \xEEn care se va purta \u0219i \xEEn ziua nun\u021Bii, cu voi \u0219i cu invita\u021Bii vo\u0219tri.",
        "\xCEntreba\u021Bi ce se \xEEnt\xE2mpl\u0103 cu pozele dup\u0103 eveniment: cum le primi\u021Bi, \xEEn ce format \u0219i dac\u0103 p\u0103streaz\u0103 o copie de siguran\u021B\u0103. Un profesionist r\u0103spunde la toate astea f\u0103r\u0103 s\u0103 stea pe g\xE2nduri.",
        "\u0218i, poate cel mai important, alege\u021Bi pe cineva cu care v\u0103 sim\u021Bi\u021Bi bine. O s\u0103-l ave\u021Bi l\xE2ng\u0103 voi o zi \xEEntreag\u0103, \xEEn cele mai emo\u021Bionante momente. Chimia conteaz\u0103.",
        "Voiam doar s\u0103 \xEEmpart bucuria asta cu voi. Mul\u021Bumesc pentru sus\u021Binere \u0219i, mai ales, celor care au \xEEncredere \xEEn mine s\u0103 le documentez amintirile. Cheers! \u{1F942}\u{1F4F7}"
      ],
      en: [
        "Thank you, fotografi-cameramani.ro! In June 2026 I got my first award at the Editors' Selection, the wedding photography contest. The editors have spoken, I have nothing to add. \u{1F90D}",
        "Then came a second awarded image. Then two more mentions. I think I'm on a roll! \u{1F30A} Looking back, it gives me even more courage. It feels great to know that what you do reaches people and actually catches their eye.",
        "The part I'm proudest of: none of the awarded images were staged. They're moments from real weddings in and around Bra\u0219ov, caught exactly as they happened. Nobody posed for them.",
        "Since many of you are right in the middle of choosing a photographer, here's some honest advice that matters more than any certificate (yes, I know, coming from me \u{1F605}):",
        "Ask for a full gallery, not just the best ten shots. Every photographer has a few spectacular frames. A whole wedding, from morning to the last dance, shows you how they really work.",
        "Pay attention to how they communicate. Do they ask about you, or just your date? The way they talk to you before the wedding is the way they'll behave on the day, with you and your guests.",
        "Ask what happens to the photos after the event: how you receive them, in what format and whether they keep a backup. A professional answers all of that without hesitating.",
        "And maybe most importantly, choose someone you feel good around. They'll be next to you for a whole day, in your most emotional moments. Chemistry matters.",
        "I just wanted to share this joy with you. Thank you for the support and, above all, to everyone who trusts me to document their memories. Cheers! \u{1F942}\u{1F4F7}"
      ]
    }
  },
  "nunta-felicia-calin-conacul-albert": {
    was: "Felicia \u0219i C\u0103lin sunt un cuplu tare simpatic, mereu cu z\xE2mbetul pe buze \u0219i cu o energie care s-a sim\u021Bit din primele momente ale zilei. Am fost cu ei de la preg\u0103tiri p\xE2n\u0103 seara t\xE2rziu, iar z\xE2mbetul \u0103la nu a disp\u0103rut nicio clip\u0103.",
    title: {
      ro: "Felicia & C\u0103lin, o nunt\u0103 tr\u0103it\u0103 cu suflet la Conacul Albert \u{1F90D}",
      en: "Felicia & C\u0103lin, a wedding lived with heart at Conacul Albert \u{1F90D}"
    },
    excerpt: {
      ro: "Un cuplu tare simpatic, o zi \xEEntreag\u0103 al\u0103turi de ei \u0219i o sear\u0103 \xEEn care sala a prins via\u021B\u0103 exact cum \u0219i-au imaginat. Plus idei pentru un Trash The Dress.",
      en: "A lovely couple, a whole day by their side and an evening when the venue came alive exactly as they pictured it. Plus Trash The Dress ideas."
    },
    body: {
      ro: [
        "Felicia & C\u0103lin \u{1F90D} Un cuplu tare simpatic, mereu cu z\xE2mbetul pe buze \u0219i cu o energie care s-a sim\u021Bit din primele momente ale zilei. Am fost cu ei de la preg\u0103tiri p\xE2n\u0103 seara t\xE2rziu, iar z\xE2mbetul \u0103la nu a disp\u0103rut nicio clip\u0103.",
        "Preg\u0103tirile, first look-ul \u0219i emo\u021Biile dintre ei ne-au emo\u021Bionat \u0219i pe noi. Ce mi-a pl\u0103cut cel mai mult? Au uitat repede de aparat. Dup\u0103 primele minute eram doar \xEEnc\u0103 un om din \xEEnc\u0103pere, iar ei erau pur \u0219i simplu ei.",
        "Seara, la Conacul Albert, printre z\xE2mbete, \xEEmbr\u0103\u021Bi\u0219\u0103ri \u0219i momente tr\u0103ite al\u0103turi de cei dragi, sala a prins via\u021B\u0103 exact a\u0219a cum \u0219i-au imaginat. Decorul elegant, lumina cald\u0103 \u0219i energia invita\u021Bilor au f\u0103cut restul.",
        "\xCEnainte de petrecere, au furat c\xE2teva minute doar pentru ei. Asta e, de fapt, esen\u021Ba. Le recomand tuturor cuplurilor: zece minute departe de invita\u021Bi, f\u0103r\u0103 telefoane, doar voi doi. Pentru voi e o gur\u0103 de aer. Pentru mine sunt, de multe ori, cele mai frumoase cadre din toat\u0103 nunta.",
        "De ce stau acolo toat\u0103 ziua? Pentru c\u0103 nunta nu se \xEEnt\xE2mpl\u0103 doar la ceremonie. Se \xEEnt\xE2mpl\u0103 \xEEn glumele de diminea\u021B\u0103, \xEEn privirea bunicii la biseric\u0103, \xEEn primul dans \u0219i \xEEn pantofii arunca\u021Bi sub mas\u0103 la dou\u0103 noaptea.",
        "Mul\u021Bi miri \xEEmi spun dup\u0103 nunt\u0103 acela\u0219i lucru: \u201EA trecut at\xE2t de repede, nu mai \u021Bin minte aproape nimic.\u201D E normal. Tocmai de aceea sunt eu acolo: voi tr\u0103i\u021Bi ziua, iar amintirea r\u0103m\xE2ne \xEEn poze.",
        "\u0218i dac\u0103, dup\u0103 nunt\u0103, rochia v\u0103 pare prea frumoas\u0103 ca s\u0103 stea \xEEntr-un dulap, hai la un Trash The Dress. F\u0103r\u0103 program, f\u0103r\u0103 invita\u021Bi, f\u0103r\u0103 grab\u0103. Alege\u021Bi un loc care v\u0103 spune ceva: o p\u0103dure de l\xE2ng\u0103 Bra\u0219ov, un lac, un c\xE2mp cu iarb\u0103 \xEEnalt\u0103. Lua\u021Bi \xEEnc\u0103l\u021B\u0103ri de schimb, un prosop \u0219i haine uscate, \u0219i l\u0103sa\u021Bi-v\u0103 du\u0219i de moment.",
        "Ne-ar pl\u0103cea s\u0103 ar\u0103t\u0103m \u0219i mai multe imagini, dar sper\u0103m ca m\u0103car acestea s\u0103 transmit\u0103 pu\u021Bin din atmosfera zilei. Galeria complet\u0103 e \xEEn Portofoliu. Cas\u0103 de piatr\u0103, dragilor! \u{1F942}",
        "Flori: Flor\u0103ria Kandila Design \xB7 Costum mire: Roca Bra\u0219ov \xB7 Rochie mireas\u0103: La Mode Toujours \xB7 Loca\u021Bie: Conacul Albert."
      ],
      en: [
        "Felicia & C\u0103lin \u{1F90D} A lovely couple, always smiling, with an energy you could feel from the very first moments of the day. I was with them from getting ready until late at night, and that smile never left.",
        "Getting ready, the first look and the emotion between them got to us too. What I loved most? They forgot about the camera quickly. After the first few minutes I was just another person in the room, and they were simply themselves.",
        "In the evening at Conacul Albert, among smiles, hugs and moments with their loved ones, the venue came alive exactly as they had pictured it. Elegant decor, warm light and the guests' energy did the rest.",
        "Before the party, they stole a few minutes just for themselves. That's what it's all about. I recommend it to every couple: ten minutes away from the guests, no phones, just the two of you. For you it's a breath of air. For me they're often the best frames of the whole wedding.",
        "Why do I stay the whole day? Because a wedding doesn't only happen at the ceremony. It happens in the morning jokes, in grandma's look at church, in the first dance and in the shoes kicked under the table at 2 a.m.",
        `Many couples tell me the same thing afterwards: "It went by so fast, I barely remember anything." That's normal. That's exactly why I'm there: you live the day, and the memory stays in the photos.`,
        "And if after the wedding the dress feels too beautiful to sit in a wardrobe, let's do a Trash The Dress. No schedule, no guests, no rush. Pick a place that means something to you: a forest near Bra\u0219ov, a lake, a field of tall grass. Bring spare shoes, a towel and dry clothes, and let yourselves go.",
        "We'd love to show even more images, but we hope these carry a little of the day's atmosphere. The full gallery is in the Portfolio. Cheers to a lifetime together! \u{1F942}",
        "Flowers: Flor\u0103ria Kandila Design \xB7 Groom's suit: Roca Bra\u0219ov \xB7 Bridal gown: La Mode Toujours \xB7 Venue: Conacul Albert."
      ]
    }
  },
  "alb-negru": {
    was: "De ce \xEEmi place at\xE2t de mult fotografia alb-negru? Poate pentru c\u0103 \xEEmi aminte\u0219te de eternitate, a\u0219a cum ar trebui s\u0103 fie orice poveste de dragoste.",
    title: {
      ro: "De ce iubesc alb-negrul (\u0219i cum s\u0103 nu v\u0103 pierde\u021Bi pozele)",
      en: "Why I love black and white (and how not to lose your photos)"
    },
    excerpt: {
      ro: "Alb-negrul \xEEmi aminte\u0219te de eternitate, a\u0219a cum ar trebui s\u0103 fie orice poveste de dragoste. Plus o re\u021Bet\u0103 simpl\u0103 ca pozele voastre s\u0103 reziste la fel de mult.",
      en: "Black and white reminds me of eternity, as every love story should be. Plus a simple recipe so your photos last just as long."
    },
    body: {
      ro: [
        "De ce \xEEmi place at\xE2t de mult fotografia alb-negru? Poate pentru c\u0103 \xEEmi aminte\u0219te de eternitate, a\u0219a cum ar trebui s\u0103 fie orice poveste de dragoste. \u{1F90D}",
        "F\u0103r\u0103 culoare r\u0103m\xE2n doar lucrurile care conteaz\u0103: o privire, o m\xE2n\u0103 str\xE2ns\u0103, un z\xE2mbet nea\u0219teptat. \u201EThe eyes, chico. They never lie.\u201D Da, e o replic\u0103 de film, dar la un botez sau la o nunt\u0103 e c\xE2t se poate de adev\u0103rat\u0103.",
        "Omonimul meu literar, Dan Brown, scria c\u0103 nicio iubire nu e mai mare dec\xE2t cea a unui tat\u0103 pentru fiul lui. Sunt de acord, dar a\u0219 ad\u0103uga ceva: nimic nu bate frumuse\u021Bea unui moment autentic. \xCEntr-un z\xE2mbet nea\u0219teptat sau \xEEntr-o privire se ascunde toat\u0103 povestea.",
        "Nu convertesc totul. Dar c\xE2nd un cadru are emo\u021Bie \u0219i lumin\u0103 bun\u0103, alb-negrul \xEEl cur\u0103\u021B\u0103 de tot ce e \xEEn plus. La fiecare eveniment primi\u021Bi \u0219i o selec\u021Bie alb-negru, pe l\xE2ng\u0103 pozele color.",
        "Vorbind de eternitate, trebuie s\u0103 v\u0103 spun \u0219i ceva mai pu\u021Bin romantic. Am auzit prea multe pove\u0219ti cu laptopuri furate, telefoane c\u0103zute \xEEn ap\u0103 sau stick-uri care nu mai pornesc. Iar odat\u0103 cu ele, poze de nunt\u0103 pierdute pentru totdeauna. A\u0219a c\u0103, o re\u021Bet\u0103 simpl\u0103, pentru oameni normali:",
        "P\u0103stra\u021Bi pozele \xEEn cel pu\u021Bin trei locuri: pe calculator, pe un hard disk extern care st\u0103 \xEEn sertar \u0219i \xEEn cloud (Google Photos, iCloud sau Dropbox). Dac\u0103 unul cedeaz\u0103, mai sunt dou\u0103.",
        "Nu v\u0103 baza\u021Bi pe linkul de desc\u0103rcare. Multe galerii online expir\u0103. Desc\u0103rca\u021Bi pozele \xEEn prima s\u0103pt\u0103m\xE2n\u0103, la rezolu\u021Bie maxim\u0103, \u0219i nu doar pe telefon.",
        "Hard diskul din sertar nu e ve\u0219nic. O dat\u0103 pe an, conecta\u021Bi-l \u0219i verifica\u021Bi c\u0103 merge. La c\xE2\u021Biva ani, copia\u021Bi totul pe unul nou.",
        "\u0218i printa\u021Bi! Sincer, cel mai sigur backup e un album pe raft. Nu are nevoie de parol\u0103, de curent sau de abonament, iar copiii vo\u0219tri \xEEl vor r\u0103sfoi peste treizeci de ani. Ave\u021Bi \xEEntreb\u0103ri despre pozele voastre? Scrie\u021Bi-mi oric\xE2nd, chiar \u0219i la ani dup\u0103 eveniment. \u{1F4F8}"
      ],
      en: [
        "Why do I love black and white photography so much? Maybe because it reminds me of eternity, as every love story should be. \u{1F90D}",
        `Without colour, only what matters is left: a look, a held hand, an unexpected smile. "The eyes, chico. They never lie." Yes, it's a movie line, but at a christening or a wedding it's as true as it gets.`,
        "My literary namesake, Dan Brown, wrote that no love is greater than a father's for his son. I agree, but I'd add something: nothing beats the beauty of an authentic moment. A whole life story can hide in an unexpected smile or a single look.",
        "I don't convert everything. But when a frame has emotion and good light, black and white strips away everything extra. With every event you also get a black and white selection alongside the colour photos.",
        "Speaking of eternity, I have to tell you something less romantic. I've heard too many stories of stolen laptops, phones dropped in water or USB sticks that won't start. And with them, wedding photos lost forever. So here's a simple recipe, for normal people:",
        "Keep your photos in at least three places: on your computer, on an external hard drive in a drawer and in the cloud (Google Photos, iCloud or Dropbox). If one fails, there are two more.",
        "Don't rely on the download link. Many online galleries expire. Download your photos in the first week, at full resolution, and not just to your phone.",
        "The drive in the drawer isn't eternal. Once a year, plug it in and check it works. Every few years, copy everything to a new one.",
        "And print! Honestly, the safest backup is an album on a shelf. No password, no power, no subscription, and your kids will flip through it in thirty years. Questions about your photos? Write to me anytime, even years after the event. \u{1F4F8}"
      ]
    }
  },
  "botez-fara-poze-regizate": {
    was: "\xCEn Rom\xE2nia nu spunem \u201Efelicit\u0103ri pentru botez\u201D, spunem \u201Es\u0103-\u021Bi tr\u0103iasc\u0103!\u201D. \u0218i cam a\u0219a v\u0103d eu \u0219i pozele de botez: calde, simple, f\u0103r\u0103 artificii.",
    title: {
      ro: "Botez f\u0103r\u0103 poze regizate (\u0219i f\u0103r\u0103 stres pentru p\u0103rin\u021Bi) \u{1F33F}",
      en: "A christening without staged photos (or stressed parents) \u{1F33F}"
    },
    excerpt: {
      ro: "Copii care sunt copii, bunici care pl\xE2ng pe furi\u0219 \u0219i un bebelu\u0219 cu propria p\u0103rere despre cristelni\u021B\u0103. Plus sfaturi pentru o \u0219edin\u021B\u0103 cu nou-n\u0103scutul.",
      en: "Kids being kids, grandparents crying on the sly and a baby with opinions about the font. Plus tips for a newborn session."
    },
    body: {
      ro: [
        "\xCEn Rom\xE2nia nu spunem \u201Efelicit\u0103ri pentru botez\u201D, spunem \u201Es\u0103-\u021Bi tr\u0103iasc\u0103!\u201D. Recunosc, mi se pare pu\u021Bin de mod\u0103 veche. \u{1F604} Dar pozele de botez nu trebuie s\u0103 fie a\u0219a: le vreau calde, moderne \u0219i naturale.",
        "\u0218tiu ce v\u0103 trece prin cap \xEEnainte de botez. Dac\u0103 pl\xE2nge tot timpul? Dac\u0103 e prea \xEEntuneric \xEEn biseric\u0103? Dac\u0103 st\u0103m toat\u0103 ziua dup\u0103 poze \xEEn loc s\u0103 st\u0103m cu invita\u021Bii? R\u0103spunsul scurt: e \xEEn regul\u0103. Bebelu\u0219ii pl\xE2ng la botez, e aproape parte din tradi\u021Bie, iar lacrimile alea ies superb \xEEn poze.",
        "Am auzit c\u0103 e greu s\u0103 fii bebelu\u0219 \xEEn ziua de azi. Colici, puseuri de cre\u0219tere, somn \u0219i mas\u0103 dup\u0103 program... parc\u0103 \xEEi preg\u0103tim de pe acum pentru via\u021Ba de adult. L\u0103sa\u021Bi rutina deoparte \xEEn ziua botezului \u0219i bucura\u021Bi-v\u0103 de cel mic. Eu sigur o fac. \u{1F90D}",
        "Bisericile sunt de multe ori \xEEntunecate, iar bli\u021Bul \xEEn ochii unui bebelu\u0219 nu e o idee bun\u0103. A\u0219a c\u0103 lucrez cu lumina care exist\u0103: cea de la ferestre \u0219i de la lum\xE2n\u0103ri. Iese mai cald, mai intim \u0219i mult mai aproape de cum a fost de fapt.",
        "Copiii sunt copii la o biseric\u0103. Alearg\u0103, se plictisesc, se uit\u0103 curio\u0219i la lum\xE2n\u0103ri. Nu-i opresc \u0219i nu-i aranjez. Momente sincere, f\u0103r\u0103 artificii.",
        "Iar voi, p\u0103rin\u021Bii, ave\u021Bi o singur\u0103 treab\u0103: s\u0103 fi\u021Bi acolo. Nu trebuie s\u0103 m\u0103 c\u0103uta\u021Bi din priviri sau s\u0103 organiza\u021Bi grupuri. Stau cu voi de la preg\u0103tirile de acas\u0103 p\xE2n\u0103 la tort \u0219i \u0219tiu c\xE2nd s\u0103 m\u0103 apropii \u0219i c\xE2nd s\u0103 m\u0103 fac nev\u0103zut.",
        "Mul\u021Bi p\u0103rin\u021Bi m\u0103 \xEEntreab\u0103 \u0219i de \u0219edin\u021Bele cu nou-n\u0103scutul. C\xE2teva lucruri \xEEnv\u0103\u021Bate de la cei mai mici clien\u021Bi ai mei: programa\u021Bi \u0219edin\u021Ba \xEEn primele dou\u0103-trei s\u0103pt\u0103m\xE2ni, c\xE2nd bebelu\u0219ul doarme mult. \xCEnc\u0103lzi\u021Bi bine camera \u0219i hr\u0103ni\u021Bi-l chiar \xEEnainte s\u0103 \xEEncepem. Un bebelu\u0219 s\u0103tul e un bebelu\u0219 somnoros. \u{1F634}",
        "Pentru voi, haine simple, \xEEn culori neutre, f\u0103r\u0103 logo-uri mari. \u0218i nu ne gr\u0103bim: \u0219edin\u021Ba merge \xEEn ritmul bebelu\u0219ului, cu pauze de al\u0103ptat, de schimbat \u0219i de alinat. Siguran\u021Ba lui e mereu pe primul loc.",
        "Ya gotta see the baby! \u{1F601} Dac\u0103 vre\u021Bi poze de botez sau cu nou-n\u0103scutul, moderne \u0219i naturale, scrie\u021Bi-mi. Sunt \xEEn Bra\u0219ov \u0219i merg oriunde m\u0103 cheam\u0103 familia."
      ],
      en: [
        `In Romania we don't say "congratulations on the christening", we say "s\u0103-\u021Bi tr\u0103iasc\u0103!" (may they live long). I'll admit it sounds a bit old-fashioned to me. \u{1F604} But christening photos don't have to be: I want them warm, modern and natural.`,
        "I know what goes through your head before the christening. What if the baby cries the whole time? What if the church is too dark? What if we spend the day on photos instead of with our guests? Short answer: it's fine. Babies cry at christenings, it's almost part of the tradition, and those tears look beautiful in photos.",
        "I've heard it's hard being a baby these days. Colic, growth spurts, sleeping and eating on schedule... it's like we're preparing them for adulthood already. Drop the routine on christening day and enjoy your little one. I sure do. \u{1F90D}",
        "Churches are often dark, and a flash in a baby's eyes is not a good idea. So I work with the light that's there: from the windows and the candles. It comes out warmer, more intimate and much closer to how it really felt.",
        "Kids are kids at church. They run around, get bored, stare at the candles. I don't stop them and I don't arrange them. Honest moments, no frills.",
        "And you, the parents, have just one job: to be there. You don't need to look for me or organise group shots. I'm with you from getting ready at home to the cake, and I know when to come close and when to disappear.",
        "Many parents also ask me about newborn sessions. A few things I've learned from my youngest clients: book the session in the first two or three weeks, when the baby sleeps a lot. Warm the room well and feed the baby right before we start. A full baby is a sleepy baby. \u{1F634}",
        "For you: simple clothes in neutral colours, no big logos. And we don't rush: the session goes at the baby's pace, with breaks for feeding, changing and soothing. The baby's safety always comes first.",
        "Ya gotta see the baby! \u{1F601} If you'd like modern, natural christening or newborn photos, write to me. I'm based in Bra\u0219ov and go wherever the family calls me."
      ]
    }
  },
  "workshop-fotografie-de-nunta": {
    was: "Recent am avut ocazia s\u0103 particip la un workshop de fotografie de nunt\u0103 al\u0103turi de Vlad Solomon, o experien\u021B\u0103 pe care o recomand oricui face meseria asta.",
    title: {
      ro: "Ce am \xEEnv\u0103\u021Bat la un workshop de nunt\u0103 (\u0219i cum arat\u0103 o \u0219edin\u021B\u0103 la apus) \u{1F4F8}",
      en: "What I learned at a wedding workshop (and what makes a great sunset session) \u{1F4F8}"
    },
    excerpt: {
      ro: "Tehnici noi de lumin\u0103, feedback sincer \u0219i c\xE2teva sfaturi practice pentru o \u0219edin\u021B\u0103 foto la apus \xEEn jurul Bra\u0219ovului.",
      en: "New lighting techniques, honest feedback and a few practical tips for a sunset photo session around Bra\u0219ov."
    },
    body: {
      ro: [
        "\u{1F4F8} Recent am participat la un workshop de fotografie de nunt\u0103 al\u0103turi de Vlad Solomon. O experien\u021B\u0103 intens\u0103 \u0219i inspira\u021Bional\u0103, pe care o recomand oricui face meseria asta.",
        "Am explorat tehnici noi de lumin\u0103 \u0219i am \xEEnv\u0103\u021Bat cum s\u0103 construiesc pove\u0219ti vizuale autentice, nu doar cadre frumoase. Ideile schimbate cu al\u021Bi pasiona\u021Bi \u0219i feedback-ul primit m-au ajutat s\u0103-mi rafinez stilul.",
        "Cel mai valoros lucru? S\u0103 privesc fotografia de nunt\u0103 cu ochi proaspe\u021Bi. Dup\u0103 multe evenimente, e u\u0219or s\u0103 intri pe pilot automat. Un workshop bun te scoate de acolo. \u0218i da, mereu accept o provocare bun\u0103 ca s\u0103 g\u0103sesc cadrul perfect pentru nunta voastr\u0103. Un fel de Frodo, dar mai pu\u021Bin obsedat. \u{1F9DD}",
        "Mare parte din workshop a fost despre lumin\u0103, a\u0219a c\u0103 v\u0103 las c\xE2teva lucruri practice pentru una dintre \u0219edin\u021Bele mele preferate: cea la apus. \u2600\uFE0F",
        "Ora de aur e scurt\u0103. Cea mai frumoas\u0103 lumin\u0103 apare cam cu o or\u0103 \xEEnainte de apus \u0219i mai \u021Bine pu\u021Bin dup\u0103. Veni\u021Bi cu 15-20 de minute mai devreme, ca s\u0103 nu ne gr\u0103bim tocmai c\xE2nd lumina e mai bun\u0103.",
        "Alege\u021Bi locul cu grij\u0103. \xCEn jurul Bra\u0219ovului mun\u021Bii ascund soarele mai devreme dec\xE2t a\u021Bi crede, a\u0219a c\u0103 dealurile \u0219i poienile deschise spre vest sunt cele mai bune. Dealul Lempe\u0219, de exemplu, e unul dintre locurile mele dragi.",
        "\xCEmbr\u0103ca\u021Bi-v\u0103 \xEEn culori calde sau neutre: crem, bej, teracot\u0103, albastru pr\u0103fuit. Evita\u021Bi imprimeurile mari \u0219i culorile neon. \u0218i lua\u021Bi o jachet\u0103, la munte se r\u0103ce\u0219te repede dup\u0103 apus.",
        "Nu v\u0103 stresa\u021Bi c\u0103 nu \u0219ti\u021Bi s\u0103 poza\u021Bi. V\u0103 dau c\xE2teva repere la \xEEnceput, apoi v\u0103 las s\u0103 vorbi\u021Bi, s\u0103 v\u0103 plimba\u021Bi, s\u0103 v\u0103 prosti\u021Bi. Cele mai bune cadre vin c\xE2nd uita\u021Bi de mine \u0219i v\u0103 uita\u021Bi unul la altul.",
        "Porumbei albi? P\u0103s\u0103ri \xEEndr\u0103gostite? Sincer, nu sunt genul care umbl\u0103 dup\u0103 cli\u0219ee. \u0218i nici pozele voastre nu ar trebui s\u0103 fie. C\xE2teva cadre de la workshop le g\u0103si\u021Bi pe Instagram. \u{1F33F}"
      ],
      en: [
        "\u{1F4F8} I recently took part in a wedding photography workshop with Vlad Solomon. An intense, inspiring experience I'd recommend to anyone in this job.",
        "We explored new lighting techniques and I learned how to build authentic visual stories, not just pretty frames. Swapping ideas with other photographers and getting honest feedback helped me refine my style.",
        "The most valuable part? Seeing wedding photography with fresh eyes. After many events it's easy to slip into autopilot. A good workshop pulls you out of it. And yes, I always accept a good challenge to find the perfect shot for your wedding. A bit like Frodo, but less obsessed. \u{1F9DD}",
        "A big part of the workshop was about light, so here are a few practical tips for one of my favourite sessions: the sunset one. \u2600\uFE0F",
        "Golden hour is short. The best light shows up about an hour before sunset and lasts a little after. Arrive 15-20 minutes early so we don't rush right when the light is best.",
        "Pick the place carefully. Around Bra\u0219ov the mountains hide the sun earlier than you'd think, so hills and meadows open to the west work best. Dealul Lempe\u0219, for example, is one of my favourite spots.",
        "Wear warm or neutral colours: cream, beige, terracotta, dusty blue. Avoid big prints and neon. And bring a jacket, it gets cold quickly in the mountains after sunset.",
        "Don't worry if you don't know how to pose. I'll give you a few pointers at the start, then let you talk, walk and goof around. The best frames come when you forget about me and look at each other.",
        "Love birds? White doves? Honestly, I'm not a clich\xE9 guy. And your photos shouldn't be either. You'll find a few frames from the workshop on Instagram. \u{1F33F}"
      ]
    }
  }
};

// src/worker/api.js
var SESSION_TTL = 24 * 3600;
var MAX_IMAGE = 8 * 1024 * 1024;
var enc = new TextEncoder();
var hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
var randomToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
var json = (data, status = 200, headers = {}) => new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json", "cache-control": "no-store", ...headers } });
var adminEmails = (env) => String(env.ADMIN_EMAILS || "lupudaniel.foto@gmail.com,ionut.filea@gmail.com").toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
var CONTENT_URL = "https://cache.internal/site";
var memo = { at: 0, data: null };
var TEXT_FIXES = [
  ["C\xE2t cost\u0103 fotografia de nunt\u0103?", "Cum se stabile\u0219te oferta?"],
  ["Nu am pachete fixe. O nunt\u0103 complet\u0103 porne\u0219te \xEEn jur de 1.000 EUR, iar oferta final\u0103 depinde de durat\u0103, loca\u021Bie \u0219i ce v\u0103 dori\u021Bi. Scrie\u021Bi-mi data \u0219i locul \u0219i v\u0103 trimit o ofert\u0103 personalizat\u0103.", "Nu am pachete fixe. Oferta depinde de durat\u0103, de loca\u021Bie \u0219i de ce v\u0103 dori\u021Bi. Scrie\u021Bi-mi data \u0219i locul, iar eu v\u0103 trimit o ofert\u0103 personalizat\u0103."],
  ["Ce nu e inclus \xEEn pre\u021B?", "Ce nu este inclus \xEEn ofert\u0103?"],
  ["Albumul tip\u0103rit, \u0219edin\u021Bele suplimentare (after-wedding, Trash The Dress) \u0219i al doilea fotograf se adaug\u0103 separat.", "Albumul tip\u0103rit, \u0219edin\u021Bele suplimentare (after-wedding, Trash The Dress) \u0219i al doilea fotograf sunt op\u021Bionale \u0219i se pl\u0103tesc separat."],
  ["Da, merg oriunde vre\u021Bi voi. Pentru evenimentele din afara Bra\u0219ovului se adaug\u0103 transportul \u0219i cazarea.", "Da, merg oriunde vre\u021Bi voi. Pentru evenimentele din afara Bra\u0219ovului, transportul \u0219i cazarea se pl\u0103tesc separat."],
  ["Deloc. Stilul meu e documentar: nu trebuie s\u0103 poza\u021Bi. Majoritatea cuplurilor uit\u0103 de mine dup\u0103 primele minute.", "Deloc. Stilul meu este documentar, a\u0219a c\u0103 nu trebuie s\u0103 poza\u021Bi. Majoritatea cuplurilor uit\u0103 de mine dup\u0103 primele minute."],
  ["Scrie\u021Bi-mi pe WhatsApp sau pe email cu data \u0219i locul. Stabilim o discu\u021Bie, apoi confirm\u0103m data.", "Scrie\u021Bi-mi pe WhatsApp sau pe email data \u0219i locul. Stabilim o discu\u021Bie, apoi confirm\u0103m data."],
  ["How much does wedding photography cost?", "How is the quote worked out?"],
  ["I don't do fixed packages. A full wedding starts at around 1,000 EUR, and the final quote depends on hours, location and what you'd like. Send me your date and place and I'll send a tailored quote.", "I don't do fixed packages. The quote depends on hours, location and what you'd like. Send me your date and place and I'll send you a tailored quote."],
  ["What isn't included?", "What isn't included in the quote?"],
  ["Printed albums, extra sessions (after-wedding, Trash The Dress) and a second photographer are added separately.", "Printed albums, extra sessions (after-wedding, Trash The Dress) and a second photographer are optional and charged separately."],
  ["Yes, I'll go wherever you want. For events outside Bra\u0219ov, travel and accommodation are added.", "Yes, I'll go wherever you want. For events outside Bra\u0219ov, travel and accommodation are charged separately."],
  ["Spune-mi data, locul \u0219i c\xE2teva cuvinte despre voi. R\u0103spund de obicei \xEEn aceea\u0219i zi.", "Spune\u021Bi-mi data, locul \u0219i c\xE2teva cuvinte despre voi. De obicei r\u0103spund \xEEn aceea\u0219i zi."],
  ["Oferta e personalizat\u0103, f\u0103r\u0103 pachete fixe (\xEEn jur de 1.000 EUR pentru o nunt\u0103).", "Fiecare ofert\u0103 este personalizat\u0103, f\u0103r\u0103 pachete fixe."],
  ["Deplasez oriunde; \xEEn afara Bra\u0219ovului se adaug\u0103 transport \u0219i cazare.", "Merg oriunde; \xEEn afara Bra\u0219ovului, transportul \u0219i cazarea se pl\u0103tesc separat."],
  ["Album, \u0219edin\u021Be extra \u0219i al doilea fotograf se adaug\u0103 separat.", "Albumul, \u0219edin\u021Bele suplimentare \u0219i al doilea fotograf sunt op\u021Bionale \u0219i se pl\u0103tesc separat."],
  ["Tailored quotes, no fixed packages (around 1,000 EUR for a wedding).", "Every quote is tailored; no fixed packages."],
  ["Happy to travel; outside Bra\u0219ov, travel and accommodation are added.", "Happy to travel; outside Bra\u0219ov, travel and accommodation are charged separately."],
  ["Albums, extra sessions and a second photographer are extra.", "Albums, extra sessions and a second photographer are optional and charged separately."],
  ["Unde vrei s\u0103 mergi?", "Unde vre\u021Bi s\u0103 merge\u021Bi?"],
  ["Fiecare eveniment are povestea lui. Alege unul \u0219i intr\u0103 \xEEn ziua respectiv\u0103.", "Fiecare eveniment are povestea lui. Alege\u021Bi unul \u0219i intra\u021Bi \xEEn ziua respectiv\u0103."],
  ["Ce s\u0103 \xEEntrebi \xEEnainte s\u0103 semnezi, ca s\u0103 nu ai surprize dup\u0103 nunt\u0103.", "Ce s\u0103 \xEEntreba\u021Bi \xEEnainte s\u0103 semna\u021Bi, ca s\u0103 nu ave\u021Bi surprize dup\u0103 nunt\u0103."]
];
function upgradePosts(saved) {
  if (!Array.isArray(saved.posts)) return saved;
  saved.posts = saved.posts.map((p) => {
    const v = posts_v2_default[p.slug];
    const first = p.body && Array.isArray(p.body.ro) ? p.body.ro[0] : null;
    return v && first === v.was ? { ...p, title: v.title, excerpt: v.excerpt, body: v.body } : p;
  });
  return saved;
}
function fixText(saved) {
  let s = JSON.stringify(saved);
  for (const [a, b] of TEXT_FIXES) s = s.split(JSON.stringify(a).slice(1, -1)).join(JSON.stringify(b).slice(1, -1));
  return JSON.parse(s);
}
async function getContent(env, ctx) {
  if (memo.data && Date.now() - memo.at < 3e4) return memo.data;
  const cache = caches.default;
  let saved = null;
  const hit = await cache.match(CONTENT_URL).catch(() => null);
  if (hit) saved = await hit.json();
  else {
    saved = await env.CONTENT.get("site", "json");
    const res = new Response(JSON.stringify(saved), { headers: { "content-type": "application/json", "cache-control": "max-age=60" } });
    const put = cache.put(CONTENT_URL, res).catch(() => {
    });
    ctx ? ctx.waitUntil(put) : await put;
  }
  if (saved) saved = upgradePosts(fixText(saved));
  const data = saved ? { ...seed_default, ...saved } : seed_default;
  if (saved && /"(Exemplu|Sample) · /.test(JSON.stringify(saved.testimonials || ""))) data.testimonials = seed_default.testimonials;
  memo = { at: Date.now(), data };
  return data;
}
async function forgetContent() {
  memo = { at: 0, data: null };
  await caches.default.delete(CONTENT_URL).catch(() => {
  });
}
function cookie(req, name) {
  const m = (req.headers.get("cookie") || "").match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? m[1] : null;
}
async function hmac(env, msg) {
  const secret = env.SESSION_SECRET || env.MOCK_LOGIN_KEY || env.ADMIN_KEY;
  if (!secret) throw new Error("no_session_secret");
  const key = await crypto.subtle.importKey("raw", enc.encode(String(secret)), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}
var sha256 = async (s) => hex(await crypto.subtle.digest("SHA-256", enc.encode(s)));
async function session(req, env) {
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
var LINK_TTL = 15 * 60;
var MAIL_COOLDOWN = 120;
async function startSession(env, email) {
  const idx = adminEmails(env).indexOf(email);
  const exp = String(Date.now() + SESSION_TTL * 1e3);
  const sid = exp + "." + idx + "." + await hmac(env, exp + "." + email);
  const res = json({ ok: true, email });
  res.headers.append("set-cookie", `sid=${sid}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL}`);
  res.headers.append("set-cookie", NOSTATS_COOKIE);
  return res;
}
var NOSTATS_COOKIE = "nostats=1; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=31536000";
var isInternal = (req) => /(?:^|;\s*)nostats=1/.test(req.headers.get("cookie") || "") || /HeadlessChrome|Playwright|Puppeteer|Lighthouse|PageSpeed|bot|crawler|spider/i.test(req.headers.get("user-agent") || "");
async function requestLink(req, env, url2) {
  const body = await readJson(req, 1e3).catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!adminEmails(env).includes(email)) return json({ ok: true });
  if (!env.MAILER) return json({ error: "mail_off" }, 503);
  if (await env.CONTENT.get("auth:cooldown")) return json({ error: "wait" }, 429);
  await env.CONTENT.put("auth:cooldown", "1", { expirationTtl: MAIL_COOLDOWN });
  const nonce = randomToken().slice(0, 32);
  const exp = String(Date.now() + LINK_TTL * 1e3);
  const token = `${nonce}.${exp}.${await hmac(env, "link:" + nonce + "." + exp + "." + email)}`;
  const link = `${url2.origin}/admin/#t=${token}`;
  const res = await env.MAILER.fetch("https://mailer/send", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      to: email,
      subject: "Link de intrare \xEEn admin \xB7 Dan C\u0103pitan de Plai",
      text: `Salut,

Apas\u0103 linkul de mai jos ca s\u0103 intri \xEEn panoul de admin al site-ului:

${link}

Linkul merge o singur\u0103 dat\u0103 \u0219i expir\u0103 \xEEn 15 minute. Dac\u0103 nu ai cerut tu linkul, ignor\u0103 acest email.
`
    })
  });
  if (!res.ok) return json({ error: "mail_failed" }, 502);
  return json({ ok: true });
}
async function verifyLink(req, env) {
  const body = await readJson(req, 1e3).catch(() => ({}));
  const m = String(body.token || "").match(/^([0-9a-f]{32})\.(\d{1,16})\.([0-9a-f]{64})$/);
  if (!m || Number(m[2]) < Date.now()) return json({ error: "bad_link" }, 403);
  let email = null;
  for (const e2 of adminEmails(env)) if (await hmac(env, "link:" + m[1] + "." + m[2] + "." + e2) === m[3]) email = e2;
  if (!email) return json({ error: "bad_link" }, 403);
  if (await env.CONTENT.get("auth:used:" + m[1])) return json({ error: "bad_link" }, 403);
  await env.CONTENT.put("auth:used:" + m[1], "1", { expirationTtl: LINK_TTL + 60 });
  return startSession(env, email);
}
async function quickLogin(req, env) {
  const body = await readJson(req, 1e3).catch(() => ({}));
  const given = await sha256(String(body.key || ""));
  const want = String(env.ADMIN_KEY || ""), dev = String(env.DEV_LOGIN_KEY || "");
  if (want && given === await sha256(want)) return startSession(env, adminEmails(env)[0]);
  if (dev.length >= 32 && given === await sha256(dev)) {
    const list2 = adminEmails(env), who = list2.includes("ionut.filea@gmail.com") ? "ionut.filea@gmail.com" : list2[0];
    return startSession(env, who);
  }
  return json({ error: "bad_key" }, 403);
}
async function logout() {
  return json({ ok: true }, 200, { "set-cookie": "sid=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" });
}
var IMG_RE = /^\/(media\/[0-9a-f]{24}\.jpg|assets\/img\/[\w.-]+)$/;
var str = (v, max = 4e3) => String(v ?? "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, max);
var bi = (v, max) => ({ ro: str(v && v.ro, max), en: str(v && v.en, max) });
var biList = (v, max, n) => ({ ro: list(v && v.ro, n).map((x) => str(x, max)), en: list(v && v.en, n).map((x) => str(x, max)) });
var list = (v, n = 200) => Array.isArray(v) ? v.slice(0, n) : [];
var imgRef = (v) => IMG_RE.test(String(v || "")) ? String(v) : "";
var imgList = (v, n = 200) => list(v, n).map(imgRef).filter(Boolean);
var url = (v) => /^https?:\/\/[^\s"'<>]+$/i.test(String(v || "")) ? String(v).slice(0, 500) : "";
function videoEmbed(link) {
  const s = String(link || "").trim();
  let m = s.match(/^https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([\w-]{11})/i);
  if (m) return { kind: "youtube", id: m[1], src: `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0` };
  m = s.match(/^https?:\/\/(?:www\.|player\.)?vimeo\.com\/(?:video\/)?(\d{6,12})(?:\/([0-9a-f]{6,20}))?/i);
  if (m) return { kind: "vimeo", id: m[1], hash: m[2] || "", src: `https://player.vimeo.com/video/${m[1]}?autoplay=1${m[2] ? "&h=" + m[2] : ""}` };
  return null;
}
function slugify(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "pagina";
}
function uniqueSlugs(items) {
  const seen = /* @__PURE__ */ new Set();
  for (const it of items) {
    let base = slugify(it.slug || it.title.ro || it.title.en), s = base, n = 2;
    while (seen.has(s)) s = `${base}-${n++}`;
    seen.add(s);
    it.slug = s;
  }
  return items;
}
function cleanContent(c, base) {
  const out = { ...base };
  if (c.hero) out.hero = {
    desktop: imgList(c.hero.desktop, 40),
    mobile: imgList(c.hero.mobile, 40),
    interval: Math.min(20, Math.max(5, Math.round(+c.hero.interval) || 5)),
    lines: {
      ro: list(c.hero.lines && c.hero.lines.ro, 10).map((l) => ({ title: str(l.title, 140), sub: str(l.sub, 140) })),
      en: list(c.hero.lines && c.hero.lines.en, 10).map((l) => ({ title: str(l.title, 140), sub: str(l.sub, 140) }))
    }
  };
  const cats = Object.keys(base.categories.ro);
  if (c.events) out.events = uniqueSlugs(list(c.events, 200).map((ev) => ({
    id: str(ev.id, 40) || randomToken().slice(0, 12),
    slug: str(ev.slug, 80),
    cat: cats.includes(ev.cat) ? ev.cat : cats[0],
    venue: str(ev.venue, 120),
    cover: imgRef(ev.cover),
    photos: imgList(ev.photos, 300),
    video: videoEmbed(ev.video) ? url(ev.video) : "",
    title: bi(ev.title, 140),
    date: bi(ev.date, 60),
    intro: bi(ev.intro, 600)
  })));
  if (c.posts) out.posts = uniqueSlugs(list(c.posts, 300).map((p) => ({
    id: str(p.id, 40) || randomToken().slice(0, 12),
    slug: str(p.slug, 80),
    cover: imgRef(p.cover),
    date: /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
    title: bi(p.title, 160),
    excerpt: bi(p.excerpt, 400),
    body: biList(p.body, 4e3, 60)
  })));
  if (c.tiles) out.tiles = list(base.tiles, 10).map((t2) => {
    const m = list(c.tiles, 10).find((x) => x && x.key === t2.key);
    return { ...t2, img: m && imgRef(m.img) || t2.img };
  });
  for (const k of ["portrait", "profile", "cta_img"]) if (k in c) out[k] = imgRef(c[k]) || base[k];
  if (c.instagram_imgs) out.instagram_imgs = imgList(c.instagram_imgs, 12);
  if (c.testimonials) {
    const tl = (v) => list(v, 30).map((x) => ({ img: imgRef(x && x.img), quote: str(x && x.quote, 800), who: str(x && x.who, 120) })).filter((x) => x.quote);
    out.testimonials = { ro: tl(c.testimonials.ro), en: tl(c.testimonials.en) };
  }
  if (c.faq) out.faq = list(c.faq, 100).map((f) => ({ q: bi(f.q, 300), a: bi(f.a, 2e3) }));
  if (c.contact) out.contact = {
    phone: str(c.contact.phone, 40),
    email: str(c.contact.email, 120),
    facebook: url(c.contact.facebook),
    messenger: url(c.contact.messenger),
    instagram: url(c.contact.instagram),
    instagram_handle: str(c.contact.instagram_handle, 60),
    area: bi(c.contact.area, 200),
    intro: bi(c.contact.intro, 400),
    notes: biList(c.contact.notes, 400, 12)
  };
  return out;
}
function usedImages(c) {
  const s = JSON.stringify(c);
  return new Set((s.match(/\/media\/[0-9a-f]{24}\.jpg/g) || []).map((x) => x.slice(7, 31)));
}
async function saveContent(req, env) {
  let body;
  try {
    body = await readJson(req, 2e6);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const saved = await env.CONTENT.get("site", "json");
  const next = cleanContent(body, saved ? { ...seed_default, ...saved } : seed_default);
  await env.CONTENT.put("site", JSON.stringify(next));
  await forgetContent();
  const keep = usedImages(next), old = Date.now() - 24 * 3600 * 1e3;
  const listed = await env.CONTENT.list({ prefix: "img:" });
  await Promise.all(listed.keys.filter((k) => !keep.has(k.name.slice(4, 28)) && k.metadata && k.metadata.t && k.metadata.t < old).map((k) => env.CONTENT.delete(k.name)));
  return json({ ok: true, content: next });
}
function isImage(buf) {
  const b = new Uint8Array(buf.slice(0, 12));
  const jpg = b[0] === 255 && b[1] === 216;
  const png = b[0] === 137 && b[1] === 80;
  const webp = String.fromCharCode(...b.slice(8, 12)) === "WEBP";
  return jpg ? "image/jpeg" : png ? "image/png" : webp ? "image/webp" : null;
}
async function storeImage(env, id, variant, buf, meta = {}) {
  const type = isImage(buf);
  if (!type || buf.byteLength > MAX_IMAGE) return false;
  await env.CONTENT.put(`img:${id}${variant}`, buf, { metadata: { type, size: buf.byteLength, t: Date.now(), ...meta } });
  return true;
}
async function uploadMedia(req, env, params) {
  const buf = await req.arrayBuffer();
  const v = params.get("v") === "s" ? "-s" : "";
  let id = params.get("id");
  if (v) {
    if (!/^[0-9a-f]{24}$/.test(id || "")) return json({ error: "bad_id" }, 400);
  } else id = randomToken().slice(0, 24);
  const w = parseInt(params.get("w") || "0", 10), h = parseInt(params.get("h") || "0", 10);
  if (!await storeImage(env, id, v, buf, { w, h })) return json({ error: "bad_image" }, 400);
  return json({ ok: true, id, url: `/media/${id}.jpg` });
}
async function importMedia(req, env) {
  let body;
  try {
    body = await readJson(req, 4e3);
  } catch {
    return json({ error: "bad_request" }, 400);
  }
  const src = url(body.url);
  if (!src) return json({ error: "bad_url" }, 400);
  const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!res.ok) return json({ error: "fetch_failed", status: res.status }, 502);
  const buf = await res.arrayBuffer();
  const id = randomToken().slice(0, 24);
  if (!await storeImage(env, id, "", buf)) return json({ error: "bad_image" }, 400);
  return json({ ok: true, id, url: `/media/${id}.jpg` });
}
async function serveMedia(env, path, ctx, req) {
  const m = path.match(/^\/media\/([0-9a-f]{24})(-s)?\.jpg$/);
  if (!m) return null;
  const cache = caches.default;
  const hit = await cache.match(req);
  if (hit) return hit;
  let { value, metadata } = await env.CONTENT.getWithMetadata(`img:${m[1]}${m[2] || ""}`, "arrayBuffer");
  if (!value && m[2]) ({ value, metadata } = await env.CONTENT.getWithMetadata(`img:${m[1]}`, "arrayBuffer"));
  if (!value) return new Response("Not found", { status: 404 });
  const res = new Response(value, { headers: { "content-type": metadata && metadata.type || "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
  ctx.waitUntil(cache.put(req, res.clone()));
  return res;
}
var KV_LIMIT_BYTES = 1e9;
var KV_LIMIT_WRITES = 1e3;
var STATS_URL = "https://cache.internal/storage";
async function storageStats(env) {
  const keys = [];
  let cursor;
  do {
    const page = await env.CONTENT.list({ prefix: "img:", cursor });
    keys.push(...page.keys);
    cursor = page.list_complete ? null : page.cursor;
  } while (cursor);
  const known = await env.CONTENT.get("sizes", "json") || {};
  const missing = keys.filter((k) => !(k.metadata && k.metadata.size) && !(k.name in known));
  const batch = missing.slice(0, 400);
  for (let i = 0; i < batch.length; i += 20) {
    await Promise.all(batch.slice(i, i + 20).map(async (k) => {
      const v = await env.CONTENT.get(k.name, "arrayBuffer");
      known[k.name] = v ? v.byteLength : 0;
    }));
  }
  const names = new Set(keys.map((k) => k.name));
  for (const n of Object.keys(known)) if (!names.has(n)) delete known[n];
  if (batch.length) await env.CONTENT.put("sizes", JSON.stringify(known));
  const site = await env.CONTENT.get("site");
  let bytes = site ? enc.encode(site).byteLength : 0, photoBytes = 0;
  for (const k of keys) photoBytes += k.metadata && k.metadata.size || known[k.name] || 0;
  bytes += photoBytes;
  const photos = keys.filter((k) => !k.name.endsWith("-s")).length;
  return {
    bytes,
    limit: KV_LIMIT_BYTES,
    photos,
    perPhoto: photos ? Math.round(photoBytes / photos) : 0,
    // full + small together
    pending: missing.length - batch.length,
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
async function todaysOps(env) {
  if (!env.CF_API_TOKEN || !env.CF_ACCOUNT_ID) return null;
  const date = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const query = `query($a:String!,$d:Date!){viewer{accounts(filter:{accountTag:$a}){
    kvOperationsAdaptiveGroups(limit:20,filter:{date:$d}){sum{requests} dimensions{actionType}}}}}`;
  try {
    const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: { authorization: "Bearer " + env.CF_API_TOKEN, "content-type": "application/json" },
      body: JSON.stringify({ query, variables: { a: env.CF_ACCOUNT_ID, d: date } })
    });
    const d = await res.json();
    const rows = d?.data?.viewer?.accounts?.[0]?.kvOperationsAdaptiveGroups;
    if (!rows) return null;
    const ops = { read: 0, write: 0, delete: 0, list: 0 };
    for (const r2 of rows) ops[r2.dimensions.actionType] = (ops[r2.dimensions.actionType] || 0) + r2.sum.requests;
    return { ...ops, used: ops.write + ops.delete + ops.list, limit: KV_LIMIT_WRITES, date };
  } catch {
    return null;
  }
}
async function storage(env, params) {
  const cache = caches.default;
  let stats = null;
  if (params.get("fresh") !== "1") {
    const hit = await cache.match(STATS_URL).catch(() => null);
    if (hit) stats = await hit.json();
  }
  if (!stats) {
    stats = await storageStats(env);
    await cache.put(STATS_URL, new Response(JSON.stringify(stats), { headers: { "cache-control": "max-age=600" } })).catch(() => {
    });
  }
  return json({ ...stats, ops: await todaysOps(env) });
}
var forgetStorage = () => caches.default.delete(STATS_URL).catch(() => {
});
var VIEWS_SCHEMA = [
  "CREATE TABLE IF NOT EXISTS views (day TEXT NOT NULL, ts INTEGER NOT NULL, vid TEXT NOT NULL, entry INTEGER NOT NULL, en INTEGER NOT NULL, path TEXT NOT NULL, ref TEXT NOT NULL, country TEXT NOT NULL, device TEXT NOT NULL)",
  "CREATE INDEX IF NOT EXISTS views_day ON views(day)"
];
var viewsReady = false;
async function ensureViews(db) {
  if (viewsReady) return;
  await db.batch(VIEWS_SCHEMA.map((q) => db.prepare(q)));
  viewsReady = true;
}
var roDay = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
var NOT_A_PERSON = /bot|crawl|spider|slurp|preview|facebookexternalhit|meta-externalagent|whatsapp|telegram|discord|skype|curl|wget|python|httpx|go-http|java\/|okhttp|node-fetch|axios|undici|headless|playwright|puppeteer|lighthouse|pagespeed/i;
var deviceOf = (ua) => /iPad|Tablet|Kindle|Silk|PlayBook|Android(?!.*Mobile)/i.test(ua) ? "tablet" : /Mobi|iPhone|iPod|Android|Windows Phone/i.test(ua) ? "mobile" : "desktop";
async function recordHit(env, req, url2) {
  if (!env.VISITORS) return;
  const purpose = req.headers.get("sec-purpose") || req.headers.get("purpose") || "";
  if (/prefetch|prerender/i.test(purpose)) return;
  const ip = req.headers.get("cf-connecting-ip") || "", ua = req.headers.get("user-agent") || "";
  if (!ip || !ua || NOT_A_PERSON.test(ua)) return;
  if (!/text\/html/.test(req.headers.get("accept") || "")) return;
  const vid = (await hmac(env, "visitor:" + ip + "|" + ua)).slice(0, 20);
  let refHost = "";
  try {
    refHost = new URL(req.headers.get("referer") || "").hostname.toLowerCase();
  } catch {
  }
  const inside = /(^|\.)dancapitandeplai\.(ro|pages\.dev)$/.test(refHost);
  const entry = inside ? 0 : 1;
  const en = /^\/en(\/|$)/.test(url2.pathname) ? 1 : 0;
  const now = /* @__PURE__ */ new Date();
  const db = env.VISITORS;
  try {
    await ensureViews(db);
    await db.prepare("INSERT INTO views (day, ts, vid, entry, en, path, ref, country, device) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)").bind(
      roDay(now),
      now.getTime(),
      vid,
      entry,
      en,
      url2.pathname.slice(0, 300),
      inside ? "" : refHost.slice(0, 100),
      String(req.cf?.country || "").slice(0, 2),
      deviceOf(ua)
    ).run();
  } catch (e2) {
    console.error("record_hit_failed", e2);
  }
}
async function ownStats(env, days, since) {
  if (!env.VISITORS) return null;
  const db = env.VISITORS;
  await ensureViews(db);
  const now = Date.now(), d = (n) => roDay(new Date(now - n * 864e5));
  const from = d(days - 1), prevFrom = d(2 * days - 1), sinceMs = Date.parse(since) || 0;
  const ALL = `(SELECT day, ts, vid, entry, en, path, ref, country, device FROM views WHERE ts >= ${sinceMs})`;
  const q = (sql, ...args) => db.prepare(sql.replace("ALL", ALL)).bind(...args);
  const by = (col, metric, limit) => q(`SELECT ${col} AS key, count(*) AS views, sum(entry) AS visits FROM ALL WHERE day >= ?1 GROUP BY ${col} HAVING ${metric} > 0 ORDER BY ${metric} DESC, views DESC LIMIT ${limit}`, from);
  const res = await db.batch([
    q("SELECT day, count(*) AS views, sum(entry) AS visits, count(DISTINCT vid) AS uniques FROM ALL WHERE day >= ?1 GROUP BY day", from),
    q("SELECT count(*) AS views, coalesce(sum(entry),0) AS visits, count(DISTINCT vid) AS uniques, coalesce(sum(en),0) AS en FROM ALL WHERE day >= ?1", from),
    q("SELECT count(*) AS views, coalesce(sum(entry),0) AS visits, count(DISTINCT vid) AS uniques FROM ALL WHERE day >= ?1 AND day < ?2", prevFrom, from),
    by("path", "views", 10),
    by("ref", "visits", 8),
    by("country", "visits", 8),
    by("device", "visits", 10)
  ]);
  const [byDay, tot, prev, pages, refs, countries, devices] = res.map((r2) => r2.results);
  const map = new Map(byDay.map((r2) => [r2.day, r2]));
  const daily = [];
  for (let i = days - 1; i >= 0; i--) {
    const k = d(i), r2 = map.get(k);
    daily.push({ key: k, views: r2 ? r2.views : 0, visits: r2 ? r2.visits : 0, uniques: r2 ? r2.uniques : 0 });
  }
  const t2 = tot[0], p = prev[0];
  return {
    days,
    from,
    to: d(0),
    since,
    own: true,
    daily,
    total: { views: t2.views, visits: t2.visits, uniques: t2.uniques },
    prev: { views: p.views, visits: p.visits, uniques: p.uniques },
    lang: { ro: t2.views - t2.en, en: t2.en },
    pages,
    refs,
    countries,
    devices,
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var RUM_SITE_TAG = "82c2176da79d4d8189e726ad2152c15d";
var SITE_HOST = "dancapitandeplai.ro";
var DEFAULT_SINCE = "2026-11-02T14:45:00Z";
var day = (d) => d.toISOString().slice(0, 10);
async function rumQuery(env, days) {
  const now = /* @__PURE__ */ new Date();
  const from = new Date(now.getTime() - (days - 1) * 864e5);
  const prevFrom = new Date(from.getTime() - days * 864e5);
  const since = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(env.STATS_SINCE || "") ? env.STATS_SINCE : DEFAULT_SINCE;
  const pieces = (start) => {
    const out = [];
    for (let i = 0; i < days; i += 7) {
      const a2 = new Date(start.getTime() + i * 864e5), b = new Date(start.getTime() + Math.min(i + 6, days - 1) * 864e5);
      if (since && since.slice(0, 10) > day(b)) {
        out.push(null);
        continue;
      }
      out.push(`{siteTag:$s, requestHost:"${SITE_HOST}", date_geq:"${day(a2)}", date_leq:"${day(b)}", datetime_geq:"${since}", userAgentBrowser_neq:"ChromeHeadless"}`);
    }
    return out;
  };
  const g = (alias, f, dims, order, limit) => `${alias}: rumPageloadEventsAdaptiveGroups(limit:${limit}, filter:${f}${order ? `, orderBy:[${order}]` : ""}){count sum{visits}${dims ? ` dimensions{${dims}}` : ""}}`;
  const parts = [];
  pieces(prevFrom).forEach((f, i) => f && parts.push(g(`prev${i}`, f, "", "", 1)));
  pieces(from).forEach((f, i) => f && parts.push(
    g(`daily${i}`, f, "date", "date_ASC", 10),
    g(`pages${i}`, f, "requestPath", "count_DESC", 500),
    g(`countries${i}`, f, "countryName", "sum_visits_DESC", 50),
    g(`devices${i}`, f, "deviceType", "sum_visits_DESC", 10),
    g(`refs${i}`, f, "refererHost", "sum_visits_DESC", 50)
  ));
  const query = `query($a:String!,$s:String!){viewer{accounts(filter:{accountTag:$a}){
${parts.join("\n")}
}}}`;
  const res = await fetch("https://api.cloudflare.com/client/v4/graphql", {
    method: "POST",
    headers: { authorization: "Bearer " + env.CF_ANALYTICS_TOKEN, "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { a: env.CF_ACCOUNT_ID, s: env.CF_RUM_SITE_TAG || RUM_SITE_TAG } })
  });
  const d = await res.json().catch(() => ({}));
  const acc = d?.data?.viewer?.accounts?.[0];
  if (!acc) throw new Error((d?.errors?.[0]?.message || "HTTP " + res.status).slice(0, 200));
  const n = Math.ceil(days / 7), a = {};
  for (const name of ["prev", "daily", "pages", "countries", "devices", "refs"]) {
    const merged = /* @__PURE__ */ new Map();
    for (let i = 0; i < n; i++) for (const r2 of acc[name + i] || []) {
      const k = JSON.stringify(r2.dimensions || {});
      const m = merged.get(k) || { dimensions: r2.dimensions, count: 0, sum: { visits: 0 } };
      m.count += r2.count;
      m.sum.visits += r2.sum.visits;
      merged.set(k, m);
    }
    a[name] = [...merged.values()];
  }
  a.total = [a.daily.reduce((t2, r2) => ({ count: t2.count + r2.count, sum: { visits: t2.sum.visits + r2.sum.visits } }), { count: 0, sum: { visits: 0 } })];
  const bySum = (x, y) => y.sum.visits - x.sum.visits || y.count - x.count;
  a.pages.sort((x, y) => y.count - x.count);
  for (const k of ["countries", "devices", "refs"]) a[k].sort(bySum);
  const sum = (rows2) => ({ views: rows2?.[0]?.count || 0, visits: rows2?.[0]?.sum?.visits || 0 });
  const rows = (list2, key) => (list2 || []).map((r2) => ({ key: r2.dimensions[key] || "", views: r2.count, visits: r2.sum.visits }));
  const byDate = new Map(rows(a.daily, "date").map((r2) => [r2.key, r2]));
  const daily = [];
  for (let t2 = from.getTime(); t2 <= now.getTime() + 1; t2 += 864e5) {
    const k = day(new Date(t2));
    daily.push(byDate.get(k) || { key: k, views: 0, visits: 0 });
  }
  const pages = rows(a.pages, "requestPath");
  const lang = { ro: 0, en: 0 };
  for (const p of pages) lang[/^\/en(\/|$)/.test(p.key) ? "en" : "ro"] += p.views;
  return {
    days,
    from: day(from),
    to: day(now),
    since,
    total: sum(a.total),
    prev: sum(a.prev),
    daily,
    lang,
    pages: pages.slice(0, 10),
    // Visits only start on a page opened from outside, so rows with 0 visits are clicks inside the site
    countries: rows(a.countries, "countryName").filter((r2) => r2.visits).slice(0, 8),
    devices: rows(a.devices, "deviceType").filter((r2) => r2.visits),
    refs: rows(a.refs, "refererHost").filter((r2) => r2.visits && !/(^|\.)dancapitandeplai\.(ro|pages\.dev)$/.test(r2.key)).slice(0, 8),
    at: (/* @__PURE__ */ new Date()).toISOString()
  };
}
var lastStats = {};
async function analytics(env, params) {
  const days = params.get("days") === "30" ? 30 : 7;
  const since = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(env.STATS_SINCE || "") ? env.STATS_SINCE : DEFAULT_SINCE;
  if (env.VISITORS) {
    try {
      return json(await ownStats(env, days, since));
    } catch (e2) {
      console.error("own_stats_failed", e2);
      return json({ error: "analytics_failed" }, 502);
    }
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
  } catch (e2) {
    if (lastStats[days]) return json(lastStats[days]);
    console.error("analytics_failed", e2);
    return json({ error: "analytics_failed" }, 502);
  }
  await cache.put(key, new Response(JSON.stringify(data), { headers: { "cache-control": "max-age=300" } })).catch(() => {
  });
  return json(data);
}
async function handleApi(req, env, url2) {
  const p = url2.pathname, m = req.method;
  if (m === "POST" && p === "/api/auth/login") return quickLogin(req, env);
  if (m === "POST" && p === "/api/auth/request") return requestLink(req, env, url2);
  if (m === "POST" && p === "/api/auth/verify") return verifyLink(req, env);
  if (m === "POST" && p === "/api/auth/logout") return logout();
  if (m === "GET" && p === "/api/content/public") return json(await getContent(env));
  const s = await session(req, env);
  if (!s) return json({ error: "unauthorized" }, 401);
  if (m !== "GET" && req.headers.get("x-admin") !== "1") return json({ error: "forbidden" }, 403);
  if (m === "GET" && p === "/api/auth/me") return json({ email: s.email }, 200, { "set-cookie": NOSTATS_COOKIE });
  if (m === "GET" && p === "/api/content") return json(await getContent(env));
  if (m === "GET" && p === "/api/storage") return storage(env, url2.searchParams);
  if (m === "GET" && p === "/api/analytics") return analytics(env, url2.searchParams);
  if (m === "GET" && p === "/api/google") return googleStats(env, url2.searchParams, json).catch((e2) => {
    console.error("google_failed", e2);
    return json({ error: "google_failed" }, 502);
  });
  if (m === "PUT" && p === "/api/content") {
    await forgetStorage();
    return saveContent(req, env);
  }
  if (m === "POST" && p === "/api/media") return uploadMedia(req, env, url2.searchParams);
  if (m === "POST" && p === "/api/media/import") return importMedia(req, env);
  return json({ error: "not_found" }, 404);
}

// public/assets/css/style.css
var style_default = `/* Self-hosted fonts: latin + Romanian subset (was Google Fonts, render-blocking) */
@font-face{font-family:'Jost';font-style:normal;font-weight:300 700;font-display:swap;src:url(/assets/fonts/jost-latin.woff2) format('woff2');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:'Jost';font-style:normal;font-weight:300 700;font-display:swap;src:url(/assets/fonts/jost-ro.woff2) format('woff2');unicode-range:U+0100-0103,U+015E-0163,U+0218-021B}
@font-face{font-family:'Cormorant Garamond';font-style:italic;font-weight:400;font-display:swap;src:url(/assets/fonts/cormorant-garamond-400i.woff2) format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-weight:400;font-display:swap;src:url(/assets/fonts/inter-400.woff2) format('woff2')}
@font-face{font-family:'Inter';font-style:normal;font-weight:500;font-display:swap;src:url(/assets/fonts/inter-500.woff2) format('woff2')}
/* Dan C\u0103pitan de Plai \u2014 layout adapted from reference demo "Home 2" */
:root {
  --ink: #161616;
  --ink-soft: #4a4a4a;
  --muted: #6b6b6b;
  --paper: #ffffff;
  --paper-2: #f6f4f0;
  --line: #e6e2da;
  --accent: #b08d57;
  --accent-ink: #8a6a3a;
  --dark: #0f0f0f;
  --head: "Jost", system-ui, -apple-system, "Segoe UI", sans-serif;
  --body: "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --serif: "Cormorant Garamond", Georgia, serif;
  --wrap: 1200px;
  --gutter: clamp(16px, 4vw, 40px);
  --radius: 2px;
  --header-bg: rgba(255,255,255,.96);
  --on-ink: #ffffff;
  color-scheme: light;
}

/* Dark variant: html[data-theme="dark"] (set before paint by inline script) */
:root[data-theme="dark"] {
  --ink: #ece9e3;
  --ink-soft: #bdb7ad;
  --muted: #8f897f;
  --paper: #121212;
  --paper-2: #1b1a19;
  --line: #2c2a27;
  --accent: #c9a56a;
  --accent-ink: #d6b47e;
  --dark: #0a0a0a;
  --header-bg: rgba(18,18,18,.94);
  --on-ink: #121212;
  color-scheme: dark;
}

*, *::before, *::after { box-sizing: border-box; }
html { scroll-behavior: smooth; -webkit-text-size-adjust: 100%; }
body {
  margin: 0;
  font: 400 16px/1.7 var(--body);
  color: var(--ink);
  background: var(--paper);
  -webkit-font-smoothing: antialiased;
}
img { display: block; max-width: 100%; height: auto; }
a { color: inherit; }
h1, h2, h3, h4 { font-family: var(--head); font-weight: 500; line-height: 1.2; margin: 0 0 .5em; letter-spacing: 0; }
p { margin: 0 0 1em; }
.wrap { width: 100%; max-width: var(--wrap); margin: 0 auto; padding: 0 var(--gutter); }
.skip { position: absolute; left: -999px; top: 0; background: var(--ink); color: var(--on-ink); padding: 8px 12px; z-index: 100; }
.skip:focus { left: 8px; top: 8px; }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 3px; }

/* Buttons */
.btn {
  display: inline-flex; align-items: center; gap: .6em;
  font: 600 13px/1 var(--head); letter-spacing: .12em; text-transform: uppercase;
  padding: 16px 28px; border: 1px solid currentColor; border-radius: var(--radius);
  text-decoration: none; transition: background .25s, color .25s, border-color .25s;
}
.btn:hover { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }
.btn--solid { background: var(--ink); color: var(--on-ink); border-color: var(--ink); }
.btn--solid:hover { background: var(--accent-ink); border-color: var(--accent-ink); color: var(--on-ink); }
.btn--light { color: #fff; }
.btn--light:hover { background: #fff; color: #121212; border-color: #fff; }
.btn svg { width: 18px; height: 18px; flex: none; }

/* Header */
.site-header {
  position: fixed; inset: 0 0 auto 0; z-index: 50;
  color: #fff; transition: background .3s, color .3s, box-shadow .3s;
}
.site-header .wrap { display: flex; align-items: center; justify-content: space-between; height: 80px; gap: 24px; }
.site-header.is-solid, body:not(.has-hero) .site-header { background: var(--header-bg); color: var(--ink); box-shadow: 0 1px 0 var(--line); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
.logo { font: 700 15px/1.1 var(--head); letter-spacing: .18em; text-transform: uppercase; text-decoration: none; }
.logo small { display: block; font-weight: 500; font-size: 10px; letter-spacing: .3em; opacity: .75; margin-top: 4px; }
/* Brand logo (traced from Dan's logo PNGs). One SVG used as a mask, so it takes the text color:
   white over the hero photo and in dark mode, black in light mode. */
.logo-img { display: block; width: 190px; aspect-ratio: 1782 / 338; background: currentColor;
  -webkit-mask: url(/assets/img/logo.svg?v=1) center / contain no-repeat; mask: url(/assets/img/logo.svg?v=1) center / contain no-repeat; }
.site-header .logo { display: block; flex: none; }
.site-footer .logo-img { width: 230px; }
@media (min-width: 901px) { .site-header .logo-img { width: 230px; } }
.site-footer .logo small { margin-top: 12px; }
@media (max-width: 380px) { .site-header .logo-img { width: 160px; } }
.nav { display: flex; align-items: center; gap: 32px; }
.nav ul { display: flex; gap: 28px; list-style: none; margin: 0; padding: 0; }
.nav a { font: 500 13px/1 var(--head); letter-spacing: .08em; text-transform: uppercase; text-decoration: none; padding: 6px 0; border-bottom: 1px solid transparent; }
.nav a:hover, .nav a[aria-current="page"] { border-color: currentColor; }
.nav .btn { padding: 12px 18px; font-size: 12px; border-bottom: 1px solid currentColor; }
.site-header:not(.is-solid) .nav .btn:hover { background: #fff; color: #121212; }
.lang { font: 600 12px/1 var(--head); letter-spacing: .1em; text-decoration: none; opacity: .8; }
.lang:hover { opacity: 1; }
.menu-toggle { display: none; background: none; border: 0; color: inherit; padding: 8px; cursor: pointer; }
.menu-toggle svg { width: 26px; height: 26px; }

@media (max-width: 900px) {
  .menu-toggle { display: block; }
  .nav {
    position: fixed; inset: 80px 0 auto 0; background: var(--paper); color: var(--ink);
    flex-direction: column; align-items: stretch; gap: 0; padding: 8px var(--gutter) 24px;
    box-shadow: 0 12px 24px rgba(0,0,0,.08); transform: translateY(-8px); opacity: 0; visibility: hidden;
    transition: opacity .2s, transform .2s, visibility .2s;
  }
  .nav.is-open { opacity: 1; visibility: visible; transform: none; }
  .nav ul { flex-direction: column; gap: 0; }
  .nav ul a { display: block; padding: 16px 0; border-bottom: 1px solid var(--line); }
  .nav .btn { margin-top: 16px; justify-content: center; }
  .nav .lang { padding: 16px 0; }
  .site-header.menu-open { background: var(--paper); color: var(--ink); }
}

/* Hero slider */
.hero { position: relative; height: 100vh; height: 100svh; min-height: 560px; color: #fff; overflow: hidden; background: var(--dark); }
.hero-slide { position: absolute; inset: 0; opacity: 0; z-index: 0; visibility: hidden; }
/* Hidden slides use visibility:hidden so phones (iOS Safari) can drop their layers + memory;
   only the 2 slides in a crossfade are GPU layers (will-change), which keeps the fade and zoom smooth */
.hero-slide.is-active { opacity: 1; z-index: 2; visibility: visible; transition: opacity var(--hero-fade, 1500ms) ease-in-out; will-change: opacity; }
.hero-slide.is-prev { opacity: 1; z-index: 1; visibility: visible; }
.hero-slide img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.06); -webkit-backface-visibility: hidden; backface-visibility: hidden; }
.hero-slide.is-active img, .hero-slide.is-prev img { transform: scale(1); transition: transform var(--hero-zoom, 6500ms) cubic-bezier(.25,.1,.25,1); will-change: transform; }
.hero-slide::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,.25) 45%, rgba(0,0,0,.55) 100%); }
.hero-caption { position: absolute; inset: 0; z-index: 2; display: grid; place-content: center; text-align: center; padding: 0 var(--gutter); }
.hero-caption h1, .hero-caption h2 { font-size: clamp(32px, 5.4vw, 68px); font-weight: 600; margin: 0 0 .35em; text-shadow: 0 2px 24px rgba(0,0,0,.25); }
.hero-caption p { font: 500 13px/1.4 var(--head); letter-spacing: .3em; text-transform: uppercase; margin: 0; opacity: .9; }
/* Reviews in the hero: glass box, bottom middle, above the arrows */
.hero--quotes .hero-caption { place-content: end center; padding-bottom: 128px; }
/* Clear glass box (Dan's pick): light frosted glass, white rim + highlight */
.hero-box { max-width: min(860px, 100%); margin: 0 auto; padding: 22px 32px 20px; border-radius: 22px; border: 1px solid rgba(255,255,255,.45);
  background: linear-gradient(135deg, rgba(255,255,255,.22), rgba(255,255,255,.06)), rgba(0,0,0,.14);
  -webkit-backdrop-filter: blur(22px) saturate(1.4) brightness(.9); backdrop-filter: blur(22px) saturate(1.4) brightness(.9);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.5), 0 8px 32px rgba(0,0,0,.2); }
.hero-box p { text-shadow: 0 1px 8px rgba(0,0,0,.35); }
@supports not ((backdrop-filter: blur(1px)) or (-webkit-backdrop-filter: blur(1px))) { .hero-box { background: rgba(30,30,30,.55); } }
.hero-caption .hero-quote { font: italic 400 clamp(17px, 1.7vw, 24px)/1.45 var(--serif); letter-spacing: 0; text-transform: none; margin: 0 auto .9em; opacity: 1; }
.hero-box p:not(.hero-quote) { font-size: 11px; letter-spacing: .28em; }
@media (max-width: 700px) { .hero--quotes .hero-caption { padding: 0 16px 124px; } .hero-box { padding: 16px 18px; -webkit-backdrop-filter: blur(12px) saturate(1.3) brightness(.9); backdrop-filter: blur(12px) saturate(1.3) brightness(.9); } .hero-caption .hero-quote { font-size: 16px; } }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
.hero-controls { position: absolute; z-index: 3; left: 50%; bottom: 32px; transform: translateX(-50%); display: flex; align-items: center; gap: 16px; }
.hero-controls button { -webkit-tap-highlight-color: transparent; touch-action: manipulation; background: none; border: 1px solid rgba(255,255,255,.4); border-radius: 50%; width: 44px; height: 44px; display: grid; place-items: center; color: #fff; cursor: pointer; transition: border-color .2s, background .2s; }
.hero-controls button:hover { border-color: #fff; background: rgba(255,255,255,.1); }
.hero-controls svg { width: 20px; height: 20px; }
.hero-count { font: 500 12px/1 var(--head); letter-spacing: .25em; min-width: 72px; text-align: center; }
.hero-scroll { position: absolute; z-index: 3; left: var(--gutter); bottom: 32px; font: 500 11px/1 var(--head); letter-spacing: .3em; text-transform: uppercase; text-decoration: none; writing-mode: vertical-rl; opacity: .8; }

/* Sections */
.section { padding: clamp(72px, 10vw, 140px) 0; }
.section--tint { background: var(--paper-2); }
.section--dark { background: var(--dark); color: #fff; }
.eyebrow { display: block; font: 600 12px/1.4 var(--head); letter-spacing: .3em; text-transform: uppercase; color: var(--accent-ink); margin-bottom: 16px; }
.section--dark .eyebrow { color: var(--accent); }
.h-xl { font-size: clamp(30px, 4vw, 48px); }
.h-lg { font-size: clamp(26px, 3.2vw, 38px); }
.lead { font-size: 18px; color: var(--ink-soft); }
.center { text-align: center; }
.narrow { max-width: 760px; margin-left: auto; margin-right: auto; }

/* Intro split */
.split { display: grid; grid-template-columns: 1.05fr .95fr; gap: clamp(32px, 6vw, 96px); align-items: center; }
.split--rev .split-media { order: -1; }
.split-media img { width: 100%; aspect-ratio: 3 / 4; object-fit: cover; }
.split-media--square img { aspect-ratio: 1; }
.signature { font: italic 400 30px/1 var(--serif); color: var(--accent-ink); margin-top: 8px; }
@media (max-width: 800px) {
  .split { grid-template-columns: 1fr; }
  .split--rev .split-media { order: 0; }
}

/* Banners */
.banners { display: grid; grid-template-columns: 1fr 1fr; }
.banner { position: relative; min-height: 520px; display: grid; align-content: end; padding: clamp(28px, 4vw, 56px); color: #fff; overflow: hidden; text-decoration: none; }
.banner img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 1.2s ease; }
.banner::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,.65) 100%); }
.banner:hover img { transform: scale(1.04); }
.banner > div { position: relative; z-index: 1; max-width: 440px; }
.banner h3 { font-size: clamp(24px, 2.6vw, 34px); margin-bottom: 24px; }
@media (max-width: 800px) { .banners { grid-template-columns: 1fr; } .banner { min-height: 420px; } }

/* Quote */
.quote { font: italic 400 clamp(26px, 3.4vw, 44px)/1.3 var(--serif); margin: 0 auto; max-width: 900px; }
.quote-by { display: block; margin-top: 24px; font: 600 12px/1 var(--head); letter-spacing: .25em; text-transform: uppercase; color: var(--muted); font-style: normal; }

/* Stats */
.stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-top: 64px; border-top: 1px solid var(--line); padding-top: 40px; }
.stat strong { display: block; font: 600 clamp(28px, 3vw, 40px)/1 var(--head); margin-bottom: 8px; }
.stat span { font-size: 14px; color: var(--muted); }
@media (max-width: 700px) { .stats { grid-template-columns: 1fr 1fr; } }

/* Services list */
.services { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; background: var(--line); border: 1px solid var(--line); margin-top: 48px; }
.service { background: var(--paper); padding: 32px 28px; }
.service h3 { font-size: 18px; margin-bottom: 8px; }
.service p { font-size: 15px; color: var(--ink-soft); margin: 0; }
@media (max-width: 900px) { .services { grid-template-columns: 1fr 1fr; } }
@media (max-width: 560px) { .services { grid-template-columns: 1fr; } }

/* Testimonials */
.testimonials { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: clamp(24px, 4vw, 56px); margin-top: 56px; }
.testimonial { text-align: center; }
.testimonial img { width: 96px; height: 96px; border-radius: 50%; object-fit: cover; margin: 0 auto 24px; }
.testimonial blockquote { font: italic 400 22px/1.5 var(--serif); margin: 0 auto 20px; max-width: 40em; color: var(--ink-soft); }
.testimonial cite { font: 600 12px/1 var(--head); letter-spacing: .2em; text-transform: uppercase; font-style: normal; }

/* CTA */
.cta { position: relative; color: #fff; text-align: center; overflow: hidden; }
.cta img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.cta::after { content: ""; position: absolute; inset: 0; background: rgba(0,0,0,.55); }
.cta .wrap { position: relative; z-index: 1; }
.cta p { opacity: .9; }

/* Instagram strip */
.ig-head { display: flex; justify-content: space-between; align-items: baseline; gap: 16px; flex-wrap: wrap; margin-bottom: 32px; }
.ig-head a { font: 600 13px/1 var(--head); letter-spacing: .1em; text-decoration: none; border-bottom: 1px solid currentColor; padding-bottom: 4px; }
.ig-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; }
.ig-grid a { position: relative; overflow: hidden; display: block; }
.ig-grid img { width: 100%; aspect-ratio: 1; object-fit: cover; transition: transform .6s, opacity .3s; }
.ig-grid a:hover img { transform: scale(1.06); opacity: .85; }
@media (max-width: 700px) { .ig-grid { grid-template-columns: repeat(3, 1fr); } }

/* Page header (inner pages): photo banner in the home hero style */
.page-hero { position: relative; display: flex; align-items: flex-end; min-height: 480px; height: 72vh; height: 72svh; max-height: 780px; color: #fff; background: var(--dark); overflow: hidden; text-align: center; }
.page-hero img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 30%; }
.page-hero::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.45) 0%, rgba(0,0,0,.25) 40%, rgba(0,0,0,.65) 100%); }
.page-hero .wrap { position: relative; z-index: 1; width: 100%; padding-bottom: clamp(48px, 8vh, 88px); }
.page-hero h1 { color: #fff; margin: 0 0 .3em; text-shadow: 0 2px 24px rgba(0,0,0,.3); }
.page-hero .eyebrow { color: var(--accent); }
.page-hero .eyebrow time { color: inherit; }
.page-hero .lead { color: rgba(255,255,255,.9); max-width: 680px; margin: 0 auto; text-shadow: 0 1px 12px rgba(0,0,0,.35); }
.page-hero .event-venue { color: rgba(255,255,255,.85); justify-content: center; margin-top: 16px; }
@media (max-width: 700px) { .page-hero { min-height: 420px; height: 64svh; } }
.page-head { padding: 160px 0 56px; text-align: center; }
.page-head p { max-width: 640px; margin: 0 auto; }

/* Portfolio */
.filters { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 28px; margin-bottom: 40px; }
.filters button { background: none; border: 0; padding: 8px 0; cursor: pointer; font: 500 13px/1 var(--head); letter-spacing: .1em; text-transform: uppercase; color: var(--muted); border-bottom: 1px solid transparent; }
.filters button[aria-pressed="true"], .filters button:hover { color: var(--ink); border-color: var(--ink); }
.gallery { columns: 3 320px; column-gap: 12px; }
.gallery a { display: block; margin-bottom: 12px; break-inside: avoid; position: relative; overflow: hidden; cursor: zoom-in; }
.gallery img { width: 100%; aspect-ratio: auto 3 / 4; /* reserve space until the photo loads (most are 3:4) */ transition: transform .8s ease, opacity .3s; }
.gallery a:hover img { transform: scale(1.03); }
.gallery a[hidden] { display: none; }
.gallery figcaption { position: absolute; left: 0; right: 0; bottom: 0; padding: 32px 16px 14px; color: #fff; font: 500 12px/1 var(--head); letter-spacing: .15em; text-transform: uppercase; background: linear-gradient(transparent, rgba(0,0,0,.55)); opacity: 0; transition: opacity .3s; }
.gallery a:hover figcaption, .gallery a:focus-visible figcaption { opacity: 1; }

/* Lightbox */
.lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(10,10,10,.96); display: none; align-items: center; justify-content: center; overscroll-behavior: contain; -webkit-tap-highlight-color: transparent; }
.lightbox.is-open { display: flex; }
.lightbox img { max-width: calc(100vw - 32px); max-height: calc(100vh - 120px); max-height: calc(100dvh - 120px); object-fit: contain; }
.lightbox button { position: absolute; background: none; border: 0; color: #fff; cursor: pointer; padding: 16px; opacity: .8; }
.lightbox button:hover { opacity: 1; }
.lightbox svg { width: 28px; height: 28px; }
.lb-close { top: 8px; right: 8px; }
.lb-prev { left: 4px; top: 50%; transform: translateY(-50%); }
.lb-next { right: 4px; top: 50%; transform: translateY(-50%); }
.lb-count { position: absolute; bottom: 20px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,.7); font: 500 12px/1 var(--head); letter-spacing: .2em; }

/* Contact */
.contact-grid { display: grid; grid-template-columns: 1fr 1fr; gap: clamp(32px, 6vw, 96px); }
.contact-list { list-style: none; padding: 0; margin: 32px 0; }
.contact-list li { padding: 18px 0; border-bottom: 1px solid var(--line); display: flex; gap: 16px; align-items: center; }
.contact-list svg { width: 20px; height: 20px; color: var(--accent-ink); flex: none; }
.contact-list a { text-decoration: none; }
.contact-list a:hover { text-decoration: underline; }
.contact-list small { display: block; color: var(--muted); font-size: 13px; }
.note { background: var(--paper-2); padding: 28px; border-left: 2px solid var(--accent); }
.note ul { margin: 0; padding-left: 18px; }
.note li { margin-bottom: 6px; }
@media (max-width: 800px) { .contact-grid { grid-template-columns: 1fr; } }

/* Footer */
.site-footer { background: var(--dark); color: rgba(255,255,255,.7); padding: 64px 0 32px; font-size: 14px; }
.site-footer .wrap { display: grid; gap: 32px; }
.footer-top { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 24px; }
.site-footer .logo { color: #fff; }
.footer-nav { display: flex; flex-wrap: wrap; gap: 8px 24px; list-style: none; margin: 0; padding: 0; }
.footer-nav a, .socials a { text-decoration: none; }
.footer-nav a:hover { color: #fff; }
.footer-seo { font-size: 13px; opacity: .8; }
.landing h2 { margin: 48px 0 16px; }
.landing h2:first-child { margin-top: 0; }
.socials { display: flex; gap: 16px; }
.socials a { display: grid; place-items: center; width: 40px; height: 40px; border: 1px solid rgba(255,255,255,.2); border-radius: 50%; transition: border-color .2s, color .2s; }
.socials a:hover { border-color: #fff; color: #fff; }
.socials svg { width: 18px; height: 18px; }
.footer-bottom { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; border-top: 1px solid rgba(255,255,255,.1); padding-top: 24px; font-size: 13px; }
.footer-bottom a { text-decoration: none; }
.footer-bottom a:hover { color: #fff; }

/* Floating WhatsApp */
.wa-float { position: fixed; right: 20px; bottom: 20px; z-index: 60; width: 56px; height: 56px; border-radius: 50%; display: grid; place-items: center; background: #25d366; color: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.2); transition: transform .2s; }
.wa-float:hover { transform: scale(1.06); }
.wa-float svg { width: 28px; height: 28px; }

/* Reveal on scroll */
.reveal { opacity: 0; transform: translateY(24px); transition: opacity .9s ease, transform .9s ease; }
.reveal.is-in { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { transition: none !important; animation: none !important; }
  .reveal { opacity: 1; transform: none; }
  html { scroll-behavior: auto; }
}
.no-js .reveal { opacity: 1; transform: none; }

/* Section 3: page buttons */
.tiles { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-top: 48px; }
.tile { position: relative; display: grid; align-content: end; aspect-ratio: 9 / 11; padding: 20px; color: #fff; text-decoration: none; overflow: hidden; }
.tile img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 1s ease; }
.tile::after { content: ""; position: absolute; inset: 0; background: linear-gradient(180deg, rgba(0,0,0,.05) 35%, rgba(0,0,0,.7) 100%); transition: background .3s; }
.tile:hover img { transform: scale(1.06); }
.tile:hover::after { background: linear-gradient(180deg, rgba(0,0,0,.2) 0%, rgba(0,0,0,.75) 100%); }
.tile > div { position: relative; z-index: 1; }
.tile-label { display: block; font: 600 16px/1.2 var(--head); letter-spacing: .14em; text-transform: uppercase; }
.tile-sub { display: block; font-size: 13px; opacity: .85; margin-top: 6px; line-height: 1.4; }
@media (max-width: 1000px) { .tiles { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 600px) { .tiles { grid-template-columns: 1fr 1fr; } .tile { aspect-ratio: 4 / 5; } .tile:first-child { grid-column: span 2; aspect-ratio: 16 / 9; } }

/* Portfolio event cards */
.events { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: clamp(24px, 3vw, 40px); }
.event-card { text-decoration: none; display: block; }
.event-card[hidden] { display: none; }
.event-card img { width: 100%; aspect-ratio: 4 / 3; object-fit: cover; transition: opacity .3s; }
.event-card:hover img { opacity: .88; }
.event-meta { padding-top: 18px; }
.event-meta .eyebrow { margin-bottom: 8px; font-size: 11px; }
.event-meta h2, .event-meta h3 { font-size: 22px; margin-bottom: 8px; }
.event-count { display: inline-flex; align-items: center; gap: 8px; font: 500 13px/1 var(--head); color: var(--muted); }
.event-count svg { width: 16px; height: 16px; transition: transform .2s; }
.event-card:hover .event-count svg { transform: translateX(4px); }
.event-venue { display: inline-flex; align-items: center; gap: 8px; color: var(--muted); font-size: 14px; margin-top: 8px; }
.event-venue svg { width: 18px; height: 18px; }
.event-nav { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-top: 56px; }
@media (max-width: 420px) { .events { grid-template-columns: 1fr; } }

/* Blog */
.posts { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: clamp(32px, 4vw, 56px); }
.post-card { text-decoration: none; display: block; }
.post-card img { width: 100%; aspect-ratio: 16 / 10; object-fit: cover; margin-bottom: 20px; }
.post-card time { font: 600 11px/1 var(--head); letter-spacing: .25em; text-transform: uppercase; color: var(--accent-ink); }
.post-card h2 { font-size: 24px; margin: 12px 0; }
.post-card p { color: var(--ink-soft); }
.more { display: inline-flex; align-items: center; gap: 8px; font: 600 12px/1 var(--head); letter-spacing: .15em; text-transform: uppercase; }
.more svg { width: 16px; height: 16px; }
.prose p { font-size: 18px; line-height: 1.8; }
@media (max-width: 420px) { .posts { grid-template-columns: 1fr; } }

/* FAQ */
.faq { border-top: 1px solid var(--line); }
.faq-item { border-bottom: 1px solid var(--line); }
.faq-item summary { cursor: pointer; list-style: none; padding: 24px 40px 24px 0; position: relative; font: 600 18px/1.4 var(--head); }
.faq-item summary::-webkit-details-marker { display: none; }
.faq-item summary::after { content: "+"; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font: 300 28px/1 var(--head); color: var(--accent-ink); transition: transform .2s; }
.faq-item[open] summary::after { transform: translateY(-50%) rotate(45deg); }
.faq-item p { color: var(--ink-soft); padding-bottom: 24px; margin: 0; }

/* Theme toggle */
.theme-toggle { background: none; border: 0; color: inherit; cursor: pointer; padding: 8px; display: grid; place-items: center; opacity: .85; }
.theme-toggle:hover { opacity: 1; }
.theme-toggle svg { width: 20px; height: 20px; }
.theme-toggle .i-sun { display: none; }
:root[data-theme="dark"] .theme-toggle .i-sun { display: block; }
:root[data-theme="dark"] .theme-toggle .i-moon { display: none; }
@media (max-width: 900px) { .nav .theme-toggle { align-self: flex-start; padding: 16px 0; } }
:root[data-theme="dark"] .gallery img, :root[data-theme="dark"] .event-card img { filter: brightness(.95); }
body, .site-header, .service, .note, .section--tint { transition: background-color .3s, color .3s; }

/* Event video: thumbnail + play button; the player loads only on click */
.video { position: relative; aspect-ratio: 16 / 9; background: #000; border-radius: 4px; overflow: hidden; margin-bottom: 24px; }
.video img, .video iframe { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; border: 0; }
.video-play { position: absolute; inset: 0; margin: auto; width: 76px; height: 76px; border-radius: 50%; border: 0; background: rgba(0,0,0,.6); color: #fff; cursor: pointer; display: grid; place-items: center; transition: background .2s, transform .2s; }
.video-play:hover, .video-play:focus-visible { background: rgba(0,0,0,.85); transform: scale(1.06); }
.video-play svg { width: 34px; height: 34px; margin-left: 4px; }

/* Cookie consent bar (main.js) */
.consent { position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 61; max-width: 760px; margin: 0 auto;
  display: flex; align-items: center; gap: 16px 24px; padding: 18px 22px; background: var(--paper); color: var(--ink);
  border: 1px solid var(--line); box-shadow: 0 10px 40px rgba(0,0,0,.18); font-size: 14px; line-height: 1.55; }
.consent[hidden] { display: none; }
.consent p { margin: 0; flex: 1; }
.consent-btns { display: flex; gap: 10px; flex: none; }
.consent .btn:not(.btn--solid) { background: transparent; color: var(--ink); }
.consent .btn { padding: 11px 18px; font-size: 12px; cursor: pointer; font-family: var(--head); }
.consent-link { background: none; border: 0; padding: 0; color: inherit; font: inherit; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
@media (max-width: 640px) {
  .consent { flex-direction: column; align-items: stretch; left: 12px; right: 12px; bottom: 12px; padding: 16px; }
  .consent-btns .btn { flex: 1; justify-content: center; }
}
`;

// src/worker/render.js
var SITE = {
  name: "Dan C\u0103pitan de Plai",
  tagline: { ro: "Fotograf de nunt\u0103 \xB7 Bra\u0219ov", en: "Wedding photographer \xB7 Bra\u0219ov" },
  url: "https://dancapitandeplai.ro"
};
var ASSET_V = "18";
var BEACON = `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "df42d30f0ed4484a949473d11ffd4b8c"}'><\/script>`;
var GA4_ID = "G-L42LWHDQLX";
var GTM_ID = "GTM-TF68724C";
var GSC_TOKEN = "";
var GTAG_START = "<!--gtag-->";
var GTAG_END = "<!--/gtag-->";
function googleTags(lang) {
  if (!GA4_ID && !GTM_ID) return "";
  const cfg = JSON.stringify({ ga4: GA4_ID, gtm: GTM_ID }).replace(/</g, "\\u003c");
  return GTAG_START + "<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});gtag('set','ads_data_redaction',true);window.__gcfg=" + cfg + ";<\/script>" + GTAG_END;
}
var ROUTES = {
  ro: {
    home: "/",
    portfolio: "/portofoliu/",
    blog: "/blog/",
    faq: "/intrebari-frecvente/",
    contact: "/contact/",
    wedding: "/fotograf-nunta-brasov/",
    christening: "/fotograf-botez-brasov/",
    family: "/sedinta-foto-familie-brasov/"
  },
  en: {
    home: "/en/",
    portfolio: "/en/portfolio/",
    blog: "/en/blog/",
    faq: "/en/faq/",
    contact: "/en/contact/",
    wedding: "/en/wedding-photographer-brasov/",
    christening: "/en/christening-photographer-brasov/",
    family: "/en/family-newborn-photographer-brasov/"
  }
};
var NAV = {
  ro: [["home", "Acas\u0103"], ["portfolio", "Portofoliu"], ["blog", "Blog"], ["faq", "\xCEntreb\u0103ri"], ["contact", "Contact"]],
  en: [["home", "Home"], ["portfolio", "Portfolio"], ["blog", "Blog"], ["faq", "FAQ"], ["contact", "Contact"]]
};
var UI = {
  ro: {
    book: "Programeaz\u0103 o discu\u021Bie",
    wa_msg: "Bun\u0103, Dan! Am v\u0103zut site-ul \u0219i a\u0219 vrea s\u0103 vorbim despre o \u0219edin\u021B\u0103 foto.",
    scroll: "Deruleaz\u0103",
    view_work: "Vezi portofoliul",
    all: "Toate",
    photos: "fotografii",
    back_portfolio: "\xCEnapoi la portofoliu",
    read_more: "Cite\u0219te",
    back_blog: "\xCEnapoi la blog",
    next_event: "Urm\u0103torul eveniment",
    play_video: "Porne\u0219te filmul",
    rights: "Toate drepturile rezervate.",
    top: "Sus",
    menu: "Meniu",
    close: "\xCEnchide",
    prev: "Anterioara",
    next: "Urm\u0103toarea",
    switch: "EN",
    switch_label: "English version",
    resume_label: "Despre Dan (CV)",
    resume_link: "Povestea \u0219i experien\u021Ba lui Dan",
    theme: "Schimb\u0103 tema (luminoas\u0103 / \xEEntunecat\u0103)"
  },
  en: {
    book: "Book a chat",
    wa_msg: "Hi Dan! I saw your website and I'd like to talk about a photo session.",
    scroll: "Scroll",
    view_work: "View portfolio",
    all: "All",
    photos: "photos",
    back_portfolio: "Back to portfolio",
    read_more: "Read",
    back_blog: "Back to blog",
    next_event: "Next event",
    play_video: "Play video",
    rights: "All rights reserved.",
    top: "Top",
    menu: "Menu",
    close: "Close",
    prev: "Previous",
    next: "Next",
    resume_label: "About Dan (resume)",
    resume_link: "Dan's story and experience",
    switch: "RO",
    switch_label: "Versiunea \xEEn rom\xE2n\u0103",
    theme: "Switch theme (light / dark)"
  }
};
var MONTHS = {
  ro: ["ianuarie", "februarie", "martie", "aprilie", "mai", "iunie", "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie"],
  en: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
};
var OTHER = { ro: "en", en: "ro" };
var SEO = {
  ro: {
    home: [
      "Fotograf nunt\u0103 \u0219i botez Bra\u0219ov \xB7 Dan C\u0103pitan de Plai",
      "Fotograf de nunt\u0103 \u0219i botez \xEEn Bra\u0219ov: fotografie documentar\u0103, momente reale, lumin\u0103 natural\u0103. Cununii civile, evenimente \u0219i \u0219edin\u021Be foto de familie. Cere\u021Bi o ofert\u0103."
    ],
    portfolio: [
      "Portofoliu fotograf nunt\u0103 \u0219i botez Bra\u0219ov \xB7 Dan C\u0103pitan de Plai",
      "Nun\u021Bi, botezuri \u0219i cununii civile fotografiate \xEEn Bra\u0219ov \u0219i \xEEmprejurimi. Fotografie de nunt\u0103 documentar\u0103: alege\u021Bi un eveniment \u0219i intra\u021Bi \xEEn ziua respectiv\u0103."
    ],
    blog: [
      "Blog \xB7 Sfaturi de la un fotograf de nunt\u0103 din Bra\u0219ov",
      "Sfaturi pentru miri \u0219i p\u0103rin\u021Bi de la un fotograf de nunt\u0103 \u0219i botez din Bra\u0219ov: preg\u0103tiri, \u0219edin\u021Be foto, cum s\u0103 nu v\u0103 pierde\u021Bi pozele."
    ],
    faq: [
      "\xCEntreb\u0103ri frecvente \xB7 Fotograf nunt\u0103 \u0219i botez Bra\u0219ov",
      "Cum lucrez, ce primi\u021Bi \u0219i cum se stabile\u0219te oferta pentru o nunt\u0103 sau un botez \xEEn Bra\u0219ov. R\u0103spunsuri scurte la ce m\u0103 \xEEntreab\u0103 cel mai des cuplurile."
    ],
    contact: [
      "Contact \xB7 Fotograf Bra\u0219ov pentru nun\u021Bi, botezuri \u0219i evenimente",
      "Scrie\u021Bi-mi data \u0219i locul: fotograf de nunt\u0103, botez \u0219i evenimente \xEEn Bra\u0219ov. Ofert\u0103 personalizat\u0103; de obicei r\u0103spund \xEEn aceea\u0219i zi."
    ]
  },
  en: {
    home: [
      "Wedding & christening photographer in Bra\u0219ov \xB7 Dan C\u0103pitan de Plai",
      "Wedding and christening photographer in Bra\u0219ov, Romania: documentary photography, real moments, natural light. Civil ceremonies, events and family photo sessions."
    ],
    portfolio: [
      "Portfolio \xB7 Wedding photographer Bra\u0219ov \xB7 Dan C\u0103pitan de Plai",
      "Weddings, christenings and civil ceremonies photographed in and around Bra\u0219ov, Romania. Documentary wedding photography: pick an event and step into that day."
    ],
    blog: [
      "Blog \xB7 Tips from a Bra\u0219ov wedding photographer",
      "Tips for couples and parents from a wedding and christening photographer in Bra\u0219ov: getting ready, photo sessions and how not to lose your photos."
    ],
    faq: [
      "FAQ \xB7 Wedding and christening photographer in Bra\u0219ov",
      "How I work, what you get and how the quote is worked out for a wedding or christening in Bra\u0219ov. Short answers to what couples ask me most."
    ],
    contact: [
      "Contact \xB7 Photographer in Bra\u0219ov for weddings and events",
      "Send me your date and place: wedding, christening and event photographer in Bra\u0219ov, Romania. Tailored quote, I usually reply the same day."
    ]
  }
};
var CAT_KW = {
  ro: { nunta: "fotograf nunt\u0103 Bra\u0219ov", after: "fotograf nunt\u0103 Bra\u0219ov", cununie: "fotograf cununie civil\u0103 Bra\u0219ov", botez: "fotograf botez Bra\u0219ov", familie: "\u0219edin\u021B\u0103 foto familie Bra\u0219ov" },
  en: { nunta: "wedding photographer Bra\u0219ov", after: "wedding photographer Bra\u0219ov", cununie: "civil ceremony photographer Bra\u0219ov", botez: "christening photographer Bra\u0219ov", familie: "family photo session Bra\u0219ov" }
};
var ICON = {
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 7h18M3 12h18M3 17h18"/></svg>',
  wa: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.5 14.4c-.3-.1-1.8-.9-2-1-.3-.1-.5-.1-.7.1-.2.3-.8 1-.9 1.2-.2.2-.3.2-.6.1-.3-.1-1.2-.5-2.4-1.5-.9-.8-1.5-1.8-1.6-2.1-.2-.3 0-.5.1-.6l.4-.5c.2-.2.2-.3.3-.5.1-.2 0-.4 0-.5l-.9-2.2c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.1.2 2.1 3.2 5.1 4.5.7.3 1.3.5 1.7.6.7.2 1.4.2 1.9.1.6-.1 1.8-.7 2-1.4.2-.7.2-1.3.2-1.4-.1-.2-.3-.3-.6-.4zM12 21.8c-1.8 0-3.5-.5-5-1.4l-.4-.2-3.7 1 1-3.6-.2-.4A9.8 9.8 0 1 1 12 21.8zm8.4-18.2A11.8 11.8 0 0 0 1.7 17.8L0 24l6.3-1.7a11.8 11.8 0 0 0 5.7 1.4c6.5 0 11.8-5.3 11.8-11.8 0-3.2-1.2-6.1-3.4-8.3z"/></svg>',
  phone: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/></svg>',
  fb: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.8-4.5 4.6V11H7v4h2.5v9h4v-9h3l.5-4h-3.5V8.8c0-.5.3-.8.5-.8z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4.2"/><circle cx="17.6" cy="6.4" r="1" fill="currentColor"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  left: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>',
  right: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>',
  sun: '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
};
var THEME_JS = "<script>(function(){var t;try{t=localStorage.getItem('theme')}catch(e){}if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.setAttribute('data-theme',t)})();<\/script>";
var e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
var t = (o, lang) => o && typeof o === "object" ? o[lang] ?? o.ro ?? "" : o ?? "";
var r = (lang, key) => ROUTES[lang][key];
var eventUrl = (lang, ev) => `${r(lang, "portfolio")}${ev.slug}/`;
var postUrl = (lang, p) => `${r(lang, "blog")}${p.slug}/`;
var small = (src) => src && src.startsWith("/media/") ? src.replace(/\.jpg$/, "-s.jpg") : src;
var safeUrl = (u) => /^https?:\/\/[^\s"'<>]+$/i.test(u || "") ? u : "#";
var waLink = (c, lang) => `https://wa.me/${String(c.contact.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(UI[lang].wa_msg)}`;
function img(src, alt, { w, h, eager, above, cls, sizes } = {}) {
  const a = [`src="${e(src)}"`, `alt="${e(alt)}"`, 'decoding="async"', eager ? 'fetchpriority="high"' : above ? "" : 'loading="lazy"'].filter(Boolean);
  if (/^\/media\/[0-9a-f]{24}\.jpg$/.test(src)) a.push(`srcset="${e(small(src))} 900w, ${e(src)} 2400w"`, `sizes="${sizes || "100vw"}"`);
  if (w && h) a.push(`width="${w}"`, `height="${h}"`);
  if (cls) a.push(`class="${cls}"`);
  return `<img ${a.join(" ")}>`;
}
function fmtDate(iso, lang) {
  const [y, m, d] = String(iso || "").split("-");
  if (!y || !m || !d) return e(iso);
  const month = MONTHS[lang][parseInt(m, 10) - 1] || "";
  return lang === "ro" ? `${parseInt(d, 10)} ${month} ${y}` : `${month} ${parseInt(d, 10)}, ${y}`;
}
function layout(c, lang, key, { title, desc, body, alt, hasHero = false, ogImage, schema, noindex = false, cta = false }) {
  if (cta) body += ctaBand(c, lang);
  const ui = UI[lang];
  const navItems = NAV[lang].map(([k, label]) => `<li><a href="${r(lang, k)}"${k === key ? ' aria-current="page"' : ""}>${e(label)}</a></li>`).join("");
  const footerNav = NAV[lang].map(([k, label]) => `<li><a href="${r(lang, k)}">${e(label)}</a></li>`).join("");
  const footerSeo = ["wedding", "christening", "family"].map((k) => `<li><a href="${r(lang, k)}">${e(LANDING[k][lang].h1)}</a></li>`).join("");
  const canonical = SITE.url + alt[lang];
  const alternates = ["ro", "en"].map((l) => `<link rel="alternate" hreflang="${l}" href="${SITE.url}${alt[l]}">`).join("") + `<link rel="alternate" hreflang="x-default" href="${SITE.url}${alt.ro}">`;
  const og = ogImage ? ogImage.startsWith("http") ? ogImage : SITE.url + ogImage : SITE.url + (c.hero && c.hero.desktop[0] || "/assets/img/hero-1.jpg");
  const schemaTag = schema ? `<script type="application/ld+json">${JSON.stringify(schema).replace(/</g, "\\u003c")}<\/script>` : "";
  const wa = waLink(c, lang);
  return `<!doctype html>
<html lang="${lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(title)}</title>
<meta name="description" content="${e(desc)}">
${noindex ? '<meta name="robots" content="noindex">' : ""}
<link rel="canonical" href="${canonical}">
${alternates}
<meta property="og:type" content="website">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:image" content="${e(og)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="${lang === "ro" ? "ro_RO" : "en_US"}">
<meta name="theme-color" content="#0f0f0f">
${GSC_TOKEN ? `<meta name="google-site-verification" content="${e(GSC_TOKEN)}">` : ""}
${THEME_JS}
${googleTags(lang)}
<link rel="icon" href="/favicon.ico" sizes="48x48">
<link rel="icon" href="/assets/img/favicon.svg?v=${ASSET_V}" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/img/apple-touch-icon.png?v=${ASSET_V}">
<link rel="manifest" href="/assets/site.webmanifest?v=${ASSET_V}">
<link rel="preload" href="/assets/fonts/jost-latin.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/inter-400.woff2" as="font" type="font/woff2" crossorigin>
<style>${style_default}</style>
${schemaTag}
</head>
<body class="${hasHero ? "has-hero" : ""}">
<a class="skip" href="#main">Skip</a>
<header class="site-header">
  <div class="wrap">
    <a class="logo" href="${r(lang, "home")}" aria-label="${e(SITE.name)}"><span class="logo-img" aria-hidden="true"></span></a>
    <button class="menu-toggle" aria-controls="nav" aria-expanded="false" aria-label="${e(ui.menu)}">${ICON.menu}</button>
    <nav class="nav" id="nav" aria-label="Main">
      <ul>${navItems}</ul>
      <button class="theme-toggle" type="button" aria-label="${e(ui.theme)}" title="${e(ui.theme)}">${ICON.moon}${ICON.sun}</button>
      <a class="lang" href="${alt[OTHER[lang]]}" hreflang="${OTHER[lang]}" aria-label="${ui.switch} \xB7 ${e(ui.switch_label)}">${ui.switch}</a>
      <a class="btn" href="${wa}" target="_blank" rel="noopener">${e(ui.book)}</a>
    </nav>
  </div>
</header>
<main id="main">
${body}
</main>
<footer class="site-footer">
  <div class="wrap">
    <div class="footer-top">
      <a class="logo" href="${r(lang, "home")}" aria-label="${e(SITE.name)}"><span class="logo-img" aria-hidden="true"></span><small>${e(SITE.tagline[lang])}</small></a>
      <ul class="footer-nav">${footerNav}</ul>
      <div class="socials">
        <a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener" aria-label="Instagram">${ICON.ig}</a>
        <a href="${e(safeUrl(c.contact.facebook))}" target="_blank" rel="noopener" aria-label="Facebook">${ICON.fb}</a>
        <a href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
      </div>
    </div>
    <ul class="footer-nav footer-seo">${footerSeo}</ul>
    <div class="footer-bottom">
      <span>\xA9 <span id="year">2026</span> ${e(SITE.name)} \xB7 ${e(ui.rights)}</span>
      <a href="#main">${e(ui.top)} \u2191</a>
    </div>
  </div>
</footer>
<a class="wa-float" href="${wa}" target="_blank" rel="noopener" aria-label="WhatsApp">${ICON.wa}</a>
<script src="/assets/js/main.js?v=${ASSET_V}" defer><\/script>
${BEACON}
</body>
</html>`;
}
function businessSchema(c, lang) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfessionalService",
    name: SITE.name,
    description: t(c.home, lang).desc,
    url: SITE.url + r(lang, "home"),
    logo: SITE.url + "/assets/img/icon-512.png",
    image: SITE.url + (c.hero && c.hero.desktop[0] || "/assets/img/hero-1.jpg"),
    telephone: c.contact.phone,
    email: c.contact.email,
    areaServed: [{ "@type": "City", name: "Bra\u0219ov" }, "Romania"],
    knowsAbout: lang === "ro" ? ["fotografie de nunt\u0103", "fotograf botez", "fotograf cununie civil\u0103", "fotograf evenimente", "\u0219edin\u021B\u0103 foto familie"] : ["wedding photography", "christening photography", "civil ceremony photography", "event photography", "family photo sessions"],
    address: { "@type": "PostalAddress", addressLocality: "Bra\u0219ov", addressCountry: "RO" },
    sameAs: [c.contact.facebook, c.contact.instagram].filter(Boolean),
    founder: { "@type": "Person", name: "Daniel Lupu" }
  };
}
function banner({ src, mobileSrc, eyebrow, title, intro, extra = "" }) {
  const pic = src ? `<picture>${mobileSrc && mobileSrc !== src ? `<source media="(orientation: portrait)" srcset="${e(small(mobileSrc))}">` : ""}${img(src, "", { eager: true, sizes: "100vw" })}</picture>` : "";
  return `<section class="page-hero">${pic}<div class="wrap">${eyebrow ? `<span class="eyebrow">${eyebrow}</span>` : ""}<h1 class="h-xl">${e(title)}</h1>${intro ? `<p class="lead">${e(intro)}</p>` : ""}${extra}</div></section>`;
}
var heroPick = (c, n) => {
  const d = c.hero && c.hero.desktop || [], m = c.hero && c.hero.mobile || [];
  return { src: d.length ? d[n % d.length] : "/assets/img/hero-1.jpg", mobileSrc: m.length ? m[n % m.length] : void 0 };
};
function ctaBand(c, lang) {
  const h = c.home[lang];
  return `<section class="section cta">
  ${img(c.cta_img, "", { w: 1600, h: 900 })}
  <div class="wrap narrow reveal">
    <h2 class="h-xl">${e(h.cta_title)}</h2>
    <p class="lead" style="color:inherit">${e(h.cta_p)}</p>
    <a class="btn btn--light" href="${waLink(c, lang)}" target="_blank" rel="noopener">${ICON.wa} ${e(UI[lang].book)}</a>
  </div>
</section>`;
}
function home(c, lang) {
  const h = c.home[lang], ui = UI[lang];
  const desktop = c.hero.desktop.length ? c.hero.desktop : ["/assets/img/hero-1.jpg"];
  const mobile = c.hero.mobile.length ? c.hero.mobile : desktop;
  const reviews = ((c.testimonials || {})[lang] || []).filter((x) => x.quote);
  const quotes = reviews.length > 0;
  const lines = quotes ? reviews.map((x) => ({ title: `\u201E${x.quote}\u201D`, sub: x.who })) : c.hero.lines[lang] && c.hero.lines[lang].length ? c.hero.lines[lang] : [{ title: SITE.name, sub: SITE.tagline[lang] }];
  const first = lines[0];
  const heroData = JSON.stringify({ desktop, mobile, lines, quotes, interval: c.hero.interval || 5 }).replace(/</g, "\\u003c");
  const nav = NAV[lang].reduce((o, [k, l]) => (o[k] = l, o), {});
  const tiles = c.tiles.map((tl) => `<a class="tile reveal" href="${r(lang, tl.key)}">${img(small(tl.img), "", { w: 900, h: 1100 })}<div><span class="tile-label">${e(nav[tl.key])}</span><span class="tile-sub">${e(t(c.tile_sub, lang)[tl.key])}</span></div></a>`).join("");
  const services = c.services[lang].map((s) => `<div class="service"><h3>${e(s.title)}</h3><p>${e(s.text)}</p></div>`).join("");
  const stats = c.stats[lang].map((s) => `<div class="stat"><strong>${e(s.num)}</strong><span>${e(s.label)}</span></div>`).join("");
  const testi = ((c.testimonials || {})[lang] || []).filter((x) => x.quote).map((x) => `<figure class="testimonial reveal">${x.img ? img(small(x.img), "", { w: 300, h: 300 }) : ""}<blockquote>\u201E${e(x.quote)}\u201D</blockquote><cite>${e(x.who)}</cite></figure>`).join("");
  const ig = c.instagram_imgs.map((src) => `<a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener" aria-label="Instagram">${img(small(src), "", { w: 600, h: 600 })}</a>`).join("");
  const n = Math.max(desktop.length, 1);
  const body = `
<section class="hero${quotes ? " hero--quotes" : ""}" aria-label="${e(SITE.name)}" data-hero>
  ${quotes ? `<h1 class="sr-only">${e(SITE.name)} \xB7 ${e(SEO[lang].home[0].split(" \xB7 ")[0])}</h1>` : ""}
  <div class="hero-slide is-active" aria-hidden="false">
    <picture><source media="(orientation: portrait)" srcset="${e(small(mobile[0]))}"><img src="${e(desktop[0])}" srcset="${e(small(desktop[0]))} 900w, ${e(desktop[0])} 2400w" sizes="100vw" alt="" fetchpriority="high" decoding="async"></picture>
    <div class="hero-caption">${quotes ? `<div class="hero-box"><p class="hero-quote">${e(first.title)}</p><p>${e(first.sub)}</p></div>` : `<h1>${e(first.title)}</h1><p>${e(first.sub)}</p>`}</div>
  </div>
  <script type="application/json" id="hero-data">${heroData}<\/script>
  <div class="hero-controls"><button class="hero-prev" aria-label="${e(ui.prev)}">${ICON.left}</button><span class="hero-count" aria-live="polite">01 / ${String(n).padStart(2, "0")}</span><button class="hero-next" aria-label="${e(ui.next)}">${ICON.right}</button></div>
  <a class="hero-scroll" href="#intro">${e(ui.scroll)}</a>
</section>

<section class="section" id="intro">
  <div class="wrap split">
    <div class="reveal">
      <span class="eyebrow">${e(h.intro_eyebrow)}</span>
      <h2 class="h-xl">${e(h.intro_title)}</h2>
      ${(h.intro_p || []).map((p) => `<p>${e(p)}</p>`).join("")}
      <p class="signature">Dan</p>
    </div>
    <div class="split-media reveal">${img(c.portrait, SITE.name, { w: 900, h: 1200, sizes: "(min-width: 900px) 45vw, 100vw" })}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">${e(h.tiles_eyebrow)}</span><h2 class="h-lg">${e(h.tiles_title)}</h2></div>
    <div class="tiles">${tiles}</div>
  </div>
</section>

<section class="section">
  <div class="wrap center reveal">
    <blockquote class="quote">\u201E${e(h.quote)}\u201D<span class="quote-by">${e(h.quote_by)}</span></blockquote>
    <div class="stats">${stats}</div>
  </div>
</section>

<section class="section section--tint">
  <div class="wrap">
    <div class="center reveal"><span class="eyebrow">${e(h.services_eyebrow)}</span><h2 class="h-lg">${e(h.services_title)}</h2></div>
    <div class="services reveal">${services}</div>
  </div>
</section>

<section class="section">
  <div class="wrap split split--rev">
    <div class="reveal">
      <span class="eyebrow">${e(h.profile_eyebrow)}</span>
      <h2 class="h-xl">${e(h.profile_title)}</h2>
      ${(h.profile_p || []).map((p) => `<p>${e(p)}</p>`).join("")}
      <a class="btn" href="${r(lang, "portfolio")}">${e(ui.view_work)} ${ICON.arrow}</a>
    </div>
    <div class="split-media split-media--square reveal">${img(c.profile, "Daniel Lupu", { w: 900, h: 900, sizes: "(min-width: 900px) 40vw, 100vw" })}</div>
  </div>
</section>

${testi ? `<section class="section section--tint">
  <div class="wrap">
    <h2 class="h-lg center reveal">${e(h.testimonials_title)}</h2>
    <div class="testimonials">${testi}</div>
  </div>
</section>` : ""}

<section class="section cta">
  ${img(c.cta_img, "", { w: 1600, h: 900 })}
  <div class="wrap narrow reveal">
    <h2 class="h-xl">${e(h.cta_title)}</h2>
    <p class="lead" style="color:inherit">${e(h.cta_p)}</p>
    <a class="btn btn--light" href="${waLink(c, lang)}" target="_blank" rel="noopener">${ICON.wa} ${e(ui.book)}</a>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="ig-head"><h2 class="h-lg" style="margin:0">${e(h.ig_title)}</h2><a href="${e(safeUrl(c.contact.instagram))}" target="_blank" rel="noopener">${e(c.contact.instagram_handle)}</a></div>
  </div>
  <div class="ig-grid">${ig}</div>
</section>`;
  const alt = { ro: r("ro", "home"), en: r("en", "home") };
  return layout(c, lang, "home", { title: SEO[lang].home[0], desc: SEO[lang].home[1], body, alt, hasHero: true, ogImage: desktop[0], schema: businessSchema(c, lang) });
}
function portfolio(c, lang) {
  const [title, intro] = c.pages[lang].portfolio;
  const ui = UI[lang], cats = c.categories[lang];
  const used = Object.keys(cats).filter((k) => c.events.some((ev) => ev.cat === k));
  const filters = `<button data-filter="all" aria-pressed="true">${e(ui.all)}</button>` + used.map((k) => `<button data-filter="${e(k)}" aria-pressed="false">${e(cats[k])}</button>`).join("");
  const cards = c.events.map((ev, n) => `<a class="event-card${n < 4 ? "" : " reveal"}" href="${eventUrl(lang, ev)}" data-cat="${e(ev.cat)}">${img(small(ev.cover || ev.photos[0] || ""), t(ev.title, lang), { eager: n === 0 })}<div class="event-meta"><span class="eyebrow">${e(cats[ev.cat] || "")} \xB7 ${e(t(ev.date, lang))}</span><h2>${e(t(ev.title, lang))}</h2><span class="event-count">${ev.photos.length} ${e(ui.photos)} ${ICON.arrow}</span></div></a>`).join("");
  const body = `${banner({ ...heroPick(c, 1), title, intro })}<section class="section"><div class="wrap"><div class="filters" role="group">${filters}</div><div class="events">${cards}</div></div></section>`;
  return layout(c, lang, "portfolio", { title: SEO[lang].portfolio[0], desc: SEO[lang].portfolio[1], body, alt: { ro: r("ro", "portfolio"), en: r("en", "portfolio") }, hasHero: true, cta: true });
}
function event(c, lang, i) {
  const ev = c.events[i], ui = UI[lang], cats = c.categories[lang];
  const nxt = c.events[(i + 1) % c.events.length];
  const title = t(ev.title, lang), kw = CAT_KW[lang][ev.cat] || CAT_KW[lang].nunta;
  const photos = ev.photos.map((p, n) => `<a href="${e(p)}"><figure style="margin:0">${img(small(p), n ? `${title} \xB7 ${n + 1}` : `${title} \xB7 ${kw}`, { above: n < 3 })}</figure></a>`).join("");
  const vid = videoEmbed(ev.video);
  const video = vid ? `<div class="video" data-kind="${vid.kind}" data-id="${e(vid.id)}"${vid.hash ? ` data-h="${e(vid.hash)}"` : ""}>
      ${vid.kind === "youtube" ? `<img src="https://i.ytimg.com/vi/${e(vid.id)}/hqdefault.jpg" alt="" loading="lazy" decoding="async" width="480" height="360">` : ""}
      <button class="video-play" aria-label="${e(ui.play_video)}: ${e(title)}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" fill="currentColor"/></svg></button>
    </div>` : "";
  const nextBtn = c.events.length > 1 ? `<a class="btn btn--solid" href="${eventUrl(lang, nxt)}">${e(ui.next_event)}: ${e(t(nxt.title, lang))} ${ICON.arrow}</a>` : "";
  const body = `
${banner({
    src: ev.cover || ev.photos[0],
    eyebrow: `${e(cats[ev.cat] || "")} \xB7 ${e(t(ev.date, lang))}`,
    title,
    intro: t(ev.intro, lang),
    extra: ev.venue ? `<p class="event-venue">${ICON.pin} ${e(ev.venue)}</p>` : ""
  })}
<section class="section">
  <div class="wrap">
    ${video}
    <div class="gallery">${photos}</div>
    <div class="event-nav">
      <a class="btn" href="${r(lang, "portfolio")}">\u2190 ${e(ui.back_portfolio)}</a>
      ${nextBtn}
    </div>
  </div>
</section>
<div class="lightbox" role="dialog" aria-modal="true" aria-label="${e(title)}">
  <button class="lb-close" aria-label="${e(ui.close)}">${ICON.x}</button>
  <button class="lb-prev" aria-label="${e(ui.prev)}">${ICON.left}</button>
  <img alt="">
  <button class="lb-next" aria-label="${e(ui.next)}">${ICON.right}</button>
  <span class="lb-count"></span>
</div>`;
  return layout(c, lang, "portfolio", {
    title: `${title} \xB7 ${kw[0].toUpperCase()}${kw.slice(1)} \xB7 ${SITE.name}`,
    desc: t(ev.intro, lang),
    body,
    alt: { ro: eventUrl("ro", ev), en: eventUrl("en", ev) },
    ogImage: ev.cover || ev.photos[0],
    hasHero: true,
    cta: true
  });
}
function blog(c, lang) {
  const [title, intro] = c.pages[lang].blog;
  const ui = UI[lang];
  const posts = [...c.posts].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cards = posts.map((p) => `<a class="post-card reveal" href="${postUrl(lang, p)}">${img(small(p.cover), t(p.title, lang), { w: 1600, h: 1e3 })}<div><time datetime="${e(p.date)}">${fmtDate(p.date, lang)}</time><h2>${e(t(p.title, lang))}</h2><p>${e(t(p.excerpt, lang))}</p><span class="more">${e(ui.read_more)} ${ICON.arrow}</span></div></a>`).join("");
  const body = `${banner({ ...heroPick(c, 2), title, intro })}<section class="section"><div class="wrap"><div class="posts">${cards}</div></div></section>`;
  return layout(c, lang, "blog", { title: SEO[lang].blog[0], desc: SEO[lang].blog[1], body, alt: { ro: r("ro", "blog"), en: r("en", "blog") }, hasHero: true, cta: true });
}
function post(c, lang, i) {
  const p = c.posts[i], ui = UI[lang];
  const paras = (t(p.body, lang) || []).map((x) => `<p>${e(x)}</p>`).join("");
  const body = `
<article>
  ${banner({ ...p.cover ? { src: p.cover } : heroPick(c, 2), eyebrow: `<time datetime="${e(p.date)}">${fmtDate(p.date, lang)}</time>`, title: t(p.title, lang), intro: t(p.excerpt, lang) })}
  <section class="section"><div class="wrap narrow prose">${paras}
    <p style="margin-top:48px"><a class="btn" href="${r(lang, "blog")}">\u2190 ${e(ui.back_blog)}</a></p>
  </div></section>
</article>`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: t(p.title, lang),
    datePublished: p.date,
    author: { "@type": "Person", name: "Daniel Lupu" },
    image: p.cover ? SITE.url + p.cover : void 0
  };
  return layout(c, lang, "blog", {
    title: `${t(p.title, lang)} \xB7 ${SITE.name}`,
    desc: t(p.excerpt, lang),
    body,
    alt: { ro: postUrl("ro", p), en: postUrl("en", p) },
    ogImage: p.cover,
    schema,
    hasHero: true,
    cta: true
  });
}
function faq(c, lang) {
  const [title, intro] = c.pages[lang].faq;
  const items = c.faq.map((f) => `<details class="faq-item"><summary>${e(t(f.q, lang))}</summary><p>${e(t(f.a, lang))}</p></details>`).join("");
  const body = `${banner({ ...heroPick(c, 3), title, intro })}
<section class="section"><div class="wrap narrow">
  <div class="faq">${items}</div>
  <p class="center" style="margin-top:48px"><a class="btn btn--solid" href="${waLink(c, lang)}" target="_blank" rel="noopener">${ICON.wa} ${e(UI[lang].book)}</a></p>
</div></section>`;
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: c.faq.map((f) => ({ "@type": "Question", name: t(f.q, lang), acceptedAnswer: { "@type": "Answer", text: t(f.a, lang) } })) };
  return layout(c, lang, "faq", { title: SEO[lang].faq[0], desc: SEO[lang].faq[1], body, alt: { ro: r("ro", "faq"), en: r("en", "faq") }, schema, hasHero: true, cta: true });
}
function contact(c, lang) {
  const P = c.pages[lang], ui = UI[lang], k = c.contact;
  const title = P.contact[0], intro = t(k.intro, lang) || P.contact[1];
  const tel = String(k.phone || "").replace(/[^\d+]/g, "");
  const wa = waLink(c, lang);
  const side = (t(k.notes, lang) || []).map((x) => `<li>${e(x)}</li>`).join("");
  const fbName = (String(k.facebook || "").match(/facebook\.com\/([^/?#]+)/) || [])[1] || "Facebook";
  const body = `${banner({ ...heroPick(c, 4), title, intro })}
<section class="section"><div class="wrap contact-grid">
  <div>
    <a class="btn btn--solid" href="${wa}" target="_blank" rel="noopener">${ICON.wa} ${e(ui.book)}</a>
    <ul class="contact-list">
      <li>${ICON.wa}<div><small>${e(P.wa_label)}</small><a href="${wa}" target="_blank" rel="noopener">${e(k.phone)}</a></div></li>
      <li>${ICON.phone}<div><small>${e(P.phone_label)}</small><a href="tel:${e(tel)}">${e(k.phone)}</a></div></li>
      <li>${ICON.mail}<div><small>${e(P.email_label)}</small><a href="mailto:${e(k.email)}">${e(k.email)}</a></div></li>
      <li>${ICON.fb}<div><small>${e(P.fb_label)}</small><a href="${e(safeUrl(k.messenger || k.facebook))}" target="_blank" rel="noopener">${e(fbName)}</a></div></li>
      <li>${ICON.ig}<div><small>${e(P.ig_label)}</small><a href="${e(safeUrl(k.instagram))}" target="_blank" rel="noopener">${e(k.instagram_handle)}</a></div></li>
      <li>${ICON.pin}<div><small>${e(P.area_label)}</small>${e(t(k.area, lang))}</div></li>
      <li>${ICON.user}<div><small>${e(ui.resume_label)}</small><a href="https://lupudaniel.pages.dev/" target="_blank" rel="noopener">${e(ui.resume_link)}</a></div></li>
    </ul>
  </div>
  <div>
    <div class="split-media split-media--square" style="margin-bottom:32px">${img(c.profile, "Daniel Lupu", { w: 900, h: 900, sizes: "(min-width: 900px) 40vw, 100vw" })}</div>
    <div class="note"><h2 class="h-lg" style="font-size:20px">${e(P.contact_side_title)}</h2><ul>${side}</ul></div>
  </div>
</div></section>`;
  return layout(c, lang, "contact", { title: SEO[lang].contact[0], desc: SEO[lang].contact[1], body, alt: { ro: r("ro", "contact"), en: r("en", "contact") }, schema: businessSchema(c, lang), hasHero: true });
}
var LANDING = {
  wedding: {
    cats: ["nunta", "cununie", "after"],
    ro: {
      h1: "Fotograf nunt\u0103 Bra\u0219ov",
      title: "Fotograf nunt\u0103 Bra\u0219ov: portofoliu \u0219i ofert\u0103 \xB7 Dan C\u0103pitan de Plai",
      desc: "Fotograf de nunt\u0103 \xEEn Bra\u0219ov: fotografie de nunt\u0103 documentar\u0103, momente reale, lumin\u0103 natural\u0103. Nun\u021Bi, cununii civile \u0219i after-wedding, cu ofert\u0103 personalizat\u0103.",
      lead: "Fotografie documentar\u0103 de nunt\u0103 \xEEn Bra\u0219ov. Voi v\u0103 tr\u0103i\u021Bi ziua, eu surprind momentele reale.",
      sections: [
        ["Cum lucrez la nunt\u0103", [
          "Sunt al\u0103turi de voi toat\u0103 ziua, de la preg\u0103tiri p\xE2n\u0103 la petrecere. Nu v\u0103 cer s\u0103 poza\u021Bi \u0219i nu opresc nimic pentru fotografii. Stau aproape, discret, \u0219i fotografiez ce se \xEEnt\xE2mpl\u0103 cu adev\u0103rat: emo\u021Bia p\u0103rin\u021Bilor, glumele prietenilor, privirile dintre voi.",
          "Lucrez cu lumin\u0103 natural\u0103. Dac\u0103 sunte\u021Bi timizi \xEEn fa\u021Ba aparatului, nu e nicio problem\u0103: majoritatea cuplurilor uit\u0103 de mine dup\u0103 primele minute."
        ]],
        ["Unde fotografiez", [
          "Sunt din Bra\u0219ov \u0219i fotografiez nun\u021Bi \xEEn ora\u0219 \u0219i \xEEn \xEEmprejurimi: \xEEn Centrul Vechi, \xEEn Poiana Bra\u0219ov, la conace \u0219i restaurante din zon\u0103. Am lucrat, printre altele, la Conacul Albert \u0219i la Naturalia Inn. Merg oriunde vre\u021Bi voi; \xEEn afara Bra\u0219ovului, transportul \u0219i cazarea se pl\u0103tesc separat."
        ]],
        ["Ofert\u0103 personalizat\u0103 pentru nunta voastr\u0103", [
          "Nu am pachete fixe. Oferta depinde de durat\u0103, de loca\u021Bie \u0219i de ce v\u0103 dori\u021Bi. Scrie\u021Bi-mi data \u0219i locul, iar eu v\u0103 trimit o ofert\u0103 personalizat\u0103."
        ]],
        ["\u0218i dup\u0103 nunt\u0103", [
          "Pe l\xE2ng\u0103 nunta propriu-zis\u0103, fotografiez cununii civile la starea civil\u0103 din Bra\u0219ov, \u0219edin\u021Be after-wedding \u0219i Trash The Dress la munte, pentru o zi doar a voastr\u0103. Dac\u0103 ave\u021Bi nevoie de un fotograf de cununie civil\u0103 \xEEn Bra\u0219ov doar pentru c\xE2teva ore, scrie\u021Bi-mi."
        ]]
      ],
      work: "Nun\u021Bi fotografiate de mine",
      cta: "Spune\u021Bi-mi data \u0219i locul nun\u021Bii"
    },
    en: {
      h1: "Wedding photographer in Bra\u0219ov",
      title: "Wedding photographer in Bra\u0219ov: portfolio & quote \xB7 Dan C\u0103pitan de Plai",
      desc: "Wedding photographer in Bra\u0219ov, Romania: documentary photography, real moments, natural light. Weddings, civil ceremonies and after-wedding sessions in Bra\u0219ov and anywhere you like.",
      lead: "Documentary wedding photography in Bra\u0219ov. You enjoy your day, I catch the real moments.",
      sections: [
        ["How I work on the day", [
          "I'm with you the whole day, from getting ready to the party. I don't ask you to pose and I don't stop the day for photos. I stay close and quiet and photograph what really happens: your parents' emotion, your friends' jokes, the looks between you two.",
          "I work with natural light. If you're shy in front of the camera, that's perfect: most couples forget I'm there after the first few minutes."
        ]],
        ["Where I shoot", [
          "I'm based in Bra\u0219ov and photograph weddings in the city and around it: the Old Town, Poiana Bra\u0219ov, manors and restaurants nearby. Among others, I've worked at Conacul Albert and Naturalia Inn. I travel anywhere you like; outside Bra\u0219ov, travel and accommodation are charged separately."
        ]],
        ["A quote made for your wedding", [
          "I don't do fixed packages. The quote depends on hours, location and what you'd like. Send me your date and place and I'll send you a tailored quote."
        ]],
        ["After the wedding", [
          "Besides the wedding day, I photograph civil ceremonies, after-wedding sessions and Trash The Dress in the mountains: a day just for the two of you."
        ]]
      ],
      work: "Weddings I've photographed",
      cta: "Tell me your wedding date and place"
    }
  },
  christening: {
    cats: ["botez", "familie"],
    ro: {
      h1: "Fotograf botez Bra\u0219ov",
      title: "Fotograf botez Bra\u0219ov: portofoliu \u0219i ofert\u0103 \xB7 Dan C\u0103pitan de Plai",
      desc: "Fotograf de botez \xEEn Bra\u0219ov: momente reale de la biseric\u0103 \u0219i de la petrecere, f\u0103r\u0103 agita\u021Bie, cu lumin\u0103 natural\u0103. Botezuri, \u0219edin\u021Be foto de familie \u0219i nou-n\u0103scu\u021Bi.",
      lead: "Fotografie de botez \xEEn Bra\u0219ov, f\u0103r\u0103 agita\u021Bie. Familia, na\u0219ii \u0219i cel mic, a\u0219a cum sunt.",
      sections: [
        ["Cum lucrez la botez", [
          "Fotografiez totul, de la preg\u0103tirile de acas\u0103 \u0219i slujba de la biseric\u0103 p\xE2n\u0103 la petrecere. Nu opresc nimic pentru fotografii \u0219i nu stresez copilul: stau discret \u0219i surprind momentele care conteaz\u0103, de la cristelni\u021B\u0103 p\xE2n\u0103 la z\xE2mbetele bunicilor.",
          "Lucrez cu lumin\u0103 natural\u0103 \u0219i am r\u0103bdare cu cei mici. Copiii nu pozeaz\u0103, \u0219i tocmai de aceea fotografiile lor ies cele mai frumoase."
        ]],
        ["Unde fotografiez", [
          "Sunt din Bra\u0219ov \u0219i fotografiez botezuri \xEEn bisericile \u0219i restaurantele din ora\u0219 \u0219i din \xEEmprejurimi, inclusiv la Conacul Albert \u0219i la Restaurant Adaggio. Merg \u0219i \xEEn afara Bra\u0219ovului; \xEEn acest caz, transportul \u0219i cazarea se pl\u0103tesc separat."
        ]],
        ["\u0218edin\u021Be foto de familie \u0219i nou-n\u0103scu\u021Bi", [
          "Dac\u0103 vre\u021Bi mai multe amintiri cu cel mic, fac \u0219i \u0219edin\u021Be foto de familie \xEEn Bra\u0219ov, acas\u0103 sau \xEEn natur\u0103, precum \u0219i \u0219edin\u021Be cu nou-n\u0103scu\u021Bi, cu bl\xE2nde\u021Be \u0219i r\u0103bdare."
        ]],
        ["Ofert\u0103 personalizat\u0103 pentru botez", [
          "Nu am pachete fixe. Scrie\u021Bi-mi data, biserica \u0219i locul petrecerii, iar eu v\u0103 trimit o ofert\u0103 personalizat\u0103."
        ]]
      ],
      work: "Botezuri \u0219i familii fotografiate de mine",
      cta: "Spune\u021Bi-mi data botezului"
    },
    en: {
      h1: "Christening photographer in Bra\u0219ov",
      title: "Christening photographer in Bra\u0219ov: portfolio & quote \xB7 Dan C\u0103pitan de Plai",
      desc: "Christening (baptism) photographer in Bra\u0219ov, Romania: real moments at church and at the party, no fuss, natural light. Christenings, family and newborn sessions.",
      lead: "Christening photography in Bra\u0219ov, without the fuss. Family, godparents and the little one, just as they are.",
      sections: [
        ["How I work at a christening", [
          "I photograph from getting ready at home, through the church service, to the party. I don't stop anything for photos and I don't stress the baby: I stay in the background and catch the moments that matter, from the font to the grandparents' smiles.",
          "I work with natural light and I'm patient with little ones. Kids don't pose, and that's exactly what turns out best."
        ]],
        ["Where I shoot", [
          "I'm based in Bra\u0219ov and photograph christenings in churches and restaurants in and around the city, including Conacul Albert and Restaurant Adaggio. I also travel outside Bra\u0219ov; then travel and accommodation are charged separately."
        ]],
        ["Family and newborns", [
          "If you'd like more memories of your little one, I also do family sessions, at home or outdoors, and gentle, patient newborn sessions."
        ]],
        ["A quote made for your christening", [
          "I don't do fixed packages. Send me the date, the church and the party venue and I'll send you a tailored quote."
        ]]
      ],
      work: "Christenings and families I've photographed",
      cta: "Tell me your christening date"
    }
  },
  family: {
    cats: ["familie", "botez"],
    ro: {
      h1: "\u0218edin\u021B\u0103 foto de familie \xEEn Bra\u0219ov",
      title: "\u0218edin\u021B\u0103 foto familie \u0219i nou-n\u0103scut Bra\u0219ov \xB7 Dan C\u0103pitan de Plai",
      desc: "\u0218edin\u021Be foto de familie \u0219i cu nou-n\u0103scu\u021Bi \xEEn Bra\u0219ov, acas\u0103 sau \xEEn natur\u0103. Fotografie documentar\u0103, f\u0103r\u0103 poze regizate, cu lumin\u0103 natural\u0103 \u0219i mult\u0103 r\u0103bdare.",
      lead: "\u0218edin\u021Be foto de familie \u0219i cu nou-n\u0103scu\u021Bi \xEEn Bra\u0219ov. F\u0103r\u0103 poze regizate, doar voi, a\u0219a cum sunte\u021Bi.",
      sections: [
        ["Cum arat\u0103 o \u0219edin\u021B\u0103", [
          "Nu v\u0103 cer s\u0103 sta\u021Bi cumin\u021Bi \u0219i s\u0103 z\xE2mbi\u021Bi la aparat. V\u0103 juca\u021Bi, v\u0103 \xEEmbr\u0103\u021Bi\u0219a\u021Bi, face\u021Bi ce face\u021Bi de obicei \xEEmpreun\u0103, iar eu fotografiez momentele care apar de la sine. Copiii nu pozeaz\u0103, \u0219i tocmai de aceea fotografiile lor ies cele mai frumoase.",
          "Lucrez cu lumin\u0103 natural\u0103, f\u0103r\u0103 blitz, a\u0219a c\u0103 cei mici nu se sperie \u0219i nu obosesc."
        ]],
        ["\u0218edin\u021B\u0103 foto cu nou-n\u0103scut", [
          "Primele s\u0103pt\u0103m\xE2ni trec foarte repede. Vin la voi acas\u0103, unde bebelu\u0219ul se simte \xEEn siguran\u021B\u0103, \u0219i am r\u0103bdare: lu\u0103m pauze ori de c\xE2te ori cel mic trebuie hr\u0103nit, adormit sau lini\u0219tit. Fotografiez detaliile mici, m\xE2nu\u021Bele, picioru\u0219ele, \u0219i momentele de tandre\u021Be dintre voi \u0219i cel mic."
        ]],
        ["Unde fotografiez", [
          "Acas\u0103 la voi, \xEEn parcurile din Bra\u0219ov, pe dealurile din jur sau la munte. Sunt din Bra\u0219ov \u0219i merg \u0219i \xEEn afara ora\u0219ului; \xEEn acest caz, transportul \u0219i cazarea se pl\u0103tesc separat."
        ]],
        ["Ofert\u0103 personalizat\u0103", [
          "Nu am pachete fixe. Scrie\u021Bi-mi ce fel de \u0219edin\u021B\u0103 v\u0103 dori\u021Bi \u0219i c\xE2nd, iar eu v\u0103 trimit o ofert\u0103 personalizat\u0103."
        ]]
      ],
      work: "Familii \u0219i botezuri fotografiate de mine",
      cta: "Programa\u021Bi o \u0219edin\u021B\u0103 de familie"
    },
    en: {
      h1: "Family and newborn photographer in Bra\u0219ov",
      title: "Family & newborn photographer in Bra\u0219ov \xB7 Dan C\u0103pitan de Plai",
      desc: "Family and newborn photo sessions in Bra\u0219ov, Romania, at home or outdoors. Documentary photography, no staged poses, natural light and plenty of patience.",
      lead: "Family and newborn photo sessions in Bra\u0219ov. No staged poses, just you, as you are.",
      sections: [
        ["What a session looks like", [
          "I won't ask you to sit still and smile at the camera. You play, hug and do what you normally do together, and I photograph the moments that happen on their own. Kids don't pose, and that's exactly why their photos turn out best.",
          "I work with natural light and no flash, so little ones don't get startled or tired."
        ]],
        ["Newborn sessions", [
          "The first weeks go by fast. I come to your home, where the baby feels safe, and I take my time: we pause for feeding, naps and calming down. I photograph the tiny details, little hands and feet, and the tender moments between you and your baby."
        ]],
        ["Where I shoot", [
          "At your home, in Bra\u0219ov's parks, on the hills around the city or in the mountains. I'm based in Bra\u0219ov and also travel further; then travel and accommodation are charged separately."
        ]],
        ["A quote made for you", [
          "I don't do fixed packages. Tell me what kind of session you'd like and when, and I'll send you a tailored quote."
        ]]
      ],
      work: "Families and christenings I've photographed",
      cta: "Book a family session"
    }
  }
};
function landing(c, lang, key) {
  const L = LANDING[key], T = L[lang], ui = UI[lang], cats = c.categories[lang];
  const evs = c.events.filter((ev) => L.cats.includes(ev.cat)).sort((a, b) => L.cats.indexOf(a.cat) - L.cats.indexOf(b.cat)).slice(0, 6);
  const cards = evs.map((ev, n) => `<a class="event-card${n < 2 ? "" : " reveal"}" href="${eventUrl(lang, ev)}">${img(small(ev.cover || ev.photos[0] || ""), t(ev.title, lang), {})}<div class="event-meta"><span class="eyebrow">${e(cats[ev.cat] || "")}${ev.venue ? ` \xB7 ${e(ev.venue)}` : ""}</span><h3>${e(t(ev.title, lang))}</h3><span class="event-count">${ev.photos.length} ${e(ui.photos)} ${ICON.arrow}</span></div></a>`).join("");
  const text = T.sections.map(([h, ps]) => `<h2 class="h-lg">${e(h)}</h2>${ps.map((x) => `<p>${e(x)}</p>`).join("")}`).join("");
  const wa = waLink(c, lang);
  const top = evs[0] ? { src: evs[0].cover || evs[0].photos[0] } : heroPick(c, 0);
  const body = `${banner({ ...top, title: T.h1, intro: T.lead })}
<section class="section"><div class="wrap narrow prose landing">
  ${text}
  <p class="center" style="margin-top:40px"><a class="btn btn--solid" href="${wa}" target="_blank" rel="noopener">${ICON.wa} ${e(T.cta)}</a></p>
</div></section>
${cards ? `<section class="section section--tint"><div class="wrap">
  <h2 class="h-lg center reveal">${e(T.work)}</h2>
  <div class="events" style="margin-top:40px">${cards}</div>
  <p class="center" style="margin-top:40px"><a class="btn" href="${r(lang, "portfolio")}">${e(ui.view_work)} ${ICON.arrow}</a></p>
</div></section>` : ""}`;
  const schema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: T.h1,
    serviceType: T.h1,
    description: T.desc,
    url: SITE.url + r(lang, key),
    areaServed: { "@type": "City", name: "Bra\u0219ov" },
    provider: businessSchema(c, lang)
  };
  return layout(c, lang, key, {
    title: T.title,
    desc: T.desc,
    body,
    alt: { ro: r("ro", key), en: r("en", key) },
    ogImage: evs[0] ? evs[0].cover || evs[0].photos[0] : void 0,
    schema,
    hasHero: true,
    cta: true
  });
}
function notFound(c) {
  const body = `<section class="page-head" style="min-height:70vh;display:grid;place-content:center"><div class="wrap">
<h1 class="h-xl">404</h1><p class="lead">Pagina nu exist\u0103. \xB7 This page doesn't exist.</p>
<p><a class="btn" href="/">Acas\u0103</a> <a class="btn" href="/en/">Home</a></p></div></section>`;
  return layout(c, "ro", "", { title: `404 \xB7 ${SITE.name}`, desc: "404", body, alt: { ro: "/", en: "/en/" }, noindex: true });
}
function route(c, path) {
  for (const lang of ["ro", "en"]) {
    const R = ROUTES[lang];
    if (path === R.home) return home(c, lang);
    if (path === R.portfolio) return portfolio(c, lang);
    if (path === R.blog) return blog(c, lang);
    if (path === R.faq) return faq(c, lang);
    if (path === R.contact) return contact(c, lang);
    if (path === R.wedding) return landing(c, lang, "wedding");
    if (path === R.christening) return landing(c, lang, "christening");
    if (path === R.family) return landing(c, lang, "family");
    if (path.startsWith(R.portfolio)) {
      const i = c.events.findIndex((ev) => path === eventUrl(lang, ev));
      if (i >= 0) return event(c, lang, i);
    }
    if (path.startsWith(R.blog)) {
      const i = c.posts.findIndex((p) => path === postUrl(lang, p));
      if (i >= 0) return post(c, lang, i);
    }
  }
  return null;
}
function sitemap(c) {
  const urls = [];
  for (const lang of ["ro", "en"]) {
    for (const k of Object.keys(ROUTES[lang])) urls.push(ROUTES[lang][k]);
    c.events.forEach((ev) => urls.push(eventUrl(lang, ev)));
    c.posts.forEach((p) => urls.push(postUrl(lang, p)));
  }
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((u) => `<url><loc>${SITE.url}${u}</loc></url>`).join("")}</urlset>`;
}

// src/worker/index.js
var SEC_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()"
};
var GSC_FILE = "google8ce557091617d5b4.html";
var PREVIEW_HOST = "dancapitandeplai.pages.dev";
var CANONICAL_ORIGIN = "https://dancapitandeplai.ro";
var html = (body, status = 200) => new Response(body, { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SEC_HEADERS } });
var index_default = {
  async fetch(req, env, ctx) {
    const url2 = new URL(req.url);
    const p = url2.pathname;
    if (url2.hostname === PREVIEW_HOST && !/^\/(api|admin|assets|media)(\/|$)/.test(p)) {
      return Response.redirect(CANONICAL_ORIGIN + p + url2.search, 301);
    }
    try {
      const ns = url2.searchParams.get("nostats");
      if (ns === "1" || ns === "0") {
        url2.searchParams.delete("nostats");
        return new Response(null, { status: 302, headers: { location: url2.pathname + url2.search, "set-cookie": ns === "1" ? NOSTATS_COOKIE : "nostats=; Path=/; Max-Age=0", "cache-control": "no-store" } });
      }
      if (p.startsWith("/api/")) return await handleApi(req, env, url2);
      if (req.method !== "GET" && req.method !== "HEAD") return new Response("Method not allowed", { status: 405 });
      const media = await serveMedia(env, p, ctx, req);
      if (media) return media;
      if (p === "/" + GSC_FILE) return new Response("google-site-verification: " + GSC_FILE, { headers: { "content-type": "text/html; charset=utf-8" } });
      if (p.startsWith("/assets/") || p.startsWith("/admin") || p === "/robots.txt" || p === "/favicon.ico") {
        if (p === "/admin") return Response.redirect(url2.origin + "/admin/", 301);
        const res = await env.ASSETS.fetch(req);
        const out = new Response(res.body, res);
        if (p.startsWith("/assets/")) out.headers.set("cache-control", "public, max-age=31536000, immutable");
        if (p.startsWith("/admin")) {
          out.headers.set("cache-control", "no-store");
          out.headers.set("x-robots-tag", "noindex");
          out.headers.set("x-frame-options", "DENY");
        }
        return out;
      }
      const c = await getContent(env, ctx);
      if (p === "/sitemap.xml") return new Response(sitemap(c), { headers: { "content-type": "application/xml" } });
      if (!p.endsWith("/") && !p.includes(".")) return Response.redirect(url2.origin + p + "/" + url2.search, 301);
      const page = route(c, p);
      const strip = (s) => {
        if (!isInternal(req)) return s;
        s = s.split(BEACON).join("");
        const a = s.indexOf(GTAG_START), b = s.indexOf(GTAG_END);
        return a >= 0 && b > a ? s.slice(0, a) + s.slice(b + GTAG_END.length) : s;
      };
      if (page && req.method === "GET" && !isInternal(req)) ctx.waitUntil(recordHit(env, req, url2));
      return page ? html(strip(page)) : html(strip(notFound(c)), 404);
    } catch (err) {
      if (p.startsWith("/api/")) return json({ error: "server_error" }, 500);
      return new Response("Something went wrong", { status: 500 });
    }
  }
};
export {
  index_default as default
};
