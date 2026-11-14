/* Fr0gB1t — main.js */

// ── i18n ──────────────────────────────────────────────────────────────────────
var I18N = {
  en: {
    nav_navigation:  "navigation",
    nav_home:        "home",
    nav_search:      "search",
    nav_tags:        "tags",
    nav_about:       "about",
    nav_categories:  "categories",
    all_tag:         "all",
    no_results:      "No results found.",
    toc_label:       "contents",
    back_link:       "← home",
    min_read:        "min read",
    search_hint:     "Type something to search articles.",
    search_placeholder: "search by title, tag or content…",
    bio:             "Security researcher. CTF player. I write about what I learn.",
    code_copy:       "copy",
    code_copied:     "copied",
    code_error:      "error"
  },
  es: {
    nav_navigation:  "navigation",
    nav_home:        "inicio",
    nav_search:      "búsqueda",
    nav_tags:        "tags",
    nav_about:       "acerca",
    nav_categories:  "categorías",
    all_tag:         "todo",
    no_results:      "No hay resultados.",
    toc_label:       "contenido",
    back_link:       "← inicio",
    min_read:        "min lectura",
    search_hint:     "Escribe algo para buscar entre los artículos.",
    search_placeholder: "buscar por título, tag o contenido…",
    bio:             "Security researcher. CTF player. Escribo lo que aprendo.",
    code_copy:       "copiar",
    code_copied:     "copiado",
    code_error:      "error"
  }
};

// Nav links keyed by data-nav attribute
var NAV_KEYS = {
  home:   "nav_home",
  search: "nav_search",
  tags:   "nav_tags",
  about:  "nav_about"
};

// ── Lang state ────────────────────────────────────────────────────────────────
var DEFAULT_LANG = (window.SITE_LANG || 'en');

function getLang() {
  try {
    return localStorage.getItem('site_lang') || DEFAULT_LANG;
  } catch(e) {
    return DEFAULT_LANG;
  }
}

function setLang(lang) {
  try { localStorage.setItem('site_lang', lang); } catch(e) {}
}

function t(key) {
  var lang = getLang();
  return (I18N[lang] && I18N[lang][key] !== undefined)
    ? I18N[lang][key]
    : (I18N['en'][key] || key);
}

// ── Apply all translations to DOM ─────────────────────────────────────────────
function applyTranslations() {
  var lang = getLang();
  document.documentElement.lang = lang;

  // Update lang switcher buttons active state
  ['en','es'].forEach(function(l) {
    var btn = document.getElementById('lang-btn-' + l);
    if (!btn) return;
    if (l === lang) {
      btn.classList.add('lang-active');
      btn.classList.remove('lang-inactive');
    } else {
      btn.classList.add('lang-inactive');
      btn.classList.remove('lang-active');
    }
  });

  // data-i18n elements (labels etc.)
  document.querySelectorAll('[data-i18n]').forEach(function(el) {
    var key = el.getAttribute('data-i18n');
    var val = t(key);
    if (val) el.textContent = val;
  });

  // Nav links via data-nav
  document.querySelectorAll('[data-nav]').forEach(function(el) {
    var key = NAV_KEYS[el.getAttribute('data-nav')];
    if (key) el.textContent = t(key);
  });

  // Bio
  var bio = document.querySelector('.sb-bio[data-i18n="bio"]');
  if (bio) bio.textContent = t('bio');

  // Back link on post pages
  var back = document.querySelector('.back-link');
  if (back) back.textContent = t('back_link');

  // TOC label
  var tocLabel = document.querySelector('.toc-label');
  if (tocLabel) tocLabel.textContent = t('toc_label');

  // Search placeholder + hint
  var searchInput = document.getElementById('search-input');
  if (searchInput) searchInput.placeholder = t('search_placeholder');
  var searchHint = document.getElementById('search-hint');
  if (searchHint) searchHint.textContent = t('search_hint');

  // No-results text
  document.querySelectorAll('.no-results').forEach(function(el) {
    el.textContent = t('no_results');
  });

  // Code copy buttons (only the ones not mid-copy)
  document.querySelectorAll('.code-copy').forEach(function(btn) {
    if (btn.textContent !== t('code_copied')) {
      btn.textContent = t('code_copy');
    }
  });
}

// ── Lang switcher ─────────────────────────────────────────────────────────────
function switchLang(lang) {
  setLang(lang);
  applyTranslations();
}

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
      var tagHtml = (p.tags || '').split(' ').filter(Boolean).map(function(tag) {
        return '<span class="post-tag">' + tag + '</span>';
      }).join('');
      return '<article class="post-item">' +
        '<div class="post-meta">' + (p.date || '') + (p.time ? ' · ' + p.time + ' ' + t('min_read') : '') + '</div>' +
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
  // Syntax highlight
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach(function(el) {
      if (el.closest('.language-mermaid') || el.classList.contains('language-mermaid')) return;
      hljs.highlightElement(el);
    });
  }

  injectCodeHeaders();
  initSearch();
  buildToc();

  // Bind lang switcher buttons
  document.querySelectorAll('.lang-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      switchLang(this.getAttribute('data-lang'));
    });
  });

  // Apply translations on load (respects localStorage preference)
  applyTranslations();
});
