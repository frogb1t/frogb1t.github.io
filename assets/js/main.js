/* Fr0gB1t — main.js */

// ── i18n strings (keep in sync with _data/i18n.yml) ──────────────────────────
var I18N = {
  es: {
    nav_home:        "inicio",
    nav_search:      "búsqueda",
    nav_tags:        "tags",
    nav_about:       "acerca",
    nav_categories:  "categorías",
    no_results:      "No hay resultados.",
    toc_label:       "contenido",
    back_link:       "← inicio",
    min_read:        "min lectura",
    all_tag:         "todo",
    lang_toggle:     "en",
    search_hint:     "Escribe algo para buscar entre los artículos.",
    code_copy:       "copiar",
    code_copied:     "copiado",
    code_error:      "error"
  },
  en: {
    nav_home:        "home",
    nav_search:      "search",
    nav_tags:        "tags",
    nav_about:       "about",
    nav_categories:  "categories",
    no_results:      "No results found.",
    toc_label:       "contents",
    back_link:       "← home",
    min_read:        "min read",
    all_tag:         "all",
    lang_toggle:     "es",
    search_hint:     "Type something to search articles.",
    code_copy:       "copy",
    code_copied:     "copied",
    code_error:      "error"
  }
};

// ── Lang helpers ──────────────────────────────────────────────────────────────
function getCurrentLang() {
  try { return localStorage.getItem('lang') || window.SITE_LANG || 'es'; } catch(e) { return window.SITE_LANG || 'es'; }
}

function t(key) {
  var lang = getCurrentLang();
  return (I18N[lang] && I18N[lang][key]) || (I18N['es'][key]) || key;
}

// Apply all data-i18n attributes in the DOM
function applyTranslations() {
  var lang = getCurrentLang();
  // Update <html lang>
  document.documentElement.lang = lang;

  // Elements with data-i18n
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (val) el.textContent = val;
  });

  // Lang toggle button text
  var btn = document.getElementById('lang-toggle');
  if (btn) btn.textContent = t('lang_toggle');

  // Bilingual navigation links
  var navMap = {
    '/':        'nav_home',
    '/search/': 'nav_search',
    '/tags/':   'nav_tags',
    '/about/':  'nav_about'
  };
  document.querySelectorAll('.sb-link').forEach(function(a) {
    var base = window.SITE_BASEURL || '';
    var href = a.getAttribute('href').replace(base, '') || '/';
    var key  = navMap[href];
    if (key) a.textContent = t(key);
  });

  // Search placeholder
  var inp = document.getElementById('search-input');
  if (inp) inp.placeholder = t('search_placeholder') || (lang === 'es' ? 'buscar…' : 'search…');

  // Search hint
  var hint = document.getElementById('search-hint');
  if (hint) hint.textContent = t('search_hint');

  // No-results paragraphs
  document.querySelectorAll('.no-results').forEach(function(el) {
    el.textContent = t('no_results');
  });

  // TOC label
  var tocLabel = document.querySelector('.toc-label');
  if (tocLabel) tocLabel.textContent = t('toc_label');

  // Back link
  var back = document.querySelector('.back-link');
  if (back) back.textContent = t('back_link');

  // "categories" sidebar label — the one right before .sb-cat buttons
  document.querySelectorAll('.sb-label').forEach(function(el) {
    if (el.nextElementSibling && el.nextElementSibling.classList.contains('sb-cat')) {
      el.textContent = t('nav_categories');
    }
  });

  // Code copy buttons
  document.querySelectorAll('.code-copy').forEach(function(btn) {
    if (btn.textContent !== t('code_copied')) btn.textContent = t('code_copy');
  });

  // Post title alt (for bilingual titles in front matter)
  var alt = document.querySelector('.post-title-alt');
  if (alt && lang === 'en' && alt.dataset.en) alt.textContent = alt.dataset.en;
  if (alt && lang === 'es' && alt.dataset.es) alt.textContent = alt.dataset.es;
}

// ── Toggle lang & reload ──────────────────────────────────────────────────────
function toggleLang() {
  var current = getCurrentLang();
  var next    = current === 'es' ? 'en' : 'es';
  try { localStorage.setItem('lang', next); } catch(e) {}
  applyTranslations();
}

// On load: if localStorage has a lang preference different from site default,
// apply translations (the HTML was rendered with the Jekyll default, JS overrides)
(function() {
  var stored = null;
  try { stored = localStorage.getItem('lang'); } catch(e) {}
  if (stored && stored !== window.SITE_LANG) {
    // Translations will be applied on DOMContentLoaded
  }
})();

// ── Sidebar ───────────────────────────────────────────────────────────────────
function toggleSidebar() {
  var off = document.body.classList.toggle('sb-off');
  try { localStorage.setItem('sb', off ? '0' : '1'); } catch(e) {}
}
(function() {
  try { if (localStorage.getItem('sb') === '0') document.body.classList.add('sb-off'); } catch(e) {}
})();

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
      var minRead = t('min_read');
      return '<article class="post-item">' +
        '<div class="post-meta">' + (p.date || '') + (p.time ? ' · ' + p.time + ' ' + minRead : '') + '</div>' +
        '<a href="' + (p.url || '#') + '" class="post-title">' + (p.title || '') + '</a>' +
        '<p class="post-excerpt">' + (p.excerpt || '') + '</p>' +
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
    var lang = '';
    if (parent) {
      parent.classList.forEach(function(cls) {
        var m = cls.match(/^language-(.+)$/);
        if (m && m[1] !== 'plaintext') lang = m[1];
      });
    }
    var wrap    = document.createElement('div');   wrap.className = 'code-wrap';
    var header  = document.createElement('div');   header.className = 'code-header';
    var langEl  = document.createElement('span');  langEl.className = 'code-lang'; langEl.textContent = lang;
    var copyBtn = document.createElement('button'); copyBtn.className = 'code-copy'; copyBtn.textContent = t('code_copy');
    copyBtn.addEventListener('click', function() {
      var code = block.querySelector('code') || block.querySelector('pre');
      navigator.clipboard.writeText(code.innerText || code.textContent).then(function() {
        copyBtn.textContent = t('code_copied');
        setTimeout(function() { copyBtn.textContent = t('code_copy'); }, 1500);
      }).catch(function() {
        copyBtn.textContent = t('code_error');
        setTimeout(function() { copyBtn.textContent = t('code_copy'); }, 1500);
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

  // Bind lang toggle button (avoids inline onclick firing before script loads)
  var langBtn = document.getElementById('lang-toggle');
  if (langBtn) langBtn.addEventListener('click', toggleLang);

  // Apply JS-side lang override if user has a stored preference
  applyTranslations();
});
