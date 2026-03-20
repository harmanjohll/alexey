/* charts.js — Chart.js plot management for KMC portal */

var roughnessChart = null, heightChart = null, surfaceChart = null, concChart = null;
var statsChart = null, histChart = null;
var pitHistChart = null, pitSurfaceChart = null, alphaChart = null, zChart = null;
var tswRoughChart = null, tswSkewChart = null, tswKurtChart = null;
var cswRoughChart = null, cswSkewChart = null, cswKurtChart = null;

var roughnessData = [], heightData = [];
var rmsHistory = [], skewHistory = [], kurtHistory = [];
var logMode = 'linear';

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

  heightChart = mkChart('heightChart', 'Avg Height', 'iteration', 'avg height', '#4a9aaa', '');
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
}

function destroyCharts() {
  [roughnessChart, heightChart, surfaceChart, concChart, statsChart, histChart, pitHistChart, pitSurfaceChart, alphaChart, zChart].forEach(function(c) { if(c) c.destroy(); });
  roughnessChart = heightChart = surfaceChart = concChart = statsChart = histChart = pitHistChart = pitSurfaceChart = alphaChart = zChart = null;
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

function addUniversalityLines(fit, logData, rawData) {
  var refBetas = [0.333, 0.25, 0.5];
  if (!fit || !logData || logData.length < 2) {
    for (var k = 0; k < 3; k++) roughnessChart.data.datasets[2 + k].data = [];
    return;
  }
  var xMin = logData[0].x, xMax = logData[logData.length - 1].x;
  for (var k = 0; k < 3; k++) {
    var b = refBetas[k];
    var refIntercept = logData[0].y - b * logData[0].x;
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
      var xMin = logData[0].x, xMax = logData[logData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:xMin,y:fit.intercept+fit.beta*xMin},{x:xMax,y:fit.intercept+fit.beta*xMax}];
    }
    addUniversalityLines(fit, logData, roughnessData);
  } else {
    roughnessChart.data.datasets[0].data = roughnessData;
    if (fit && roughnessData.length > 0) {
      var xMin = roughnessData[0].x, xMax = roughnessData[roughnessData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:xMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(xMin))},{x:xMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(xMax))}];
    }
    var logData = roughnessData.filter(function(p) { return p.x > 0 && p.y > 0; }).map(function(p) { return { x: Math.log10(p.x), y: Math.log10(p.y) }; });
    addUniversalityLines(fit, logData, roughnessData);
  }
  roughnessChart.update();
  document.getElementById('betaDisp').textContent = fit ? '\u03B2 = ' + fit.beta.toFixed(4) : '\u03B2 = \u2014';

  // Height
  heightData.push({ x: d.iter, y: d.aveht });
  heightChart.data.datasets[0].data = heightData;
  heightChart.update();

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
      var xMin = logData[0].x, xMax = logData[logData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:xMin,y:fit.intercept+fit.beta*xMin},{x:xMax,y:fit.intercept+fit.beta*xMax}];
    } else { roughnessChart.data.datasets[1].data = []; }
  } else {
    if (fit && roughnessData.length > 0) {
      var xMin = roughnessData[0].x, xMax = roughnessData[roughnessData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:xMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(xMin))},{x:xMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(xMax))}];
    } else { roughnessChart.data.datasets[1].data = []; }
  }
  addUniversalityLines(fit, logData, roughnessData);
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
      var xMin = logData[0].x, xMax = logData[logData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:xMin,y:fit.intercept+fit.beta*xMin},{x:xMax,y:fit.intercept+fit.beta*xMax}];
    }
  } else {
    roughnessChart.data.datasets[0].data = roughnessData;
    if (fit && roughnessData.length > 0) {
      var xMin = roughnessData[0].x, xMax = roughnessData[roughnessData.length-1].x;
      roughnessChart.data.datasets[1].data = [{x:xMin,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(xMin))},{x:xMax,y:Math.pow(10,fit.intercept+fit.beta*Math.log10(xMax))}];
    }
  }
  addUniversalityLines(fit, logData, roughnessData);
  roughnessChart.update();
  document.getElementById('betaDisp').textContent = fit ? '\u03B2 = ' + fit.beta.toFixed(4) : '\u03B2 = \u2014';
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
