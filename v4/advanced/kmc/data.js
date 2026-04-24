/* data.js — Data management, pit analysis, scaling exponents, logbook, export for KMC portal */

var scalingData = [];
try { scalingData = JSON.parse(localStorage.getItem('alexey_kmc_scaling') || '[]'); } catch(e) { scalingData = []; }
var LOGBOOK_KEY = 'alexey_kmc_logbook';

/* ── Pit Analysis ── */
function analyzePits(htArray, opts) {
  /* opts: { method:'sigma'|'range'|'slope', k:1.0, minWidth:3, gapMerge:2, slopeThresh:1.0 } */
  if (!opts) opts = {};
  var method = opts.method || 'sigma';
  var k = opts.k !== undefined ? opts.k : 1.0;
  var minWidth = opts.minWidth !== undefined ? opts.minWidth : 3;
  var gapMerge = opts.gapMerge !== undefined ? opts.gapMerge : 2;
  var slopeThresh = opts.slopeThresh !== undefined ? opts.slopeThresh : 1.0;

  var n = htArray.length;
  if (n === 0) return { pits: [], cutoff: 0, mean: 0, range: 0, sigma: 0 };

  var sum = 0;
  for (var i = 0; i < n; i++) sum += htArray[i];
  var mean = sum / n;

  var hMin = Infinity, hMax = -Infinity;
  var m2 = 0;
  for (var i = 0; i < n; i++) {
    if (htArray[i] < hMin) hMin = htArray[i];
    if (htArray[i] > hMax) hMax = htArray[i];
    var d = htArray[i] - mean;
    m2 += d * d;
  }
  var sigma = Math.sqrt(m2 / n);
  var range = hMax - hMin;
  if (range === 0) return { pits: [], cutoff: mean, mean: mean, range: 0, sigma: 0 };

  var cutoff;
  var belowCutoff;

  if (method === 'slope') {
    // Slope-based: find pit regions by local gradient
    // Compute forward difference gradient
    var grad = new Float64Array(n);
    for (var i = 0; i < n - 1; i++) grad[i] = htArray[i + 1] - htArray[i];
    grad[n - 1] = 0;

    // Mark pit interiors: regions below mean where bounded by steep slopes
    belowCutoff = new Uint8Array(n);
    cutoff = mean; // pits must be below mean
    var inDescent = false, descentStart = -1;
    for (var i = 0; i < n; i++) {
      if (grad[i] > slopeThresh) {
        // steep ascending slope = potential right edge of pit
        inDescent = false;
      } else if (grad[i] < -slopeThresh) {
        // steep descending slope = potential left edge of pit
        if (!inDescent) { inDescent = true; descentStart = i; }
      }
      // Mark below-mean regions that follow a descent
      if (htArray[i] < mean) belowCutoff[i] = 1;
    }
  } else {
    // Threshold-based methods
    if (method === 'sigma') {
      cutoff = mean - k * sigma;
    } else {
      cutoff = mean - k * range;
    }
    belowCutoff = new Uint8Array(n);
    for (var i = 0; i < n; i++) {
      if (htArray[i] < cutoff) belowCutoff[i] = 1;
    }
  }

  // Extract contiguous regions
  var rawPits = [];
  var inPit = false, pitStart = 0, pitMinH = Infinity;
  for (var i = 0; i < n; i++) {
    if (belowCutoff[i]) {
      if (!inPit) { inPit = true; pitStart = i; pitMinH = htArray[i]; }
      if (htArray[i] < pitMinH) pitMinH = htArray[i];
    } else {
      if (inPit) {
        rawPits.push({ start: pitStart, end: i, width: i - pitStart, depth: mean - pitMinH, minH: pitMinH });
        inPit = false;
      }
    }
  }
  if (inPit) rawPits.push({ start: pitStart, end: n, width: n - pitStart, depth: mean - pitMinH, minH: pitMinH });

  // Merge pits separated by small gaps
  var merged = [];
  for (var i = 0; i < rawPits.length; i++) {
    if (merged.length > 0) {
      var last = merged[merged.length - 1];
      var gap = rawPits[i].start - last.end;
      if (gap <= gapMerge) {
        // Merge: extend last pit to include this one
        last.end = rawPits[i].end;
        last.width = last.end - last.start;
        if (rawPits[i].minH < last.minH) last.minH = rawPits[i].minH;
        last.depth = mean - last.minH;
        continue;
      }
    }
    merged.push({ start: rawPits[i].start, end: rawPits[i].end, width: rawPits[i].width, depth: rawPits[i].depth, minH: rawPits[i].minH });
  }

  // Filter by minimum width
  var pits = [];
  for (var i = 0; i < merged.length; i++) {
    if (merged[i].width >= minWidth) {
      pits.push({ start: merged[i].start, width: merged[i].width, depth: merged[i].depth });
    }
  }

  return { pits: pits, cutoff: cutoff, mean: mean, range: range, sigma: sigma, method: method };
}

function updatePitAnalysis() {
  if (!lastFullHt || lastFullHt.length === 0) return;
  var methodEl = document.getElementById('pitMethod');
  var method = methodEl ? methodEl.value : 'sigma';
  var k = +(document.getElementById('pitThreshold').value) || 1.0;
  var minW = +(document.getElementById('pitMinWidth') || {}).value || 3;
  var gapM = +(document.getElementById('pitGapMerge') || {}).value || 2;
  var slopeT = +(document.getElementById('pitSlopeThresh') || {}).value || 1.0;
  var result = analyzePits(lastFullHt, { method: method, k: k, minWidth: minW, gapMerge: gapM, slopeThresh: slopeT });
  var pits = result.pits;

  document.getElementById('pitCount').textContent = pits.length;
  if (pits.length > 0) {
    var avgW = pits.reduce(function(s, p) { return s + p.width; }, 0) / pits.length;
    var maxW = 0; for (var i = 0; i < pits.length; i++) if (pits[i].width > maxW) maxW = pits[i].width;
    var avgD = pits.reduce(function(s, p) { return s + p.depth; }, 0) / pits.length;
    var maxD = 0; for (var i = 0; i < pits.length; i++) if (pits[i].depth > maxD) maxD = pits[i].depth;
    var totalPitSites = pits.reduce(function(s, p) { return s + p.width; }, 0);
    document.getElementById('pitAvgW').textContent = avgW.toFixed(1);
    document.getElementById('pitMaxW').textContent = maxW;
    document.getElementById('pitAvgD').textContent = avgD.toFixed(2);
    document.getElementById('pitMaxD').textContent = maxD.toFixed(2);
    document.getElementById('pitCoverage').textContent = ((totalPitSites / lastFullHt.length) * 100).toFixed(1) + '%';
  } else {
    ['pitAvgW','pitMaxW','pitAvgD','pitMaxD','pitCoverage'].forEach(function(id) { document.getElementById(id).textContent = '\u2014'; });
  }
  document.getElementById('pitCutoff').textContent = result.cutoff.toFixed(1) + (result.sigma > 0 ? ' (\u03C3=' + result.sigma.toFixed(2) + ')' : '');
  document.getElementById('pitMeanH').textContent = result.mean.toFixed(1);

  // Pit width histogram
  if (pitHistChart && pits.length > 0) {
    var widths = pits.map(function(p) { return p.width; });
    var maxPW = 0; for (var i = 0; i < widths.length; i++) if (widths[i] > maxPW) maxPW = widths[i];
    var nBins = Math.min(20, maxPW);
    var binW = Math.max(1, Math.ceil(maxPW / nBins));
    var bins = [];
    var labels = [];
    for (var b = 0; b < nBins; b++) {
      bins.push(0);
      var lo = b * binW + 1;
      var hi = (b + 1) * binW;
      labels.push(lo === hi ? '' + lo : lo + '-' + hi);
    }
    for (var i = 0; i < widths.length; i++) {
      var b = Math.min(nBins - 1, Math.floor((widths[i] - 1) / binW));
      bins[b]++;
    }
    pitHistChart.data.labels = labels;
    pitHistChart.data.datasets[0].data = bins;
    pitHistChart.update();
  } else if (pitHistChart) {
    pitHistChart.data.labels = [];
    pitHistChart.data.datasets[0].data = [];
    pitHistChart.update();
  }

  // Pit-highlighted surface profile
  if (pitSurfaceChart) {
    var step = Math.max(1, Math.floor(lastFullHt.length / 500));
    var xs = [], surfY = [], pitY = [], threshY = [];
    var isPit = new Uint8Array(lastFullHt.length);
    for (var p = 0; p < pits.length; p++) {
      for (var i = pits[p].start; i < pits[p].start + pits[p].width && i < lastFullHt.length; i++) isPit[i] = 1;
    }
    for (var x = 0; x < lastFullHt.length; x += step) {
      xs.push(x);
      surfY.push(lastFullHt[x]);
      pitY.push(isPit[x] ? lastFullHt[x] : null);
      threshY.push(result.cutoff);
    }
    pitSurfaceChart.data.labels = xs;
    pitSurfaceChart.data.datasets[0].data = surfY;
    pitSurfaceChart.data.datasets[1].data = pitY;
    pitSurfaceChart.data.datasets[2].data = threshY;
    pitSurfaceChart.update();
  }
}

/* ── Scaling Exponents ── */
function renderScalingTable() {
  var tbl = document.getElementById('scalingTable');
  var html = '<tr><th>L (lattx)</th><th style="text-align:right">w_sat (RMS)</th><th style="text-align:right">t_x (iter)</th><th></th></tr>';
  for (var i = 0; i < scalingData.length; i++) {
    var row = scalingData[i];
    html += '<tr><td class="num">' + row.L + '</td><td class="num">' + row.wsat.toFixed(4) + '</td><td class="num">' + row.tx + '</td><td><button class="sm danger" onclick="removeScalingEntry(' + i + ')" style="padding:2px 6px;font-size:9px">&times;</button></td></tr>';
  }
  tbl.innerHTML = html;
}

function addScalingEntry() {
  var L = +document.getElementById('scaleL').value;
  var wsat = +document.getElementById('scaleWsat').value;
  var tx = +document.getElementById('scaleTx').value;
  if (!L || !wsat || !tx) return;
  scalingData.push({ L: L, wsat: wsat, tx: tx });
  localStorage.setItem('alexey_kmc_scaling', JSON.stringify(scalingData));
  renderScalingTable();
  updateScalingPlots();
  document.getElementById('scaleL').value = '';
  document.getElementById('scaleWsat').value = '';
  document.getElementById('scaleTx').value = '';
}

function removeScalingEntry(idx) {
  scalingData.splice(idx, 1);
  localStorage.setItem('alexey_kmc_scaling', JSON.stringify(scalingData));
  renderScalingTable();
  updateScalingPlots();
}

function clearScalingData() {
  scalingData = [];
  localStorage.setItem('alexey_kmc_scaling', '[]');
  renderScalingTable();
  updateScalingPlots();
}

function autoRecordScaling() {
  if (roughnessData.length < 5) { alert('Run a simulation first'); return; }
  var L = +document.getElementById('pLattx').value;
  var n = roughnessData.length;
  var startIdx = Math.floor(n * 0.8);
  var sumRms = 0;
  for (var i = startIdx; i < n; i++) sumRms += roughnessData[i].y;
  var wsat = sumRms / (n - startIdx);
  var target = 0.9 * wsat;
  var tx = roughnessData[roughnessData.length - 1].x;
  for (var i = 0; i < n; i++) {
    if (roughnessData[i].y >= target) { tx = roughnessData[i].x; break; }
  }
  scalingData.push({ L: L, wsat: wsat, tx: tx });
  localStorage.setItem('alexey_kmc_scaling', JSON.stringify(scalingData));
  renderScalingTable();
  updateScalingPlots();
}

function updateScalingPlots() {
  if (!alphaChart || !zChart) return;
  var fitMinVal = +document.getElementById('fitMin').value || 1;
  var fitMaxVal = +document.getElementById('fitMax').value || Infinity;
  var betaFit = fitPowerLaw(roughnessData, fitMinVal, fitMaxVal);
  var betaVal = betaFit ? betaFit.beta : null;
  document.getElementById('scaleBeta').textContent = betaVal !== null ? betaVal.toFixed(4) : '\u2014';

  if (scalingData.length < 2) {
    alphaChart.data.datasets[0].data = [];
    alphaChart.data.datasets[1].data = [];
    alphaChart.update();
    zChart.data.datasets[0].data = [];
    zChart.data.datasets[1].data = [];
    zChart.update();
    document.getElementById('scaleAlpha').textContent = '\u2014';
    document.getElementById('scaleZ').textContent = '\u2014';
    document.getElementById('scaleClass').textContent = '\u2014';
    return;
  }

  var alphaPoints = scalingData.map(function(d) { return { x: Math.log10(d.L), y: Math.log10(d.wsat) }; });
  alphaChart.data.datasets[0].data = alphaPoints;
  var alphaFit = fitLogLogSlope(alphaPoints);
  if (alphaFit) {
    var xMin = alphaPoints[0].x, xMax = alphaPoints[alphaPoints.length-1].x;
    for (var i = 1; i < alphaPoints.length; i++) { if (alphaPoints[i].x < xMin) xMin = alphaPoints[i].x; if (alphaPoints[i].x > xMax) xMax = alphaPoints[i].x; }
    alphaChart.data.datasets[1].data = [
      { x: xMin, y: alphaFit.intercept + alphaFit.slope * xMin },
      { x: xMax, y: alphaFit.intercept + alphaFit.slope * xMax }
    ];
    document.getElementById('scaleAlpha').textContent = alphaFit.slope.toFixed(4);
  } else {
    alphaChart.data.datasets[1].data = [];
    document.getElementById('scaleAlpha').textContent = '\u2014';
  }
  alphaChart.update();

  var zPoints = scalingData.map(function(d) { return { x: Math.log10(d.L), y: Math.log10(d.tx) }; });
  zChart.data.datasets[0].data = zPoints;
  var zFit = fitLogLogSlope(zPoints);
  if (zFit) {
    var xMin = zPoints[0].x, xMax = zPoints[zPoints.length-1].x;
    for (var i = 1; i < zPoints.length; i++) { if (zPoints[i].x < xMin) xMin = zPoints[i].x; if (zPoints[i].x > xMax) xMax = zPoints[i].x; }
    zChart.data.datasets[1].data = [
      { x: xMin, y: zFit.intercept + zFit.slope * xMin },
      { x: xMax, y: zFit.intercept + zFit.slope * xMax }
    ];
    document.getElementById('scaleZ').textContent = zFit.slope.toFixed(4);
  } else {
    zChart.data.datasets[1].data = [];
    document.getElementById('scaleZ').textContent = '\u2014';
  }
  zChart.update();

  var alpha = alphaFit ? alphaFit.slope : null;
  var zVal = zFit ? zFit.slope : null;
  classifyUniversality(betaVal, alpha, zVal);
}

function classifyUniversality(beta, alpha, z) {
  var el = document.getElementById('scaleClass');
  var classes = [
    { name: 'Random deposition (1+1D)', b: 0.5, a: 0.5, z: 1 },
    { name: 'Edwards-Wilkinson (1+1D)', b: 0.25, a: 0.5, z: 2 },
    { name: 'KPZ (1+1D)', b: 0.333, a: 0.5, z: 1.5 },
    { name: 'KPZ (2+1D)', b: 0.24, a: 0.39, z: 1.61 },
    { name: 'MBE/Mullins-Herring (2+1D)', b: 0.25, a: 1.0, z: 4 }
  ];
  if (beta === null) { el.textContent = '\u2014'; return; }
  var best = null, bestDist = Infinity;
  for (var i = 0; i < classes.length; i++) {
    var c = classes[i];
    var dist = Math.abs(beta - c.b);
    if (alpha !== null) dist += Math.abs(alpha - c.a);
    if (z !== null) dist += Math.abs(z - c.z) * 0.5;
    if (dist < bestDist) { bestDist = dist; best = c; }
  }
  el.textContent = best ? best.name : '\u2014';
}

/* ── Logbook ── */
function getLogEntries() {
  try { return JSON.parse(localStorage.getItem(LOGBOOK_KEY)) || []; }
  catch(e) { return []; }
}

function saveLogEntries(entries) {
  localStorage.setItem(LOGBOOK_KEY, JSON.stringify(entries));
}

function renderLogbook() {
  var entries = getLogEntries();
  var el = document.getElementById('logbookEntries');
  if (entries.length === 0) {
    el.innerHTML = '<div class="logbook-empty">No entries yet. Run a simulation and record your observations.</div>';
    return;
  }
  var html = '';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var typeClass = e.type === 'obs' ? 'obs' : e.type === 'quest' ? 'quest' : 'conc';
    var typeLabel = e.type === 'obs' ? 'Observation' : e.type === 'quest' ? 'Question' : 'Conclusion';
    var date = new Date(e.timestamp);
    var ts = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    html += '<div class="log-entry">'
      + '<div class="log-entry-hdr">'
      + '<span class="log-type-tag ' + typeClass + '">' + typeLabel + '</span>'
      + '<span class="log-entry-ts">' + ts + '</span>'
      + '<div class="log-entry-actions"><button onclick="deleteLogEntry(' + i + ')">&times;</button></div>'
      + '</div>'
      + '<div class="log-entry-text">' + e.text.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>'
      + (e.context ? '<div class="log-entry-ctx">' + e.context + '</div>' : '')
      + '</div>';
  }
  el.innerHTML = html;
}

function addLogEntry() {
  var text = document.getElementById('logText').value.trim();
  if (!text) return;
  var type = document.getElementById('logType').value;
  var entries = getLogEntries();
  entries.push({id: Date.now().toString(36), timestamp: new Date().toISOString(), type: type, text: text, context:''});
  saveLogEntries(entries);
  document.getElementById('logText').value = '';
  renderLogbook();
}

function deleteLogEntry(idx) {
  var entries = getLogEntries();
  entries.splice(idx, 1);
  saveLogEntries(entries);
  renderLogbook();
}

/* ── Auto-suggest pit parameters ── */
function autoSuggestPitParams() {
  if (!lastFullHt || lastFullHt.length === 0) { alert('Run a simulation first'); return; }
  var n = lastFullHt.length;

  // Compute quartiles for IQR method
  var sorted = Array.prototype.slice.call(lastFullHt).sort(function(a, b) { return a - b; });
  var q1 = sorted[Math.floor(n * 0.25)];
  var q3 = sorted[Math.floor(n * 0.75)];
  var iqr = q3 - q1;

  // Compute mean and sigma
  var sum = 0;
  for (var i = 0; i < n; i++) sum += lastFullHt[i];
  var mean = sum / n;
  var m2 = 0;
  for (var i = 0; i < n; i++) { var d = lastFullHt[i] - mean; m2 += d * d; }
  var sigma = Math.sqrt(m2 / n);

  // k from IQR: lower fence = Q1 - 1.5*IQR, then k = (mean - lowerFence)/sigma
  var k = 1.5;
  if (sigma > 0) {
    var lowerFence = q1 - 1.5 * iqr;
    k = (mean - lowerFence) / sigma;
    k = Math.max(1.0, Math.min(3.0, k));
  }

  // minWidth from correlation length xi
  var minW = 3;
  if (window._lastAlphaResult && window._lastAlphaResult.xi) {
    minW = Math.max(3, Math.floor(window._lastAlphaResult.xi / 2));
  }

  // Apply to inputs
  var methodEl = document.getElementById('pitMethod');
  if (methodEl) methodEl.value = 'sigma';
  var kEl = document.getElementById('pitThreshold');
  if (kEl) kEl.value = k.toFixed(1);
  var mwEl = document.getElementById('pitMinWidth');
  if (mwEl) mwEl.value = minW;

  updatePitAnalysis();
}

/* ── Export data snapshot (JSON) ── */
function exportSnapshot() {
  var params = readParams();
  var iter = document.getElementById('stIter').textContent;

  // Gather stats
  var stats = {
    rms: document.getElementById('stRms').textContent,
    stdev: document.getElementById('stStd').textContent,
    skewness: document.getElementById('stSkew').textContent,
    kurtosis: document.getElementById('stKurt').textContent,
    aveht: document.getElementById('stAveht').textContent,
    etchDepth: document.getElementById('stEtchDepth').textContent,
    etchRate: document.getElementById('stEtchRate').textContent,
    selectivity: document.getElementById('stSelectivity').textContent,
    heightRange: document.getElementById('stRange').textContent,
    surfaceWidth: document.getElementById('stWidth').textContent
  };

  // Scaling exponents
  var scaling = {
    beta: document.getElementById('betaDisp').textContent,
    alphaCorr: document.getElementById('alphaCorr').textContent,
    xi: document.getElementById('xiCorrStat').textContent,
    gInfOverSqrt2: document.getElementById('gInfRms').textContent,
    rmsDirect: document.getElementById('rmsDirectCorr').textContent,
    alphaScaling: document.getElementById('scaleAlpha').textContent,
    zScaling: document.getElementById('scaleZ').textContent,
    universalityClass: document.getElementById('scaleClass').textContent
  };

  // Pit analysis
  var pitStats = {
    count: document.getElementById('pitCount').textContent,
    avgWidth: document.getElementById('pitAvgW').textContent,
    maxWidth: document.getElementById('pitMaxW').textContent,
    avgDepth: document.getElementById('pitAvgD').textContent,
    maxDepth: document.getElementById('pitMaxD').textContent,
    coverage: document.getElementById('pitCoverage').textContent,
    cutoff: document.getElementById('pitCutoff').textContent
  };

  // Time series
  var timeSeries = {
    roughness: roughnessData.map(function(d) { return { iter: d.x, rms: d.y }; }),
    etchDepth: etchDepthData.map(function(d) { return { iter: d.x, depth: d.y }; }),
    rmsHistory: rmsHistory,
    skewHistory: skewHistory,
    kurtHistory: kurtHistory
  };

  // G(r) data
  var correlation = null;
  if (window._lastCorr) {
    correlation = { r: window._lastCorr.r, g: window._lastCorr.g };
    if (window._lastAlphaResult) {
      correlation.alpha = window._lastAlphaResult.alpha;
      correlation.xi = window._lastAlphaResult.xi;
      correlation.gInf = window._lastAlphaResult.gInf;
    }
  }

  var snapshot = {
    exported: new Date().toISOString(),
    iteration: iter,
    parameters: params,
    stats: stats,
    scaling: scaling,
    pitAnalysis: pitStats,
    timeSeries: timeSeries,
    correlation: correlation
  };

  var blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kmc-snapshot-iter' + iter + '.json';
  a.click();
}

/* ── Copy results table (markdown) to clipboard ── */
function copyResultsTable() {
  var iter = document.getElementById('stIter').textContent;
  var lines = [
    '| Metric | Value |',
    '|--------|-------|',
    '| Iteration | ' + iter + ' |',
    '| RMS Roughness | ' + document.getElementById('stRms').textContent + ' |',
    '| Std Dev | ' + document.getElementById('stStd').textContent + ' |',
    '| Skewness | ' + document.getElementById('stSkew').textContent + ' |',
    '| Kurtosis (excess) | ' + document.getElementById('stKurt').textContent + ' |',
    '| Etch Depth | ' + document.getElementById('stEtchDepth').textContent + ' |',
    '| Etch Rate | ' + document.getElementById('stEtchRate').textContent + ' |',
    '| Ge/Si Selectivity | ' + document.getElementById('stSelectivity').textContent + ' |',
    '| β (growth) | ' + document.getElementById('betaDisp').textContent + ' |',
    '| α (G(r)) | ' + document.getElementById('alphaCorr').textContent + ' |',
    '| ξ (corr length) | ' + document.getElementById('xiCorrStat').textContent + ' |',
    '| G(∞)/√2 | ' + document.getElementById('gInfRms').textContent + ' |',
    '| Pit Count | ' + document.getElementById('pitCount').textContent + ' |',
    '| Avg Pit Width | ' + document.getElementById('pitAvgW').textContent + ' |',
    '| Avg Pit Depth | ' + document.getElementById('pitAvgD').textContent + ' |',
    '| Pit Coverage | ' + document.getElementById('pitCoverage').textContent + ' |'
  ];
  var md = lines.join('\n');
  navigator.clipboard.writeText(md).then(function() {
    alert('Results table copied to clipboard');
  }, function() {
    // Fallback
    var ta = document.createElement('textarea');
    ta.value = md; document.body.appendChild(ta);
    ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    alert('Results table copied to clipboard');
  });
}

function exportLogbook() {
  var entries = getLogEntries();
  if (entries.length === 0) return;
  var md = '# KMC SiGe Thin Film \u2014 Research Logbook\n\n';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    var typeLabel = e.type === 'obs' ? 'Observation' : e.type === 'quest' ? 'Question' : 'Conclusion';
    var date = new Date(e.timestamp);
    md += '## ' + typeLabel + ' \u2014 ' + date.toLocaleDateString() + ' ' + date.toLocaleTimeString() + '\n\n';
    md += e.text + '\n\n';
    if (e.context) md += '> Context: ' + e.context + '\n\n';
    md += '---\n\n';
  }
  var blob = new Blob([md], {type:'text/markdown'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kmc-logbook.md';
  a.click();
}
