/* Fr0gB1t — main.js */

// ── Static UI strings (nav, labels, buttons) ──────────────────────────────────
var UI = {
  en: {
    nav_navigation:     "navigation",
    nav_home:           "home",
    nav_search:         "search",
    nav_tags:           "tags",
    nav_about:          "about",
    nav_categories:     "categories",
    all_tag:            "all",
    no_results:         "No results found.",
    toc_label:          "contents",
    back_link:          "← home",
    min_read:           "min read",
    search_placeholder: "search by title, tag or content…",
    search_hint:        "Type something to search articles.",
    bio:                "Security researcher. CTF player. I write about what I learn.",
    code_copy:          "copy",
    code_copied:        "copied",
    translating:        "translating…",
    trans_error:        "translation error"
  },
  es: {
    nav_navigation:     "navigation",
    nav_home:           "inicio",
    nav_search:         "búsqueda",
    nav_tags:           "tags",
    nav_about:          "acerca",
    nav_categories:     "categorías",
    all_tag:            "todo",
    no_results:         "No hay resultados.",
    toc_label:          "contenido",
    back_link:          "← inicio",
    min_read:           "min lectura",
    search_placeholder: "buscar por título, tag o contenido…",
    search_hint:        "Escribe algo para buscar entre los artículos.",
    bio:                "Security researcher. CTF player. Escribo lo que aprendo.",
    code_copy:          "copiar",
    code_copied:        "copiado",
    translating:        "traduciendo…",
    trans_error:        "error al traducir"
  }
};

var NAV_KEYS = { home: "nav_home", search: "nav_search", tags: "nav_tags", about: "nav_about" };

// ── Lang state ────────────────────────────────────────────────────────────────
var DEFAULT_LANG = window.SITE_LANG || 'en';

function getLang() {
  try { return localStorage.getItem('site_lang') || DEFAULT_LANG; } catch(e) { return DEFAULT_LANG; }
}
function setLang(l) {
  try { localStorage.setItem('site_lang', l); } catch(e) {}
}
function ui(key) {
  var l = getLang();
  return (UI[l] && UI[l][key]) || UI['en'][key] || key;
}

// ── Translation cache (sessionStorage — clears on tab close) ──────────────────
function cacheKey(lang, text) {
  // Simple hash to keep keys short
  var h = 0;
  for (var i = 0; i < text.length; i++) { h = (Math.imul(31, h) + text.charCodeAt(i)) | 0; }
  return 'tr_' + lang + '_' + Math.abs(h);
}
function getCached(lang, text) {
  try { return sessionStorage.getItem(cacheKey(lang, text)); } catch(e) { return null; }
}
function setCached(lang, text, result) {
  try { sessionStorage.setItem(cacheKey(lang, text), result); } catch(e) {}
}

// ── Translate a string via Claude API ─────────────────────────────────────────
async function translateText(text, targetLang) {
  if (!text || !text.trim()) return text;
  var cached = getCached(targetLang, text);
  if (cached !== null) return cached;

  var langName = targetLang === 'en' ? 'English' : 'Spanish';
  var prompt =
    'Translate the following text to ' + langName + '. ' +
    'Return ONLY the translated text, no explanations, no quotes, no preamble. ' +
    'Preserve all Markdown formatting, HTML tags, code blocks (do not translate code), and line breaks exactly as they are.\n\n' +
    text;

  var resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!resp.ok) throw new Error('API error ' + resp.status);
  var data = await resp.json();
  var result = (data.content && data.content[0] && data.content[0].text) || text;
  setCached(targetLang, text, result);
  return result;
}

// ── Walk a container and collect translatable text nodes ──────────────────────
// Skips: <code>, <pre>, <script>, <style>, and elements with data-no-translate.
// Returns array of { node: TextNode, original: string }
function collectTextNodes(root) {
  var results = [];
  var SKIP = { CODE: 1, PRE: 1, SCRIPT: 1, STYLE: 1, KBD: 1, VAR: 1, SAMP: 1 };

  function walk(node) {
    if (node.nodeType === 3) { // TEXT_NODE
      var txt = node.nodeValue.trim();
      if (txt.length > 1) results.push({ node: node, original: node.nodeValue });
      return;
    }
    if (node.nodeType !== 1) return; // not ELEMENT_NODE
    if (SKIP[node.tagName]) return;
    if (node.hasAttribute && node.hasAttribute('data-no-translate')) return;
    // Skip code-wrap headers (lang label + copy button)
    if (node.classList && (node.classList.contains('code-header') || node.classList.contains('code-lang'))) return;
    for (var i = 0; i < node.childNodes.length; i++) walk(node.childNodes[i]);
  }

  walk(root);
  return results;
}

// ── Translate all translatable content on the page ───────────────────────────
async function translatePage(targetLang) {
  var jobs = []; // { nodes: [TextNode…], text: string }

  // Helper: collect text nodes from a container and queue a translation job
  function queueContainer(container) {
    if (!container) return;
    var textNodes = collectTextNodes(container);
    if (!textNodes.length) return;
    // Group consecutive text nodes under the same parent into one string
    // to minimise API calls while keeping granularity
    var grouped = {};
    textNodes.forEach(function(item) {
      var key = item.node.parentNode ? item.node.parentNode.__i18n_id : null;
      if (!key) {
        key = 'g' + jobs.length + '_' + Math.random().toString(36).slice(2);
        if (item.node.parentNode) item.node.parentNode.__i18n_id = key;
      }
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(item);
    });
    Object.values(grouped).forEach(function(items) {
      jobs.push(items);
    });
  }

  // Post prose content
  queueContainer(document.getElementById('prose-content'));

  // Post h1 title
  var h1 = document.querySelector('.article-body h1');
  if (h1) queueContainer(h1);

  // Index page: post titles + excerpts
  document.querySelectorAll('.post-list .post-title, .post-excerpt').forEach(queueContainer);

  // Static pages (about)
  var staticProse = document.querySelector('.prose:not(#prose-content)');
  if (staticProse) queueContainer(staticProse);

  if (!jobs.length) return;

  setTranslatingState(true);

  try {
    // Translate all jobs in parallel
    await Promise.all(jobs.map(async function(items) {
      // Join all text values with a separator the model can't confuse with real text
      var SEP = '\n||||\n';
      var combined = items.map(function(i) { return i.original; }).join(SEP);
      var translated = await translateText(combined, targetLang);
      var parts = translated.split(SEP);
      items.forEach(function(item, idx) {
        item.node.nodeValue = (parts[idx] !== undefined) ? parts[idx] : item.original;
      });
    }));

    // Rebuild TOC headings (text changed)
    buildToc();

  } catch(err) {
    console.error('Translation error:', err);
    setTranslatingState(false, true);
    return;
  }

  setTranslatingState(false);
}

// ── Translating indicator on the lang buttons ─────────────────────────────────
function setTranslatingState(loading, error) {
  var switcher = document.querySelector('.lang-switcher');
  if (!switcher) return;
  if (loading) {
    switcher.classList.add('translating');
  } else {
    switcher.classList.remove('translating');
    if (error) switcher.classList.add('trans-error');
  }
}

// ── Apply static UI translations (instant, no API) ───────────────────────────
function applyUITranslations() {
  var lang = getLang();
  document.documentElement.lang = lang;

  // Lang buttons active/inactive
  ['en','es'].forEach(function(l) {
    var btn = document.getElementById('lang-btn-' + l);
    if (!btn) return;
    btn.classList.toggle('lang-active',   l === lang);
    btn.classList.toggle('lang-inactive', l !== lang);
  });

  // data-i18n elements
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var val = ui(el.getAttribute('data-i18n'));
    if (val) el.textContent = val;
  });

  // Nav links
  document.querySelectorAll('[data-nav]').forEach(function(el) {
    var key = NAV_KEYS[el.getAttribute('data-nav')];
    if (key) el.textContent = ui(key);
  });

  // Bio
  var bio = document.querySelector('.sb-bio');
  if (bio) bio.textContent = ui('bio');

  // Back link
  var back = document.querySelector('.back-link');
  if (back) back.textContent = ui('back_link');

  // TOC label
  var tocLabel = document.querySelector('.toc-label');
  if (tocLabel) tocLabel.textContent = ui('toc_label');

  // Search
  var inp = document.getElementById('search-input');
  if (inp) inp.placeholder = ui('search_placeholder');
  var hint = document.getElementById('search-hint');
  if (hint) hint.textContent = ui('search_hint');

  // No-results
  document.querySelectorAll('.no-results').forEach(function(el) {
    el.textContent = ui('no_results');
  });

  // Code copy buttons
  document.querySelectorAll('.code-copy').forEach(function(btn) {
    if (btn.textContent !== ui('code_copied')) btn.textContent = ui('code_copy');
  });
}

// ── Switch language ───────────────────────────────────────────────────────────
async function switchLang(lang) {
  if (lang === getLang()) return;
  setLang(lang);
  applyUITranslations();
  await translatePage(lang);
}

// ── Sidebar ───────────────────────────────────────────────────────────────────
function toggleSidebar() {
  var off = document.body.classList.toggle('sb-off');
  try { localStorage.setItem('sb', off ? '0' : '1'); } catch(e) {}
}
(function() {
  try { if (localStorage.getItem('sb') === '0') document.body.classList.add('sb-off'); } catch(e) {} }
)();

// ── Category filter ───────────────────────────────────────────────────────────
function filterCat(el, cat) {
  document.querySelectorAll('.sb-cat').forEach(function(b) { b.classList.remove('active'); });
  el.classList.add('active');
  var visible = 0;
  document.querySelectorAll('.post-item').forEach(function(item) {
    var tags = (item.dataset.tags || '').toLowerCase().split(' ');
    var show = cat === 'all' || tags.indexOf(cat) !== -1;
    item.style.display = show ? '' : 'none';
    if (show) visible++;
  });
  var nr = document.getElementById('no-results');
  if (nr) nr.style.display = visible === 0 ? '' : 'none';
}

// ── Search ────────────────────────────────────────────────────────────────────
function initSearch() {
  var input = document.getElementById('search-input');
  if (!input) return;
  input.focus();
  input.addEventListener('input', function() {
    var q       = this.value.trim().toLowerCase();
    var results = document.getElementById('search-results');
    var noRes   = document.getElementById('search-no-results');
    var hint    = document.getElementById('search-hint');
    if (!q) {
      results.innerHTML = '';
      if (noRes) noRes.style.display = 'none';
      if (hint)  hint.style.display  = '';
      return;
    }
    if (hint) hint.style.display = 'none';
    var posts = window.POSTS || [];
    var matches = posts.filter(function(p) {
      return (p.title   || '').toLowerCase().includes(q) ||
             (p.tags    || '').toLowerCase().includes(q) ||
             (p.excerpt || '').toLowerCase().includes(q);
    });
    if (noRes) noRes.style.display = matches.length ? 'none' : '';
    results.innerHTML = matches.map(function(p) {
      var tagHtml = (p.tags || '').split(' ').filter(Boolean).map(function(t) {
        return '<span class="post-tag">' + t + '</span>';
      }).join('');
      return '<article class="post-item">' +
        '<div class="post-meta">' + (p.date||'') + (p.time ? ' · ' + p.time + ' ' + ui('min_read') : '') + '</div>' +
        '<a href="' + (p.url||'#') + '" class="post-title">' + (p.title||'') + '</a>' +
        '<p class="post-excerpt">' + (p.excerpt||'') + '</p>' +
        '<div class="post-tags">' + tagHtml + '</div>' +
        '</article>';
    }).join('');
  });
}

// ── TOC ───────────────────────────────────────────────────────────────────────
function buildToc() {
  var toc   = document.getElementById('article-toc');
  var prose = document.getElementById('prose-content');
  if (!toc || !prose) return;
  var headings = prose.querySelectorAll('h2[id], h3[id]');
  if (!headings.length) return;
  toc.style.display = '';
  var label = toc.querySelector('.toc-label');
  toc.innerHTML = '';
  toc.appendChild(label);
  headings.forEach(function(h) {
    var a = document.createElement('a');
    a.href = '#' + h.id;
    a.className = 'toc-link' + (h.tagName === 'H3' ? ' toc-h3' : '');
    a.textContent = h.textContent;
    a.addEventListener('click', function(e) {
      e.preventDefault();
      h.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    toc.appendChild(a);
  });
  function updateActive() {
    var mid = window.scrollY + window.innerHeight * 0.3;
    var active = headings[0];
    headings.forEach(function(h) { if (h.offsetTop <= mid) active = h; });
    toc.querySelectorAll('.toc-link').forEach(function(link) {
      link.classList.toggle('active', link.getAttribute('href') === '#' + active.id);
    });
  }
  window.addEventListener('scroll', updateActive, { passive: true });
  updateActive();
}

// ── Code headers ──────────────────────────────────────────────────────────────
function injectCodeHeaders() {
  document.querySelectorAll('.highlight').forEach(function(block) {
    if (block.closest('.code-wrap')) return;
    var parent = block.parentElement;
    var langName = '';
    if (parent) {
      parent.classList.forEach(function(cls) {
        var m = cls.match(/^language-(.+)$/);
        if (m && m[1] !== 'plaintext') langName = m[1];
      });
    }
    var wrap    = document.createElement('div');    wrap.className = 'code-wrap';
    var header  = document.createElement('div');    header.className = 'code-header';
    var langEl  = document.createElement('span');   langEl.className = 'code-lang'; langEl.textContent = langName;
    var copyBtn = document.createElement('button'); copyBtn.className = 'code-copy'; copyBtn.textContent = ui('code_copy');
    copyBtn.addEventListener('click', function() {
      var code = block.querySelector('code') || block.querySelector('pre');
      navigator.clipboard.writeText(code.innerText || code.textContent).then(function() {
        copyBtn.textContent = ui('code_copied');
        setTimeout(function() { copyBtn.textContent = ui('code_copy'); }, 1500);
      }).catch(function() {
        copyBtn.textContent = ui('code_error') || 'error';
        setTimeout(function() { copyBtn.textContent = ui('code_copy'); }, 1500);
      });
    });
    header.appendChild(langEl);
    header.appendChild(copyBtn);
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(header);
    wrap.appendChild(block);
  });
}

// ── DOMContentLoaded ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach(function(el) {
      if (el.closest('.language-mermaid') || el.classList.contains('language-mermaid')) return;
      hljs.highlightElement(el);
    });
  }

  injectCodeHeaders();
  initSearch();
  buildToc();

  // Bind lang buttons
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchLang(this.getAttribute('data-lang'));
    });
  });

  // Apply UI translations (instant)
  applyUITranslations();

  // If stored lang differs from site default, also translate page content
  var stored = getLang();
  if (stored !== DEFAULT_LANG) {
    translatePage(stored);
  }
});
