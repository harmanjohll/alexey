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

/* Auto-inject export buttons into all chart cards */
function injectExportButtons() {
  var canvases = document.querySelectorAll('.chart-wrap canvas, .lattice-wrap canvas, .heightmap-wrap canvas');
  for (var i = 0; i < canvases.length; i++) {
    var cvs = canvases[i];
    var card = cvs.closest('.dash-card');
    if (!card || card.querySelector('.export-png-btn')) continue;
    var hdr = card.querySelector('.card-hdr');
    if (!hdr) {
      // card-label only (no card-hdr) — wrap it
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
    btn.textContent = '\u2193 PNG';
    btn.setAttribute('data-canvas', cvs.id);
    btn.onclick = function() { exportChartPNG(this.getAttribute('data-canvas')); };
    hdr.appendChild(btn);
  }
}


var roughnessChart = null, etchChart = null, surfaceChart = null, concChart = null;
var statsChart = null, histChart = null;
var pitHistChart = null, pitSurfaceChart = null, alphaChart = null, zChart = null;
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
  roughnessChart = mkChart('roughnessChart', 'RMS', 'iteration', 'RMS roughness', '#7dd87d', 'log');
  // Dataset 1: fit line within the selected range
  roughnessChart.data.datasets.push({ label:'fit', data:[], borderColor:'#f0b429', borderWidth:2, borderDash:[6,3], pointRadius:0, fill:false });
  roughnessChart.options.plugins.legend = { display:false };

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
  [roughnessChart, etchChart, surfaceChart, concChart, statsChart, histChart, pitHistChart, pitSurfaceChart, alphaChart, zChart, corrChart].forEach(function(c) { if(c) c.destroy(); });
  roughnessChart = etchChart = surfaceChart = concChart = statsChart = histChart = pitHistChart = pitSurfaceChart = alphaChart = zChart = corrChart = null;
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

/* Power-law regression on log-log data */
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
