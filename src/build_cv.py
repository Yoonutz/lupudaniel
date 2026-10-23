"""Build Daniel's CV PDFs (RO + EN) from the site's state JSON. No phone, no salaries.
Usage: python3 -I build_cv.py <state.json> <hero.webp> <outdir>"""
import base64, json, re, subprocess, sys, os

state = json.load(open(sys.argv[1]))
photo = ("data:image/jpeg;base64," if sys.argv[2].endswith(".jpg") else "data:image/webp;base64,") + base64.b64encode(open(sys.argv[2], "rb").read()).decode()
out = sys.argv[3]

L = {
 "ro": {"title": "Fotograf-Videograf · Graphic Designer · Content Creator", "profile": "Profil", "exp": "Experiență profesională",
        "edu": "Educație", "skills": "Instrumente", "langs": "Limbi", "contact": "Contact", "services": "Competențe"},
 "en": {"title": "Photographer-Videographer · Graphic Designer · Content Creator", "profile": "Profile", "exp": "Work experience",
        "edu": "Education", "skills": "Tools", "langs": "Languages", "contact": "Contact", "services": "Core skills"},
}

def t(v, lang):
    s = v if isinstance(v, str) else v.get(lang) or v.get("en", "")
    return re.sub(r"</?span>", "", s)

def build(lang):
    x, c = state["exp"], state["contact"]
    lab = L[lang]
    rows = "".join(f'<div class="crow"><b>{t(r["k"],lang)}</b><span>{t(r["v"],lang)}</span></div>' for r in c["rows"])
    rows += "".join(f'<div class="crow"><b>{t(s["label"],lang)}</b><span>{s["url"].replace("https://www.","").rstrip("/")}</span></div>' for s in c["social"])
    jobs = "".join(f'''<div class="job"><div class="jh"><h3>{t(j["role"],lang)}</h3><span class="when">{t(j["when"],lang)}</span></div>
      <div class="co">{t(j["co"],lang)} · {t(j["place"],lang)}</div><ul>{"".join(f"<li>{t(i['t'],lang)}</li>" for i in j["items"])}</ul></div>''' for j in x["jobs"])
    edu = "".join(f'<div class="ed"><b>{t(i["b"],lang)}</b><span>{t(i["s"],lang)}</span></div>' for i in x["edu"]["items"])
    langs = "".join(f'<div class="ed"><b>{t(i["b"],lang)}</b><span>{t(i["s"],lang)}</span></div>' for i in x["langs"]["items"])
    tools = ", ".join(t(cc, lang) for cc in x["tools"]["chips"])
    svc = "".join(f'<div class="ed"><b>{t(s["title"],lang)}</b><span>{t(s["text"],lang)}</span></div>' for s in state["services"]["items"])
    profile = "".join(f"<p>{t(p,lang)}</p>" for p in state["about"]["paras"])
    return f'''<!doctype html><html lang="{lang}"><head><meta charset="utf-8"><title>CV {state["brand"]}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap">
<style>
@page{{size:A4;margin:14mm 14mm 14mm 14mm}}
*{{box-sizing:border-box}}
body{{margin:0;font:9.6pt/1.45 'Plus Jakarta Sans',Arial,sans-serif;color:#1c1517}}
header{{display:flex;gap:16px;align-items:center;padding-bottom:12px;border-bottom:2px solid #8b2635;margin-bottom:12px}}
header img{{width:70px;height:70px;object-fit:cover;object-position:50% 20%;border-radius:0 10px 0 10px}}
h1{{margin:0;font-size:22pt;letter-spacing:-.02em}}
.sub{{color:#8b2635;font-weight:600;font-size:10.5pt}}
.grid{{display:grid;grid-template-columns:1fr 2.1fr;gap:20px}}
h2{{font-size:9pt;text-transform:uppercase;letter-spacing:.12em;color:#8b2635;margin:0 0 6px;padding-bottom:3px;border-bottom:1px solid #e8e1df}}
section{{margin-bottom:12px}}
.crow,.ed{{display:flex;flex-direction:column;margin-bottom:6px}}
.crow b,.ed b{{font-weight:700;font-size:9pt}}
.crow span,.ed span{{color:#3d3336;word-break:break-word}}
p{{margin:0 0 6px}}
.job{{margin-bottom:9px;break-inside:avoid}}
.jh{{display:flex;justify-content:space-between;gap:10px;align-items:baseline}}
h3{{margin:0;font-size:10pt}}
.when{{color:#6b5f62;font-size:8.6pt;white-space:nowrap}}
.co{{color:#8b2635;font-weight:600;font-size:9pt}}
ul{{margin:3px 0 0;padding-left:15px}}
li{{margin-bottom:1px}}
</style></head><body>
<header><img src="{photo}" alt=""><div><h1>{state["brand"]}</h1><div class="sub">{lab["title"]}</div></div></header>
<div class="grid">
<aside>
<section><h2>{lab["contact"]}</h2>{rows}</section>
<section><h2>{lab["services"]}</h2>{svc}</section>
<section><h2>{lab["skills"]}</h2><p>{tools}</p></section>
<section><h2>{lab["langs"]}</h2>{langs}</section>
<section><h2>{lab["edu"]}</h2>{edu}</section>
</aside>
<main>
<section><h2>{lab["profile"]}</h2>{profile}</section>
<section><h2>{lab["exp"]}</h2>{jobs}</section>
</main></div></body></html>'''

for lang in ("ro", "en"):
    path = os.path.join(out, f"cv-{lang}.html")
    open(path, "w").write(build(lang))
