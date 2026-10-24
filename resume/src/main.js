
// Page renders from STATE ({en, ro} per text). Admin mode (5 clicks on the hero photo + login) edits STATE and republishes the page.
const STATE=JSON.parse(document.getElementById("state").textContent);
const IMG=JSON.parse(document.getElementById("img").textContent);
const app=document.getElementById("app");
const root=document.documentElement;
let lang="ro",lens="p",admin=false,dirty=false,curSec="",readOnly=false;
const editing=new Set();
try{const s=localStorage.getItem("dl-lang");if(s==="en"||s==="ro")lang=s}catch(e){}
try{const s=localStorage.getItem("dl-lens");if(s==="all"||s==="p"||s==="d")lens=s}catch(e){}
try{const t=localStorage.getItem("dl-theme");if(t)root.dataset.theme=t}catch(e){}

const ICONS={
 camera:'<path d="M4 7h3l2-3h6l2 3h3v13H4z"/><circle cx="12" cy="13" r="4"/>',
 layout:'<path d="M3 3h18v18H3z"/><path d="M3 9h18M9 21V9"/>',
 chart:'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
 code:'<path d="M8 9l-4 3 4 3M16 9l4 3-4 3M13 6l-2 12"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'
};
const UI={
 en:{edit:"Edit section",done:"Done",add:"Add",admin:"Admin mode",hint:"Edit a section, then save. Editing the English version.",save:"Save changes",saving:"Saving…",saved:"Saved",unsaved:"Unsaved changes",exit:"Exit admin",photo:"Photo & video",design:"Design & print",ro:"This view can't save. Open the page with edit access.",fail:"Save failed. Try again.",copy:"Copy",copied:"Copied"},
 ro:{edit:"Editează secțiunea",done:"Gata",add:"Adaugă",admin:"Mod admin",hint:"Editează o secțiune, apoi salvează. Editezi versiunea în română.",save:"Salvează",saving:"Se salvează…",saved:"Salvat",unsaved:"Modificări nesalvate",exit:"Ieși din admin",photo:"Foto & video",design:"Design & print",ro:"Această vizualizare nu poate salva. Deschide pagina cu drept de editare.",fail:"Salvarea a eșuat. Încearcă din nou.",copy:"Copiază",copied:"Copiat"}
};
const u=k=>UI[lang][k];
const L=(en,ro)=>({en,ro:ro??en});
const NEW={
 "hero.stats":()=>({b:L("New","Nou"),s:L("label","etichetă")}),
 "services.items":()=>({icon:"star",title:L("New service","Serviciu nou"),text:L("Short description.","Descriere scurtă."),chips:[L("Tool","Instrument")]}),
 "services.items.*.chips":()=>L("Tool","Instrument"),
 "exp.jobs":()=>({when:L("2026 – present","2026 – prezent"),dur:L(""),role:L("Role","Rol"),co:L("Company","Companie"),place:L("City","Oraș"),items:[{t:L("What you did.","Ce ai făcut.")}]}),
 "exp.jobs.*.items":()=>({t:L("What you did.","Ce ai făcut.")}),
 "exp.edu.items":()=>({b:L("School","Școală"),s:L("Field · years","Domeniu · ani")}),
 "exp.langs.items":()=>({b:L("Language","Limbă"),s:L("Level","Nivel")}),
 "exp.tools.chips":()=>L("Tool","Instrument"),
 "about.paras":()=>L("New paragraph.","Paragraf nou."),
 "about.timeline":()=>({y:L("2026"),t:L("What happened.","Ce s-a întâmplat.")}),
 "contact.rows":()=>({k:L("Label","Etichetă"),v:L("Value","Valoare")}),
 "contact.social":()=>({label:L("Link"),url:"https://"})
};
const PREPEND=new Set(["exp.jobs"]);

function get(path){return path.split(".").reduce((o,k)=>o==null?o:o[k],STATE)}
function parentOf(path){const i=path.lastIndexOf(".");return [get(path.slice(0,i)),path.slice(i+1)]}
const escT=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
const escA=s=>escT(s).replace(/"/g,"&quot;");
function clean(html){
  const t=document.createElement("template");t.innerHTML=html;
  const walk=n=>[...n.childNodes].map(c=>{
    if(c.nodeType===3)return escT(c.textContent);
    if(c.nodeType!==1)return "";
    const tag=c.tagName.toLowerCase();
    if(tag==="br")return "";
    if(tag==="strong"||tag==="b")return "<strong>"+walk(c)+"</strong>";
    if(tag==="span")return "<span>"+walk(c)+"</span>";
    if(tag==="mark"){const f=c.getAttribute("data-f");return /^(p|d|pd)$/.test(f)?`<mark data-f="${f}">${walk(c)}</mark>`:walk(c)}
    return walk(c);
  }).join("");
  return walk(t.content).replace(/ /g," ").trim();
}
function txt(path){const v=get(path);return v==null?"":typeof v==="string"?v:(v[lang]??v.en??"")}
const ed=()=>admin&&editing.has(curSec);
// editable text element
function E(tag,path,cls="",attrs=""){
  return `<${tag}${cls?` class="${cls}"`:""} data-p="${path}"${ed()?' contenteditable="true" spellcheck="true"':""}${attrs?" "+attrs:""}>${txt(path)}</${tag}>`;
}
const X=(path,corner)=>ed()?`<button class="x${corner?" corner":""}" type="button" data-del="${path}" aria-label="Remove">×</button>`:"";
const ADD=(path,label)=>ed()?`<button class="add" type="button" data-add="${path}">+ ${u("add")}${label?" "+label:""}</button>`:"";
const EDITBTN=id=>admin?`<button class="edit-sec" type="button" data-edit-sec="${id}" aria-pressed="${editing.has(id)}">${editing.has(id)?u("done"):u("edit")}</button>`:"";
function sec(id,fn){curSec=id;const h=fn();curSec="";return h}
const safeUrl=s=>/^https?:\/\//i.test(s)?s:"#";

function renderNav(){
  const n=STATE.nav;
  return `<header class="nav"><div class="wrap">
    <a class="brand" href="#top"><span class="mark">DL</span>${escT(STATE.brand)}</a>
    <nav aria-label="Sections"><a href="#services">${n.services[lang]}</a><a href="#experience">${n.experience[lang]}</a><a href="#about">${n.about[lang]}</a><a href="#contact">${n.contact[lang]}</a></nav>
    <button class="icon-btn lang-btn" id="lang" type="button" aria-label="${lang==="ro"?"Switch to English":"Schimbă în română"}">${lang==="ro"?"EN":"RO"}</button>
    <button class="icon-btn" id="theme" type="button" aria-label="Toggle light or dark theme"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>
  </div></header>`+(admin?`<div class="admin-bar"><div class="wrap"><b>${u("admin")}</b><span class="hint">${u("hint")}</span><span class="status" id="status">${dirty?u("unsaved"):""}</span><button class="save" type="button" id="save"${dirty&&!readOnly?"":" disabled"}>${u("save")}</button><button type="button" id="exit">${u("exit")}</button></div></div>`:"");
}
function renderHero(){return sec("hero",()=>{const h=STATE.hero;return `<section class="hero"><div class="wrap sec-wrap">${EDITBTN("hero")}
  <div class="hero-text">
    <div class="avail"><i></i>${E("span","hero.avail")}</div>
    ${E("h1","hero.h1")}
    ${E("p","hero.lede","lede")}
    <div class="cta"><a class="btn btn-primary" href="#contact">${E("span","hero.cta1")}</a><a class="btn btn-ghost" href="#experience">${E("span","hero.cta2")}</a><a class="btn btn-ghost" href="/cv/${lang}.pdf" download="CV-Daniel-Lupu-${lang.toUpperCase()}.pdf"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>${E("span","hero.cv")}</a></div>
    <div class="stats">${h.stats.map((s,i)=>`<div class="stat">${E("b",`hero.stats.${i}.b`)}${E("span",`hero.stats.${i}.s`)}${X(`hero.stats.${i}`)}</div>`).join("")}${ADD("hero.stats")}</div>
  </div>
  <div class="frame" id="photo"><img src="${IMG.hero}" alt="Portrait of Daniel Lupu in a studio with a stone wall" draggable="false"><div class="vf"><i></i></div><span class="vf-tag">REC · BRAȘOV</span></div>
</div></section>`})}
function renderServices(){return sec("services",()=>{const s=STATE.services;return `<section id="services" style="background:var(--surface-2);border-block:1px solid var(--border)"><div class="wrap sec-wrap">${EDITBTN("services")}
  <div class="sec-head"><div>${E("p","services.eyebrow","eyebrow")}${E("h2","services.title")}</div>${E("p","services.intro")}</div>
  <div class="svc-grid">${s.items.map((it,i)=>`<article class="card svc has-x">${X(`services.items.${i}`,true)}
    <div class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ICONS[it.icon]||ICONS.star}</svg></div>
    ${E("h3",`services.items.${i}.title`)}${E("p",`services.items.${i}.text`)}
    <div class="chips">${it.chips.map((c,j)=>`<span class="chip">${E("span",`services.items.${i}.chips.${j}`)}${X(`services.items.${i}.chips.${j}`)}</span>`).join("")}${ADD(`services.items.${i}.chips`)}</div>
  </article>`).join("")}</div>
  ${ed()?`<div style="margin-top:16px">${ADD("services.items")}</div>`:""}
</div></section>`})}
function renderExp(){return sec("experience",()=>{const x=STATE.exp,editingNow=ed();
  const jobs=x.jobs.map((j,i)=>{
    const lensing=!editingNow&&lens!=="all";
    const dimJob=lensing&&!j.items.some((it,k)=>hasMark(txt(`exp.jobs.${i}.items.${k}.t`),lens));
    return `<article class="card job has-x${dimJob?" dim":""}">${X(`exp.jobs.${i}`,true)}
      <div class="when">${E("span",`exp.jobs.${i}.when`)}<small>${E("span",`exp.jobs.${i}.dur`)}</small></div>
      <div class="job-body">${E("h3",`exp.jobs.${i}.role`)}
        <div class="co">${E("span",`exp.jobs.${i}.co`,"co-name")} <span>· ${E("span",`exp.jobs.${i}.place`)}</span></div>
        <ul>${j.items.map((it,k)=>`<li>${lensing&&!dimJob?`<span>${lensify(txt(`exp.jobs.${i}.items.${k}.t`),lens)}</span>`:E("span",`exp.jobs.${i}.items.${k}.t`)}${X(`exp.jobs.${i}.items.${k}`)}</li>`).join("")}</ul>
        ${editingNow?`<div class="ff">${ADD(`exp.jobs.${i}.items`)}</div>`:""}
      </div></article>`}).join("");
  const list=(key)=>`<ul>${x[key].items.map((it,i)=>`<li>${E("b",`exp.${key}.items.${i}.b`)}${E("span",`exp.${key}.items.${i}.s`)}${X(`exp.${key}.items.${i}`)}</li>`).join("")}</ul>${ADD(`exp.${key}.items`)}`;
  return `<section id="experience" style="background:var(--surface-2);border-block:1px solid var(--border)"><div class="wrap sec-wrap">${EDITBTN("experience")}
  <div class="sec-head"><div>${E("p","exp.eyebrow","eyebrow")}${E("h2","exp.title")}</div>${E("p","exp.intro")}</div>
  <div class="tabs" role="tablist" aria-label="Experience field">${["all","p","d"].map(k=>`<button class="tab" role="tab" data-lens="${k}" aria-selected="${lens===k}">${x.tabs[k][lang]}</button>`).join("")}</div>
  <p class="lens-note">${x.notes[lens][lang]}</p>
  ${editingNow?`<div class="hl-help"><span>${lang==="ro"?"Selectează cuvinte dintr-o realizare ca să le marchezi pentru un filtru:":"Select words in a bullet to mark them for a filter:"}</span><mark data-f="p">${x.tabs.p[lang]}</mark><mark data-f="d">${x.tabs.d[lang]}</mark><mark data-f="pd">${lang==="ro"?"Ambele":"Both"}</mark></div><div style="margin-bottom:14px">${ADD("exp.jobs")}</div>`:""}
  <div class="jobs"${editingNow?"":` data-lens="${lens}"`}>${jobs}</div>
  <div class="edu-grid">
    <div class="card">${E("h3","exp.edu.title")}${list("edu")}</div>
    <div class="card">${E("h3","exp.tools.title")}<div class="chips">${x.tools.chips.map((c,i)=>`<span class="chip">${E("span",`exp.tools.chips.${i}`)}${X(`exp.tools.chips.${i}`)}</span>`).join("")}${ADD("exp.tools.chips")}</div></div>
    <div class="card">${E("h3","exp.langs.title")}${list("langs")}</div>
  </div>
</div></section>`})}
function renderAbout(){return sec("about",()=>{const a=STATE.about;return `<section id="about" class="about"><div class="wrap sec-wrap">${EDITBTN("about")}
  <div class="about-intro">${E("p","about.eyebrow","eyebrow")}${E("h2","about.title","about-h")}
    ${a.paras.map((p,i)=>`<div class="para">${E("p",`about.paras.${i}`)}${X(`about.paras.${i}`)}</div>`).join("")}${ADD("about.paras")}</div>
  <div><ol class="timeline">${a.timeline.map((t,i)=>`<li>${E("span",`about.timeline.${i}.y`,"yr")}<p>${E("span",`about.timeline.${i}.t`)}${X(`about.timeline.${i}`)}</p></li>`).join("")}</ol>${ADD("about.timeline")}</div>
</div></section>`})}
function renderContact(){return sec("contact",()=>{const c=STATE.contact,e=ed();return `<section id="contact"><div class="wrap sec-wrap">${EDITBTN("contact")}
  <div class="contact-card">
    <div class="contact-photo"><img src="${IMG.full}" alt="Daniel Lupu standing by a window in a studio"></div>
    <div class="contact-body">${E("p","contact.eyebrow","eyebrow")}${E("h2","contact.title")}${E("p","contact.text")}
      <div class="rows">
        ${c.rows.map((r,i)=>`<div class="row">${E("span",`contact.rows.${i}.k`,"k")}${E("span",`contact.rows.${i}.v`,"v",r.copy?'data-copysrc="1"':"")}${r.copy&&!e?`<button class="copy" type="button" data-copy="contact.rows.${i}.v">${u("copy")}</button>`:""}${X(`contact.rows.${i}`)}</div>`).join("")}
        <div class="row"><span class="k">Social</span>${c.social.map((s,i)=>e?`<span style="display:grid;gap:2px">${E("span",`contact.social.${i}.label`)}<span class="url" data-url="contact.social.${i}.url" contenteditable="true" spellcheck="false">${escT(s.url)}</span></span>${X(`contact.social.${i}`)}`:`<a href="${escA(safeUrl(s.url))}" target="_blank" rel="noopener">${txt(`contact.social.${i}.label`)}</a>`).join("")}${ADD("contact.social")}</div>
        <div class="row"><span class="k">CV</span><a href="/cv/${lang}.pdf" download="CV-Daniel-Lupu-${lang.toUpperCase()}.pdf">${lang==="ro"?"Descarcă CV (PDF)":"Download CV (PDF)"}</a>${e?`<span class="url">${lang==="ro"?"Se actualizează automat la salvare":"Updates automatically on save"}</span>`:""}</div>
        ${ADD("contact.rows")}
      </div>
    </div>
  </div>
</div></section>`})}
function renderFooter(){return sec("footer",()=>`<footer><div class="wrap sec-wrap">${E("span","footer.left")}${E("span","footer.right")}${admin?`<button class="edit-sec" type="button" data-edit-sec="footer" aria-pressed="${editing.has("footer")}" style="position:static">${editing.has("footer")?u("done"):u("edit")}</button>`:""}</div></footer>`)}

function render(){
  const y=scrollY;
  root.lang=lang;
  app.innerHTML=renderNav()+`<main id="top">`+renderHero()+renderServices()+renderExp()+renderAbout()+renderContact()+`</main>`+renderFooter()+
   `<button class="totop" id="totop" type="button" aria-label="Back to top"><svg class="ring" viewBox="0 0 48 48"><circle class="track" cx="24" cy="24" r="21"/><circle class="prog" id="prog" cx="24" cy="24" r="21"/></svg><svg class="arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg></button>`;
  document.title=STATE.brand;
  if(admin)scrollTo(0,y);
  onScroll();
}

function markDirty(){dirty=true;const s=document.getElementById("status");if(s)s.textContent=u("unsaved");const b=document.getElementById("save");if(b&&!readOnly)b.disabled=false}
function setText(path,val){
  const [o,k]=parentOf(path),cur=o[k];
  if(typeof cur==="string"){o[k]=val}else{const other=lang==="ro"?"en":"ro";if(cur[other]===cur[lang])cur[other]=val;cur[lang]=val}
  markDirty();
}

// filter highlights: <mark data-f="p|d|pd"> inside experience bullets
const MARK_RE=/<mark data-f="(p|d|pd)">[\s\S]*?<\/mark>/g;
const hasMark=(html,l)=>[...String(html).matchAll(MARK_RE)].some(x=>x[1].includes(l));
function lensify(html,l){
  return String(html).split(/(<mark data-f="(?:p|d|pd)">[\s\S]*?<\/mark>)/).map(seg=>{
    if(!seg)return "";
    const mk=seg.match(/^<mark data-f="(p|d|pd)">/);
    if(mk&&mk[1].includes(l))return seg.replace("<mark ",'<mark class="on" ');
    return `<span class="soft">${seg}</span>`;
  }).join("");
}
// older content tagged whole bullets with f: turn those into marks once
(function migrate(){
  STATE.exp.jobs.forEach(j=>{j.items.forEach(it=>{
    if(it.f&&!/<mark /.test(JSON.stringify(it.t)))for(const l of ["en","ro"])if(it.t[l])it.t[l]=`<mark data-f="${it.f}">${it.t[l]}</mark>`;
    delete it.f});delete j.f});
})();
const pop=document.createElement("div");pop.className="hl-pop";pop.hidden=true;document.body.appendChild(pop);
function hlTarget(){
  const s=getSelection();if(!admin||!s.rangeCount||s.isCollapsed)return null;
  const r=s.getRangeAt(0),host=n=>(n.nodeType===1?n:n.parentElement)?.closest('[contenteditable="true"][data-p^="exp.jobs."][data-p$=".t"]');
  const el=host(r.startContainer);if(!el||el!==host(r.endContainer)||!r.toString().trim())return null;
  return {el,r};
}
function showPop(){
  const t=hlTarget();if(!t){pop.hidden=true;return}
  const X=STATE.exp.tabs;
  pop.innerHTML=`<button type="button" data-hl="p">${X.p[lang]}</button><button type="button" data-hl="d">${X.d[lang]}</button><button type="button" data-hl="pd">${lang==="ro"?"Ambele":"Both"}</button><button type="button" data-hl="">${lang==="ro"?"Fără marcaj":"No mark"}</button>`;
  pop.hidden=false;
  const rc=t.r.getBoundingClientRect(),w=pop.offsetWidth,h=pop.offsetHeight;
  let top=rc.top-h-8;if(top<80)top=rc.bottom+8;
  pop.style.top=top+"px";pop.style.left=Math.max(8,Math.min(innerWidth-w-8,rc.left+rc.width/2-w/2))+"px";
}
const unwrap=mk=>{mk.replaceWith(...mk.childNodes)};
pop.addEventListener("mousedown",e=>e.preventDefault());
pop.addEventListener("click",e=>{
  const b=e.target.closest("[data-hl]");const t=hlTarget();if(!b||!t)return;
  const {el,r}=t,f=b.dataset.hl;
  el.querySelectorAll("mark").forEach(mk=>{if(r.intersectsNode(mk))unwrap(mk)});
  if(f){const frag=r.extractContents();frag.querySelectorAll("mark").forEach(unwrap);const mk=document.createElement("mark");mk.setAttribute("data-f",f);mk.appendChild(frag);r.insertNode(mk)}
  el.normalize();getSelection().removeAllRanges();pop.hidden=true;
  setText(el.dataset.p,clean(el.innerHTML));
});
let popT=0;document.addEventListener("selectionchange",()=>{clearTimeout(popT);popT=setTimeout(showPop,120)});
addEventListener("scroll",()=>{if(!pop.hidden)showPop()},{passive:true});

// events
app.addEventListener("input",e=>{
  const el=e.target.closest("[data-p],[data-url]");if(!el)return;
  if(el.dataset.url){const [o,k]=parentOf(el.dataset.url);o[k]=el.textContent.trim();markDirty();return}
  setText(el.dataset.p,clean(el.innerHTML));
});
app.addEventListener("keydown",e=>{if(e.key==="Enter"&&e.target.isContentEditable){e.preventDefault();e.target.blur()}});
app.addEventListener("paste",e=>{if(!e.target.closest('[contenteditable="true"]'))return;e.preventDefault();document.execCommand("insertText",false,(e.clipboardData||window.clipboardData).getData("text/plain").replace(/\s+/g," "))});
let clicks=[];
app.addEventListener("click",e=>{
  const t=e.target;
  if(t.closest('[contenteditable="true"]')&&t.closest("a")){e.preventDefault();return}
  if(t.closest("#photo")&&!admin){const now=Date.now();clicks=clicks.filter(c=>now-c<3000);clicks.push(now);if(clicks.length>=5){clicks=[];openLogin()}return}
  const b=t.closest("button");if(!b)return;
  if(b.id==="lang"){lang=lang==="ro"?"en":"ro";try{localStorage.setItem("dl-lang",lang)}catch(_){}render();return}
  if(b.id==="theme"){const cur=root.dataset.theme||(matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");root.dataset.theme=cur==="dark"?"light":"dark";try{localStorage.setItem("dl-theme",root.dataset.theme)}catch(_){}return}
  if(b.id==="totop"){scrollTo({top:0,behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"});return}
  if(b.dataset.lens){lens=b.dataset.lens;try{localStorage.setItem("dl-lens",lens)}catch(_){}render();return}
  if(b.dataset.copy){const v=document.querySelector(`[data-p="${b.dataset.copy}"]`);const done=()=>{b.textContent=u("copied");setTimeout(()=>b.textContent=u("copy"),1600)};const sel=()=>{const r=document.createRange();r.selectNodeContents(v);const s=getSelection();s.removeAllRanges();s.addRange(r)};if(navigator.clipboard)navigator.clipboard.writeText(v.textContent).then(done).catch(sel);else sel();return}
  if(b.dataset.editSec){const id=b.dataset.editSec;editing.has(id)?editing.delete(id):editing.add(id);render();return}
  if(b.dataset.add){const p=b.dataset.add,key=p.replace(/\.\d+\./g,".*.");const arr=get(p);const item=NEW[key]?NEW[key](p):L("New","Nou");PREPEND.has(key)?arr.unshift(item):arr.push(item);markDirty();render();return}
  if(b.dataset.del){const [arr,i]=parentOf(b.dataset.del);arr.splice(+i,1);markDirty();render();return}
  if(b.id==="save"){save(b);return}
  if(b.id==="exit"){admin=false;editing.clear();render();return}
});

// login + save go through the site's own API (/api/*); the session token lives only in memory, so a refresh leaves admin
let token="";
async function api(path,body){
  const r=await fetch(path,{method:"POST",headers:{"content-type":"application/json",...(token?{authorization:"Bearer "+token}:{})},body:JSON.stringify(body)});
  let data={};try{data=await r.json()}catch(_){}
  return {status:r.status,ok:r.ok,data};
}
const T={
  en:{title:"Admin",sub:"Sign in to edit this page.",user:"Username",pass:"Password",cancel:"Cancel",go:"Sign in",bad:"Wrong username or password.",many:"Too many attempts. Try again in 15 minutes.",net:"Can't reach the server. Check your connection.",
      pwTitle:"Change your password",pwSub:"You're using the starting password. Choose a new one before editing. You'll sign in with it next time.",pwNew:"New password",pwConfirm:"Confirm new password",pwSave:"Save password",pwShort:"Use at least 8 characters.",pwMatch:"The two passwords don't match.",pwSame:"Choose a password different from the starting one.",pwDone:"Password changed.",pwExit:"Exit admin",expired:"Session expired. Sign in again."},
  ro:{title:"Admin",sub:"Autentifică-te pentru a edita pagina.",user:"Utilizator",pass:"Parolă",cancel:"Anulează",go:"Intră",bad:"Utilizator sau parolă greșită.",many:"Prea multe încercări. Încearcă din nou peste 15 minute.",net:"Serverul nu răspunde. Verifică conexiunea.",
      pwTitle:"Schimbă parola",pwSub:"Folosești parola inițială. Alege una nouă înainte de a edita. Data viitoare te vei autentifica cu ea.",pwNew:"Parolă nouă",pwConfirm:"Confirmă parola nouă",pwSave:"Salvează parola",pwShort:"Folosește cel puțin 8 caractere.",pwMatch:"Parolele nu coincid.",pwSame:"Alege o parolă diferită de cea inițială.",pwDone:"Parola a fost schimbată.",pwExit:"Ieși din admin",expired:"Sesiunea a expirat. Autentifică-te din nou."}
};
const tr=k=>T[lang][k];
function modal(html,{closable}){
  if(document.querySelector(".modal"))return null;
  const m=document.createElement("div");m.className="modal";m.innerHTML=html;
  document.body.appendChild(m);
  const esc=e=>{if(e.key==="Escape"&&closable)close()};
  const close=()=>{m.remove();document.removeEventListener("keydown",esc)};
  document.addEventListener("keydown",esc);
  m.close=close;return m;
}
function openLogin(){
  const m=modal(`<form class="login" autocomplete="off"><div style="display:flex;justify-content:space-between;align-items:center"><h2>${tr("title")}</h2><button class="x" type="button" data-close aria-label="Close" style="width:30px;height:30px;font-size:18px">×</button></div><p>${tr("sub")}</p>
   <label for="adm-user">${tr("user")}<input id="adm-user" name="user" required autocapitalize="none" autocorrect="off" spellcheck="false"></label>
   <label for="adm-pass">${tr("pass")}<input id="adm-pass" name="pass" type="password" required autocomplete="current-password"></label>
   <div class="err" role="alert"></div>
   <div class="row-btn"><button class="btn btn-ghost" type="button" data-close>${tr("cancel")}</button><button class="btn btn-primary" type="submit">${tr("go")}</button></div></form>`,{closable:true});
  if(!m)return;
  m.querySelectorAll("[data-close]").forEach(b=>b.onclick=m.close);
  m.querySelector("#adm-user").focus();
  m.querySelector("form").addEventListener("submit",async e=>{
    e.preventDefault();
    const f=e.target,err=m.querySelector(".err"),btn=f.querySelector("[type=submit]");
    btn.disabled=true;err.textContent="";
    let r;try{r=await api("/api/login",{user:f.user.value.trim().toLowerCase(),pass:f.pass.value})}catch(_){err.textContent=tr("net");btn.disabled=false;return}
    btn.disabled=false;
    if(r.ok&&r.data.token){token=r.data.token;m.close();admin=true;render();if(r.data.mustChange)openChangePassword()}
    else{err.textContent=r.status===429?tr("many"):tr("bad");f.pass.value="";f.pass.focus()}
  });
}
function openChangePassword(){
  const m=modal(`<form class="login" autocomplete="off"><h2>⚠ ${tr("pwTitle")}</h2><p>${tr("pwSub")}</p>
   <label for="pw-new">${tr("pwNew")}<input id="pw-new" name="pw" type="password" required minlength="8" autocomplete="new-password"></label>
   <label for="pw-confirm">${tr("pwConfirm")}<input id="pw-confirm" name="pw2" type="password" required minlength="8" autocomplete="new-password"></label>
   <div class="err" role="alert"></div>
   <div class="row-btn"><button class="btn btn-ghost" type="button" data-exit>${tr("pwExit")}</button><button class="btn btn-primary" type="submit">${tr("pwSave")}</button></div></form>`,{closable:false});
  if(!m)return;
  m.querySelector("[data-exit]").onclick=()=>{m.close();token="";admin=false;editing.clear();render()};
  m.querySelector("#pw-new").focus();
  m.querySelector("form").addEventListener("submit",async e=>{
    e.preventDefault();
    const f=e.target,err=m.querySelector(".err"),btn=f.querySelector("[type=submit]");
    if(f.pw.value.length<8){err.textContent=tr("pwShort");return}
    if(f.pw.value!==f.pw2.value){err.textContent=tr("pwMatch");f.pw2.focus();return}
    btn.disabled=true;err.textContent="";
    let r;try{r=await api("/api/password",{pass:f.pw.value})}catch(_){err.textContent=tr("net");btn.disabled=false;return}
    btn.disabled=false;
    if(r.ok){m.close();const s=document.getElementById("status");if(s)s.textContent=tr("pwDone")}
    else if(r.status===401){m.close();sessionOver()}
    else err.textContent=r.data.error==="same"?tr("pwSame"):r.data.error==="short"?tr("pwShort"):tr("net");
  });
}
function sessionOver(){token="";admin=false;editing.clear();render();openLogin();const e=document.querySelector(".login .err");if(e)e.textContent=tr("expired")}
async function save(b){
  const st=document.getElementById("status");
  b.disabled=true;st.textContent=u("saving");
  let r;try{r=await api("/api/save",STATE)}catch(_){st.textContent=u("fail");b.disabled=false;return}
  if(r.ok){
    dirty=false;st.textContent=lang==="ro"?"Se actualizează CV-ul…":"Updating CV…";
    try{await rebuildCvs();st.textContent=u("saved")}
    catch(err){if(err.code===401)return sessionOver();dirty=true;b.disabled=false;st.textContent=lang==="ro"?"Pagina e salvată, CV-ul nu. Apasă din nou Salvează.":"Page saved, CV not updated. Press Save again."}
  }
  else if(r.status===401){sessionOver()}
  else if(r.status===403&&r.data.error==="must_change"){st.textContent="";b.disabled=false;openChangePassword()}
  else{st.textContent=u("fail");b.disabled=false}
}

// CV PDFs (RO + EN) are rebuilt in the admin's browser from STATE on every save, then uploaded, so the CV always matches the site.
// Layout follows Daniel's original CV (eJobs style, Open Sans). Phone and salaries are left out on purpose.
const PDFMAKE="https://cdnjs.cloudflare.com/ajax/libs/pdfmake/0.2.10/";
const CV_INK="#1a1a1a",CV_MUTED="#6b6b6b",CV_LINK="#2f7de1",CV_RULE="#4d4d4d";
const CV_L={
 ro:{contact:"Date contact",email:"Email",city:"Oraș",about:"Despre mine",exp:"Experiență profesională",edu:"Educație",skills:"Abilități",general:"Abilități generale",langs:"Limbi străine",cv:"CV",native:/^(română|romanian)$/i},
 en:{contact:"Contact details",email:"Email",city:"City",about:"About me",exp:"Work experience",edu:"Education",skills:"Skills",general:"General skills",langs:"Foreign languages",cv:"CV",native:/^(română|romanian)$/i}
};
let pdfLib=null;
function loadScript(src){return new Promise((ok,bad)=>{const s=document.createElement("script");s.src=src;s.onload=ok;s.onerror=()=>bad(new Error("load "+src));document.head.appendChild(s)})}
async function pdfReady(){
  if(!pdfLib){
    await loadScript(PDFMAKE+"pdfmake.min.js");
    const f=w=>location.origin+"/fonts/opensans-"+w+".ttf";
    window.pdfMake.fonts={
      OpenSans:{normal:f(400),bold:f(700),italics:f(400),bolditalics:f(700)},
      OpenSansSemi:{normal:f(600),bold:f(700),italics:f(600),bolditalics:f(700)}
    };
    pdfLib=window.pdfMake;
  }
  return pdfLib;
}
// "<strong>a</strong> b" -> [{text:"a",bold:true},{text:" b"}]
function rich(v,lng){
  const s=typeof v==="string"?v:(v&&(v[lng]??v.en))||"";
  const t=document.createElement("template");t.innerHTML=s;
  const out=[];const walk=(n,bold)=>n.childNodes.forEach(c=>{if(c.nodeType===3)out.push({text:c.textContent,bold});else if(c.nodeType===1)walk(c,bold||/^(STRONG|B)$/.test(c.tagName))});
  walk(t.content,false);return out.length?out:[{text:""}];
}
const plain=(v,lng)=>rich(v,lng).map(r=>r.text).join("");
async function cvPhoto(){
  const img=new Image();img.src=IMG.hero;await img.decode();
  const side=Math.min(img.naturalWidth,img.naturalHeight),c=document.createElement("canvas");c.width=c.height=240;
  const g=c.getContext("2d");g.beginPath();g.arc(120,120,120,0,Math.PI*2);g.clip();
  g.drawImage(img,(img.naturalWidth-side)/2,img.naturalHeight*0.03,side,side,0,0,240,240);
  return c.toDataURL("image/png");
}
function cvDoc(lng,photo){
  const S=STATE,x=S.exp,lab=CV_L[lng],j0=x.jobs[0];
  const name=lng==="ro"?S.brand.split(" ").reverse().join(" "):S.brand;
  const headline=j0?[plain(j0.role,lng),plain(j0.co,lng)].filter(Boolean).join(" - "):"";
  const row=k=>(S.contact.rows.find(r=>new RegExp(k,"i").test(plain(r.k,"en")))||{}).v;
  const email=plain(row("mail")||"",lng),city=plain(row("based|city|loca")||"",lng);
  const cityShort=city.split(",")[0];
  const H=t=>[{text:t,font:"OpenSans",bold:true,fontSize:15,margin:[0,18,0,5]},{canvas:[{type:"line",x1:0,y1:0,x2:515,y2:0,lineWidth:0.6,lineColor:CV_RULE}],margin:[0,0,0,10]}];
  const kv=(k,v,link)=>({text:[{text:k+": ",bold:true},link?{text:v,color:CV_LINK,link}:{text:v}],margin:[0,0,0,7]});
  const twoCol=(left,right)=>({columns:[{width:115,stack:left},{width:"*",stack:right}],columnGap:14});
  const jobs=x.jobs.map(j=>({unbreakable:true,margin:[0,0,0,12],stack:[twoCol(
    [{text:plain(j.when,lng),bold:true,fontSize:9.5},{text:plain(j.dur,lng),color:CV_MUTED,fontSize:8.5,margin:[0,2,0,0]}],
    [{text:[plain(j.role,lng),plain(j.co,lng)].filter(Boolean).join(" - "),bold:true,fontSize:10},
     {text:plain(j.place,lng).replace(/ · /g," | "),color:CV_MUTED,fontSize:8.5,margin:[0,2,0,6]},
     ...j.items.map(i=>({text:plain(i.t,lng),margin:[0,0,0,4]}))]
  )]}));
  const edu=x.edu.items.map(i=>{
    const s=plain(i.s,lng),m=s.match(/^(.*?)\s*·\s*(\d{4}\s*[–-]\s*\d{4})\s*$/);
    return {margin:[0,0,0,9],stack:[twoCol([{text:m?m[2].replace(/\s*[–-]\s*/," - "):"",bold:true,fontSize:9.5}],[{text:plain(i.b,lng),bold:true,fontSize:10},{text:m?m[1]:s,color:CV_MUTED,fontSize:8.5,margin:[0,2,0,0]}])]};
  });
  const langs=x.langs.items.filter(i=>!lab.native.test(plain(i.b,"en"))).map(i=>kv(plain(i.b,lng),plain(i.s,lng)));
  return {
    pageSize:"A4",pageMargins:[40,40,40,50],
    info:{title:lab.cv+" "+name,author:S.brand},
    defaultStyle:{font:"OpenSans",fontSize:9.2,lineHeight:1.3,color:CV_INK},
    footer:(cur,total)=>({margin:[40,14,40,0],stack:[
      {canvas:[{type:"line",x1:0,y1:0,x2:515,y2:0,lineWidth:0.5,lineColor:"#bdbdbd"}]},
      {text:`${lab.cv} ${name} ${cur}/${total}`,alignment:"right",fontSize:8,color:CV_MUTED,margin:[0,6,0,0]}]}),
    content:[
      {columns:[
        {image:photo,width:86,height:86},
        {stack:[{text:name,bold:true,fontSize:22,margin:[0,6,0,4]},{text:headline,bold:true,fontSize:10.5},{text:cityShort,fontSize:9,margin:[0,4,0,0]}],margin:[18,0,0,0]}
      ],margin:[0,0,0,4]},
      ...H(lab.contact),
      email?kv(lab.email,email,"mailto:"+email):"",
      city?kv(lab.city,cityShort):"",
      ...S.contact.social.map(s=>kv(plain(s.label,lng),s.url.replace(/^https?:\/\/(www\.)?/,"").replace(/\/$/,""),s.url)),
      ...H(lab.about),
      ...S.about.paras.map(p=>({text:rich(p,lng).map(r=>({text:r.text})),alignment:"left",margin:[0,0,0,6]})),
      ...H(lab.exp),
      ...jobs,
      ...H(lab.edu),
      ...edu,
      ...H(lab.skills),
      {text:lab.general,bold:true,margin:[0,0,0,4]},
      {text:x.tools.chips.map(c=>plain(c,lng)).join(", ")},
      ...H(lab.langs),
      ...langs
    ]
  };
}
async function rebuildCvs(){
  const pm=await pdfReady(),photo=await cvPhoto();
  for(const lng of ["ro","en"]){
    const blob=await new Promise(ok=>pm.createPdf(cvDoc(lng,photo)).getBlob(ok));
    const r=await fetch("/api/cv?lang="+lng,{method:"POST",headers:{"content-type":"application/pdf",authorization:"Bearer "+token},body:blob});
    if(r.status===401)throw Object.assign(new Error("unauthorized"),{code:401});
    if(!r.ok)throw new Error("cv upload "+r.status);
  }
}

function onScroll(){
  const btn=document.getElementById("totop"),prog=document.getElementById("prog");if(!btn)return;
  const C=2*Math.PI*21;prog.style.strokeDasharray=C;
  const max=document.documentElement.scrollHeight-innerHeight,p=max>0?scrollY/max:0;
  prog.style.strokeDashoffset=C*(1-p);btn.classList.toggle("show",scrollY>400);
}
addEventListener("scroll",onScroll,{passive:true});
addEventListener("beforeunload",e=>{if(admin&&dirty){e.preventDefault();e.returnValue=""}});
render();
