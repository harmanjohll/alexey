/* report.js — composite PNG report builder for the KMC studio.

   Produces a single landscape PNG that captures one run on one image.
   User picks which charts/text blocks to include via checkboxes;
   defaults match the screenshot they showed.

   Layout: 3-column grid; each card is either a canvas snapshot of an
   existing Chart.js chart (or the lattice cross-section) or a small
   formatted text block (parameters, stats). Header band carries a
   user-editable "claim" line plus auto-filled run parameters. */

var REPORT_ITEMS = [
  // ── Pre-checked by default (match user's reference composite) ──
  { key: 'params',     label: 'Run Parameters',                 group: 'default', kind: 'text',
    render: function(){ return _reportRunParams(); } },
  { key: 'lattice',    label: 'Lattice Cross-Section',          group: 'default', kind: 'canvas',
    canvasId: 'latticeCanvas' },
  { key: 'surfStats',  label: 'Surface Statistics',             group: 'default', kind: 'text',
    render: function(){ return _reportSurfaceStats(); } },
  { key: 'phases',     label: 'Multi-phase β analysis (table)', group: 'default', kind: 'text',
    render: function(){ return _reportPhases(); } },
  { key: 'phaseMini',  label: 'Per-phase mini-charts',          group: 'default', kind: 'composite',
    render: function(ctx,x,y,w,h){ _reportPhaseMinis(ctx,x,y,w,h); } },
  { key: 'pitStats',   label: 'Pit Analysis Summary',           group: 'default', kind: 'text',
    render: function(){ return _reportPitStats(); } },
  { key: 'roughness',  label: 'RMS Roughness vs Iteration',     group: 'default', kind: 'canvas',
    canvasId: 'roughnessChart' },
  { key: 'pitWidth',   label: 'Pit Width Distribution',         group: 'default', kind: 'canvas',
    canvasId: 'pitHistChart' },
  { key: 'pitDepth',   label: 'Pit Depth Distribution',         group: 'default', kind: 'canvas',
    canvasId: 'pitDepthHistChart' },
  { key: 'pitWvD',     label: 'Width vs Depth (log-log)',       group: 'default', kind: 'canvas',
    canvasId: 'pitWvDChart' },
  { key: 'pitLifetime',label: 'Pit Lifetime Distribution',      group: 'default', kind: 'canvas',
    canvasId: 'pitLifetimeChart' },
  { key: 'pitSurvival',label: 'Pit Survival by Birth Iteration',group: 'default', kind: 'canvas',
    canvasId: 'pitSurvivalChart' },
  { key: 'corr',       label: 'Height-Height Correlation G(r)', group: 'default', kind: 'canvas',
    canvasId: 'corrChart' },
  // ── Optional ──
  { key: 'etch',       label: 'Etch Depth & Rate vs Iteration', group: 'optional', kind: 'canvas',
    canvasId: 'etchChart' },
  { key: 'stats',      label: 'Surface Statistics vs Iteration',group: 'optional', kind: 'canvas',
    canvasId: 'statsChart' },
  { key: 'hist',       label: 'Height Distribution (current)',  group: 'optional', kind: 'canvas',
    canvasId: 'histChart' },
  { key: 'surface',    label: 'Surface Profile — ht(x)',        group: 'optional', kind: 'canvas',
    canvasId: 'surfaceChart' },
  { key: 'conc',       label: 'Concentration Profile',          group: 'optional', kind: 'canvas',
    canvasId: 'concChart' },
  { key: 'pitSurface', label: 'Surface Profile with Pits',      group: 'optional', kind: 'canvas',
    canvasId: 'pitSurfaceChart' },
  { key: 'nucleation', label: 'Nucleation & Death Rate',        group: 'optional', kind: 'canvas',
    canvasId: 'pitNucleationChart' },
  { key: 'nn',         label: 'Pit NN Distance Distribution',   group: 'optional', kind: 'canvas',
    canvasId: 'pitNNChart' },
  { key: 'gr',         label: 'Pair Correlation g(r)',          group: 'optional', kind: 'canvas',
    canvasId: 'pitGRChart' },
  { key: 'comp',       label: 'Pit Ge fraction vs depth',       group: 'optional', kind: 'canvas',
    canvasId: 'pitCompChart' },
  { key: 'heightmap',  label: 'Height Map',                     group: 'optional', kind: 'canvas',
    canvasId: 'hmapCanvas' }
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

function _drawTextCard(ctx, x, y, w, h, title, rows, accent) {
  // Card frame
  ctx.fillStyle = '#fafaf6';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d4cfc5';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  // Title bar
  ctx.fillStyle = accent || '#5e5853';
  ctx.font = '500 11px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(title.toUpperCase(), x + 14, y + 12);

  // Rows: key (left) → value (right)
  var rowY = y + 36;
  ctx.font = '400 13px "Space Mono", monospace';
  for (var i = 0; i < rows.length; i++) {
    if (rowY > y + h - 20) break;
    var r = rows[i];
    ctx.fillStyle = '#8a847f';
    ctx.fillText(r.k, x + 14, rowY);
    ctx.fillStyle = '#1a1a18';
    ctx.textAlign = 'right';
    ctx.fillText(String(r.v), x + w - 14, rowY);
    ctx.textAlign = 'left';
    rowY += 22;
  }
}

function _drawCanvasCard(ctx, x, y, w, h, title, srcCanvas, accent) {
  ctx.fillStyle = '#fafaf6';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d4cfc5';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.fillStyle = accent || '#5e5853';
  ctx.font = '500 11px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText(title.toUpperCase(), x + 14, y + 12);

  if (!srcCanvas) {
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 12px "Space Grotesk", sans-serif';
    ctx.fillText('(no data — run the simulation first)', x + 14, y + 36);
    return;
  }

  // Fit canvas content into card area, preserving aspect ratio.
  var pad = 14;
  var cardW = w - 2 * pad;
  var cardH = h - 36 - pad;
  var srcW = srcCanvas.width || 1, srcH = srcCanvas.height || 1;
  var ratio = Math.min(cardW / srcW, cardH / srcH);
  var drawW = srcW * ratio;
  var drawH = srcH * ratio;
  var drawX = x + pad + (cardW - drawW) / 2;
  var drawY = y + 32 + (cardH - drawH) / 2;
  try {
    // White background under chart so themes don't bleed through.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(drawX - 2, drawY - 2, drawW + 4, drawH + 4);
    ctx.drawImage(srcCanvas, drawX, drawY, drawW, drawH);
  } catch (e) {
    ctx.fillStyle = '#e24b4a';
    ctx.font = '400 12px "Space Grotesk", sans-serif';
    ctx.fillText('(could not render: ' + e.message + ')', x + 14, y + 36);
  }
}

function _reportPhaseMinis(ctx, x, y, w, h) {
  ctx.fillStyle = '#fafaf6';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#d4cfc5';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);

  ctx.fillStyle = '#5e5853';
  ctx.font = '500 11px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.fillText('PER-PHASE MINI-CHARTS', x + 14, y + 12);

  var minis = (typeof phaseMiniCharts !== 'undefined') ? phaseMiniCharts : [];
  if (!minis.length) {
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 12px "Space Grotesk", sans-serif';
    ctx.fillText('(no phases detected — run simulation and click auto-detect)', x + 14, y + 36);
    return;
  }

  var n = minis.length;
  var pad = 14;
  var slotW = (w - 2 * pad - (n - 1) * 8) / n;
  var slotH = h - 36 - pad;
  var slotY = y + 32;
  for (var i = 0; i < n; i++) {
    var inst = minis[i];
    if (!inst || !inst.canvas) continue;
    var slotX = x + pad + i * (slotW + 8);
    var srcW = inst.canvas.width, srcH = inst.canvas.height;
    var ratio = Math.min(slotW / srcW, slotH / srcH);
    var dW = srcW * ratio, dH = srcH * ratio;
    var dX = slotX + (slotW - dW) / 2;
    var dY = slotY + (slotH - dH) / 2;
    try {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dX - 2, dY - 2, dW + 4, dH + 4);
      ctx.drawImage(inst.canvas, dX, dY, dW, dH);
    } catch (e) {}
  }
}

/* ── Layout: simple 3-column grid, items packed in selection order ── */

function _packGrid(items, totalW, padding, gutter, cols) {
  var colW = Math.floor((totalW - padding * 2 - gutter * (cols - 1)) / cols);
  var laid = [];
  var colHeights = new Array(cols).fill(0);
  var startY = padding;
  for (var i = 0; i < items.length; i++) {
    var item = items[i];
    var span = item.span || 1;  // 1 column default; some items might span 2 cols
    if (span > cols) span = cols;
    var height = item.height || 280;
    // Find best fit: leftmost column where 'span' consecutive cols have lowest max height
    var bestCol = 0, bestY = Infinity;
    for (var c = 0; c <= cols - span; c++) {
      var maxH = 0;
      for (var k = 0; k < span; k++) maxH = Math.max(maxH, colHeights[c + k]);
      if (maxH < bestY) { bestY = maxH; bestCol = c; }
    }
    var x = padding + bestCol * (colW + gutter);
    var y = startY + bestY;
    var w = colW * span + gutter * (span - 1);
    laid.push({ item: item, x: x, y: y, w: w, h: height });
    for (var k2 = 0; k2 < span; k2++) {
      colHeights[bestCol + k2] = bestY + height + gutter;
    }
  }
  var totalHeight = startY;
  for (var c2 = 0; c2 < cols; c2++) totalHeight = Math.max(totalHeight, colHeights[c2]);
  totalHeight += padding;
  return { laid: laid, totalHeight: totalHeight, colW: colW };
}

function _itemHeight(item) {
  if (item.kind === 'text') {
    // Estimate: 36 (header) + 22 per row + 14 padding
    var rows = (typeof item.render === 'function') ? item.render() : [];
    return 36 + rows.length * 22 + 18;
  }
  if (item.kind === 'composite') return 240;  // mini-charts band
  // canvas — let's keep 280 px for typical charts; lattice gets 320 if hero
  if (item.key === 'lattice') return 360;
  return 280;
}

function _itemSpan(item) {
  // Hero-sized items get 2 columns; lattice spans full width (3).
  if (item.key === 'lattice') return 3;
  if (item.key === 'roughness') return 2;
  if (item.key === 'phaseMini') return 3;
  return 1;
}

/* ── Build the composite ───────────────────────────────────────── */

function buildKMCReport(opts) {
  opts = opts || {};
  var selectedKeys = opts.selectedKeys || [];
  var notes = opts.notes || '';

  var width = 1920;
  var padding = 32;
  var gutter = 16;
  var cols = 3;
  var headerH = 180;

  // Resolve items in declaration order, only keep selected
  var items = REPORT_ITEMS.filter(function(it){ return selectedKeys.indexOf(it.key) >= 0; })
    .map(function(it){
      return Object.assign({}, it, { height: _itemHeight(it), span: _itemSpan(it) });
    });
  if (!items.length) {
    alert('Select at least one item.');
    return;
  }

  // Pack
  var totalW = width;
  var pack = _packGrid(items, totalW, padding, gutter, cols);
  var totalH = headerH + pack.totalHeight;

  var canvas = document.createElement('canvas');
  // 2x supersampling for crispness
  var scale = 2;
  canvas.width = width * scale;
  canvas.height = totalH * scale;
  var ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, totalH);

  // Header band
  ctx.fillStyle = '#0a1e0a';
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = '#7dd87d';
  ctx.font = '600 28px "Instrument Serif", serif';
  ctx.textBaseline = 'top';
  ctx.fillText('KMC Run Report', padding, 24);
  // Auto-filled subline of parameters
  var p = (typeof readParams === 'function') ? readParams() : {};
  var paramLine = 'T = ' + (p.temp || '—') + ' K  ·  θ = ' + (p.theta !== undefined ? p.theta : '—') +
    '  ·  P_des = ' + (p.pdes !== undefined ? p.pdes : '—') +
    '  ·  L = ' + (p.lattx || '—') + ' × ' + (p.lattz || '—') +
    '  ·  niter₁ = ' + (p.niter1 || '—');
  ctx.font = '400 14px "Space Mono", monospace';
  ctx.fillStyle = '#a8d8a8';
  ctx.fillText(paramLine, padding, 64);
  // Asymptotic β + universality if present
  var asympLine = '';
  if (typeof currentPhases !== 'undefined' && currentPhases && currentPhases.length) {
    var last = currentPhases[currentPhases.length - 1];
    asympLine = 'asymptotic β = ' + last.beta.toFixed(3) + '   R² = ' + last.r2.toFixed(3);
  }
  if (asympLine) {
    ctx.fillStyle = '#d8e8c8';
    ctx.fillText(asympLine, padding, 88);
  }
  // User notes (claim text)
  if (notes && notes.trim()) {
    ctx.fillStyle = '#ffffff';
    ctx.font = '400 14px "Space Grotesk", sans-serif';
    var maxNoteW = width - padding * 2;
    var lines = _wrapText(ctx, notes.trim(), maxNoteW);
    var ny = 116;
    for (var i = 0; i < lines.length && i < 2; i++) {
      ctx.fillText(lines[i], padding, ny);
      ny += 22;
    }
  }
  // Timestamp + signature
  ctx.fillStyle = '#7a9a7a';
  ctx.font = '400 11px "Space Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleString() + '  ·  Alexey Mikhail Johll', width - padding, 24);
  ctx.textAlign = 'left';

  // Items
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
