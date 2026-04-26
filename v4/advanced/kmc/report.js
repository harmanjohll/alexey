/* report.js — composite PNG report builder for the KMC studio.

   Produces a single landscape PNG that captures one run on one image.
   User picks which charts/text blocks to include via checkboxes;
   defaults match the screenshot they showed.

   Layout: 3-column grid; each card is either a canvas snapshot of an
   existing Chart.js chart (or the lattice cross-section) or a small
   formatted text block (parameters, stats). Header band carries a
   user-editable "claim" line plus auto-filled run parameters. */

var REPORT_ITEMS = [
  // ── Pre-checked by default (match user's reference composite, sans the
  //    parameters card — the header already prints those). ──
  { key: 'lattice',    label: 'Lattice Cross-Section',          group: 'default', kind: 'canvas',
    canvasId: 'latticeCanvas', span: 6, natH: 140 },
  { key: 'roughness',  label: 'RMS Roughness vs Iteration',     group: 'default', kind: 'canvas',
    canvasId: 'roughnessChart', span: 3, natH: 260 },
  { key: 'surfStats',  label: 'Surface Statistics',             group: 'default', kind: 'text',
    span: 2, natH: 260, render: function(){ return _reportSurfaceStats(); } },
  { key: 'pitStats',   label: 'Pit Analysis',                   group: 'default', kind: 'text',
    span: 1, natH: 260, render: function(){ return _reportPitStats(); } },
  { key: 'phases',     label: 'Multi-phase β analysis',         group: 'default', kind: 'text',
    span: 2, natH: 200, render: function(){ return _reportPhases(); } },
  { key: 'phaseMini',  label: 'Per-phase mini-charts',          group: 'default', kind: 'composite',
    span: 4, natH: 200, render: function(ctx,x,y,w,h){ _reportPhaseMinis(ctx,x,y,w,h); } },
  { key: 'pitWidth',   label: 'Pit Width Distribution',         group: 'default', kind: 'canvas',
    canvasId: 'pitHistChart', span: 1, natH: 240 },
  { key: 'pitDepth',   label: 'Pit Depth Distribution',         group: 'default', kind: 'canvas',
    canvasId: 'pitDepthHistChart', span: 1, natH: 240 },
  { key: 'pitWvD',     label: 'Width vs Depth (log-log)',       group: 'default', kind: 'canvas',
    canvasId: 'pitWvDChart', span: 1, natH: 240 },
  { key: 'pitLifetime',label: 'Pit Lifetime Distribution',      group: 'default', kind: 'canvas',
    canvasId: 'pitLifetimeChart', span: 1, natH: 240 },
  { key: 'pitSurvival',label: 'Pit Survival',                   group: 'default', kind: 'canvas',
    canvasId: 'pitSurvivalChart', span: 1, natH: 240 },
  { key: 'corr',       label: 'Height-Height Correlation G(r)', group: 'default', kind: 'canvas',
    canvasId: 'corrChart', span: 1, natH: 240 },
  // ── Optional ──
  { key: 'params',     label: 'Run Parameters (extra card)',    group: 'optional', kind: 'text',
    span: 1, natH: 220, render: function(){ return _reportRunParams(); } },
  { key: 'etch',       label: 'Etch Depth & Rate vs Iteration', group: 'optional', kind: 'canvas',
    canvasId: 'etchChart', span: 2, natH: 240 },
  { key: 'stats',      label: 'Surface Statistics vs Iteration',group: 'optional', kind: 'canvas',
    canvasId: 'statsChart', span: 2, natH: 240 },
  { key: 'hist',       label: 'Height Distribution (current)',  group: 'optional', kind: 'canvas',
    canvasId: 'histChart', span: 1, natH: 240 },
  { key: 'surface',    label: 'Surface Profile — ht(x)',        group: 'optional', kind: 'canvas',
    canvasId: 'surfaceChart', span: 2, natH: 240 },
  { key: 'conc',       label: 'Concentration Profile',          group: 'optional', kind: 'canvas',
    canvasId: 'concChart', span: 1, natH: 240 },
  { key: 'pitSurface', label: 'Surface Profile with Pits',      group: 'optional', kind: 'canvas',
    canvasId: 'pitSurfaceChart', span: 3, natH: 240 },
  { key: 'nucleation', label: 'Nucleation & Death Rate',        group: 'optional', kind: 'canvas',
    canvasId: 'pitNucleationChart', span: 2, natH: 240 },
  { key: 'nn',         label: 'Pit NN Distance Distribution',   group: 'optional', kind: 'canvas',
    canvasId: 'pitNNChart', span: 1, natH: 240 },
  { key: 'gr',         label: 'Pair Correlation g(r)',          group: 'optional', kind: 'canvas',
    canvasId: 'pitGRChart', span: 1, natH: 240 },
  { key: 'comp',       label: 'Pit Ge fraction vs depth',       group: 'optional', kind: 'canvas',
    canvasId: 'pitCompChart', span: 1, natH: 240 },
  { key: 'heightmap',  label: 'Height Map',                     group: 'optional', kind: 'canvas',
    canvasId: 'hmapCanvas', span: 6, natH: 60 }
];

/* ── Text content builders ───────────────────────────── */

function _reportRunParams() {
  var p = (typeof readParams === 'function') ? readParams() : {};
  return [
    { k: 'T',      v: (p.temp || '—') + ' K' },
    { k: 'θ (Ge)', v: (p.theta !== undefined ? p.theta : '—') },
    { k: 'P_des',  v: (p.pdes  !== undefined ? p.pdes  : '—') },
    { k: 'Lattx',  v: (p.lattx || '—') },
    { k: 'Lattz',  v: (p.lattz || '—') },
    { k: 'niter1', v: (p.niter1 || '—') }
  ];
}

function _reportSurfaceStats() {
  var get = function(id){ var el = document.getElementById(id); return el ? el.textContent : '—'; };
  return [
    { k: 'iteration',    v: get('stIter') },
    { k: 'avg height',   v: get('stAveht') },
    { k: 'RMS',          v: get('stRms') },
    { k: 'std dev',      v: get('stStd') },
    { k: 'skewness',     v: get('stSkew') },
    { k: 'kurtosis',     v: get('stKurt') },
    { k: 'height range', v: get('stRange') },
    { k: 'surface width',v: get('stWidth') },
    { k: 'etch depth',   v: get('stEtchDepth') },
    { k: 'etch rate',    v: get('stEtchRate') },
    { k: 'Ge/Si select.', v: get('stSelectivity') }
  ];
}

function _reportPhases() {
  if (typeof currentPhases === 'undefined' || !currentPhases || !currentPhases.length) {
    return [{ k: 'phases', v: 'no phase analysis run' }];
  }
  var rows = [];
  for (var i = 0; i < currentPhases.length; i++) {
    var p = currentPhases[i];
    rows.push({
      k: 'phase ' + (i + 1) + ' · iter ' + Math.round(p.xStart) + '–' + Math.round(p.xEnd),
      v: 'β = ' + p.beta.toFixed(4) + '   R² = ' + p.r2.toFixed(4) + '   n=' + p.n
    });
  }
  return rows;
}

function _reportPitStats() {
  var get = function(id){ var el = document.getElementById(id); return el ? el.textContent : '—'; };
  return [
    { k: 'pit count',     v: get('pitCount') },
    { k: 'avg width',     v: get('pitAvgW') },
    { k: 'max width',     v: get('pitMaxW') },
    { k: 'avg depth',     v: get('pitAvgD') },
    { k: 'max depth',     v: get('pitMaxD') },
    { k: 'coverage',      v: get('pitCoverage') },
    { k: 'cutoff height', v: get('pitCutoff') },
    { k: 'mean height',   v: get('pitMeanH') }
  ];
}

/* ── Canvas drawing primitives ───────────────────────── */

/* Card title bar height (compact). */
var CARD_TITLE_H = 22;
var CARD_PAD    = 6;

function _drawCardFrame(ctx, x, y, w, h, title, accent) {
  ctx.fillStyle = '#fafaf6';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d4cfc5';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = accent || '#5e5853';
  ctx.font = '500 10px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(title.toUpperCase(), x + 8, y + 6);
}

function _drawTextCard(ctx, x, y, w, h, title, rows, accent) {
  _drawCardFrame(ctx, x, y, w, h, title, accent);
  // Auto-fit row size based on available vertical space
  var avail = h - CARD_TITLE_H - CARD_PAD * 2;
  var n = rows.length || 1;
  var rowH = Math.max(13, Math.min(20, Math.floor(avail / n)));
  var fontPx = Math.max(10, Math.min(13, rowH - 4));
  ctx.font = '400 ' + fontPx + 'px "Space Mono", monospace';
  var rowY = y + CARD_TITLE_H + CARD_PAD;
  for (var i = 0; i < rows.length; i++) {
    if (rowY > y + h - CARD_PAD) break;
    var r = rows[i];
    ctx.fillStyle = '#8a847f';
    ctx.textAlign = 'left';
    ctx.fillText(r.k, x + 8, rowY);
    ctx.fillStyle = '#1a1a18';
    ctx.textAlign = 'right';
    ctx.fillText(String(r.v), x + w - 8, rowY);
    ctx.textAlign = 'left';
    rowY += rowH;
  }
}

function _drawCanvasCard(ctx, x, y, w, h, title, srcCanvas, accent) {
  _drawCardFrame(ctx, x, y, w, h, title, accent);
  if (!srcCanvas) {
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 11px "Space Grotesk", sans-serif';
    ctx.fillText('(no data — run the simulation first)', x + 8, y + CARD_TITLE_H + CARD_PAD);
    return;
  }
  // Fit canvas content edge-to-edge inside card; preserve aspect ratio.
  var contentX = x + CARD_PAD;
  var contentY = y + CARD_TITLE_H + CARD_PAD;
  var contentW = w - 2 * CARD_PAD;
  var contentH = h - CARD_TITLE_H - 2 * CARD_PAD;
  var srcW = srcCanvas.width || 1, srcH = srcCanvas.height || 1;
  var ratio = Math.min(contentW / srcW, contentH / srcH);
  var drawW = srcW * ratio;
  var drawH = srcH * ratio;
  var drawX = contentX + (contentW - drawW) / 2;
  var drawY = contentY + (contentH - drawH) / 2;
  try {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(drawX - 1, drawY - 1, drawW + 2, drawH + 2);
    ctx.drawImage(srcCanvas, drawX, drawY, drawW, drawH);
  } catch (e) {
    ctx.fillStyle = '#e24b4a';
    ctx.font = '400 11px "Space Grotesk", sans-serif';
    ctx.fillText('(render failed: ' + e.message + ')', x + 8, y + CARD_TITLE_H + CARD_PAD);
  }
}

function _reportPhaseMinis(ctx, x, y, w, h) {
  _drawCardFrame(ctx, x, y, w, h, 'PER-PHASE MINI-CHARTS', '#3d7a52');
  var minis = (typeof phaseMiniCharts !== 'undefined') ? phaseMiniCharts : [];
  if (!minis.length) {
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 11px "Space Grotesk", sans-serif';
    ctx.fillText('(no phases detected — run simulation and click auto-detect)', x + 8, y + CARD_TITLE_H + CARD_PAD);
    return;
  }
  var n = minis.length;
  var slotPad = CARD_PAD;
  var slotGap = 4;
  var slotW = (w - 2 * slotPad - (n - 1) * slotGap) / n;
  var slotH = h - CARD_TITLE_H - 2 * slotPad;
  var slotY = y + CARD_TITLE_H + slotPad;
  for (var i = 0; i < n; i++) {
    var inst = minis[i];
    if (!inst || !inst.canvas) continue;
    var slotX = x + slotPad + i * (slotW + slotGap);
    var srcW = inst.canvas.width, srcH = inst.canvas.height;
    var ratio = Math.min(slotW / srcW, slotH / srcH);
    var dW = srcW * ratio, dH = srcH * ratio;
    var dX = slotX + (slotW - dW) / 2;
    var dY = slotY + (slotH - dH) / 2;
    try {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dX - 1, dY - 1, dW + 2, dH + 2);
      ctx.drawImage(inst.canvas, dX, dY, dW, dH);
    } catch (e) {}
  }
}

/* ── Layout: row-major packer on a 6-column grid, fitting 16:9 canvas ──
   Each item declares its preferred span (1–6) and natural height; we pack
   items into rows in selection order, then scale row heights so the total
   fits the available body height. */

var REPORT_COLS = 6;

function _packRows(items, totalW, padding, gutter, availH) {
  // Build rows from selection order, respecting REPORT_COLS budget.
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

  // Reflow underfilled rows: expand each item's effective width so the row
  // fills the full canvas. Avoids the dead horizontal gap when the user's
  // selection doesn't sum to a clean multiple of REPORT_COLS.
  for (var r0 = 0; r0 < rows.length; r0++) {
    var rr = rows[r0];
    if (rr.spanUsed < REPORT_COLS && rr.items.length > 0) {
      var factor = REPORT_COLS / rr.spanUsed;
      var carried = 0;
      for (var ii = 0; ii < rr.items.length; ii++) {
        rr.items[ii].effectiveSpan = rr.items[ii].span * factor;
      }
    } else {
      for (var ii2 = 0; ii2 < rr.items.length; ii2++) {
        rr.items[ii2].effectiveSpan = rr.items[ii2].span;
      }
    }
  }

  // Total natural body height across rows (includes inter-row gutter).
  var natTotal = 0;
  for (var r = 0; r < rows.length; r++) natTotal += rows[r].maxNatH;
  natTotal += gutter * Math.max(0, rows.length - 1);

  // Scale to fit available body height. With few items, allow generous
  // vertical expansion so cards aren't lost in dead space.
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
  var bodyH = y - gutter;
  return { laid: laid, bodyH: bodyH, scale: scale, rows: rows.length };
}

/* ── Build the composite ───────────────────────────────────────── */

function buildKMCReport(opts) {
  opts = opts || {};
  var selectedKeys = opts.selectedKeys || [];
  var notes = opts.notes || '';

  // Fixed 16:9 slide dimensions (1920×1080 logical, 2× supersampled).
  var width  = 1920;
  var height = 1080;
  var padding = 18;
  var gutter  = 10;
  var headerH = 96;
  var availBody = height - headerH - padding;

  // Resolve items in declaration order, only keep selected.
  var items = REPORT_ITEMS.filter(function(it){ return selectedKeys.indexOf(it.key) >= 0; });
  if (!items.length) { alert('Select at least one item.'); return; }

  var pack = _packRows(items, width, padding, gutter, availBody);
  if (pack.scale < 0.6) {
    if (!confirm('You\'ve selected a lot of items — they\'ll be shrunk to ' +
      Math.round(pack.scale * 100) + '% of their natural size to fit one slide. ' +
      'Generate anyway?')) return;
  }

  // 2× supersampled canvas for crispness
  var ssr = 2;
  var canvas = document.createElement('canvas');
  canvas.width = width * ssr;
  canvas.height = height * ssr;
  var ctx = canvas.getContext('2d');
  ctx.scale(ssr, ssr);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // ── Header band (slim, single row + claim line) ──
  ctx.fillStyle = '#0a1e0a';
  ctx.fillRect(0, 0, width, headerH);

  // Title (top-left)
  ctx.fillStyle = '#7dd87d';
  ctx.font = '600 22px "Instrument Serif", serif';
  ctx.textBaseline = 'top';
  ctx.fillText('KMC Run Report', padding, 14);

  // Parameter line (top-left, below title)
  var p = (typeof readParams === 'function') ? readParams() : {};
  var paramLine = 'T = ' + (p.temp || '—') + ' K · θ = ' + (p.theta !== undefined ? p.theta : '—') +
    ' · P_des = ' + (p.pdes !== undefined ? p.pdes : '—') +
    ' · L = ' + (p.lattx || '—') + '×' + (p.lattz || '—') +
    ' · niter₁ = ' + (p.niter1 || '—');
  // Asymptotic β if present
  if (typeof currentPhases !== 'undefined' && currentPhases && currentPhases.length) {
    var last = currentPhases[currentPhases.length - 1];
    paramLine += '  ·  β = ' + last.beta.toFixed(3) + ' (R² = ' + last.r2.toFixed(3) + ')';
  }
  ctx.font = '400 13px "Space Mono", monospace';
  ctx.fillStyle = '#a8d8a8';
  ctx.fillText(paramLine, padding, 46);

  // User notes (claim line) — single line, ellipsised if too long
  if (notes && notes.trim()) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 400 13px "Space Grotesk", sans-serif';
    var maxNoteW = width - padding * 2 - 280;  // leave room for timestamp on right
    var line = notes.trim();
    var lines = _wrapText(ctx, line, maxNoteW);
    ctx.fillText(lines[0] + (lines.length > 1 ? '…' : ''), padding, 70);
  }

  // Timestamp + signature (top-right)
  ctx.fillStyle = '#7a9a7a';
  ctx.font = '400 11px "Space Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleString() + '  ·  Alexey Mikhail Johll', width - padding, 18);
  ctx.fillText('rows: ' + pack.rows + '  ·  fit scale: ' + Math.round(pack.scale * 100) + '%', width - padding, 38);
  ctx.textAlign = 'left';

  // ── Body items ──
  for (var i2 = 0; i2 < pack.laid.length; i2++) {
    var entry = pack.laid[i2];
    var item = entry.item;
    var x = entry.x, y = entry.y + headerH, w = entry.w, h = entry.h;
    if (item.kind === 'text') {
      _drawTextCard(ctx, x, y, w, h, item.label, item.render(), '#3d7a52');
    } else if (item.kind === 'canvas') {
      var src = document.getElementById(item.canvasId);
      _drawCanvasCard(ctx, x, y, w, h, item.label, src, '#3d7a52');
    } else if (item.kind === 'composite') {
      item.render(ctx, x, y, w, h);
    }
  }

  // Trigger download
  canvas.toBlob(function(blob) {
    if (!blob) { alert('PNG generation failed.'); return; }
    var url = URL.createObjectURL(blob);
    var stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'kmc_report_' + stamp + '.png';
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 100);
  }, 'image/png');
}

function _wrapText(ctx, text, maxW) {
  var words = text.split(/\s+/);
  var lines = [], line = '';
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line);
      line = words[i];
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ── Modal UI ─────────────────────────────────────────────────── */

function openReportModal() {
  // Avoid duplicate
  var existing = document.getElementById('reportModalBg');
  if (existing) existing.remove();

  var bg = document.createElement('div');
  bg.id = 'reportModalBg';
  bg.className = 'report-modal-bg';

  var modal = document.createElement('div');
  modal.className = 'report-modal';
  bg.appendChild(modal);

  // Header
  modal.innerHTML =
    '<div class="report-modal-hdr">' +
      '<h3>Build run report</h3>' +
      '<p>One PNG per run, all selected charts laid out on a single landscape image. Defaults are pre-selected — uncheck anything you don\'t want, or scroll down for optional extras.</p>' +
    '</div>' +
    '<div class="report-notes-row">' +
      '<label class="sl">notes / claim (one or two lines, shown in the report header)</label>' +
      '<textarea id="reportNotes" placeholder="e.g. Asymptotic β indicates Edwards-Wilkinson scaling; persistent pits dominate morphology."></textarea>' +
    '</div>' +
    '<div class="report-list" id="reportList"></div>' +
    '<div class="report-modal-row">' +
      '<button type="button" id="reportCancelBtn">Cancel</button>' +
      '<button type="button" class="primary" id="reportBuildBtn">Download composite PNG →</button>' +
    '</div>';

  // Auto-populate notes textarea with a sensible default the user can edit
  var p = (typeof readParams === 'function') ? readParams() : {};
  var betaLine = '';
  if (typeof currentPhases !== 'undefined' && currentPhases && currentPhases.length) {
    var last = currentPhases[currentPhases.length - 1];
    betaLine = 'Asymptotic β = ' + last.beta.toFixed(3) + ' (R² = ' + last.r2.toFixed(3) + ').';
  }
  var defaultNotes = 'Run at T = ' + (p.temp || '—') + ' K, θ = ' + (p.theta !== undefined ? p.theta : '—') +
    ', P_des = ' + (p.pdes !== undefined ? p.pdes : '—') + ', L = ' + (p.lattx || '—') + '. ' + betaLine;

  // Build list (default-checked group first, then optional)
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
      cb.type = 'checkbox';
      cb.value = it.key;
      cb.checked = groups[g].defaultChecked;
      lbl.appendChild(cb);
      var span = document.createElement('span');
      span.textContent = it.label;
      lbl.appendChild(span);
      list.appendChild(lbl);
    }
  }

  document.body.appendChild(bg);
  document.getElementById('reportNotes').value = defaultNotes;

  document.getElementById('reportCancelBtn').onclick = function(){ bg.remove(); };
  document.getElementById('reportBuildBtn').onclick = function(){
    var checked = modal.querySelectorAll('.report-item input[type="checkbox"]:checked');
    var keys = [];
    for (var i = 0; i < checked.length; i++) keys.push(checked[i].value);
    var notes = document.getElementById('reportNotes').value;
    bg.remove();
    setTimeout(function(){
      buildKMCReport({ selectedKeys: keys, notes: notes });
    }, 50);
  };
  bg.onclick = function(e){ if (e.target === bg) bg.remove(); };
}
