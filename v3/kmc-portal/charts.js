/* charts.js — Chart.js plot management for KMC portal */

var roughnessChart = null, etchChart = null, surfaceChart = null, concChart = null;
var statsChart = null, histChart = null;
var pitHistChart = null, pitSurfaceChart = null, alphaChart = null, zChart = null;
var corrChart = null;
var tswRoughChart = null, tswSkewChart = null, tswKurtChart = null;
var cswRoughChart = null, cswSkewChart = null, cswKurtChart = null;

var roughnessData = [], etchDepthData = [], etchRateData = [];
var rmsHistory = [], skewHistory = [], kurtHistory = [];
var logMode = 'linear';
var initialAveHt = null;

var chartDefaults = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
  plugins: {
    legend: { display: false },
    tooltip: { backgroundColor:'#111a11', borderColor:'rgba(60,160,60,0.3)', borderWidth:1, titleColor:'#e8f0e8', bodyColor:'#7a9a7a',
      titleFont:{family:'JetBrains Mono',size:10}, bodyFont:{family:'JetBrains Mono',size:10} }
  },
  scales: {
    x: { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}} },
    y: { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}} }
  }
};

function mkChart(id, label, xLabel, yLabel, color, scaleType) {
  var opts = JSON.parse(JSON.stringify(chartDefaults));
  opts.scales.x.title = { display:true, text:xLabel, color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  opts.scales.y.title = { display:true, text:yLabel, color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  if (scaleType === 'log') { opts.scales.x.type = 'logarithmic'; opts.scales.y.type = 'logarithmic'; }
  return new Chart(document.getElementById(id), {
    type: 'line',
    data: { labels:[], datasets:[{ label:label, data:[], borderColor:color, borderWidth:1.5, pointRadius:0, fill:false, tension:0.2 }] },
    options: opts
  });
}

function initCharts() {
  if (logMode === 'linear') {
    roughnessChart = mkChart('roughnessChart', 'log\u2081\u2080(RMS)', 'log\u2081\u2080(iteration)', 'log\u2081\u2080(RMS roughness)', '#7dd87d', '');
  } else {
    roughnessChart = mkChart('roughnessChart', 'RMS', 'iteration', 'RMS roughness', '#7dd87d', 'log');
  }
  // Add fit + universality reference lines
  roughnessChart.data.datasets.push({ label:'fit', data:[], borderColor:'#f0b429', borderWidth:1.5, borderDash:[5,3], pointRadius:0, fill:false });
  roughnessChart.data.datasets.push({ label:'\u03B2_KPZ=0.333', data:[], borderColor:'rgba(125,160,221,0.5)', borderWidth:1, borderDash:[3,4], pointRadius:0, fill:false });
  roughnessChart.data.datasets.push({ label:'\u03B2_EW=0.25', data:[], borderColor:'rgba(125,221,125,0.5)', borderWidth:1, borderDash:[3,4], pointRadius:0, fill:false });
  roughnessChart.data.datasets.push({ label:'\u03B2_rand=0.5', data:[], borderColor:'rgba(226,75,74,0.5)', borderWidth:1, borderDash:[3,4], pointRadius:0, fill:false });
  roughnessChart.options.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9},boxWidth:12} };

  // Etch depth & rate (dual y-axis)
  var eOpts = JSON.parse(JSON.stringify(chartDefaults));
  eOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9},boxWidth:12} };
  etchChart = new Chart(document.getElementById('etchChart'), {
    type:'line',
    data:{ labels:[], datasets:[
      { label:'Etch Depth', data:[], borderColor:'#4a9aaa', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y' },
      { label:'Etch Rate', data:[], borderColor:'#f0b429', borderWidth:1, borderDash:[4,3], pointRadius:0, fill:false, yAxisID:'y2' }
    ]},
    options: { responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins: eOpts.plugins,
      scales: {
        x: { grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}}, title:{display:true,text:'iteration',color:'#4a6a4a',font:{family:'JetBrains Mono',size:9}} },
        y: { position:'left', grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}}, title:{display:true,text:'etch depth (layers)',color:'#4a9aaa',font:{family:'JetBrains Mono',size:9}} },
        y2: { position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}}, title:{display:true,text:'rate (layers/iter)',color:'#f0b429',font:{family:'JetBrains Mono',size:9}} }
      }
    }
  });

  surfaceChart = mkChart('surfaceChart', 'ht(x)', 'x', 'height', '#7dd87d', '');
  concChart = mkChart('concChart', 'Ge fraction', 'depth (z)', 'Ge/(Si+Ge)', '#FF7043', '');

  // Stats evolution chart (dual y-axis)
  var sOpts = JSON.parse(JSON.stringify(chartDefaults));
  sOpts.scales.x.title = { display:true, text:'iteration', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  sOpts.scales.y.title = { display:true, text:'RMS', color:'#7dd87d', font:{family:'JetBrains Mono',size:9} };
  sOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9},boxWidth:12} };
  statsChart = new Chart(document.getElementById('statsChart'), {
    type:'line',
    data:{ labels:[], datasets:[
      { label:'RMS', data:[], borderColor:'#7dd87d', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y' },
      { label:'Skewness', data:[], borderColor:'#f0b429', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y2' },
      { label:'Kurtosis', data:[], borderColor:'#e24b4a', borderWidth:1.5, pointRadius:0, fill:false, yAxisID:'y2' }
    ]},
    options: { responsive:true, maintainAspectRatio:false, animation:{duration:0},
      plugins: sOpts.plugins,
      scales: {
        x: sOpts.scales.x,
        y: { position:'left', grid:{color:'rgba(60,160,60,0.08)'}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}}, title:{display:true,text:'RMS',color:'#7dd87d',font:{family:'JetBrains Mono',size:9}} },
        y2: { position:'right', grid:{drawOnChartArea:false}, ticks:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9}}, title:{display:true,text:'skew / kurt',color:'#f0b429',font:{family:'JetBrains Mono',size:9}} }
      }
    }
  });

  // Height distribution histogram
  var hOpts = JSON.parse(JSON.stringify(chartDefaults));
  hOpts.scales.x.title = { display:true, text:'height', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  hOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  histChart = new Chart(document.getElementById('histChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(60,160,60,0.5)', borderWidth:0, borderRadius:2 }] },
    options: hOpts
  });

  // Pit width histogram
  var phOpts = JSON.parse(JSON.stringify(chartDefaults));
  phOpts.scales.x.title = { display:true, text:'pit width (sites)', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  phOpts.scales.y.title = { display:true, text:'count', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  pitHistChart = new Chart(document.getElementById('pitHistChart'), {
    type:'bar',
    data:{ labels:[], datasets:[{ data:[], backgroundColor:'rgba(226,75,74,0.5)', borderWidth:0, borderRadius:2 }] },
    options: phOpts
  });

  // Pit-highlighted surface profile
  var psOpts = JSON.parse(JSON.stringify(chartDefaults));
  psOpts.scales.x.title = { display:true, text:'x', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  psOpts.scales.y.title = { display:true, text:'height', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  psOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9},boxWidth:12} };
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
  opts.scales.x.title = { display:true, text:xLabel, color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  opts.scales.y.title = { display:true, text:yLabel, color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
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

function addUniversalityLines(fit, logData, rawData, fitMinVal, fitMaxVal) {
  var refBetas = [0.333, 0.25, 0.5];
  if (!fit || !logData || logData.length < 2) {
    for (var k = 0; k < 3; k++) roughnessChart.data.datasets[2 + k].data = [];
    return;
  }
  // Anchor reference lines at the midpoint of the fit range (not first data point)
  var fMin = Math.log10(Math.max(1, fitMinVal || 1));
  var fMax = Math.log10(fitMaxVal && isFinite(fitMaxVal) ? fitMaxVal : rawData[rawData.length-1].x);
  var midX = (fMin + fMax) / 2;
  var midY = fit.intercept + fit.beta * midX;
  var xMin = logData[0].x, xMax = logData[logData.length - 1].x;
  for (var k = 0; k < 3; k++) {
    var b = refBetas[k];
    var refIntercept = midY - b * midX;
    if (logMode === 'linear') {
      roughnessChart.data.datasets[2 + k].data = [
        { x: xMin, y: refIntercept + b * xMin },
        { x: xMax, y: refIntercept + b * xMax }
      ];
    } else {
      var rXmin = rawData[0].x, rXmax = rawData[rawData.length - 1].x;
      roughnessChart.data.datasets[2 + k].data = [
        { x: rXmin, y: Math.pow(10, refIntercept + b * Math.log10(rXmin)) },
        { x: rXmax, y: Math.pow(10, refIntercept + b * Math.log10(rXmax)) }
      ];
    }
  }
}

function updateCharts(d) {
  // Roughness
  roughnessData.push({ x: d.iter, y: d.rmsht });
  var fitMinVal = +document.getElementById('fitMin').value || 1;
  var fitMaxVal = +document.getElementById('fitMax').value || Infinity;
  var fit = fitPowerLaw(roughnessData, fitMinVal, fitMaxVal);
  if (logMode === 'linear') {
    var logData = roughnessData.filter(function(p) { return p.x > 0 && p.y > 0; }).map(function(p) { return { x: Math.log10(p.x), y: Math.log10(p.y) }; });
    roughnessChart.data.datasets[0].data = logData;
    if (fit && logData.length > 0) {
      var fMinLog = Math.log10(Math.max(1, fitMinVal));
      var fMaxLog = Math.log10(isFinite(fitMaxVal) ? fitMaxVal : roughnessData[roughnessData.length-1].x);
      roughnessChart.data.datasets[1].data = [{x:fMinLog,y:fit.intercept+fit.beta*fMinLog},{x:fMaxLog,y:fit.intercept+fit.beta*fMaxLog}];
    }
    addUniversalityLines(fit, logData, roughnessData, fitMinVal, fitMaxVal);
  } else {
    roughnessChart.data.datasets[0].data = roughnessData;
    if (fit && roughnessData.length > 0) {
      var fMin = Math.max(1, fitMinVal);
      var fMax = isFinite(fitMaxVal) ? fitMaxVal : roughnessData[roughnessData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:fMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMin))},{x:fMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMax))}];
    }
    var logData = roughnessData.filter(function(p) { return p.x > 0 && p.y > 0; }).map(function(p) { return { x: Math.log10(p.x), y: Math.log10(p.y) }; });
    addUniversalityLines(fit, logData, roughnessData, fitMinVal, fitMaxVal);
  }
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
  var logData = roughnessData.filter(function(p) { return p.x > 0 && p.y > 0; }).map(function(p) { return { x: Math.log10(p.x), y: Math.log10(p.y) }; });
  if (logMode === 'linear') {
    if (fit && logData.length > 0) {
      var fMinLog = Math.log10(Math.max(1, fitMinVal));
      var fMaxLog = Math.log10(isFinite(fitMaxVal) ? fitMaxVal : roughnessData[roughnessData.length-1].x);
      roughnessChart.data.datasets[1].data = [{x:fMinLog,y:fit.intercept+fit.beta*fMinLog},{x:fMaxLog,y:fit.intercept+fit.beta*fMaxLog}];
    } else { roughnessChart.data.datasets[1].data = []; }
  } else {
    if (fit && roughnessData.length > 0) {
      var fMin = Math.max(1, fitMinVal);
      var fMax = isFinite(fitMaxVal) ? fitMaxVal : roughnessData[roughnessData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:fMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMin))},{x:fMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMax))}];
    } else { roughnessChart.data.datasets[1].data = []; }
  }
  addUniversalityLines(fit, logData, roughnessData, fitMinVal, fitMaxVal);
  roughnessChart.update();
  document.getElementById('betaDisp').textContent = fit ? '\u03B2 = ' + fit.beta.toFixed(4) : '\u03B2 = \u2014';
}

function setLogMode(mode) {
  logMode = mode;
  document.getElementById('logLinBtn').classList.toggle('active', mode === 'linear');
  document.getElementById('logScaleBtn').classList.toggle('active', mode === 'logscale');
  if (roughnessChart) roughnessChart.destroy();
  if (logMode === 'linear') {
    roughnessChart = mkChart('roughnessChart', 'log\u2081\u2080(RMS)', 'log\u2081\u2080(iteration)', 'log\u2081\u2080(RMS roughness)', '#7dd87d', '');
  } else {
    roughnessChart = mkChart('roughnessChart', 'RMS', 'iteration', 'RMS roughness', '#7dd87d', 'log');
  }
  roughnessChart.data.datasets.push({ label:'fit', data:[], borderColor:'#f0b429', borderWidth:1.5, borderDash:[5,3], pointRadius:0, fill:false });
  roughnessChart.data.datasets.push({ label:'\u03B2_KPZ=0.333', data:[], borderColor:'rgba(125,160,221,0.5)', borderWidth:1, borderDash:[3,4], pointRadius:0, fill:false });
  roughnessChart.data.datasets.push({ label:'\u03B2_EW=0.25', data:[], borderColor:'rgba(125,221,125,0.5)', borderWidth:1, borderDash:[3,4], pointRadius:0, fill:false });
  roughnessChart.data.datasets.push({ label:'\u03B2_rand=0.5', data:[], borderColor:'rgba(226,75,74,0.5)', borderWidth:1, borderDash:[3,4], pointRadius:0, fill:false });
  roughnessChart.options.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9},boxWidth:12} };

  var fitMinVal = +document.getElementById('fitMin').value || 1;
  var fitMaxVal = +document.getElementById('fitMax').value || Infinity;
  var fit = fitPowerLaw(roughnessData, fitMinVal, fitMaxVal);
  var logData = roughnessData.filter(function(p) { return p.x > 0 && p.y > 0; }).map(function(p) { return { x:Math.log10(p.x), y:Math.log10(p.y) }; });
  if (logMode === 'linear') {
    roughnessChart.data.datasets[0].data = logData;
    if (fit && logData.length > 0) {
      var fMinLog = Math.log10(Math.max(1, fitMinVal));
      var fMaxLog = Math.log10(isFinite(fitMaxVal) ? fitMaxVal : roughnessData[roughnessData.length-1].x);
      roughnessChart.data.datasets[1].data = [{x:fMinLog,y:fit.intercept+fit.beta*fMinLog},{x:fMaxLog,y:fit.intercept+fit.beta*fMaxLog}];
    }
  } else {
    roughnessChart.data.datasets[0].data = roughnessData;
    if (fit && roughnessData.length > 0) {
      var fMin = Math.max(1, fitMinVal);
      var fMax = isFinite(fitMaxVal) ? fitMaxVal : roughnessData[roughnessData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:fMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMin))},{x:fMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(fMax))}];
    }
  }
  addUniversalityLines(fit, logData, roughnessData, fitMinVal, fitMaxVal);
  roughnessChart.update();
  document.getElementById('betaDisp').textContent = fit ? '\u03B2 = ' + fit.beta.toFixed(4) : '\u03B2 = \u2014';
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
  cOpts.scales.x.title = { display:true, text:'log\u2081\u2080(r)', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  cOpts.scales.y.title = { display:true, text:'log\u2081\u2080(G(r))', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  cOpts.plugins.legend = { display:true, labels:{color:'#7a9a7a',font:{family:'JetBrains Mono',size:9},boxWidth:12} };
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
  aOpts.scales.x.title = { display:true, text:'log\u2081\u2080(L)', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  aOpts.scales.y.title = { display:true, text:'log\u2081\u2080(w_sat)', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  alphaChart = new Chart(document.getElementById('alphaChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'data', data:[], borderColor:'#7da0dd', backgroundColor:'#7da0dd', borderWidth:1.5, pointRadius:4, showLine:false },
      { label:'fit', data:[], borderColor:'#7da0dd', borderWidth:1.5, borderDash:[5,3], pointRadius:0, showLine:true, fill:false }
    ]},
    options: aOpts
  });
  var zOpts = JSON.parse(JSON.stringify(chartDefaults));
  zOpts.scales.x.title = { display:true, text:'log\u2081\u2080(L)', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  zOpts.scales.y.title = { display:true, text:'log\u2081\u2080(t_x)', color:'#4a6a4a', font:{family:'JetBrains Mono',size:9} };
  zChart = new Chart(document.getElementById('zChart'), {
    type:'scatter',
    data:{ datasets:[
      { label:'data', data:[], borderColor:'#e24b4a', backgroundColor:'#e24b4a', borderWidth:1.5, pointRadius:4, showLine:false },
      { label:'fit', data:[], borderColor:'#e24b4a', borderWidth:1.5, borderDash:[5,3], pointRadius:0, showLine:true, fill:false }
    ]},
    options: zOpts
  });
}
