/* cookbook.js — Football research-analysis cookbook UI scaffolding.

   Each entry is registered in cookbook-entries.js (FOOTBALL_COOKBOOK array).
   This file owns:
   - Store helpers (per-entry persistence under 'cookbook.<id>')
   - renderCookbook() — mounts every entry into #cookbookRoot
   - refreshCookbookCard() — rebuilds a single card after run/clear
   - the run/clear/render dispatch wiring

   Each entry shape:
     { id, title, why, recipe, controls?, notes?, run(params), render(result, mount) }
   • controls — optional array of {type:'leagueSelect'|'select'|'number', id, label, options?, default?}
   • run(params) — pure compute. Returns whatever render() expects. Heavy work goes here.
   • render(result, mountEl) — draws into the per-card body div. May call Chart.js or 2D canvas.

   No row-accumulation pattern (unlike KMC) — each entry is one stored result
   that can be re-run on demand. Result shape is entry-specific. */

var COOKBOOK_STORE_KEY = 'football';

function _ckKey(id) { return 'cookbook.' + id; }

function getCookbookResult(id) {
  if (typeof Store === 'undefined') return null;
  return Store.get(COOKBOOK_STORE_KEY, _ckKey(id), null);
}
function setCookbookResult(id, payload) {
  if (typeof Store === 'undefined') return;
  Store.set(COOKBOOK_STORE_KEY, _ckKey(id), payload);
}

/* Render every registered entry into #cookbookRoot. Idempotent — safe
   to call on init and after any state change. */
function renderCookbook() {
  var root = document.getElementById('cookbookRoot');
  if (!root) return;
  if (typeof FOOTBALL_COOKBOOK === 'undefined') {
    root.innerHTML = '<div class="cookbook-empty">No entries registered.</div>';
    return;
  }
  root.innerHTML = '';
  for (var i = 0; i < FOOTBALL_COOKBOOK.length; i++) {
    root.appendChild(renderCookbookCard(FOOTBALL_COOKBOOK[i]));
  }
  refreshCookbookSummary();
}

function refreshCookbookSummary() {
  var stats = document.getElementById('cookbookSummaryStats');
  if (!stats || typeof FOOTBALL_COOKBOOK === 'undefined') return;
  var done = 0;
  for (var i = 0; i < FOOTBALL_COOKBOOK.length; i++) {
    if (getCookbookResult(FOOTBALL_COOKBOOK[i].id)) done++;
  }
  if (done === 0) stats.textContent = FOOTBALL_COOKBOOK.length + ' entries · click to expand';
  else stats.textContent = done + '/' + FOOTBALL_COOKBOOK.length + ' entries computed · click to expand';
}

function renderCookbookCard(entry) {
  var card = document.createElement('div');
  card.className = 'cookbook-card';
  card.setAttribute('data-cookbook-id', entry.id);

  // Header: title + Run + Clear
  var hdr = document.createElement('div');
  hdr.className = 'card-hdr';
  hdr.innerHTML =
    '<span class="card-label">' + entry.title + '</span>' +
    '<button class="sm" data-action="run">Run analysis →</button>' +
    '<button class="sm danger" data-action="clear">Clear</button>';
  card.appendChild(hdr);

  // Why this matters
  if (entry.why) {
    var why = document.createElement('div');
    why.className = 'cookbook-why';
    why.textContent = entry.why;
    card.appendChild(why);
  }

  // Recipe (one-liner)
  if (entry.recipe) {
    var recipe = document.createElement('div');
    recipe.className = 'cookbook-recipe';
    recipe.innerHTML = '<b>Recipe:</b> ' + entry.recipe;
    card.appendChild(recipe);
  }

  // Controls (optional)
  if (entry.controls && entry.controls.length) {
    var ctrls = document.createElement('div');
    ctrls.className = 'cookbook-controls';
    for (var ci = 0; ci < entry.controls.length; ci++) {
      ctrls.appendChild(_buildControl(entry.controls[ci]));
    }
    card.appendChild(ctrls);
  }

  // Body where render() draws
  var body = document.createElement('div');
  body.className = 'cookbook-body-mount';
  body.id = 'cookbook-mount-' + entry.id;
  card.appendChild(body);

  // Notes/caveats
  if (entry.notes) {
    var notes = document.createElement('div');
    notes.className = 'cookbook-notes';
    notes.textContent = entry.notes;
    card.appendChild(notes);
  }

  // Wire actions
  hdr.querySelectorAll('button[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      handleCookbookAction(entry, btn.getAttribute('data-action'));
    });
  });

  // Restore previous result if any
  var prev = getCookbookResult(entry.id);
  if (prev && prev.result) {
    setTimeout(function() { entry.render(prev.result, body); }, 0);
  } else {
    body.innerHTML = '<div class="cookbook-empty">Click <b>Run analysis</b> to compute.</div>';
  }

  return card;
}

function _buildControl(c) {
  var wrap = document.createElement('div');
  wrap.className = 'cookbook-control';
  var label = document.createElement('label');
  label.textContent = c.label || c.id;
  wrap.appendChild(label);

  var input;
  if (c.type === 'leagueSelect') {
    input = document.createElement('select');
    var opts = (typeof LEAGUE_DATA !== 'undefined') ? Object.keys(LEAGUE_DATA) : (c.options || []);
    for (var i = 0; i < opts.length; i++) {
      var o = document.createElement('option');
      o.value = opts[i]; o.textContent = opts[i];
      if (c['default'] === opts[i]) o.selected = true;
      input.appendChild(o);
    }
  } else if (c.type === 'select') {
    input = document.createElement('select');
    for (var j = 0; j < (c.options || []).length; j++) {
      var oo = document.createElement('option');
      oo.value = c.options[j]; oo.textContent = c.options[j];
      if (c['default'] === c.options[j]) oo.selected = true;
      input.appendChild(oo);
    }
  } else {
    input = document.createElement('input');
    input.type = c.type || 'text';
    input.value = (c['default'] != null ? c['default'] : '');
  }
  input.id = 'ck-ctrl-' + c.id;
  input.setAttribute('data-control-id', c.id);
  wrap.appendChild(input);
  return wrap;
}

function _readControls(entry, card) {
  var params = {};
  if (!entry.controls) return params;
  for (var i = 0; i < entry.controls.length; i++) {
    var c = entry.controls[i];
    var el = card.querySelector('[data-control-id="' + c.id + '"]');
    if (!el) continue;
    var v = el.value;
    if (c.type === 'number') v = parseFloat(v);
    params[c.id] = v;
  }
  return params;
}

function handleCookbookAction(entry, action) {
  var card = document.querySelector('.cookbook-card[data-cookbook-id="' + entry.id + '"]');
  var mount = document.getElementById('cookbook-mount-' + entry.id);
  if (!card || !mount) return;

  if (action === 'run') {
    var params = _readControls(entry, card);
    mount.innerHTML = '<div class="cookbook-empty">Computing…</div>';
    // Defer so the spinner paints before heavy work.
    setTimeout(function() {
      try {
        var result = entry.run(params);
        setCookbookResult(entry.id, { params: params, result: result, computedAt: new Date().toISOString() });
        entry.render(result, mount);
        refreshCookbookSummary();
      } catch (e) {
        mount.innerHTML = '<div class="cookbook-error">Error: ' + (e && e.message ? e.message : e) + '</div>';
        if (typeof console !== 'undefined') console.error(e);
      }
    }, 30);
    return;
  }

  if (action === 'clear') {
    setCookbookResult(entry.id, null);
    mount.innerHTML = '<div class="cookbook-empty">Click <b>Run analysis</b> to compute.</div>';
    refreshCookbookSummary();
    return;
  }
}

/* Expose so app.js can call after DOMContentLoaded. */
if (typeof window !== 'undefined') {
  window.renderCookbook = renderCookbook;
  window.refreshCookbookSummary = refreshCookbookSummary;
  window.getCookbookResult = getCookbookResult;
}
