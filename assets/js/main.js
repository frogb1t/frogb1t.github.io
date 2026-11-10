/* seclog — main.js */

// ── Sidebar ───────────────────────────────────────
function toggleSidebar() {
  var off = document.body.classList.toggle('sb-off');
  try { localStorage.setItem('sb', off ? '0' : '1'); } catch(e) {}
}
(function() {
  try { if (localStorage.getItem('sb') === '0') document.body.classList.add('sb-off'); } catch(e) {}
})();

// ── Category filter ───────────────────────────────
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

// ── Search ────────────────────────────────────────
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
        '<div class="post-meta">' + (p.date || '') + (p.time ? ' · ' + p.time + ' min' : '') + '</div>' +
        '<a href="' + (p.url || '#') + '" class="post-title">' + (p.title || '') + '</a>' +
        '<p class="post-excerpt">' + (p.excerpt || '') + '</p>' +
        '<div class="post-tags">' + tagHtml + '</div>' +
        '</article>';
    }).join('');
  });
}

// ── TOC — build from h2s, track scroll ───────────
function buildToc() {
  var toc      = document.getElementById('article-toc');
  var prose    = document.getElementById('prose-content');
  if (!toc || !prose) return;

  var headings = prose.querySelectorAll('h2[id], h3[id]');
  if (!headings.length) return;

  toc.style.display = '';
  // Keep label, remove old links
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

  // Scroll spy
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

// ── Highlight.js + code headers + copy ───────────
document.addEventListener('DOMContentLoaded', function() {
  // Syntax highlight
  if (typeof hljs !== 'undefined') {
    document.querySelectorAll('pre code').forEach(function(el) {
      hljs.highlightElement(el);
    });
  }
  // Code block headers
  injectCodeHeaders();
  // Search page
  initSearch();
  // TOC on post pages
  buildToc();
});

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
    var copyBtn = document.createElement('button'); copyBtn.className = 'code-copy'; copyBtn.textContent = 'copiar';
    copyBtn.addEventListener('click', function() {
      var code = block.querySelector('code') || block.querySelector('pre');
      navigator.clipboard.writeText(code.innerText || code.textContent).then(function() {
        copyBtn.textContent = 'copiado';
        setTimeout(function() { copyBtn.textContent = 'copiar'; }, 1500);
      }).catch(function() {
        copyBtn.textContent = 'error';
        setTimeout(function() { copyBtn.textContent = 'copiar'; }, 1500);
      });
    });
    header.appendChild(langEl);
    header.appendChild(copyBtn);
    block.parentNode.insertBefore(wrap, block);
    wrap.appendChild(header);
    wrap.appendChild(block);
  });
}

function copyCode(btn) {
  var block = btn.closest('.codeblock');
  var code  = block.querySelector('code') || block.querySelector('pre');
  navigator.clipboard.writeText(code.innerText || code.textContent).then(function() {
    btn.textContent = 'copiado';
    setTimeout(function() { btn.textContent = 'copiar'; }, 1500);
  });
}
