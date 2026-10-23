"""Assemble _worker.js for lupudaniel.pages.dev from the parts in this folder.
Usage: python3 -I build.py <outdir>  (expects cv-ro.pdf / cv-en.pdf here; rebuild them with build_cv.py)"""
import base64, json, os, sys
D = os.path.dirname(os.path.abspath(__file__))
rd = lambda f, m="r": open(os.path.join(D, f), m).read()
b64 = lambda f: base64.b64encode(rd(f, "rb")).decode()
RESET = (":root{color-scheme:light;box-sizing:border-box;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}"
         "html{scroll-padding-top:env(safe-area-inset-top,0px)}body{margin:0;padding:0}img{max-width:100%}[hidden]{display:none!important}")
img = json.dumps({"hero": "/img/hero.webp", "full": "/img/full.webp"})
main = rd("main.js")
assert "</script" not in main
page = f'''<!doctype html><html lang="ro"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>Daniel Lupu · Fotograf-videograf &amp; designer grafic</title>
<meta name="description" content="Daniel Lupu, fotograf-videograf și designer grafic în Brașov: foto și video, design și DTP, social media și reclame. Photographer-videographer and graphic designer in Brașov, Romania.">
<meta property="og:title" content="Daniel Lupu · Fotograf-videograf &amp; designer grafic">
<meta property="og:description" content="Foto, video, design și print în Brașov.">
<meta property="og:image" content="/img/full.webp">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500&display=swap">
<style>{RESET}{rd("style.css")}</style></head><body>
<div id="app"></div>
<script type="application/json" id="state">__STATE_JSON__</script>
<script type="application/json" id="img">{img}</script>
<script>{main}</script>
</body></html>'''
w = rd("worker-src.js")
w = w.replace("__PAGE__", json.dumps(page), 1)
w = w.replace("__STATE__", json.dumps(json.loads(rd("state.default.json")), ensure_ascii=False), 1)
w = w.replace("__IMAGES__", json.dumps({"/img/hero.webp": b64("hero.webp"), "/img/full.webp": b64("full.webp")}), 1)
w = w.replace("__CVS__", json.dumps({"ro": b64("cv-ro.pdf"), "en": b64("cv-en.pdf")}), 1)
out = sys.argv[1]
os.makedirs(out, exist_ok=True)
open(os.path.join(out, "_worker.js"), "w").write(w)
print("worker bytes", len(w.encode()))
