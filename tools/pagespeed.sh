#!/bin/bash
# Lighthouse (same engine as PageSpeed Insights) on the live site, mobile + desktop.
# The anonymous PSI API is often out of quota (429), so this runs Lighthouse locally.
# Needs: npm i lighthouse@12 (any dir) and Chromium. Usage: tools/pagespeed.sh [base-url]
# Rule: every score must stay above 90.
B=${1:-https://dancapitandeplai.pages.dev}
CHROME=${CHROME_PATH:-$(node -e "console.log(require('playwright').chromium.executablePath())" 2>/dev/null)}
OUT=$(mktemp -d); fail=0
for p in / /en/ /portofoliu/ /en/portfolio/ /portofoliu/felicia-calin/ /blog/ /blog/pregatirile-de-dimineata/ /intrebari-frecvente/ /contact/; do
  for ff in mobile desktop; do
    extra=""; [ $ff = desktop ] && extra="--preset=desktop"
    f="$OUT/$(echo "$p" | tr / _)$ff.json"
    CHROME_PATH=$CHROME npx --no-install lighthouse "$B$p" $extra --quiet --output=json --output-path="$f" \
      --chrome-flags="--headless=new --no-sandbox" >/dev/null 2>&1
    node -e "const r=require('$f'),c=r.categories,s=Object.values(c).map(x=>Math.round(x.score*100));
      console.log((s.some(v=>v<=90)?'FAIL':'ok  ')+' $ff\t'+s.join(' ')+'\tLCP '+r.audits['largest-contentful-paint'].displayValue+'\t$p');
      process.exit(s.some(v=>v<=90)?1:0)" || fail=1
  done
done
echo "(scores: performance accessibility best-practices seo; JSON in $OUT)"
exit $fail
