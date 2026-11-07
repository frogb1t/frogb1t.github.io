document.querySelectorAll('.copy-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    var pre = btn.closest('.highlight-wrap').querySelector('pre');
    var text = pre.innerText || pre.textContent;
    navigator.clipboard.writeText(text).then(function() {
      btn.textContent = 'copied';
      btn.classList.add('copied');
      setTimeout(function() {
        btn.textContent = 'copy';
        btn.classList.remove('copied');
      }, 1500);
    });
  });
});
