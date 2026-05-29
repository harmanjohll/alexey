/* charts.js — Chart.js plot management for KMC portal */

/* ── Chart PNG Export (white background, 2x resolution) ── */
function exportChartPNG(canvasId) {
  var srcCanvas = document.getElementById(canvasId);
  if (!srcCanvas) return;
  // Find the chart title from the card-label in the parent card
  var card = srcCanvas.closest('.dash-card');
  var title = '';
  if (card) {
    var lbl = card.querySelector('.card-label');
    if (lbl) title = lbl.textContent;
  }
  // Get the Chart.js instance
  var chartInstance = Chart.getChart(srcCanvas);
  if (!chartInstance) {
    // Not a Chart.js canvas — export raw (e.g. lattice)
    exportRawCanvasPNG(srcCanvas, title);
    return;
  }
  // Save original styles, swap to white-background export theme
  var origBg = chartInstance.options.plugins.customCanvasBackground;
  var origScales = {};
  var scaleKeys = Object.keys(chartInstance.options.scales || {});
  for (var i = 0; i < scaleKeys.length; i++) {
    var sk = scaleKeys[i];
    var s = chartInstance.options.scales[sk];
    origScales[sk] = {
      gridColor: s.grid ? s.grid.color : undefined,
      tickColor: s.ticks ? s.ticks.color : undefined,
      titleColor: s.title ? s.title.color : undefined
    };
    if (s.grid) s.grid.color = 'rgba(0,0,0,0.1)';
    if (s.ticks) s.ticks.color = '#333';
    if (s.title) s.title.color = '#333';
  }
  var origLegColor = null;
  if (chartInstance.options.plugins.legend && chartInstance.options.plugins.legend.labels) {
    origLegColor = chartInstance.options.plugins.legend.labels.color;
    chartInstance.options.plugins.legend.labels.color = '#333';
  }
  // Register a temporary background plugin
  var bgPlugin = {
    id: 'exportBg',
    beforeDraw: function(chart) {
      var ctx = chart.ctx;
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, chart.width, chart.height);
      ctx.restore();
    }
  };
  chartInstance.config.plugins = chartInstance.config.plugins || [];
  chartInstance.config.plugins.push(bgPlugin);
  chartInstance.update('none');
  // Create hi-res export canvas
  var scale = 2;
  var srcW = srcCanvas.width, srcH = srcCanvas.height;
  var pad = title ? 36 : 0;
  var exp = document.createElement('canvas');
  exp.width = srcW * scale;
  exp.height = (srcH + pad) * scale;
  var ectx = exp.getContext('2d');
  ectx.scale(scale, scale);
  ectx.fillStyle = '#ffffff';
  ectx.fillRect(0, 0, srcW, srcH + pad);
  if (title) {
    ectx.font = '500 11px "Space Mono", monospace';
    ectx.fillStyle = '#333';
    ectx.fillText(title, 12, 22);
  }
  ectx.drawImage(srcCanvas, 0, pad, srcW, srcH);
  // Restore original theme
  chartInstance.config.plugins = chartInstance.config.plugins.filter(function(p) { return p.id !== 'exportBg'; });
  for (var i = 0; i < scaleKeys.length; i++) {
    var sk = scaleKeys[i];
    var s = chartInstance.options.scales[sk];
    var o = origScales[sk];
    if (s.grid && o.gridColor !== undefined) s.grid.color = o.gridColor;
    if (s.ticks && o.tickColor !== undefined) s.ticks.color = o.tickColor;
    if (s.title && o.titleColor !== undefined) s.title.color = o.titleColor;
  }
  if (origLegColor !== null && chartInstance.options.plugins.legend && chartInstance.options.plugins.legend.labels) {
    chartInstance.options.plugins.legend.labels.color = origLegColor;
  }
  chartInstance.update('none');
  // Download
  var slug = (title || canvasId).replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  var link = document.createElement('a');
  link.download = 'kmc_' + slug + '.png';
  link.href = exp.toDataURL('image/png');
  link.click();
}

function exportRawCanvasPNG(srcCanvas, title) {
  var scale = 2;
  var pad = title ? 36 : 0;
  var w = srcCanvas.width, h = srcCanvas.height;
  var exp = document.createElement('canvas');
  exp.width = w * scale;
  exp.height = (h + pad) * scale;
  var ctx = exp.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h + pad);
  if (title) {
    ctx.font = '500 11px "Space Mono", monospace';
    ctx.fillStyle = '#333';
    ctx.fillText(title, 12, 22);
  }
  ctx.drawImage(srcCanvas, 0, pad, w, h);
  var slug = (title || 'canvas').replace(/[^a-zA-Z0-9]+/g, '_').toLowerCase();
  var link = document.createElement('a');
  link.download = 'kmc_' + slug + '.png';
  link.href = exp.toDataURL('image/png');
  link.click();
}

/* Auto-inject export buttons into all chart cards. Per-canvas (not
   per-card), so cards with more than one canvas (e.g. lattice + heightmap)
   get a button each. Includes any canvas inside .dash-card with an id,
   regardless of wrapper class — picks up alphaChart/zChart too. */
function injectExportButtons() {
  var canvases = document.querySelectorAll('.dash-card canvas[id], .cookbook-card canvas[id]');
  for (var i = 0; i < canvases.length; i++) {
    var cvs = canvases[i];
    if (!cvs.id) continue;
    var card = cvs.closest('.dash-card') || cvs.closest('.cookbook-card');
    if (!card) continue;
    // Skip only if a button already exists for THIS canvas (per-canvas).
    if (card.querySelector('.export-png-btn[data-canvas="' + cvs.id + '"]')) continue;
    var hdr = card.querySelector('.card-hdr');
    if (!hdr) {
      var lbl = card.querySelector('.card-label');
      if (!lbl) continue;
      var wrap = document.createElement('div');
      wrap.className = 'card-hdr';
      lbl.parentNode.insertBefore(wrap, lbl);
      wrap.appendChild(lbl);
      hdr = wrap;
    }
    var btn = document.createElement('button');
    btn.className = 'sm export-png-btn';
    btn.style.marginLeft = 'auto';
    var canvasCount = card.querySelectorAll('canvas[id]').length;
    btn.textContent = canvasCount > 1
      ? '\u2193 ' + cvs.id.replace(/Canvas|Chart/g, '')
      : '\u2193 PNG';
    btn.setAttribute('data-canvas', cvs.id);
    btn.onclick = function() { exportChartPNG(this.getAttribute('data-canvas')); };
    hdr.appendChild(btn);
  }
}


var roughnessChart = null, etchChart = null, surfaceChart = null, concChart = null;
var statsChart = null, histChart = null;
var pitHistChart = null, pitSurfaceChart = null, alphaChart = null, zChart = null;
var pitDepthHistChart = null, pitWvDChart = null;
var pitLifetimeChart = null, pitNucleationChart = null;
var pitNNChart = null, pitGRChart = null, pitCompChart = null;
var pitSurvivalChart = null;
var lifetimeYScale = 'log'; // 'linear' or 'log'
var corrChart = null;
var tswRoughChart = null, tswSkewChart = null, tswKurtChart = null;
var cswRoughChart = null, cswSkewChart = null, cswKurtChart = null;

var roughnessData = [], etchDepthData = [], etchRateData = [];
var rmsHistory = [], skewHistory = [], kurtHistory = [];
var initialAveHt = null;

var chartDefaults = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor:'#111a11', borderColor:'rgba(60,160,60,0.3)', borderWidth:1, titleColor:'#e8f0e8', bodyColor:'#7a9a7a',
      titleFont:{family:'Space Mono',size:10}, bodyFont:{family:'Space Mono',size:10} }
  },
  scales: {
    x: { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}} },
    y: { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}} }
  }
};

function mkChart(id, label, xLabel, yLabel, color, scaleType) {
  var opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.scales.x.title = { display:true, text:xLabel, color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  opts.scales.y.title = { display:true, text:yLabel, color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  if (scaleType === 'log') { opts.scales.x.type = 'logarithmic'; opts.scales.y.type = 'logarithmic'; }
  return new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels:[], datasets:[{ label:label, data:[], borderColor:color, borderWidth:1.5, pointRadius:0, fill:false, tension:0.2 }] },
    options: opts
  });
}

function initCharts() {
  // Build the roughness chart fresh in the current axis mode (default
  // 'log-data'). Avoids post-construction scale mutation that crashes
  // Chart.js v4 with a stack overflow.
  _buildRoughnessChart(roughnessAxisMode);

  // Etch depth & rate (dual y-axis)
  var eOpts = JSON.parse(JSON.stringify(chartDefaults));
  eOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'Space Mono',size:9},boxWidth:12} };
  etchChart = new Chart(document.getElementById('etchChart'), {
    type:'line',
    data:{ labels:[], datasets:[
      { label:'Etch Depth', data:[], borderColor:'#4a9aaa', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y' },
      { label:'Etch Rate', data:[], borderColor:'#f0b429', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false, yAxisID:'y2' }
    ]},
    options: { responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins: eOpts.plugins,
      scales: {
        x: { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'iteration',color:'#4a6a4a',font:{family:'Space Mono',size:9}} },
        y: { position:'left', grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'etch depth (layers)',color:'#4a9aaa',font:{family:'Space Mono',size:9}} },
        y2: { position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'rate (layers/iter)',color:'#f0b429',font:{family:'Space Mono',size:9}} }
      }
    }
  });

  surfaceChart = mkChart('surfaceChart', 'ht(x)', 'x', 'height', '#7dd87d', '');
  concChart = mkChart('concChart', 'Ge fraction', 'depth (z)', 'Ge/(Si+Ge)', '#FF7043', '');

  // Stats evolution chart (dual y-axis)
  var sOpts = JSON.parse(JSON.stringify(chartDefaults));
  sOpts.scales.x.title = { display:true, text:'iteration', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  sOpts.scales.y.title = { display:true, text:'RMS', color:'#7dd87d', font:{family:'Space Mono',size:9} };
  sOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'Space Mono',size:9},boxWidth:12,
    filter: function(item) {
      var cb = document.getElementById('showSkewKurt');
      if (cb && !cb.checked && (item.text === 'Skewness' || item.text === 'Kurtosis')) return false;
      return true;
    }
  } };
  statsChart = new Chart(document.getElementById('statsChart'), {
    type:'line',
    data:{ labels:[], datasets:[
      { label:'RMS', data:[], borderColor:'#7dd87d', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y' },
      { label:'Skewness', data:[], borderColor:'#f0b429', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y2', hidden:true },
      { label:'Kurtosis', data:[], borderColor:'#e24b4a', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y2', hidden:true }
    ]},
    options: { responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins: sOpts.plugins,
      scales: {
        x: sOpts.scales.x,
        y: { position:'left', grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'RMS',color:'#7dd87d',font:{family:'Space Mono',size:9}} },
        y2: { position:'right', display:false, grid:{drawOnChartArea:false}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'skew / kurt',color:'#f0b429',font:{family:'Space Mono',size:9}} }
      }
    }
  });
  // Sync with toggle state
  var skCb = document.getElementById('showSkewKurt');
  if (skCb && skCb.checked) { statsChart.data.datasets[1].hidden = false; statsChart.data.datasets[2].hidden = false; statsChart.options.scales.y2.display = true; }

  // Height distribution histogram
  var hOpts = JSON.parse(JSON.stringify(chartDefaults));
  hOpts.scales.x.title = { display:true, text:'height', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  hOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  histChart = new Chart(document.getElementById('histChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(60,160,60,0.5)', borderWidth:0, borderRadius:2 }] },
    options: hOpts
  });

  // Pit width histogram
  var phOpts = JSON.parse(JSON.stringify(chartDefaults));
  phOpts.scales.x.title = { display:true, text:'pit width (sites)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  phOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pitHistChart = new Chart(document.getElementById('pitHistChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(226,75,74,0.5)', borderWidth:0, borderRadius:2 }] },
    options: phOpts
  });

  // Pit depth histogram
  var pdOpts = JSON.parse(JSON.stringify(chartDefaults));
  pdOpts.scales.x.title = { display:true, text:'pit depth (lattice units)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pdOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pitDepthHistChart = new Chart(document.getElementById('pitDepthHistChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(74,154,170,0.5)', borderWidth:0, borderRadius:2 }] },
    options: pdOpts
  });

  // Pit width-vs-depth scatter (log-log) with power-law fit
  var pwdOpts = JSON.parse(JSON.stringify(chartDefaults));
  pwdOpts.scales.x.type = 'logarithmic';
  pwdOpts.scales.y.type = 'logarithmic';
  pwdOpts.scales.x.title = { display:true, text:'pit width (sites)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pwdOpts.scales.y.title = { display:true, text:'pit depth', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pwdOpts.plugins.legend = { display:false };
  pitWvDChart = new Chart(document.getElementById('pitWvDChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'pits', data:[], borderColor:'rgba(226,75,74,0.8)', backgroundColor:'rgba(226,75,74,0.6)', borderWidth:0, pointRadius:3, showLine:false },
      { label:'fit',  data:[], borderColor:'#f0b429', borderWidth:1.5, borderDash:[6,3], pointRadius:0, fill:false, showLine:true }
    ]},
    options: pwdOpts
  });

  // Pit lifetime histogram (log-y default; rebuilt on toggle)
  _buildLifetimeChart(lifetimeYScale);

  // Pit survival by birth-iteration band
  var psOpts = JSON.parse(JSON.stringify(chartDefaults));
  psOpts.scales.x.title = { display:true, text:'birth iteration band', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  psOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  psOpts.plugins.legend = { display:true, labels:{ color:'#7a9a7a', font:{family:'Space Mono',size:9}, boxWidth:12 } };
  pitSurvivalChart = new Chart(document.getElementById('pitSurvivalChart'), {
    type:'bar',
    data:{ labels:[], datasets:[
      { label:'born',  data:[], backgroundColor:'rgba(110,192,221,0.45)', borderWidth:0, borderRadius:2 },
      { label:'still alive at end', data:[], backgroundColor:'rgba(160,106,216,0.75)', borderWidth:0, borderRadius:2 }
    ]},
    options: psOpts
  });

  // Nucleation + death rate vs iteration (smoothed line, dual series)
  var pnOpts = JSON.parse(JSON.stringify(chartDefaults));
  pnOpts.scales.x.title = { display:true, text:'iteration', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pnOpts.scales.y.title = { display:true, text:'pits per window', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pnOpts.plugins.legend = { display:true, labels:{ color:'#7a9a7a', font:{family:'Space Mono',size:9}, boxWidth:12 } };
  pitNucleationChart = new Chart(document.getElementById('pitNucleationChart'), {
    type:'line',
    data:{ datasets:[
      { label:'born',  data:[], borderColor:'#7dd87d', borderWidth:1.5, pointRadius:0, fill:false, tension:0.2 },
      { label:'died',  data:[], borderColor:'#e24b4a', borderWidth:1.5, pointRadius:0, fill:false, tension:0.2 }
    ]},
    options: pnOpts
  });

  // Nearest-neighbour distance histogram
  var nnOpts = JSON.parse(JSON.stringify(chartDefaults));
  nnOpts.scales.x.title = { display:true, text:'NN distance (sites)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  nnOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pitNNChart = new Chart(document.getElementById('pitNNChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(110,192,221,0.55)', borderWidth:0, borderRadius:2 }] },
    options: nnOpts
  });

  // Pair correlation g(r)
  var grOpts = JSON.parse(JSON.stringify(chartDefaults));
  grOpts.scales.x.title = { display:true, text:'r (sites)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  grOpts.scales.y.title = { display:true, text:'g(r)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  grOpts.plugins.legend = { display:false };
  pitGRChart = new Chart(document.getElementById('pitGRChart'), {
    type:'line',
    data:{ datasets:[
      { label:'g(r)', data:[], borderColor:'#9aa6ff', borderWidth:1.5, pointRadius:0, fill:false, tension:0.2 },
      { label:'baseline', data:[], borderColor:'rgba(120,120,120,0.4)', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false }
    ]},
    options: grOpts
  });

  // Pit Ge fraction vs depth (scatter), with reference horizontal line
  var pcOpts = JSON.parse(JSON.stringify(chartDefaults));
  pcOpts.scales.x.title = { display:true, text:'pit depth', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pcOpts.scales.y.title = { display:true, text:'Ge fraction in pit walls', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  pcOpts.plugins.legend = { display:false };
  pitCompChart = new Chart(document.getElementById('pitCompChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'pits',     data:[], borderColor:'rgba(255,112,67,0.85)', backgroundColor:'rgba(255,112,67,0.6)', borderWidth:0, pointRadius:3, showLine:false },
      { label:'baseline', data:[], borderColor:'rgba(120,120,120,0.5)', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false, showLine:true }
    ]},
    options: pcOpts
  });

  // Pit-highlighted surface profile
  var psOpts = JSON.parse(JSON.stringify(chartDefaults));
  psOpts.scales.x.title = { display:true, text:'x', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  psOpts.scales.y.title = { display:true, text:'height', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  psOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'Space Mono',size:9},boxWidth:12} };
  pitSurfaceChart = new Chart(document.getElementById('pitSurfaceChart'), {
    type:'line',
    data:{ labels:[], datasets:[
      { label:'surface', data:[], borderColor:'#7dd87d', borderWidth:1, pointRadius:0, fill:false },
      { label:'pits', data:[], borderColor:'rgba(226,75,74,0.8)', backgroundColor:'rgba(226,75,74,0.25)', borderWidth:1, pointRadius:0, fill:true },
      { label:'threshold', data:[], borderColor:'rgba(240,180,41,0.6)', borderWidth:1, borderDash:[6,4], pointRadius:0, fill:false }
    ]},
    options: psOpts
  });

  initScalingCharts();
  initCorrChart();
}

function destroyCharts() {
  [roughnessChart, etchChart, surfaceChart, concChart, statsChart, histChart, pitHistChart, pitDepthHistChart, pitWvDChart, pitSurfaceChart, alphaChart, zChart, corrChart, pitLifetimeChart, pitNucleationChart, pitNNChart, pitGRChart, pitCompChart, pitSurvivalChart].forEach(function(c) { if(c) c.destroy(); });
  roughnessChart = etchChart = surfaceChart = concChart = statsChart = histChart = pitHistChart = pitDepthHistChart = pitWvDChart = pitSurfaceChart = alphaChart = zChart = corrChart = pitLifetimeChart = pitNucleationChart = pitNNChart = pitGRChart = pitCompChart = pitSurvivalChart = null;
}

function destroySweepCharts() {
  [tswRoughChart, tswSkewChart, tswKurtChart, cswRoughChart, cswSkewChart, cswKurtChart].forEach(function(c) { if (c) c.destroy(); });
  tswRoughChart = tswSkewChart = tswKurtChart = cswRoughChart = cswSkewChart = cswKurtChart = null;
}

function mkSweepChart(id, xLabel, yLabel, color) {
  var opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.scales.x.title = { display:true, text:xLabel, color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  opts.scales.y.title = { display:true, text:yLabel, color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  return new Chart(document.getElementById(id), {
    type: 'scatter',
    data: { datasets:[{ data:[], borderColor:color, backgroundColor:color, borderWidth:1.5, pointRadius:4, showLine:true, tension:0.2, fill:false }] },
    options: opts
  });
}

/* Power-law regression on log-log data — single segment OLS. */
function fitPowerLaw(data, xMin, xMax) {
  var valid = data.filter(function(d) { return d.x > 0 && d.y > 0; });
  if (xMin !== undefined && xMax !== undefined) {
    valid = valid.filter(function(d) { return d.x >= xMin && d.x <= xMax; });
  }
  if (valid.length < 3) return null;
  var logD = valid.map(function(d) { return { x: Math.log10(d.x), y: Math.log10(d.y) }; });
  var n = logD.length;
  var sx=0, sy=0, sxy=0, sxx=0;
  for (var i = 0; i < n; i++) { sx += logD[i].x; sy += logD[i].y; sxy += logD[i].x*logD[i].y; sxx += logD[i].x*logD[i].x; }
  var denom = n*sxx - sx*sx;
  if (Math.abs(denom) < 1e-15) return null;
  var beta = (n*sxy - sx*sy) / denom;
  var intercept = (sy - beta*sx) / n;
  return { beta: beta, intercept: intercept };
}

/* ───────────────────────── Axis-mode toggle ────────────────────────────
   Three viewing modes on the RMS roughness chart, applied identically to
   per-phase mini-charts so the user sees one consistent view:
     'linear'    — both axes linear; raw data labels.
     'log-data'  — both axes logarithmic; labels are data values (1, 10, 100…).
     'log-log10' — both axes logarithmic; labels are log10(value) (0, 1, 2…).
   In all three modes the underlying β fit is unchanged (computed in log
   space). The toggle only affects how the chart presents the same numbers. */

var roughnessAxisMode = 'log-data';

function _decadeTickCallback(value) {
  // Only show whole-decade ticks: 1, 10, 100, 1000, …
  var l = Math.log10(value);
  if (Math.abs(l - Math.round(l)) < 1e-6) return Number(value).toLocaleString();
  return '';
}
function _logTickCallback(value) {
  // Show log10(value) instead of value: 0, 1, 2, 3, 4
  var l = Math.log10(value);
  if (Math.abs(l - Math.round(l)) < 1e-6) return String(Math.round(l));
  return '';
}

function _applyAxisMode(chart, mode) {
  // Chart.js v4 cannot safely mutate scales.x/y.type after construction —
  // the scale class is fixed at build time. Use _buildRoughnessChart instead.
  // Kept as a no-op for safety; all real axis swaps go through setAxisMode.
}

/* Build (or rebuild) the roughness chart with the given axis mode.
   Destroys any existing instance, recreates with fresh scale config,
   re-feeds roughnessData and any phase fit lines. */
function _buildRoughnessChart(mode) {
  if (roughnessChart) { try { roughnessChart.destroy(); } catch (e) {} roughnessChart = null; }
  var canvas = document.getElementById('roughnessChart');
  if (!canvas) return null;

  var xScale = { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'iteration',color:'#4a6a4a',font:{family:'Space Mono',size:9}} };
  var yScale = { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'RMS roughness',color:'#4a6a4a',font:{family:'Space Mono',size:9}} };
  if (mode === 'linear') {
    xScale.type = 'linear'; yScale.type = 'linear';
  } else {
    xScale.type = 'logarithmic'; yScale.type = 'logarithmic';
    var cb = (mode === 'log-log10') ? _logTickCallback : _decadeTickCallback;
    xScale.ticks.callback = cb; yScale.ticks.callback = cb;
  }

  roughnessChart = new Chart(canvas, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'RMS', data: roughnessData ? roughnessData.slice() : [], borderColor: '#7dd87d', borderWidth: 1.5, pointRadius: 0, fill: false, tension: 0.2 },
      { label: 'fit', data: [], borderColor: '#f0b429', borderWidth: 2, borderDash: [6,3], pointRadius: 0, fill: false }
    ]},
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
      plugins: { legend: { display: false }, tooltip: { backgroundColor:'#111a11', borderColor:'rgba(60,160,60,0.3)', borderWidth:1, titleColor:'#e8f0e8', bodyColor:'#7a9a7a', titleFont:{family:'Space Mono',size:10}, bodyFont:{family:'Space Mono',size:10} } },
      scales: { x: xScale, y: yScale }
    }
  });
  return roughnessChart;
}

function setAxisMode(mode) {
  if (mode !== 'linear' && mode !== 'log-data' && mode !== 'log-log10') return;
  roughnessAxisMode = mode;
  if (typeof Store !== 'undefined') Store.set('kmc', 'axis_mode', mode);
  // Update caption
  var cap = document.getElementById('axisCaption');
  if (cap) {
    if (mode === 'linear') {
      cap.innerHTML = 'On <b>linear axes</b>, the power-law shape is hard to read — the early-time regime is squeezed against the left edge and the slope changes continuously. Switch to <b>log-log</b> to recover β as the slope of a straight line.';
    } else if (mode === 'log-log10') {
      cap.innerHTML = 'On <b>log-log axes (log₁₀ labels)</b>, the axis labels show log<sub>10</sub>(value) directly — so 0, 1, 2, 3, 4 represent iterations 1, 10, 100, 1000, 10000. β still reads as the slope of the straight line.';
    } else {
      cap.innerHTML = 'On <b>log-log axes</b>, a power law w &prop; t<sup>β</sup> plots as a straight line. β is the slope — the steeper the line, the faster the surface roughens.';
    }
  }
  // Rebuild the roughness chart with the new scale type (mutating scale.type
  // on a live chart is not safe in Chart.js v4 — destroy + recreate is the
  // robust path).
  if (typeof _buildRoughnessChart === 'function') _buildRoughnessChart(mode);
  // Re-render mini-charts so they pick up the new mode
  if (typeof renderPhaseMiniCharts === 'function') {
    renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  }
  // Re-apply current single fit line if any
  if (typeof refitBeta === 'function' && roughnessData && roughnessData.length >= 3) {
    try { refitBeta(); } catch (e) {}
  }
  // Re-render multi-phase fit lines if currentPhases exist
  if (typeof renderPhasesOnMain === 'function' && currentPhases && currentPhases.length) {
    renderPhasesOnMain();
  }
}

function restoreAxisMode() {
  if (typeof Store === 'undefined') return;
  var saved = Store.get('kmc', 'axis_mode');
  if (saved === 'linear' || saved === 'log-data' || saved === 'log-log10') {
    var radio = document.querySelector('input[name="axisMode"][value="' + saved + '"]');
    if (radio) radio.checked = true;
    setAxisMode(saved);
  }
}

/* ───────────────────────── Multi-phase β analysis ─────────────────────────
   Detect distinct linear regimes on log-log w(t) by recursive bisection,
   then prune by BIC. Faithful to Fortran data; pure post-processing. */

var PHASE_COLORS = ['#7dd87d', '#4a9aaa', '#f0b429', '#e24b4a', '#a06ad8'];
var currentPhases = [];
var phaseMiniCharts = [];
var phaseLogResample = false;

/* OLS in already-log-transformed space. Returns {beta, intercept, r2, sse, n, xStart, xEnd, idxStart, idxEnd}. */
function _olsLogLog(logPts, idxStart, idxEnd) {
  var n = logPts.length;
  if (n < 3) return null;
  var sx=0, sy=0, sxy=0, sxx=0;
  for (var i = 0; i < n; i++) { sx += logPts[i].x; sy += logPts[i].y; sxy += logPts[i].x*logPts[i].y; sxx += logPts[i].x*logPts[i].x; }
  var denom = n*sxx - sx*sx;
  if (Math.abs(denom) < 1e-15) return null;
  var beta = (n*sxy - sx*sy) / denom;
  var intercept = (sy - beta*sx) / n;
  var meanY = sy / n;
  var ssTot = 0, sse = 0;
  for (var j = 0; j < n; j++) {
    var pred = intercept + beta * logPts[j].x;
    sse += (logPts[j].y - pred) * (logPts[j].y - pred);
    ssTot += (logPts[j].y - meanY) * (logPts[j].y - meanY);
  }
  var r2 = ssTot < 1e-15 ? 1 : 1 - sse / ssTot;
  return {
    beta: beta, intercept: intercept, r2: r2, sse: sse, n: n,
    xStart: Math.pow(10, logPts[0].x), xEnd: Math.pow(10, logPts[n-1].x),
    idxStart: idxStart, idxEnd: idxEnd
  };
}

/* Pick log-spaced sample of original (non-log) data. Returns up to nTarget
   points whose x-values approximate a geometric series. */
function _logResample(rawData, nTarget) {
  var valid = rawData.filter(function(d) { return d.x > 0 && d.y > 0; });
  if (valid.length <= nTarget) return valid;
  valid.sort(function(a, b) { return a.x - b.x; });
  var xMin = valid[0].x, xMax = valid[valid.length - 1].x;
  var logMin = Math.log10(xMin), logMax = Math.log10(xMax);
  var seen = {}, picked = [];
  for (var k = 0; k < nTarget; k++) {
    var target = Math.pow(10, logMin + (logMax - logMin) * k / (nTarget - 1));
    // find nearest valid point in log-space
    var bestIdx = 0, bestDist = Infinity;
    for (var i = 0; i < valid.length; i++) {
      var d = Math.abs(Math.log10(valid[i].x) - Math.log10(target));
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    if (!seen[bestIdx]) { seen[bestIdx] = 1; picked.push(valid[bestIdx]); }
  }
  picked.sort(function(a, b) { return a.x - b.x; });
  return picked;
}

/* Recursive top-down bisection. Splits at point of largest residual when
   the segment R² is below threshold. Returns an array of segment fits. */
function _recursiveSplit(logPts, idxOffset, opts, depth) {
  var threshold = opts.r2Threshold;
  var minSegN = opts.minSegN;
  var maxDepth = opts.maxDepth;
  var fit = _olsLogLog(logPts, idxOffset, idxOffset + logPts.length - 1);
  if (!fit) return [];
  if (fit.r2 >= threshold || logPts.length < minSegN * 2 || depth >= maxDepth) {
    return [fit];
  }
  // largest-residual split candidate (avoid the endpoints)
  var bestI = -1, bestRes = -1;
  for (var i = minSegN; i < logPts.length - minSegN; i++) {
    var pred = fit.intercept + fit.beta * logPts[i].x;
    var res = Math.abs(logPts[i].y - pred);
    if (res > bestRes) { bestRes = res; bestI = i; }
  }
  if (bestI < 0) return [fit];
  var left  = _recursiveSplit(logPts.slice(0, bestI), idxOffset, opts, depth + 1);
  var right = _recursiveSplit(logPts.slice(bestI), idxOffset + bestI, opts, depth + 1);
  return left.concat(right);
}

/* BIC for a partitioning. Lower is better. n = total points across all phases. */
function _bicForPhases(phases) {
  var n = 0, sse = 0;
  for (var i = 0; i < phases.length; i++) { n += phases[i].n; sse += phases[i].sse; }
  if (n === 0) return Infinity;
  // 2 free params per phase (slope + intercept), penalty ~ k·log(n).
  var k = phases.length * 2;
  return n * Math.log(sse / n) + k * Math.log(n);
}

/* Bottom-up merge: drop the split that raises BIC the least when undone.
   Repeats while BIC drops or stays within deltaBic of current. Caps phases at maxPhases. */
function _mergeByBIC(phases, allLogPts, opts) {
  var maxPhases = opts.maxPhases;
  var deltaBic = opts.deltaBic;
  function refit(p) {
    return _olsLogLog(allLogPts.slice(p.idxStart, p.idxEnd + 1), p.idxStart, p.idxEnd);
  }
  while (phases.length > 1) {
    var curBIC = _bicForPhases(phases);
    var bestIdx = -1, bestBIC = Infinity, bestMerged = null;
    for (var i = 0; i < phases.length - 1; i++) {
      var merged = _olsLogLog(
        allLogPts.slice(phases[i].idxStart, phases[i+1].idxEnd + 1),
        phases[i].idxStart, phases[i+1].idxEnd
      );
      if (!merged) continue;
      var trial = phases.slice(0, i).concat([merged], phases.slice(i + 2));
      var trialBIC = _bicForPhases(trial);
      if (trialBIC < bestBIC) { bestBIC = trialBIC; bestIdx = i; bestMerged = merged; }
    }
    if (bestIdx < 0) break;
    var improvesBIC = bestBIC <= curBIC + deltaBic;
    var overCap = phases.length > maxPhases;
    if (improvesBIC || overCap) {
      phases = phases.slice(0, bestIdx).concat([bestMerged], phases.slice(bestIdx + 2));
    } else {
      break;
    }
  }
  return phases;
}

/* Refit a single segment using ALL linear data points within [iterStart, iterEnd]
   inclusive. Returns the same shape as _olsLogLog. */
function _fitRangeAllData(rawData, iterStart, iterEnd) {
  var pts = rawData.filter(function(d) {
    return d.x > 0 && d.y > 1e-6 && d.x >= iterStart && d.x <= iterEnd;
  });
  if (pts.length < 3) return null;
  pts.sort(function(a, b) { return a.x - b.x; });
  var logPts = pts.map(function(d) { return { x: Math.log10(d.x), y: Math.log10(d.y) }; });
  var fit = _olsLogLog(logPts, 0, logPts.length - 1);
  if (!fit) return null;
  // Override displayed boundaries with the requested iter range, not the
  // sampled extremes — phase boundaries should be contiguous in iteration space.
  fit.xStart = iterStart;
  fit.xEnd = iterEnd;
  return fit;
}

/* Force phase ranges to be contiguous: phase i+1 starts at phase i's end + 1.
   Refits each phase using all linear data points in its range. */
function _snapAndRefitContiguous(phases, rawData) {
  if (!phases || phases.length === 0) return phases;
  var sorted = phases.slice().sort(function(a, b) { return a.xStart - b.xStart; });
  var validX = rawData.filter(function(d) { return d.x > 0 && d.y > 1e-6; }).map(function(d) { return d.x; });
  if (validX.length === 0) return sorted;
  validX.sort(function(a, b) { return a - b; });
  var dataStart = validX[0], dataEnd = validX[validX.length - 1];

  var bounds = [dataStart];
  for (var i = 1; i < sorted.length; i++) bounds.push(Math.round(sorted[i].xStart));
  bounds.push(dataEnd + 1);

  var refit = [];
  for (var j = 0; j < sorted.length; j++) {
    var lo = bounds[j], hi = bounds[j + 1] - 1;
    if (j === sorted.length - 1) hi = dataEnd;
    var f = _fitRangeAllData(rawData, lo, hi);
    if (f) refit.push(f);
  }
  return refit.length ? refit : sorted;
}

/* Top-level: detect phases on raw {x, y} data. Returns {phases, logPts}. */
function fitPhases(rawData, opts) {
  opts = opts || {};
  var threshold = opts.r2Threshold || 0.998;
  var maxPhases = opts.maxPhases || 5;
  var minSegN   = opts.minSegN   || 4;
  var maxDepth  = opts.maxDepth  || 4;
  var deltaBic  = opts.deltaBic  || 2;
  var useLog    = !!opts.logResample;

  var working = rawData.filter(function(d) { return d.x > 0 && d.y > 1e-6; });
  working.sort(function(a, b) { return a.x - b.x; });
  if (useLog) working = _logResample(working, 32);
  if (working.length < minSegN * 2) {
    var single = _olsLogLog(working.map(function(d){return{x:Math.log10(d.x),y:Math.log10(d.y)};}), 0, working.length-1);
    var phasesS = single ? _snapAndRefitContiguous([single], rawData) : [];
    return { phases: phasesS, logPts: working.map(function(d){return{x:Math.log10(d.x),y:Math.log10(d.y)};}), source: working };
  }
  var logPts = working.map(function(d) { return { x: Math.log10(d.x), y: Math.log10(d.y) }; });
  var phases = _recursiveSplit(logPts, 0, { r2Threshold:threshold, minSegN:minSegN, maxDepth:maxDepth }, 0);
  phases = _mergeByBIC(phases, logPts, { maxPhases:maxPhases, deltaBic:deltaBic });
  // Snap phase boundaries so they're contiguous in iteration space, then
  // refit each phase using ALL linear data points (not just the log-resampled subset).
  phases = _snapAndRefitContiguous(phases, rawData);
  return { phases: phases, logPts: logPts, source: working };
}

/* Split phase at index i into two halves at iteration `splitIter`. Refits each
   half using all linear data in its range. */
function splitPhase(i, splitIter) {
  if (i < 0 || i >= currentPhases.length) return;
  var p = currentPhases[i];
  splitIter = Math.round(splitIter);
  if (!isFinite(splitIter) || splitIter <= p.xStart || splitIter >= p.xEnd) return;
  var left  = _fitRangeAllData(roughnessData, p.xStart, splitIter);
  var right = _fitRangeAllData(roughnessData, splitIter + 1, p.xEnd);
  if (!left || !right) return;
  currentPhases = currentPhases.slice(0, i).concat([left, right], currentPhases.slice(i + 1));
  persistPhases();
  renderPhasesOnMain();
  renderPhaseRows('phaseRows');
  renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  refreshUniversalityBadge();
}

/* Persist current phases to localStorage via the v4 Store. */
function persistPhases() {
  if (typeof Store === 'undefined' || !currentPhases || !currentPhases.length) return;
  var slim = currentPhases.map(function(p) {
    return { xStart:p.xStart, xEnd:p.xEnd, beta:p.beta, intercept:p.intercept, r2:p.r2, n:p.n, idxStart:p.idxStart, idxEnd:p.idxEnd };
  });
  Store.set('kmc', 'phases', slim);
}

/* Render multi-phase fit lines onto the main roughness chart. Datasets:
   [0] raw points (managed by updateCharts), [1] live single-fit line
   (managed by refitBeta), [2..N] one phase line each (managed here). */
function renderPhasesOnMain() {
  if (!roughnessChart) return;
  // Trim everything past dataset 1 (preserves raw + live single-fit)
  while (roughnessChart.data.datasets.length > 2) {
    roughnessChart.data.datasets.pop();
  }
  if (!currentPhases || currentPhases.length === 0) {
    roughnessChart.update();
    return;
  }
  for (var i = 0; i < currentPhases.length; i++) {
    var p = currentPhases[i];
    var color = PHASE_COLORS[i % PHASE_COLORS.length];
    var x0 = p.xStart, x1 = p.xEnd;
    var y0 = Math.pow(10, p.intercept + p.beta * Math.log10(x0));
    var y1 = Math.pow(10, p.intercept + p.beta * Math.log10(x1));
    roughnessChart.data.datasets.push({
      label: 'phase ' + (i + 1),
      data: [{ x:x0, y:y0 }, { x:x1, y:y1 }],
      borderColor: color, borderWidth: 2.5,
      pointRadius: 0, fill: false, tension: 0
    });
  }
  roughnessChart.update();
}

/* Render the per-phase rows table into a target container. */
function renderPhaseRows(targetId) {
  var el = document.getElementById(targetId);
  if (!el) return;
  if (!currentPhases || !currentPhases.length) {
    el.innerHTML = '<div style="padding:10px;color:var(--text-tertiary);font-size:11px;font-family:\'Space Mono\',monospace">no phases yet — click <b>auto-detect</b> after a run</div>';
    return;
  }
  var html = '<div class="phase-rows">';
  for (var i = 0; i < currentPhases.length; i++) {
    var p = currentPhases[i];
    var color = PHASE_COLORS[i % PHASE_COLORS.length];
    html +=
      '<div class="phase-row" data-phase="' + i + '">' +
        '<span class="phase-swatch" style="background:' + color + '"></span>' +
        '<span class="phase-label">phase ' + (i + 1) + '</span>' +
        '<span class="phase-range">' +
          'iter <input type="number" class="phase-start" value="' + Math.round(p.xStart) + '" min="1" data-phase="' + i + '"> ' +
          '– <input type="number" class="phase-end"   value="' + Math.round(p.xEnd)   + '" min="1" data-phase="' + i + '">' +
        '</span>' +
        '<span class="phase-beta">β = <b>' + p.beta.toFixed(4) + '</b></span>' +
        '<span class="phase-r2">R² = ' + p.r2.toFixed(4) + '</span>' +
        '<span class="phase-n">n = ' + p.n + '</span>' +
        '<button class="sm" data-split="' + i + '" title="Split this phase into two at a chosen iteration">split</button>' +
        (i < currentPhases.length - 1 ? '<button class="sm" data-merge="' + i + '">merge →</button>' : '<span class="phase-spacer"></span>') +
      '</div>';
  }
  html += '</div>';
  el.innerHTML = html;
  // Wire up edits
  var rows = el.querySelectorAll('.phase-row');
  for (var r = 0; r < rows.length; r++) {
    var inputs = rows[r].querySelectorAll('input[type="number"]');
    inputs.forEach(function (inp) {
      inp.addEventListener('change', function () { applyManualPhases(); });
    });
    var mb = rows[r].querySelector('button[data-merge]');
    if (mb) mb.addEventListener('click', function (e) {
      mergePhase(+e.target.getAttribute('data-merge'));
    });
    var sb = rows[r].querySelector('button[data-split]');
    if (sb) sb.addEventListener('click', function (e) {
      var pi = +e.target.getAttribute('data-split');
      var phase = currentPhases[pi];
      if (!phase) return;
      var midpoint = Math.round((phase.xStart + phase.xEnd) / 2);
      var input = prompt(
        'Split phase ' + (pi + 1) + ' (iter ' + Math.round(phase.xStart) + '–' + Math.round(phase.xEnd) + ')\nat which iteration?',
        String(midpoint)
      );
      if (input === null) return;
      var splitAt = parseInt(input, 10);
      if (!isFinite(splitAt) || splitAt <= phase.xStart || splitAt >= phase.xEnd) {
        alert('Split iteration must be strictly inside the phase range.');
        return;
      }
      splitPhase(pi, splitAt);
    });
  }
}

/* Render small per-phase mini-charts. Destroys old ones first. */
function renderPhaseMiniCharts(containerId, allRawData) {
  var el = document.getElementById(containerId);
  if (!el) return;
  // Destroy old mini charts
  for (var k = 0; k < phaseMiniCharts.length; k++) {
    if (phaseMiniCharts[k]) phaseMiniCharts[k].destroy();
  }
  phaseMiniCharts = [];
  el.innerHTML = '';
  if (!currentPhases || !currentPhases.length) return;

  for (var i = 0; i < currentPhases.length; i++) {
    var p = currentPhases[i];
    var color = PHASE_COLORS[i % PHASE_COLORS.length];
    var card = document.createElement('div');
    card.className = 'phase-mini-card';
    card.innerHTML =
      '<div class="phase-mini-hdr">' +
        '<span class="phase-mini-num" style="color:' + color + '">phase ' + (i + 1) + '</span>' +
        '<span class="phase-mini-beta">β = ' + p.beta.toFixed(3) + '</span>' +
        '<span class="phase-mini-r2">R² = ' + p.r2.toFixed(3) + '</span>' +
      '</div>' +
      '<canvas class="phase-mini-canvas"></canvas>';
    el.appendChild(card);
    var cvs = card.querySelector('canvas');
    var pts = allRawData.filter(function(d){ return d.x >= p.xStart && d.x <= p.xEnd && d.y > 0; });
    var fitLine = [
      { x: p.xStart, y: Math.pow(10, p.intercept + p.beta * Math.log10(p.xStart)) },
      { x: p.xEnd,   y: Math.pow(10, p.intercept + p.beta * Math.log10(p.xEnd))   }
    ];
    // Match axis mode of the main chart so all views stay consistent.
    var axisMode = roughnessAxisMode || 'log-data';
    var miniXOpts = { grid:{color:'rgba(60,160,60,0.06)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:8},maxTicksLimit:4} };
    var miniYOpts = { grid:{color:'rgba(60,160,60,0.06)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:8},maxTicksLimit:4} };
    if (axisMode === 'linear') {
      miniXOpts.type = 'linear'; miniYOpts.type = 'linear';
    } else {
      miniXOpts.type = 'logarithmic'; miniYOpts.type = 'logarithmic';
      var miniCb = (axisMode === 'log-log10') ? _logTickCallback : _decadeTickCallback;
      miniXOpts.ticks.callback = miniCb;
      miniYOpts.ticks.callback = miniCb;
    }
    var inst = new Chart(cvs, {
      type: 'line',
      data: { datasets: [
        { label:'data', data:pts, borderColor:color, backgroundColor:color, borderWidth:0, pointRadius:1.5, showLine:false },
        { label:'fit',  data:fitLine, borderColor:color, borderWidth:2, pointRadius:0, fill:false, borderDash:[4,3] }
      ]},
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
        plugins: { legend:{display:false}, tooltip:{enabled:false} },
        scales: { x: miniXOpts, y: miniYOpts }
      }
    });
    phaseMiniCharts.push(inst);
  }
}

/* User-triggered: auto-detect phases on the current roughness data. */
function autoDetectPhases() {
  if (!roughnessData || roughnessData.length < 8) return;
  var thrEl = document.getElementById('phaseR2Thr');
  var maxEl = document.getElementById('phaseMax');
  var logEl = document.getElementById('phaseLogResample');
  var threshold = thrEl ? +thrEl.value || 0.998 : 0.998;
  var maxPhases = maxEl ? +maxEl.value || 5 : 5;
  phaseLogResample = logEl ? logEl.checked : false;
  var result = fitPhases(roughnessData, {
    r2Threshold: threshold, maxPhases: maxPhases, logResample: phaseLogResample
  });
  currentPhases = result.phases;
  persistPhases();
  renderPhasesOnMain();
  renderPhaseRows('phaseRows');
  renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  refreshUniversalityBadge();
}

/* Apply manual edits from the phase-rows inputs. Phases stay contiguous. */
function applyManualPhases() {
  var rows = document.querySelectorAll('.phase-row');
  if (!rows.length) return;
  var ranges = [];
  rows.forEach(function (row) {
    var s = +row.querySelector('.phase-start').value;
    var e = +row.querySelector('.phase-end').value;
    if (s > 0 && e > s) ranges.push({ s:s, e:e });
  });
  ranges.sort(function(a, b) { return a.s - b.s; });
  var newPhases = [];
  for (var i = 0; i < ranges.length; i++) {
    var fit = _fitRangeAllData(roughnessData, ranges[i].s, ranges[i].e);
    if (fit) newPhases.push(fit);
  }
  currentPhases = newPhases;
  persistPhases();
  renderPhasesOnMain();
  renderPhaseRows('phaseRows');
  renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  refreshUniversalityBadge();
}

/* Merge phase i with phase i+1 and refit using all linear data in the union. */
function mergePhase(i) {
  if (i < 0 || i >= currentPhases.length - 1) return;
  var a = currentPhases[i], b = currentPhases[i + 1];
  var merged = _fitRangeAllData(roughnessData, a.xStart, b.xEnd);
  if (!merged) return;
  currentPhases = currentPhases.slice(0, i).concat([merged], currentPhases.slice(i + 2));
  persistPhases();
  renderPhasesOnMain();
  renderPhaseRows('phaseRows');
  renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  refreshUniversalityBadge();
}

function clearPhases() {
  currentPhases = [];
  if (typeof Store !== 'undefined') Store.remove('kmc', 'phases');
  renderPhasesOnMain();
  renderPhaseRows('phaseRows');
  renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  refreshUniversalityBadge();
}

/* Match β against canonical universality classes. Prefers the asymptotic
   phase β (last phase) when multi-phase data exists, falls back to the
   live single-fit β otherwise. Updates the #findClass element so the
   header readout stays consistent with the multi-phase analysis. */
function refreshUniversalityBadge() {
  var classEl = document.getElementById('findClass');
  if (!classEl) return;
  var bv = null, source = null;
  if (currentPhases && currentPhases.length > 0) {
    bv = currentPhases[currentPhases.length - 1].beta;
    source = currentPhases.length === 1 ? 'fit' : 'asymptotic phase ' + currentPhases.length;
  } else if (roughnessData && roughnessData.length >= 3) {
    var fitMinEl = document.getElementById('fitMin');
    var fitMaxEl = document.getElementById('fitMax');
    var fitMin = fitMinEl ? +fitMinEl.value || 1 : 1;
    var fitMax = fitMaxEl ? +fitMaxEl.value || Infinity : Infinity;
    var f = fitPowerLaw(roughnessData, fitMin, fitMax);
    if (f) { bv = f.beta; source = 'live fit'; }
  }
  if (bv === null) {
    classEl.textContent = '—';
    classEl.className = 'finding-value';
    return;
  }
  var classes = [
    { name: 'Random deposition', b: 0.5  },
    { name: 'KPZ',               b: 0.333 },
    { name: 'EW',                b: 0.25 }
  ];
  var best = classes[0], bestD = Math.abs(bv - classes[0].b);
  for (var i = 1; i < classes.length; i++) {
    var dd = Math.abs(bv - classes[i].b);
    if (dd < bestD) { best = classes[i]; bestD = dd; }
  }
  classEl.textContent = best.name + ' (β=' + best.b + ', Δ=' + bestD.toFixed(3) + ', from ' + source + ')';
  classEl.className = 'finding-value ' + (bestD < 0.03 ? 'match-good' : bestD < 0.08 ? 'match-close' : 'match-far');
}

/* Build (or rebuild) the lifetime histogram with the given y-scale type. */
function _buildLifetimeChart(yMode) {
  if (pitLifetimeChart) { try { pitLifetimeChart.destroy(); } catch (e) {} pitLifetimeChart = null; }
  var canvas = document.getElementById('pitLifetimeChart');
  if (!canvas) return null;
  var prevLabels = [], prevData = [];
  // Preserve current data if any (when called via setLifetimeYScale)
  // We can't read it back from the destroyed chart; will be repopulated
  // by the next updatePitTrackingCharts() call.
  var yScale = { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'count',color:'#4a6a4a',font:{family:'Space Mono',size:9}} };
  if (yMode === 'log') yScale.type = 'logarithmic';
  var xScale = { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}, title:{display:true,text:'lifetime (iterations)',color:'#4a6a4a',font:{family:'Space Mono',size:9}} };
  pitLifetimeChart = new Chart(canvas, {
    type: 'bar',
    data: { labels: prevLabels, datasets: [{ data: prevData, backgroundColor: 'rgba(160,106,216,0.55)', borderWidth: 0, borderRadius: 2 }] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
      plugins: { legend: { display: false }, tooltip: { backgroundColor:'#111a11', borderColor:'rgba(60,160,60,0.3)', borderWidth:1, titleColor:'#e8f0e8', bodyColor:'#7a9a7a', titleFont:{family:'Space Mono',size:10}, bodyFont:{family:'Space Mono',size:10} } },
      scales: { x: xScale, y: yScale }
    }
  });
  return pitLifetimeChart;
}

function setLifetimeYScale(mode) {
  if (mode !== 'linear' && mode !== 'log') return;
  lifetimeYScale = mode;
  if (typeof Store !== 'undefined') Store.set('kmc', 'lifetime_y', mode);
  // Rebuild rather than mutate scale.type on a live chart.
  if (typeof _buildLifetimeChart === 'function') _buildLifetimeChart(mode);
  // Repopulate from current registry on next opportunity.
  if (typeof updatePitTrackingCharts === 'function') {
    try { updatePitTrackingCharts(); } catch (e) {}
  }
}

function restoreLifetimeYScale() {
  if (typeof Store === 'undefined') return;
  var saved = Store.get('kmc', 'lifetime_y');
  if (saved === 'linear' || saved === 'log') {
    lifetimeYScale = saved;
    var radio = document.querySelector('input[name="lifetimeY"][value="' + saved + '"]');
    if (radio) radio.checked = true;
    setLifetimeYScale(saved);
  }
}

function _median(sorted) {
  if (!sorted.length) return 0;
  var m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : (sorted[m - 1] + sorted[m]) / 2;
}

/* Update lifetime histogram + survival panel + nucleation/death rate charts.
   Reads pitRegistry, nucleationByIter, deathsByIter declared in app.js. */
function updatePitTrackingCharts() {
  if (typeof pitRegistry === 'undefined') return;
  var ids = Object.keys(pitRegistry);
  var lifetimes = [];
  var lastIter = 0;
  for (var i = 0; i < ids.length; i++) {
    var rec = pitRegistry[ids[i]];
    var death = rec.deathIter !== null ? rec.deathIter : rec.lastSeenIter;
    var lt = death - rec.birthIter + 1;
    if (lt > 0) lifetimes.push(lt);
    if (rec.lastSeenIter > lastIter) lastIter = rec.lastSeenIter;
  }

  // ── Header readouts ──
  var disp = document.getElementById('pitTrackedCount');
  if (disp) disp.textContent = String(ids.length);
  var stats = document.getElementById('lifetimeStats');
  if (stats) {
    if (lifetimes.length === 0) {
      stats.textContent = 'median — · mean — · max —';
    } else {
      var sorted = lifetimes.slice().sort(function(a,b){return a-b;});
      var med = _median(sorted);
      var sum = sorted.reduce(function(a,b){return a+b;}, 0);
      var mean = sum / sorted.length;
      var max = sorted[sorted.length-1];
      stats.textContent = 'median ' + Math.round(med) + ' · mean ' + Math.round(mean) + ' · max ' + max;
    }
  }

  // ── Lifetime histogram (log-spaced bins) ──
  if (pitLifetimeChart) {
    if (lifetimes.length >= 3) {
      lifetimes.sort(function(a,b){return a-b;});
      var ltMin = lifetimes[0], ltMax = lifetimes[lifetimes.length-1];
      var nBins = Math.min(20, Math.max(6, Math.round(2 * Math.log10(ltMax / Math.max(1, ltMin)) * 4) || 8));
      // Log-spaced bin edges from ltMin to ltMax (clamped to ≥1)
      var lo0 = Math.max(1, ltMin);
      var logLo = Math.log10(lo0), logHi = Math.log10(Math.max(ltMax, lo0 + 1));
      var edges = [];
      for (var e = 0; e <= nBins; e++) {
        edges.push(Math.pow(10, logLo + (logHi - logLo) * e / nBins));
      }
      var bins = new Array(nBins).fill(0);
      var labels = [];
      for (var b = 0; b < nBins; b++) {
        labels.push(Math.round(edges[b]) + '–' + Math.round(edges[b + 1]));
      }
      for (var k = 0; k < lifetimes.length; k++) {
        // Find the bin
        var v = lifetimes[k];
        var idx = nBins - 1;
        for (var bb = 0; bb < nBins; bb++) {
          if (v < edges[bb + 1]) { idx = bb; break; }
        }
        bins[idx]++;
      }
      // For log-y: filter empty bins to null so Chart.js skips them
      // (a 0 bar on a logarithmic axis can crash the scale). The actual
      // y-scale type is set at construction time by _buildLifetimeChart.
      var displayBins = (lifetimeYScale === 'log')
        ? bins.map(function(v) { return v > 0 ? v : null; })
        : bins;
      pitLifetimeChart.data.labels = labels;
      pitLifetimeChart.data.datasets[0].data = displayBins;
      pitLifetimeChart.update();
    } else {
      pitLifetimeChart.data.labels = [];
      pitLifetimeChart.data.datasets[0].data = [];
      pitLifetimeChart.update();
    }
  }

  // ── Survival by birth band ──
  if (pitSurvivalChart && lastIter > 0 && typeof survivorsByBirthBand === 'function') {
    var sv = survivorsByBirthBand(pitRegistry, lastIter, { nBands: 8 });
    var bandLabels = sv.bands.map(function(b) { return b.lo + '–' + b.hi; });
    var bornData = sv.bands.map(function(b) { return b.born; });
    var aliveData = sv.bands.map(function(b) { return b.alive; });
    pitSurvivalChart.data.labels = bandLabels;
    pitSurvivalChart.data.datasets[0].data = bornData;
    pitSurvivalChart.data.datasets[1].data = aliveData;
    pitSurvivalChart.update();
    var aliveTotal = aliveData.reduce(function(a,b){return a+b;}, 0);
    var sd = document.getElementById('survivalAliveCount');
    if (sd) sd.textContent = String(aliveTotal);
  }
  // ── Nucleation/death rate (windowed) ──
  if (pitNucleationChart && typeof nucleationByIter !== 'undefined') {
    var lastIter = nucleationByIter.length ? nucleationByIter[nucleationByIter.length-1].iter : 0;
    var winSize = Math.max(1, Math.round(lastIter / 40)); // ~40 windows across the run
    var bornAcc = {}, diedAcc = {};
    for (var n = 0; n < nucleationByIter.length; n++) {
      var w = Math.floor(nucleationByIter[n].iter / winSize) * winSize;
      bornAcc[w] = (bornAcc[w] || 0) + nucleationByIter[n].count;
    }
    for (var n2 = 0; n2 < deathsByIter.length; n2++) {
      var w2 = Math.floor(deathsByIter[n2].iter / winSize) * winSize;
      diedAcc[w2] = (diedAcc[w2] || 0) + deathsByIter[n2].count;
    }
    var keys = Object.keys(bornAcc).map(Number).sort(function(a,b){return a-b;});
    var bornData = keys.map(function(k){ return { x: k, y: bornAcc[k] }; });
    var diedData = keys.map(function(k){ return { x: k, y: diedAcc[k] || 0 }; });
    pitNucleationChart.data.datasets[0].data = bornData;
    pitNucleationChart.data.datasets[1].data = diedData;
    pitNucleationChart.update();
  }
}

/* Refresh spatial-statistics + composition charts. Called from app.js
   per worker iteration after trackPits(). */
function updatePitSpatialAndCompositionCharts(lattx) {
  var pits = window._currentPits || [];
  // ── NN distance histogram ──
  if (pitNNChart) {
    var nn = (typeof nearestNeighbourDistances === 'function') ? nearestNeighbourDistances(pits, lattx) : [];
    if (nn.length >= 3) {
      nn.sort(function(a,b){return a-b;});
      var nnMin = nn[0], nnMax = nn[nn.length-1];
      var iqr = nn[Math.floor(nn.length*0.75)] - nn[Math.floor(nn.length*0.25)];
      var fdW = iqr > 0 ? 2 * iqr / Math.pow(nn.length, 1/3) : Math.max((nnMax-nnMin)/8, 1);
      var nBins = Math.min(20, Math.max(4, Math.ceil((nnMax - nnMin) / fdW) || 4));
      var binW = (nnMax - nnMin) / nBins || 1;
      var bins = new Array(nBins).fill(0);
      var labels = [];
      for (var b = 0; b < nBins; b++) {
        var lo = nnMin + b * binW;
        var hi = nnMin + (b + 1) * binW;
        labels.push(Math.round(lo) + '–' + Math.round(hi));
      }
      for (var i = 0; i < nn.length; i++) {
        var bi = Math.min(nBins - 1, Math.floor((nn[i] - nnMin) / binW));
        bins[bi]++;
      }
      pitNNChart.data.labels = labels;
      pitNNChart.data.datasets[0].data = bins;
      pitNNChart.update();
    } else {
      pitNNChart.data.labels = [];
      pitNNChart.data.datasets[0].data = [];
      pitNNChart.update();
    }
  }

  // ── Pair correlation g(r) ──
  if (pitGRChart) {
    if (pits.length >= 4) {
      var pc = pairCorrelation(pits, lattx, { nBins: 30, rMax: lattx / 2 });
      var grPts = [], basePts = [];
      for (var k = 0; k < pc.r.length; k++) {
        grPts.push({ x: pc.r[k], y: pc.g[k] });
        basePts.push({ x: pc.r[k], y: 1 });
      }
      pitGRChart.data.datasets[0].data = grPts;
      pitGRChart.data.datasets[1].data = basePts;
      pitGRChart.update();
    } else {
      pitGRChart.data.datasets[0].data = [];
      pitGRChart.data.datasets[1].data = [];
      pitGRChart.update();
    }
  }

  // ── Composition scatter ──
  if (pitCompChart && typeof pitComposition === 'function') {
    if (pits.length > 0 && typeof lastSliceData !== 'undefined' && lastSliceData && typeof lastFullHt !== 'undefined' && lastFullHt) {
      var comp = pitComposition(pits, lastFullHt, lastSliceData, lastSliceH, lastSliceStart, lattx, { depthSamples: 4 });
      var scatter = comp.perPit
        .filter(function(c){ return c.geFrac !== null; })
        .map(function(c){ return { x: c.depth, y: c.geFrac }; });
      pitCompChart.data.datasets[0].data = scatter;
      // Baseline horizontal line at refGeFrac
      if (comp.refGeFrac !== null && scatter.length > 0) {
        var xs = scatter.map(function(s){return s.x;});
        var xMin = Math.min.apply(null, xs), xMax = Math.max.apply(null, xs);
        pitCompChart.data.datasets[1].data = [
          { x: xMin, y: comp.refGeFrac }, { x: xMax, y: comp.refGeFrac }
        ];
      } else {
        pitCompChart.data.datasets[1].data = [];
      }
      var disp = document.getElementById('pitCompDisp');
      if (disp) disp.textContent = comp.refGeFrac !== null
        ? 'ref Ge = ' + comp.refGeFrac.toFixed(3) + ' (n=' + comp.refN + ')'
        : 'ref = —';
      pitCompChart.update();
    } else {
      pitCompChart.data.datasets[0].data = [];
      pitCompChart.data.datasets[1].data = [];
      pitCompChart.update();
    }
  }
}

/* Restore phases from localStorage when the page loads. */
function restorePhases() {
  if (typeof Store === 'undefined') return;
  var saved = Store.get('kmc', 'phases');
  if (saved && Array.isArray(saved) && saved.length) {
    currentPhases = saved;
    renderPhasesOnMain();
    renderPhaseRows('phaseRows');
    renderPhaseMiniCharts('phaseMiniCharts', roughnessData);
  }
}

function fitLogLogSlope(points) {
  if (points.length < 2) return null;
  var n = points.length;
  var sx=0, sy=0, sxy=0, sxx=0;
  for (var i = 0; i < n; i++) { sx += points[i].x; sy += points[i].y; sxy += points[i].x*points[i].y; sxx += points[i].x*points[i].x; }
  var denom = n*sxx - sx*sx;
  if (Math.abs(denom) < 1e-15) return null;
  var slope = (n*sxy - sx*sy) / denom;
  var intercept = (sy - slope*sx) / n;
  return { slope: slope, intercept: intercept };
}

function updateCharts(d) {
  // Roughness
  roughnessData.push({ x: d.iter, y: d.rmsht });
  var fitMinVal = +document.getElementById('fitMin').value || 1;
  var fitMaxVal = +document.getElementById('fitMax').value || Infinity;
  var fit = fitPowerLaw(roughnessData, fitMinVal, fitMaxVal);
  roughnessChart.data.datasets[0].data = roughnessData;
  if (fit && roughnessData.length > 0) {
    var rMax = roughnessData[roughnessData.length-1].x;
    var fMin = Math.max(1, fitMinVal);
    var fMax = isFinite(fitMaxVal) ? Math.min(fitMaxVal, rMax) : rMax;
    roughnessChart.data.datasets[1].data = [{x:fMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMin))},{x:fMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMax))}];
  }
  applyFitZoom();
  roughnessChart.update();
  document.getElementById('betaDisp').textContent = fit ? '\u03B2 = ' + fit.beta.toFixed(4) : '\u03B2 = \u2014';

  // Etch depth & rate
  if (initialAveHt === null) initialAveHt = d.aveht;
  var depth = initialAveHt - d.aveht; // negative = etched deeper, but we want positive convention
  if (depth < 0) depth = -depth; // always show as positive etch depth
  etchDepthData.push({ x: d.iter, y: depth });
  var rate = 0;
  if (etchDepthData.length >= 2) {
    var prev = etchDepthData[etchDepthData.length - 2];
    var di = d.iter - prev.x;
    if (di > 0) rate = (depth - prev.y) / di;
  }
  etchRateData.push({ x: d.iter, y: rate });
  etchChart.data.datasets[0].data = etchDepthData;
  etchChart.data.datasets[1].data = etchRateData;
  etchChart.update();

  // Stats evolution
  rmsHistory.push(d.rmsht);
  skewHistory.push(d.skewness);
  kurtHistory.push(d.kurtosis);
  var sLabels = rmsHistory.map(function(_, i) { return i + 1; });
  statsChart.data.labels = sLabels;
  statsChart.data.datasets[0].data = rmsHistory;
  statsChart.data.datasets[1].data = skewHistory;
  statsChart.data.datasets[2].data = kurtHistory;
  statsChart.update();

  // Height histogram
  histChart.data.labels = d.htHistLabels.map(function(v) { return v.toFixed(0); });
  histChart.data.datasets[0].data = d.htHistCounts;
  histChart.update();

  // Surface profile
  surfaceChart.data.labels = d.htX;
  surfaceChart.data.datasets[0].data = d.htY;
  surfaceChart.update();

  // Concentration
  concChart.data.labels = d.concZ;
  concChart.data.datasets[0].data = d.concGe;
  concChart.update();
}

function refitBeta() {
  if (!roughnessChart || roughnessData.length < 3) return;
  var fitMinVal = +document.getElementById('fitMin').value || 1;
  var fitMaxVal = +document.getElementById('fitMax').value || Infinity;
  var fit = fitPowerLaw(roughnessData, fitMinVal, fitMaxVal);
  if (fit && roughnessData.length > 0) {
    var rMax = roughnessData[roughnessData.length-1].x;
    var fMin = Math.max(1, fitMinVal);
    var fMax = isFinite(fitMaxVal) ? Math.min(fitMaxVal, rMax) : rMax;
    roughnessChart.data.datasets[1].data = [{x:fMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMin))},{x:fMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMax))}];
  } else {
    roughnessChart.data.datasets[1].data = [];
  }
  applyFitZoom();
  roughnessChart.update();
  document.getElementById('betaDisp').textContent = fit ? '\u03B2 = ' + fit.beta.toFixed(4) : '\u03B2 = \u2014';
}

function applyFitZoom() {
  if (!roughnessChart) return;
  var fitMinVal = +document.getElementById('fitMin').value || 1;
  var fitMaxVal = +document.getElementById('fitMax').value || Infinity;
  if (roughnessData.length > 0) {
    var dataMax = roughnessData[roughnessData.length-1].x;
    var xMax = isFinite(fitMaxVal) ? Math.min(fitMaxVal, dataMax) : dataMax;
    roughnessChart.options.scales.x.min = Math.max(1, fitMinVal);
    roughnessChart.options.scales.x.max = xMax;
    // Let y-axis auto-fit to visible data
    delete roughnessChart.options.scales.y.min;
    delete roughnessChart.options.scales.y.max;
  }
}

function resetFitZoom() {
  if (!roughnessChart || roughnessData.length === 0) return;
  var dataMax = roughnessData[roughnessData.length-1].x;
  document.getElementById('fitMin').value = 1;
  document.getElementById('fitMax').value = dataMax;
  refitBeta();
}

function toggleSkewKurt() {
  var show = document.getElementById('showSkewKurt').checked;
  var els = document.querySelectorAll('[data-metric="skewkurt"]');
  for (var i = 0; i < els.length; i++) els[i].style.display = show ? '' : 'none';
  if (statsChart) {
    statsChart.data.datasets[1].hidden = !show;
    statsChart.data.datasets[2].hidden = !show;
    statsChart.options.scales.y2.display = show;
    statsChart.update();
  }
}

/* ── Height-Height Correlation G(r) ── */
function computeCorrelation(ht) {
  var N = ht.length;
  var maxR = Math.min(Math.floor(N / 2), 250);
  var rArr = new Array(maxR), gArr = new Array(maxR);
  for (var r = 1; r <= maxR; r++) {
    var sum = 0;
    for (var x = 0; x < N; x++) {
      var x2 = (x + r) % N;
      var d = ht[x2] - ht[x];
      sum += d * d;
    }
    rArr[r - 1] = r;
    gArr[r - 1] = Math.sqrt(sum / N);
  }
  return { r: rArr, g: gArr };
}

function fitAlpha(corrData) {
  if (!corrData || corrData.g.length < 5) return null;
  var satVal = corrData.g[corrData.g.length - 1];
  var xiIdx = corrData.g.length - 1;
  for (var i = 0; i < corrData.g.length; i++) {
    if (corrData.g[i] >= 0.9 * satVal) { xiIdx = i; break; }
  }
  var xi = corrData.r[xiIdx];
  var fitEnd = Math.max(5, Math.floor(xiIdx * 0.8));
  if (fitEnd > corrData.r.length) fitEnd = corrData.r.length;
  var logPts = [];
  for (var i = 0; i < fitEnd; i++) {
    if (corrData.g[i] > 0) logPts.push({ x: Math.log10(corrData.r[i]), y: Math.log10(corrData.g[i]) });
  }
  var fit = fitLogLogSlope(logPts);
  if (!fit) return null;
  return { alpha: fit.slope, intercept: fit.intercept, xi: xi, gInf: satVal };
}

function initCorrChart() {
  if (corrChart) corrChart.destroy();
  var cOpts = JSON.parse(JSON.stringify(chartDefaults));
  cOpts.scales.x.title = { display:true, text:'log\u2081\u2080(r)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  cOpts.scales.y.title = { display:true, text:'log\u2081\u2080(G(r))', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  cOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'Space Mono',size:9},boxWidth:12} };
  corrChart = new Chart(document.getElementById('corrChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'G(r)', data:[], borderColor:'#7da0dd', backgroundColor:'rgba(125,160,221,0.4)', borderWidth:1, pointRadius:2, showLine:true, tension:0, fill:false },
      { label:'\u03B1 fit', data:[], borderColor:'#f0b429', borderWidth:1.5, borderDash:[5,3], pointRadius:0, showLine:true, fill:false }
    ]},
    options: cOpts
  });
}

function updateCorrelation() {
  if (!lastFullHt || lastFullHt.length < 20 || !corrChart) return;
  var corr = computeCorrelation(lastFullHt);
  var logCorr = [];
  for (var i = 0; i < corr.r.length; i++) {
    if (corr.g[i] > 0) logCorr.push({ x: Math.log10(corr.r[i]), y: Math.log10(corr.g[i]) });
  }
  corrChart.data.datasets[0].data = logCorr;

  var result = fitAlpha(corr);
  if (result && logCorr.length > 0) {
    var xMin = logCorr[0].x;
    var xMax = Math.log10(Math.max(2, result.xi * 0.8));
    corrChart.data.datasets[1].data = [
      { x: xMin, y: result.intercept + result.alpha * xMin },
      { x: xMax, y: result.intercept + result.alpha * xMax }
    ];
    document.getElementById('alphaCorr').textContent = result.alpha.toFixed(4);
    document.getElementById('xiCorrStat').textContent = result.xi;
    document.getElementById('gInfRms').textContent = (result.gInf / Math.sqrt(2)).toFixed(4);
    // Also update summary card duplicates
    var ac2 = document.getElementById('alphaCorr2');
    if (ac2) ac2.textContent = result.alpha.toFixed(4);
    var xc2 = document.getElementById('xiCorr2');
    if (xc2) xc2.textContent = result.xi;
    if (rmsHistory.length > 0) {
      document.getElementById('rmsDirectCorr').textContent = rmsHistory[rmsHistory.length - 1].toFixed(4);
    }
    // Store for auto-suggest and export
    window._lastCorr = corr;
    window._lastAlphaResult = result;
  } else {
    corrChart.data.datasets[1].data = [];
  }
  corrChart.update();

  // Update stabilization indicator
  updateStabilizationIndicator();
}

function updateStabilizationIndicator() {
  var el = document.getElementById('roughnessStabilized');
  if (!el) return;
  if (rmsHistory.length < 10) { el.innerHTML = ''; return; }
  var stable = isRoughnessStabilized();
  el.innerHTML = stable
    ? '<span style="color:#3ca03c">\u25CF stabilized</span>'
    : '<span style="color:#f0b429">\u25CF transient</span>';
}

function isRoughnessStabilized() {
  if (rmsHistory.length < 10) return false;
  var last10 = rmsHistory.slice(-10);
  var sum = 0;
  for (var i = 0; i < 10; i++) sum += last10[i];
  var mean = sum / 10;
  if (mean === 0) return false;
  var v = 0;
  for (var i = 0; i < 10; i++) { var d = last10[i] - mean; v += d * d; }
  var cv = Math.sqrt(v / 10) / mean;
  return cv < 0.05;
}

/* Scaling exponent charts */
function initScalingCharts() {
  if (alphaChart) alphaChart.destroy();
  if (zChart) zChart.destroy();
  var aOpts = JSON.parse(JSON.stringify(chartDefaults));
  aOpts.scales.x.title = { display:true, text:'log\u2081\u2080(L)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  aOpts.scales.y.title = { display:true, text:'log\u2081\u2080(w_sat)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  alphaChart = new Chart(document.getElementById('alphaChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'data', data:[], borderColor:'#7da0dd', backgroundColor:'#7da0dd', borderWidth:1.5, pointRadius:4, showLine:false },
      { label:'fit', data:[], borderColor:'#7da0dd', borderWidth:1.5, borderDash:[5,3], pointRadius:0, showLine:true, fill:false }
    ]},
    options: aOpts
  });
  var zOpts = JSON.parse(JSON.stringify(chartDefaults));
  zOpts.scales.x.title = { display:true, text:'log\u2081\u2080(L)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  zOpts.scales.y.title = { display:true, text:'log\u2081\u2080(t_x)', color:'#4a6a4a', font:{family:'Space Mono',size:9} };
  zChart = new Chart(document.getElementById('zChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'data', data:[], borderColor:'#e24b4a', backgroundColor:'#e24b4a', borderWidth:1.5, pointRadius:4, showLine:false },
      { label:'fit', data:[], borderColor:'#e24b4a', borderWidth:1.5, borderDash:[5,3], pointRadius:0, showLine:true, fill:false }
    ]},
    options: zOpts
  });
}

/* ══════════════════════════════════════════════
   RICH SWEEP CHARTS (Investigation Protocol)
   ══════════════════════════════════════════════ */
var richSweepCharts = {};

function initRichSweepCharts(prefix, xLabel) {
  // Destroy existing
  var keys = ['Beta', 'Pits', 'PitWidth', 'Alpha', 'Xi', 'Etch'];
  for (var i = 0; i < keys.length; i++) {
    var k = prefix + keys[i];
    if (richSweepCharts[k]) { richSweepCharts[k].destroy(); richSweepCharts[k] = null; }
  }

  var metrics = [
    { suffix: 'Beta',     yLabel: '\u03B2 (growth exponent)', color: '#7dd87d' },
    { suffix: 'Pits',     yLabel: 'Pit count',                color: '#e24b4a' },
    { suffix: 'PitWidth', yLabel: 'Avg pit width (sites)',     color: '#f0b429' },
    { suffix: 'Alpha',    yLabel: '\u03B1 (roughness exponent)', color: '#7da0dd' },
    { suffix: 'Xi',       yLabel: '\u03BE (correlation length)', color: '#4a9aaa' },
    { suffix: 'Etch',     yLabel: 'Etch depth (layers)',       color: '#cfb03d' }
  ];

  for (var i = 0; i < metrics.length; i++) {
    var m = metrics[i];
    var canvasId = prefix + m.suffix + 'Chart';
    var el = document.getElementById(canvasId);
    if (!el) continue;
    richSweepCharts[prefix + m.suffix] = mkSweepChart(canvasId, xLabel, m.yLabel, m.color);
  }

  // Also init the basic RMS/skew/kurt charts
  var basicIds = [
    { id: prefix + 'RoughChart', label: 'RMS Roughness', color: '#7dd87d' },
    { id: prefix + 'SkewChart',  label: 'Skewness',      color: '#f0b429' },
    { id: prefix + 'KurtChart',  label: 'Kurtosis (excess)', color: '#e24b4a' }
  ];
  for (var j = 0; j < basicIds.length; j++) {
    var b = basicIds[j];
    var el2 = document.getElementById(b.id);
    if (!el2) continue;
    var key = prefix + b.id.replace(prefix, '');
    if (richSweepCharts[key]) richSweepCharts[key].destroy();
    richSweepCharts[key] = mkSweepChart(b.id, xLabel, b.label, b.color);
  }
}

function updateRichSweepCharts(prefix, results, paramName) {
  function mapField(field) {
    return results.filter(function(r) { return r[field] !== null && r[field] !== undefined; })
      .map(function(r) { return { x: r._paramVal, y: r[field] }; });
  }

  var charts = {
    'Beta':     'beta',
    'Pits':     'pitCount',
    'PitWidth': 'avgPitWidth',
    'Alpha':    'alpha',
    'Xi':       'xi',
    'Etch':     'etchDepth'
  };

  for (var suffix in charts) {
    var ch = richSweepCharts[prefix + suffix];
    if (ch) {
      ch.data.datasets[0].data = mapField(charts[suffix]);
      ch.update();
    }
  }

  // Basic charts
  var basicMap = { 'RoughChart': 'rmsht', 'SkewChart': 'skewness', 'KurtChart': 'kurtosis' };
  for (var bid in basicMap) {
    var ch2 = richSweepCharts[prefix + bid];
    if (ch2) {
      ch2.data.datasets[0].data = mapField(basicMap[bid]);
      ch2.update();
    }
  }
}
