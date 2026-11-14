/* Fr0gB1t — main.js */

// ── Static UI strings ─────────────────────────────────────────────────────────
var UI = {
  es: {
    nav_navigation: "navigation", nav_home: "inicio", nav_search: "búsqueda",
    nav_tags: "tags", nav_about: "acerca", nav_categories: "categorías",
    all_tag: "todo", no_results: "No hay resultados.", toc_label: "contenido",
    back_link: "← inicio", min_read: "min lectura",
    search_placeholder: "buscar por título, tag o contenido…",
    search_hint: "Escribe algo para buscar entre los artículos.",
    bio: "Security researcher. CTF player. Escribo lo que aprendo.",
    code_copy: "copiar", code_copied: "copiado"
  },
  en: {
    nav_navigation: "navigation", nav_home: "home", nav_search: "search",
    nav_tags: "tags", nav_about: "about", nav_categories: "categories",
    all_tag: "all", no_results: "No results found.", toc_label: "contents",
    back_link: "← home", min_read: "min read",
    search_placeholder: "search by title, tag or content…",
    search_hint: "Type something to search articles.",
    bio: "Security researcher. CTF player. I write about what I learn.",
    code_copy: "copy", code_copied: "copied"
  }
};
var NAV_KEYS = { home:"nav_home", search:"nav_search", tags:"nav_tags", about:"nav_about" };

// ── Lang state ────────────────────────────────────────────────────────────────
// SITE_LANG is always "es" (Jekyll default). JS only overrides to "en".
var SITE_LANG = window.SITE_LANG || 'es'; // the language posts are written in

function getLang() {
  try { return localStorage.getItem('site_lang') || SITE_LANG; } catch(e) { return SITE_LANG; }
}
function setLang(l) { try { localStorage.setItem('site_lang', l); } catch(e) {} }
function ui(key) { var l=getLang(); return (UI[l]&&UI[l][key])||UI.es[key]||key; }

// ── Translation cache (sessionStorage) ───────────────────────────────────────
function hashStr(s) {
  var h=0; for(var i=0;i<s.length;i++) h=(Math.imul(31,h)+s.charCodeAt(i))|0;
  return Math.abs(h).toString(36);
}
function getCached(lang,text){ try{return sessionStorage.getItem('tr_'+lang+'_'+hashStr(text));}catch(e){return null;} }
function setCached(lang,text,val){ try{sessionStorage.setItem('tr_'+lang+'_'+hashStr(text),val);}catch(e){} }

// ── Translate via Claude API ──────────────────────────────────────────────────
async function translateText(text, targetLang) {
  if (!text || !text.trim()) return text;
  var cached = getCached(targetLang, text);
  if (cached !== null) return cached;

  var langName = targetLang === 'en' ? 'English' : 'Spanish';
  var res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{
        role: 'user',
        content:
          'Translate the following text to ' + langName + '. ' +
          'Return ONLY the translated text, nothing else. ' +
          'Preserve whitespace and line breaks exactly.\n\n' + text
      }]
    })
  });
  if (!res.ok) throw new Error('API ' + res.status);
  var data = await res.json();
  var result = data.content && data.content[0] && data.content[0].text || text;
  setCached(targetLang, text, result);
  return result;
}

// ── Collect all text nodes to translate, skipping code ───────────────────────
var SKIP_TAGS = {CODE:1,PRE:1,SCRIPT:1,STYLE:1,KBD:1,VAR:1,SAMP:1};

function collectTextNodes(root) {
  var results = [];
  function walk(node) {
    if (node.nodeType === 3) {
      if (node.nodeValue.trim().length > 1) results.push(node);
      return;
    }
    if (node.nodeType !== 1) return;
    if (SKIP_TAGS[node.tagName]) return;
    if (node.classList && (
      node.classList.contains('code-header') ||
      node.classList.contains('code-lang') ||
      node.classList.contains('code-copy') ||
      node.classList.contains('post-tag') ||
      node.classList.contains('post-meta') ||
      node.classList.contains('sb-cat-n')
    )) return;
    for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
  }
  walk(root);
  return results;
}

// ── Save / restore original DOM text ─────────────────────────────────────────
// We store the originals on the TextNode objects themselves so we can restore.
function saveOriginals(nodes) {
  nodes.forEach(function(n) {
    if (n._orig === undefined) n._orig = n.nodeValue;
  });
}
function restoreOriginals(nodes) {
  nodes.forEach(function(n) {
    if (n._orig !== undefined) n.nodeValue = n._orig;
  });
}

// ── Translating indicator ─────────────────────────────────────────────────────
function setTranslatingState(on) {
  var sw = document.querySelector('.lang-switcher');
  if (sw) sw.classList.toggle('translating', on);
}

// ── Translate the whole page content ─────────────────────────────────────────
var _allTextNodes = null; // cached after first collection

function getAllTextNodes() {
  if (_allTextNodes) return _allTextNodes;
  var nodes = [];
  // Post prose
  var prose = document.getElementById('prose-content');
  if (prose) nodes = nodes.concat(collectTextNodes(prose));
  // Post h1
  var h1 = document.querySelector('.article-body h1');
  if (h1) nodes = nodes.concat(collectTextNodes(h1));
  // Index: titles + excerpts
  document.querySelectorAll('.post-list .post-title, .post-excerpt').forEach(function(el) {
    nodes = nodes.concat(collectTextNodes(el));
  });
  // Static prose (about page)
  var sp = document.querySelector('.prose:not(#prose-content)');
  if (sp) nodes = nodes.concat(collectTextNodes(sp));
  _allTextNodes = nodes;
  return nodes;
}

async function translatePage(targetLang) {
  var nodes = getAllTextNodes();
  if (!nodes.length) return;

  // If going back to base language, just restore originals
  if (targetLang === SITE_LANG) {
    restoreOriginals(nodes);
    buildToc();
    return;
  }

  saveOriginals(nodes);
  setTranslatingState(true);

  try {
    var SEP = '\n<|||>\n';
    // Batch all text nodes into one API call
    var texts  = nodes.map(function(n) { return n._orig; });
    var joined = texts.join(SEP);
    var translated = await translateText(joined, targetLang);
    var parts  = translated.split(SEP);
    nodes.forEach(function(n, i) {
      n.nodeValue = (parts[i] !== undefined && parts[i].trim()) ? parts[i] : n._orig;
    });
    buildToc();
  } catch(err) {
    console.error('Translation failed:', err);
  }

  setTranslatingState(false);
}

// ── Apply UI-only translations (instant) ─────────────────────────────────────
function applyUI() {
  var lang = getLang();
  document.documentElement.lang = lang;
  ['en','es'].forEach(function(l) {
    var b = document.getElementById('lang-btn-'+l);
    if (!b) return;
    b.classList.toggle('lang-active',   l===lang);
    b.classList.toggle('lang-inactive', l!==lang);
  });
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var v = ui(el.getAttribute('data-i18n')); if(v) el.textContent = v;
  });
  document.querySelectorAll('[data-nav]').forEach(function(el) {
    var k = NAV_KEYS[el.getAttribute('data-nav')]; if(k) el.textContent = ui(k);
  });
  var bio = document.querySelector('.sb-bio'); if(bio) bio.textContent = ui('bio');
  var back = document.querySelector('.back-link'); if(back) back.textContent = ui('back_link');
  var tocL = document.querySelector('.toc-label'); if(tocL) tocL.textContent = ui('toc_label');
  var inp = document.getElementById('search-input'); if(inp) inp.placeholder = ui('search_placeholder');
  var hint = document.getElementById('search-hint'); if(hint) hint.textContent = ui('search_hint');
  document.querySelectorAll('.no-results').forEach(function(el){ el.textContent = ui('no_results'); });
  document.querySelectorAll('.code-copy').forEach(function(b){
    if(b.textContent !== ui('code_copied')) b.textContent = ui('code_copy');
  });
}

// ── Switch language ───────────────────────────────────────────────────────────
async function switchLang(lang) {
  setLang(lang);
  applyUI();
  await translatePage(lang);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function toggleSidebar() {
  var off = document.body.classList.toggle('sb-off');
  try { localStorage.setItem('sb', off ? '0' : '1'); } catch(e) {}
}
(function(){ try{ if(localStorage.getItem('sb')==='0') document.body.classList.add('sb-off'); }catch(e){} })();

// ── Category filter ───────────────────────────────────────────────────────────
function filterCat(el, cat) {
  document.querySelectorAll('.sb-cat').forEach(function(b){ b.classList.remove('active'); });
  el.classList.add('active');
  var visible = 0;
  document.querySelectorAll('.post-item').forEach(function(item) {
    var tags = (item.dataset.tags||'').toLowerCase().split(' ');
    var show = cat==='all' || tags.indexOf(cat)!==-1;
    item.style.display = show ? '' : 'none';
    if(show) visible++;
  });
  var nr = document.getElementById('no-results');
  if(nr) nr.style.display = visible===0 ? '' : 'none';
}

// ── Search ────────────────────────────────────────────────────────────────────
function initSearch() {
  var input = document.getElementById('search-input');
  if (!input) return;
  input.focus();
  input.addEventListener('input', function() {
    var q = this.value.trim().toLowerCase();
    var results = document.getElementById('search-results');
    var noRes   = document.getElementById('search-no-results');
    var hint    = document.getElementById('search-hint');
    if (!q) {
      results.innerHTML = '';
      if(noRes) noRes.style.display = 'none';
      if(hint)  hint.style.display  = '';
      return;
    }
    if(hint) hint.style.display = 'none';
    var posts = window.POSTS || [];
    var matches = posts.filter(function(p){
      return (p.title||'').toLowerCase().includes(q)||
             (p.tags||'').toLowerCase().includes(q)||
             (p.excerpt||'').toLowerCase().includes(q);
    });
    if(noRes) noRes.style.display = matches.length ? 'none' : '';
    results.innerHTML = matches.map(function(p){
      var tagHtml = (p.tags||'').split(' ').filter(Boolean).map(function(t){
        return '<span class="post-tag">'+t+'</span>';
      }).join('');
      return '<article class="post-item">'+
        '<div class="post-meta">'+(p.date||'')+(p.time?' · '+p.time+' '+ui('min_read'):'' )+'</div>'+
        '<a href="'+(p.url||'#')+'" class="post-title">'+(p.title||'')+'</a>'+
        '<p class="post-excerpt">'+(p.excerpt||'')+'</p>'+
        '<div class="post-tags">'+tagHtml+'</div>'+
        '</article>';
    }).join('');
  });
}

// ── TOC ───────────────────────────────────────────────────────────────────────
function buildToc() {
  var toc   = document.getElementById('article-toc');
  var prose = document.getElementById('prose-content');
  if(!toc||!prose) return;
  var headings = prose.querySelectorAll('h2[id],h3[id]');
  if(!headings.length) return;
  toc.style.display='';
  var label = toc.querySelector('.toc-label');
  toc.innerHTML=''; toc.appendChild(label);
  headings.forEach(function(h){
    var a=document.createElement('a');
    a.href='#'+h.id;
    a.className='toc-link'+(h.tagName==='H3'?' toc-h3':'');
    a.textContent=h.textContent;
    a.addEventListener('click',function(e){ e.preventDefault(); h.scrollIntoView({behavior:'smooth',block:'start'}); });
    toc.appendChild(a);
  });
  function updateActive(){
    var mid=window.scrollY+window.innerHeight*0.3, active=headings[0];
    headings.forEach(function(h){ if(h.offsetTop<=mid) active=h; });
    toc.querySelectorAll('.toc-link').forEach(function(l){
      l.classList.toggle('active',l.getAttribute('href')==='#'+active.id);
    });
  }
  window.addEventListener('scroll',updateActive,{passive:true});
  updateActive();
}

// ── Code headers ──────────────────────────────────────────────────────────────
function injectCodeHeaders() {
  document.querySelectorAll('.highlight').forEach(function(block){
    if(block.closest('.code-wrap')) return;
    var parent=block.parentElement, langName='';
    if(parent) parent.classList.forEach(function(cls){
      var m=cls.match(/^language-(.+)$/); if(m&&m[1]!=='plaintext') langName=m[1];
    });
    var wrap=document.createElement('div'); wrap.className='code-wrap';
    var header=document.createElement('div'); header.className='code-header';
    var langEl=document.createElement('span'); langEl.className='code-lang'; langEl.textContent=langName;
    var copyBtn=document.createElement('button'); copyBtn.className='code-copy'; copyBtn.textContent=ui('code_copy');
    copyBtn.addEventListener('click',function(){
      var code=block.querySelector('code')||block.querySelector('pre');
      navigator.clipboard.writeText(code.innerText||code.textContent).then(function(){
        copyBtn.textContent=ui('code_copied');
        setTimeout(function(){ copyBtn.textContent=ui('code_copy'); },1500);
      }).catch(function(){ copyBtn.textContent='error'; setTimeout(function(){ copyBtn.textContent=ui('code_copy'); },1500); });
    });
    header.appendChild(langEl); header.appendChild(copyBtn);
    block.parentNode.insertBefore(wrap,block);
    wrap.appendChild(header); wrap.appendChild(block);
  });
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if(typeof hljs!=='undefined'){
    document.querySelectorAll('pre code').forEach(function(el){
      if(el.closest('.language-mermaid')||el.classList.contains('language-mermaid')) return;
      hljs.highlightElement(el);
    });
  }
  injectCodeHeaders();
  initSearch();
  buildToc();

  // Bind lang buttons
  document.querySelectorAll('.lang-btn').forEach(function(btn){
    btn.addEventListener('click', function(){ switchLang(this.getAttribute('data-lang')); });
  });

  // Apply UI immediately
  applyUI();

  // If user previously switched to EN, re-apply content translation
  var stored = getLang();
  if (stored !== SITE_LANG) {
    translatePage(stored);
  }
});
