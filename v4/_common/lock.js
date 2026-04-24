/* v4 lock.js — hypothesis lock widget. Binds a textarea + button + timestamp span.
   On lock: disables textarea, writes exp.<id>.hypothesis + exp.<id>.locked_at,
   calls onLocked() so the studio can enable its simulation. Restores on reload. */

var Lock = (function () {
  var state = {}; // expId -> { locked: bool, onLocked: fn }

  function isLocked(expId) { return !!(state[expId] && state[expId].locked); }

  function attach(expId, opts) {
    var ta = document.getElementById(opts.textareaId);
    var btn = document.getElementById(opts.buttonId);
    var ts = opts.timestampId ? document.getElementById(opts.timestampId) : null;
    var minLen = opts.minLen || 20;
    state[expId] = { locked: false, onLocked: opts.onLocked || function () {} };

    function doLock(savedAt) {
      var t = ta.value.trim();
      if (!savedAt && t.length < minLen) {
        ta.style.borderColor = 'var(--danger)';
        return;
      }
      state[expId].locked = true;
      ta.disabled = true;
      ta.style.borderColor = 'var(--accent)';
      ta.style.boxShadow = '0 0 0 2px var(--accent-subtle)';
      if (ts) {
        ts.style.display = 'block';
        var when = savedAt ? new Date(savedAt) : new Date();
        ts.textContent = 'locked · ' + when.toLocaleString();
      }
      btn.textContent = '✓ Hypothesis locked';
      btn.disabled = true;
      if (!savedAt) {
        Store.set(expId, 'hypothesis', t);
        Store.set(expId, 'locked_at', new Date().toISOString());
      }
      state[expId].onLocked();
    }

    btn.addEventListener('click', function () { doLock(null); });

    // Restore previously locked hypothesis
    var saved = Store.get(expId, 'hypothesis');
    var savedAt = Store.get(expId, 'locked_at');
    if (saved) {
      ta.value = saved;
      doLock(savedAt || new Date().toISOString());
    }
  }

  return { attach: attach, isLocked: isLocked };
})();
