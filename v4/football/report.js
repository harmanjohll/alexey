/* report.js — composite-PNG report builder for the football studio.

   Mirrors v4/advanced/kmc/report.js but draws football-specific items.
   Drawing helpers and per-item renderers live in report-render.js.

   Workflow: user clicks "Build report →" → modal opens with a
   pre-selected list of items → click Download → 1920×1080 PNG saved. */

var REPORT_ITEMS = [
  // ── Default-checked (top of list, pre-ticked) ──
  { key: 'hypothesis',  label: 'Hypothesis',                       group: 'default', kind: 'text',
    span: 3, natH: 200, render: function(){ return _reportHypothesis(); } },
  { key: 'runStats',    label: 'Run summary (xG, P(0), P(2+))',    group: 'default', kind: 'text',
    span: 3, natH: 200, render: function(){ return _reportRunStats(); } },
  { key: 'pitch',       label: 'Pitch with placed shots',          group: 'default', kind: 'canvas',
    canvasId: 'pitch', span: 3, natH: 280 },
  { key: 'mcHist',      label: 'Monte Carlo goal distribution',    group: 'default', kind: 'canvas',
    canvasId: 'mcChart', span: 3, natH: 280 },
  { key: 'cookCross',   label: 'Cross-league residual ranking',    group: 'default', kind: 'cookbook',
    cookbookId: 'residual-cross-league', span: 3, natH: 320 },
  { key: 'cookStyle',   label: 'Style fingerprint (PCA scatter)',  group: 'default', kind: 'cookbook',
    cookbookId: 'style-fingerprint', span: 3, natH: 320 },
  { key: 'cookTour',    label: 'Pairwise tournament heatmap',      group: 'default', kind: 'cookbook',
    cookbookId: 'tournament-30x30', span: 3, natH: 380 },
  { key: 'cookBYOL',    label: 'Your team vs every team',          group: 'default', kind: 'cookbook',
    cookbookId: 'byol-vs-everyone', span: 3, natH: 380 },

  // ── Optional extras ──
  { key: 'timeline',    label: 'Cumulative xG timeline',           group: 'optional', kind: 'canvas',
    canvasId: 'timelineChart', span: 3, natH: 240 },
  { key: 'sensitivity', label: 'Sensitivity to xG multiplier',     group: 'optional', kind: 'canvas',
    canvasId: 'sensChart', span: 3, natH: 240 },
  { key: 'overPerf',    label: 'Overperformance scatter (xG vs goals)', group: 'optional', kind: 'canvas',
    canvasId: 'overPerfChart', span: 3, natH: 240 },
  { key: 'shotZone',    label: 'Shot zone distribution by league', group: 'optional', kind: 'canvas',
    canvasId: 'shotZoneChart', span: 3, natH: 240 },
  { key: 'leagueMatch', label: 'BYOL match outcome distribution',  group: 'optional', kind: 'canvas',
    canvasId: 'leagueMatchChart', span: 3, natH: 240 },
  { key: 'cookSingle',  label: 'Residuals — single league',        group: 'optional', kind: 'cookbook',
    cookbookId: 'residual-single-league', span: 3, natH: 280 }
];

/* ── Text content builders ──────────────────────────────────── */

function _reportHypothesis() {
  var hypEl = document.getElementById('hypText');
  var ts    = (typeof Store !== 'undefined') ? Store.get('football', 'timestamp', null) : null;
  var text  = hypEl ? (hypEl.value || '').trim() : '';
  if (!text) text = '(no hypothesis recorded)';
  return [
    { k: 'locked',  v: ts ? new Date(ts).toLocaleString() : '—' },
    { k: '',        v: '__BLOCK__' + text }
  ];
}

function _reportRunStats() {
  var get = function(id) { var el = document.getElementById(id); return el ? el.textContent.trim() : '—'; };
  var nShots = (typeof window.shots !== 'undefined' && window.shots) ? window.shots.length : 0;
  return [
    { k: 'shots placed', v: String(nShots) },
    { k: 'expected xG',  v: get('rXG') },
    { k: 'avg goals',    v: get('rAvg') },
    { k: 'max goals',    v: get('rMax') },
    { k: 'P(0 goals)',   v: get('rP0') },
    { k: 'P(2+ goals)',  v: get('rP2') }
  ];
}

/* ── Layout: row-major packer (same shape as KMC) ───────────── */

var REPORT_COLS = 6;

function _packRows(items, totalW, padding, gutter, availH) {
  var rows = [];
  var current = { items: [], spanUsed: 0, maxNatH: 0 };
  for (var i = 0; i < items.length; i++) {
    var it = items[i];
    var span = Math.max(1, Math.min(REPORT_COLS, it.span || 1));
    if (current.spanUsed + span > REPORT_COLS) {
      rows.push(current);
      current = { items: [], spanUsed: 0, maxNatH: 0 };
    }
    current.items.push({ item: it, span: span });
    current.spanUsed += span;
    if (it.natH > current.maxNatH) current.maxNatH = it.natH;
  }
  if (current.items.length) rows.push(current);

  for (var r0 = 0; r0 < rows.length; r0++) {
    var rr = rows[r0];
    if (rr.spanUsed < REPORT_COLS && rr.items.length > 0) {
      var factor = REPORT_COLS / rr.spanUsed;
      for (var ii = 0; ii < rr.items.length; ii++) rr.items[ii].effectiveSpan = rr.items[ii].span * factor;
    } else {
      for (var ii2 = 0; ii2 < rr.items.length; ii2++) rr.items[ii2].effectiveSpan = rr.items[ii2].span;
    }
  }

  var natTotal = 0;
  for (var r = 0; r < rows.length; r++) natTotal += rows[r].maxNatH;
  natTotal += gutter * Math.max(0, rows.length - 1);
  var scale = natTotal > 0 ? availH / natTotal : 1;
  if (scale > 2.5) scale = 2.5;
  if (scale < 0.55) scale = 0.55;

  var laid = [];
  var y = 0;
  var innerW = totalW - padding * 2;
  var spanW = (innerW - gutter * (REPORT_COLS - 1)) / REPORT_COLS;
  for (var r2 = 0; r2 < rows.length; r2++) {
    var row = rows[r2];
    var rowH = Math.floor(row.maxNatH * scale);
    var x = padding;
    for (var k = 0; k < row.items.length; k++) {
      var entry = row.items[k];
      var es = entry.effectiveSpan;
      var w = Math.floor(spanW * es + gutter * (es - 1));
      laid.push({ item: entry.item, x: x, y: y, w: w, h: rowH });
      x += w + gutter;
    }
    y += rowH + gutter;
  }
  return { laid: laid, bodyH: y - gutter, scale: scale, rows: rows.length };
}

/* ── Build the composite ─────────────────────────────────────── */

function buildFootballReport(opts) {
  opts = opts || {};
  var selectedKeys = opts.selectedKeys || [];
  var notes = opts.notes || '';

  var width  = 1920, height = 1080;
  var padding = 18, gutter = 10, headerH = 96;
  var availBody = height - headerH - padding;

  var items = REPORT_ITEMS.filter(function(it){ return selectedKeys.indexOf(it.key) >= 0; });
  if (!items.length) { alert('Select at least one item.'); return; }

  var pack = _packRows(items, width, padding, gutter, availBody);
  if (pack.scale < 0.6) {
    if (!confirm('You\'ve selected a lot of items — they\'ll be shrunk to ' +
      Math.round(pack.scale * 100) + '% of their natural size to fit one slide. Generate anyway?')) return;
  }

  var ssr = 2;
  var canvas = document.createElement('canvas');
  canvas.width = width * ssr; canvas.height = height * ssr;
  var ctx = canvas.getContext('2d');
  ctx.scale(ssr, ssr);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Header band
  _drawReportHeader(ctx, width, headerH, padding, notes, pack);

  // Body items
  for (var i2 = 0; i2 < pack.laid.length; i2++) {
    var entry = pack.laid[i2];
    var item = entry.item;
    var x = entry.x, y = entry.y + headerH, w = entry.w, h = entry.h;
    if (item.kind === 'text') {
      _drawTextCard(ctx, x, y, w, h, item.label, item.render());
    } else if (item.kind === 'canvas') {
      var src = document.getElementById(item.canvasId);
      _drawCanvasCard(ctx, x, y, w, h, item.label, src);
    } else if (item.kind === 'cookbook') {
      _drawCookbookCard(ctx, x, y, w, h, item);
    }
  }

  canvas.toBlob(function(blob) {
    if (!blob) { alert('PNG generation failed.'); return; }
    var url = URL.createObjectURL(blob);
    var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var a = document.createElement('a');
    a.href = url; a.download = 'football_report_' + stamp + '.png';
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 100);
  }, 'image/png');
}

/* ── Modal UI ────────────────────────────────────────────────── */

function openFootballReportModal() {
  var existing = document.getElementById('reportModalBg');
  if (existing) existing.remove();

  var bg = document.createElement('div');
  bg.id = 'reportModalBg'; bg.className = 'report-modal-bg';
  var modal = document.createElement('div');
  modal.className = 'report-modal';
  bg.appendChild(modal);

  modal.innerHTML =
    '<div class="report-modal-hdr">' +
      '<h3>Build research report</h3>' +
      '<p>One PNG per session, all selected charts laid out on a 1920×1080 slide. Defaults are pre-selected — uncheck anything you don\'t want, scroll for optional extras.</p>' +
    '</div>' +
    '<div class="report-notes-row">' +
      '<label class="sl">notes / claim (one or two lines, shown in the report header)</label>' +
      '<textarea id="reportNotes" placeholder="e.g. Top-flight teams converge in PCA space; tournament ranking matches reputation; my BYOL beats X% of teams."></textarea>' +
    '</div>' +
    '<div class="report-list" id="reportList"></div>' +
    '<div class="report-modal-row">' +
      '<button type="button" id="reportCancelBtn">Cancel</button>' +
      '<button type="button" class="primary" id="reportBuildBtn">Download composite PNG →</button>' +
    '</div>';

  var list = modal.querySelector('#reportList');
  var groups = [
    { id: 'default',  title: 'Pre-selected', defaultChecked: true },
    { id: 'optional', title: 'Optional extras', defaultChecked: false }
  ];
  for (var g = 0; g < groups.length; g++) {
    var heading = document.createElement('div');
    heading.className = 'report-group-hdr';
    heading.textContent = groups[g].title;
    list.appendChild(heading);
    for (var i = 0; i < REPORT_ITEMS.length; i++) {
      var it = REPORT_ITEMS[i];
      if (it.group !== groups[g].id) continue;
      var lbl = document.createElement('label');
      lbl.className = 'report-item';
      var cb = document.createElement('input');
      cb.type = 'checkbox'; cb.value = it.key;
      // For cookbook items, default-check only if a result exists
      if (it.kind === 'cookbook' && groups[g].defaultChecked) {
        var hasResult = (typeof getCookbookResult === 'function') && getCookbookResult(it.cookbookId);
        cb.checked = !!hasResult;
      } else {
        cb.checked = groups[g].defaultChecked;
      }
      lbl.appendChild(cb);
      var span = document.createElement('span');
      span.textContent = it.label;
      lbl.appendChild(span);
      // Note for cookbook items without results
      if (it.kind === 'cookbook' && !cb.checked && groups[g].id === 'default') {
        var hint = document.createElement('span');
        hint.className = 'report-hint';
        hint.textContent = ' (no result — run cookbook entry first)';
        lbl.appendChild(hint);
      }
      list.appendChild(lbl);
    }
  }

  document.body.appendChild(bg);

  document.getElementById('reportCancelBtn').onclick = function(){ bg.remove(); };
  document.getElementById('reportBuildBtn').onclick = function(){
    var checked = modal.querySelectorAll('.report-item input[type="checkbox"]:checked');
    var keys = [];
    for (var i = 0; i < checked.length; i++) keys.push(checked[i].value);
    var notes = document.getElementById('reportNotes').value;
    bg.remove();
    setTimeout(function(){ buildFootballReport({ selectedKeys: keys, notes: notes }); }, 50);
  };
  bg.onclick = function(e){ if (e.target === bg) bg.remove(); };
}

if (typeof window !== 'undefined') {
  window.openFootballReportModal = openFootballReportModal;
  window.buildFootballReport = buildFootballReport;
}
