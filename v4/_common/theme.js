/* v4 theme.js — one global theme toggle, migrates old v3 keys.
   Stored under localStorage key `theme`. Applied to <html data-theme>. */

(function () {
  var OLD_KEYS = ['alexey_theme', 'football_theme', 'rw_theme', 'fractal_theme'];
  var saved = localStorage.getItem('theme');
  if (!saved) {
    for (var i = 0; i < OLD_KEYS.length; i++) {
      var v = localStorage.getItem(OLD_KEYS[i]);
      if (v === 'light' || v === 'dark') { saved = v; break; }
    }
  }
  if (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    saved = 'dark';
  }
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

function toggleTheme() {
  var h = document.documentElement;
  var next = h.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  h.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
}

function mountThemeToggle() {
  if (document.querySelector('.theme-toggle')) return;
  var btn = document.createElement('button');
  btn.className = 'theme-toggle';
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Toggle theme');
  btn.onclick = toggleTheme;
  btn.innerHTML =
    '<svg class="icon-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>' +
    '<svg class="icon-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>';
  document.body.appendChild(btn);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountThemeToggle);
} else {
  mountThemeToggle();
}
