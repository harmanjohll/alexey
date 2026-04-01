/* sweep.js — Enhanced sweep orchestrators with comprehensive metric collection */

var sweepCancelled = false;
var lastSweepResults = null; // Store results for export

/* ── Speed Presets ── */
var SPEED_PRESETS = {
  quick:    { lattx: 256,  niter1: 3000 },
  standard: { lattx: 512,  niter1: 5000 },
  thorough: { lattx: 1024, niter1: 10000 }
};
var currentSpeed = 'standard';

function setSpeed(level) {
  currentSpeed = level;
  var btns = document.querySelectorAll('.speed-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].getAttribute('data-speed') === level);
  }
  var info = document.getElementById('speedInfo');
  if (info) {
    var p = SPEED_PRESETS[level];
    info.textContent = 'lattx=' + p.lattx + ', ' + p.niter1 + ' iterations per point';
  }
}

/* ── Rich Worker Runner ──
   Runs a full simulation and collects:
   - Roughness trajectory (for beta fitting)
   - Final height array (for pit analysis + correlation)
   - Final stats (RMS, skew, kurt, events)
   - Lattice snapshot (canvas image)
*/
function runWorkerRich(params) {
  return new Promise(function(resolve) {
    var w = new Worker('worker-kmc.js');
    var roughTraj = []; // {x: iter, y: rms}
    var lastData = null;
    var lastHtRaw = null;
    var lastSlice = null;
    var lastSliceH = 0;
    var initialAve = null;

    w.onmessage = function(e) {
      var d = e.data;
      if (d.type === 'iteration') {
        // Track roughness trajectory for beta fit
        if (d.rmsht > 0) roughTraj.push({ x: d.iter, y: d.rmsht });
        if (initialAve === null) initialAve = d.aveht;

        lastData = {
          rmsht: d.rmsht, aveht: d.aveht, stdev: d.stdev,
          skewness: d.skewness, kurtosis: d.kurtosis, iter: d.iter,
          events: d.events
        };

        // Capture height array and slice (transferable buffers become detached, so copy)
        if (d.htRaw) {
          lastHtRaw = new Int32Array(d.htRaw);
        }
        if (d.sliceData) {
          lastSlice = new Uint8Array(d.sliceData);
          lastSliceH = d.sliceH;
        }
      } else if (d.type === 'done') {
        w.terminate();

        if (!lastData) { resolve(null); return; }

        // Compute beta from roughness trajectory
        var beta = null;
        if (roughTraj.length >= 10) {
          var fit = fitPowerLaw(roughTraj, 1, Infinity);
          if (fit) beta = fit.beta;
        }

        // Compute pit analysis from final height array
        var pitResult = { pits: [] };
        if (lastHtRaw && lastHtRaw.length > 0) {
          var htArray = Array.from(lastHtRaw);
          pitResult = analyzePits(htArray, { method: 'sigma', k: 1.0, minWidth: 3, gapMerge: 2 });
        }

        // Compute correlation alpha and xi
        var alpha = null, xi = null;
        if (lastHtRaw && lastHtRaw.length >= 20) {
          var corr = computeCorrelation(Array.from(lastHtRaw));
          var alphaResult = fitAlpha(corr);
          if (alphaResult) {
            alpha = alphaResult.alpha;
            xi = alphaResult.xi;
          }
        }

        // Etch depth and selectivity
        var etchDepth = initialAve !== null ? Math.abs(initialAve - lastData.aveht) : 0;
        var selectivity = null;
        if (lastData.events) {
          var ngedes = lastData.events.ngedes || 0;
          var nsides = lastData.events.nsides || 0;
          selectivity = nsides > 0 ? ngedes / nsides : (ngedes > 0 ? Infinity : null);
        }

        // Pit stats
        var pits = pitResult.pits;
        var pitCount = pits.length;
        var avgPitWidth = 0, maxPitWidth = 0, avgPitDepth = 0, pitCoverage = 0;
        if (pitCount > 0) {
          var totalW = 0, totalD = 0;
          for (var i = 0; i < pits.length; i++) {
            totalW += pits[i].width;
            totalD += pits[i].depth;
            if (pits[i].width > maxPitWidth) maxPitWidth = pits[i].width;
          }
          avgPitWidth = totalW / pitCount;
          avgPitDepth = totalD / pitCount;
          if (lastHtRaw) pitCoverage = totalW / lastHtRaw.length;
        }

        // Render lattice snapshot to offscreen canvas
        var snapshot = null;
        if (lastSlice && lastSliceH > 0) {
          try {
            var snapCanvas = document.createElement('canvas');
            snapCanvas.width = params.lattx;
            snapCanvas.height = lastSliceH;
            renderLattice(lastSlice.buffer, lastSliceH, params.lattx, snapCanvas);
            snapshot = snapCanvas.toDataURL('image/png');
          } catch (err) { /* snapshot capture failed, non-critical */ }
        }

        resolve({
          rmsht: lastData.rmsht,
          skewness: lastData.skewness,
          kurtosis: lastData.kurtosis,
          aveht: lastData.aveht,
          iter: lastData.iter,
          beta: beta,
          pitCount: pitCount,
          avgPitWidth: avgPitWidth,
          maxPitWidth: maxPitWidth,
          avgPitDepth: avgPitDepth,
          pitCoverage: pitCoverage,
          pitDensity: lastHtRaw ? pitCount / lastHtRaw.length : 0,
          alpha: alpha,
          xi: xi,
          etchDepth: etchDepth,
          selectivity: selectivity,
          snapshot: snapshot
        });
      }
    };

    w.onerror = function() { w.terminate(); resolve(null); };
    w.postMessage({ type: 'start', params: params });
  });
}

function cancelSweep() {
  sweepCancelled = true;
}

/* ── Generic Sweep Runner ──
   sweepConfig: { paramName, values[], label, prefix, xLabel }
*/
async function runGenericSweep(sweepConfig) {
  if (running) return;
  running = true;
  sweepCancelled = false;

  var paramName = sweepConfig.paramName;
  var values = sweepConfig.values;
  var prefix = sweepConfig.prefix;
  var xLabel = sweepConfig.xLabel;

  var baseParams = readParams();
  // Apply speed preset
  var speed = SPEED_PRESETS[currentSpeed];
  baseParams.lattx = speed.lattx;
  baseParams.lattz = 2048;
  baseParams.niter2 = 100;
  baseParams.psi = 0;
  baseParams.pge = 1.0;
  autoAdjustZstopZlo();

  // Init/reset charts
  initRichSweepCharts(prefix, xLabel);

  var dashEl = document.getElementById(prefix + 'Dash');
  if (dashEl) dashEl.style.display = '';
  var runBtn = document.getElementById(prefix + 'RunBtn');
  if (runBtn) runBtn.disabled = true;
  var summaryEl = document.getElementById(prefix + 'Summary');
  if (summaryEl) summaryEl.innerHTML = '';
  var tableBody = document.getElementById(prefix + 'TableBody');
  if (tableBody) tableBody.innerHTML = '';
  var gallery = document.getElementById(prefix + 'Gallery');
  if (gallery) gallery.innerHTML = '';

  var results = [];
  for (var i = 0; i < values.length; i++) {
    if (sweepCancelled) break;
    var val = values[i];
    var pct = ((i / values.length) * 100).toFixed(0);
    var progFill = document.getElementById(prefix + 'ProgFill');
    var progText = document.getElementById(prefix + 'ProgText');
    if (progFill) progFill.style.width = pct + '%';
    if (progText) progText.textContent = sweepConfig.label(val) + ' (' + (i + 1) + '/' + values.length + ')';

    var p = {};
    for (var k in baseParams) p[k] = baseParams[k];
    p[paramName] = val;
    p.niter1 = speed.niter1;

    var data = await runWorkerRich(p);
    if (data) {
      data._paramVal = val;
      results.push(data);
      updateRichSweepCharts(prefix, results, paramName);
      updateRichSweepTable(prefix, results, sweepConfig);

      // Add snapshot to gallery
      if (data.snapshot && gallery) {
        var thumb = document.createElement('div');
        thumb.className = 'snap-thumb';
        thumb.innerHTML = '<img src="' + data.snapshot + '" alt="' + sweepConfig.label(val) + '">'
          + '<div class="snap-label">' + sweepConfig.label(val) + '</div>'
          + '<div class="snap-stats">\u03B2=' + (data.beta !== null ? data.beta.toFixed(3) : '\u2014')
          + ' pits=' + data.pitCount + '</div>';
        thumb.querySelector('img').onclick = (function(src, lbl) {
          return function() { downloadImage(src, 'kmc-' + prefix + '-' + lbl + '.png'); };
        })(data.snapshot, sweepConfig.label(val).replace(/[^a-zA-Z0-9]/g, '_'));
        gallery.appendChild(thumb);
      }
    }
  }

  // Summary
  if (results.length > 0 && summaryEl) {
    summaryEl.innerHTML = buildSweepSummary(results, sweepConfig);
  }

  lastSweepResults = { config: sweepConfig, results: results };

  if (progFill) progFill.style.width = '100%';
  if (progText) progText.textContent = sweepCancelled ? 'Cancelled' : 'Complete (' + results.length + ' points)';
  if (runBtn) runBtn.disabled = false;
  running = false;
}

/* ── Sweep Summary Builder ── */
function buildSweepSummary(results, config) {
  var minR = results[0], maxR = results[0];
  var maxPits = results[0], minBeta = results[0], maxBeta = results[0];
  for (var i = 1; i < results.length; i++) {
    var r = results[i];
    if (r.rmsht < minR.rmsht) minR = r;
    if (r.rmsht > maxR.rmsht) maxR = r;
    if (r.pitCount > maxPits.pitCount) maxPits = r;
    if (r.beta !== null && (minBeta.beta === null || r.beta < minBeta.beta)) minBeta = r;
    if (r.beta !== null && (maxBeta.beta === null || r.beta > maxBeta.beta)) maxBeta = r;
  }
  var html = '<div class="sweep-summary-grid">';
  html += '<div><span class="sl">SMOOTHEST</span><div class="sv sm">' + config.label(minR._paramVal) + '</div><div style="font-size:11px;color:var(--text-secondary)">RMS = ' + minR.rmsht.toFixed(4) + '</div></div>';
  html += '<div><span class="sl">ROUGHEST</span><div class="sv sm">' + config.label(maxR._paramVal) + '</div><div style="font-size:11px;color:var(--text-secondary)">RMS = ' + maxR.rmsht.toFixed(4) + '</div></div>';
  html += '<div><span class="sl">MOST PITS</span><div class="sv sm">' + config.label(maxPits._paramVal) + '</div><div style="font-size:11px;color:var(--text-secondary)">' + maxPits.pitCount + ' pits, ' + (maxPits.pitCoverage * 100).toFixed(1) + '% coverage</div></div>';
  if (maxBeta.beta !== null) {
    html += '<div><span class="sl">\u03B2 RANGE</span><div class="sv sm">' + (minBeta.beta !== null ? minBeta.beta.toFixed(3) : '\u2014') + ' \u2013 ' + maxBeta.beta.toFixed(3) + '</div></div>';
  }
  html += '</div>';
  return html;
}

/* ── Results Table Builder ── */
function updateRichSweepTable(prefix, results, config) {
  var body = document.getElementById(prefix + 'TableBody');
  if (!body) return;
  var html = '';
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    html += '<tr>';
    html += '<td class="num">' + config.label(r._paramVal) + '</td>';
    html += '<td class="num">' + r.rmsht.toFixed(4) + '</td>';
    html += '<td class="num">' + (r.beta !== null ? r.beta.toFixed(3) : '\u2014') + '</td>';
    html += '<td class="num">' + r.pitCount + '</td>';
    html += '<td class="num">' + r.avgPitWidth.toFixed(1) + '</td>';
    html += '<td class="num">' + (r.pitCoverage * 100).toFixed(1) + '%</td>';
    html += '<td class="num">' + (r.alpha !== null ? r.alpha.toFixed(3) : '\u2014') + '</td>';
    html += '<td class="num">' + (r.xi !== null ? r.xi : '\u2014') + '</td>';
    html += '<td class="num">' + r.etchDepth.toFixed(2) + '</td>';
    html += '<td class="num">' + (r.selectivity !== null && r.selectivity !== Infinity ? r.selectivity.toFixed(1) : '\u221E') + '</td>';
    html += '</tr>';
  }
  body.innerHTML = html;
}

/* ── Image Download Helper ── */
function downloadImage(dataUrl, filename) {
  var a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

function downloadChart(chartId, filename) {
  var chart = null;
  // Find chart by canvas ID (check all known chart variables)
  var canvasEl = document.getElementById(chartId);
  if (canvasEl) {
    var chartInst = Chart.getChart(canvasEl);
    if (chartInst) {
      downloadImage(chartInst.toBase64Image(), filename || chartId + '.png');
    }
  }
}

/* ── Export Sweep Results as CSV ── */
function exportSweepCSV() {
  if (!lastSweepResults || !lastSweepResults.results.length) return;
  var config = lastSweepResults.config;
  var results = lastSweepResults.results;
  var headers = [config.paramName, 'RMS', 'beta', 'skewness', 'kurtosis', 'pitCount', 'avgPitWidth', 'maxPitWidth', 'avgPitDepth', 'pitCoverage', 'pitDensity', 'alpha', 'xi', 'etchDepth', 'selectivity'];
  var lines = [headers.join(',')];
  for (var i = 0; i < results.length; i++) {
    var r = results[i];
    lines.push([
      r._paramVal, r.rmsht.toFixed(6), r.beta !== null ? r.beta.toFixed(4) : '',
      r.skewness.toFixed(4), r.kurtosis.toFixed(4), r.pitCount,
      r.avgPitWidth.toFixed(2), r.maxPitWidth, r.avgPitDepth.toFixed(3),
      (r.pitCoverage * 100).toFixed(2), r.pitDensity.toFixed(6),
      r.alpha !== null ? r.alpha.toFixed(4) : '', r.xi !== null ? r.xi : '',
      r.etchDepth.toFixed(3), r.selectivity !== null && r.selectivity !== Infinity ? r.selectivity.toFixed(2) : 'Inf'
    ].join(','));
  }
  var blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'kmc-sweep-' + config.paramName + '.csv';
  a.click();
}

/* ══════════════════════════════════════════════
   INVESTIGATION PROTOCOLS
   ══════════════════════════════════════════════ */

var invHypotheses = {};

function lockInvHypothesis(invNum) {
  var ta = document.getElementById('invHyp' + invNum);
  if (!ta) return;
  var text = ta.value.trim();
  if (text.length < 20) { ta.style.borderColor = 'var(--danger)'; return; }
  ta.disabled = true;
  ta.style.borderColor = 'var(--accent-border)';
  ta.style.boxShadow = '0 0 0 2px var(--accent-subtle)';
  var ts = document.getElementById('invTs' + invNum);
  if (ts) { ts.style.display = 'block'; ts.textContent = 'locked \u00B7 ' + new Date().toLocaleString(); }
  var lockBtn = document.getElementById('invLockBtn' + invNum);
  if (lockBtn) { lockBtn.textContent = '\u2713 Locked'; lockBtn.disabled = true; }
  var runBtn = document.getElementById('invRunBtn' + invNum);
  if (runBtn) runBtn.disabled = false;
  invHypotheses[invNum] = text;
  localStorage.setItem('alexey_kmc_inv' + invNum + '_hypothesis', text);
  localStorage.setItem('alexey_kmc_inv' + invNum + '_timestamp', new Date().toISOString());
}

function linspace(min, max, n) {
  var arr = [];
  for (var i = 0; i < n; i++) {
    arr.push(n === 1 ? min : min + (max - min) * i / (n - 1));
  }
  return arr;
}

function runInvestigation(invNum) {
  switch (invNum) {
    case 1: // Temperature sweep
      setMode('tsweep');
      runGenericSweep({
        paramName: 'temp',
        values: linspace(300, 1000, 8),
        label: function(v) { return 'T=' + v.toFixed(0) + 'K'; },
        prefix: 'tsw',
        xLabel: 'Temperature (K)'
      });
      break;
    case 2: // Composition sweep
      setMode('csweep');
      runGenericSweep({
        paramName: 'theta',
        values: linspace(0.05, 0.6, 8),
        label: function(v) { return '\u03B8=' + v.toFixed(2); },
        prefix: 'csw',
        xLabel: '\u03B8 (Ge fraction)'
      });
      break;
    case 3: // Desorption sweep
      setMode('dsweep');
      runGenericSweep({
        paramName: 'pdes',
        values: linspace(0.01, 0.5, 8),
        label: function(v) { return 'P=' + v.toFixed(2); },
        prefix: 'dsw',
        xLabel: 'P_des (desorption probability)'
      });
      break;
  }
}

/* ── Legacy sweep wrappers (keep existing tab buttons working) ── */
async function runTempSweep() {
  var tMin = +document.getElementById('tswTmin').value;
  var tMax = +document.getElementById('tswTmax').value;
  var pts = +document.getElementById('tswPts').value;
  runGenericSweep({
    paramName: 'temp',
    values: linspace(tMin, tMax, pts),
    label: function(v) { return 'T=' + v.toFixed(0) + 'K'; },
    prefix: 'tsw',
    xLabel: 'Temperature (K)'
  });
}

async function runCompSweep() {
  var thMin = +document.getElementById('cswThetaMin').value;
  var thMax = +document.getElementById('cswThetaMax').value;
  var pts = +document.getElementById('cswPts').value;
  runGenericSweep({
    paramName: 'theta',
    values: linspace(thMin, thMax, pts),
    label: function(v) { return '\u03B8=' + v.toFixed(2); },
    prefix: 'csw',
    xLabel: '\u03B8 (Ge fraction)'
  });
}

async function runDesorpSweep() {
  var dMin = +document.getElementById('dswPdesMin').value;
  var dMax = +document.getElementById('dswPdesMax').value;
  var pts = +document.getElementById('dswPts').value;
  runGenericSweep({
    paramName: 'pdes',
    values: linspace(dMin, dMax, pts),
    label: function(v) { return 'P=' + v.toFixed(2); },
    prefix: 'dsw',
    xLabel: 'P_des (desorption probability)'
  });
}
