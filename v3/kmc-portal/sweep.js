/* sweep.js — Sweep orchestrators for KMC portal (temperature and composition sweeps) */

var worker = null;
var running = false;
var pausedState = false;
var sweepCancelled = false;

function runWorkerForParams(params) {
  return new Promise(function(resolve) {
    var w = new Worker('worker-kmc.js');
    var lastData = null;
    w.onmessage = function(e) {
      var d = e.data;
      if (d.type === 'iteration') {
        lastData = { rmsht: d.rmsht, aveht: d.aveht, stdev: d.stdev, skewness: d.skewness, kurtosis: d.kurtosis, iter: d.iter };
      } else if (d.type === 'done') {
        w.terminate();
        resolve(lastData);
      }
    };
    w.onerror = function() { w.terminate(); resolve(lastData); };
    w.postMessage({ type: 'start', params: params });
  });
}

function cancelSweep() {
  sweepCancelled = true;
}

/* ── Temperature Sweep ── */
async function runTempSweep() {
  if (running) return;
  running = true;
  sweepCancelled = false;
  var tMin = +document.getElementById('tswTmin').value;
  var tMax = +document.getElementById('tswTmax').value;
  var pts = +document.getElementById('tswPts').value;
  var niter = +document.getElementById('tswNiter').value;
  var baseParams = readParams();

  if (tswRoughChart) tswRoughChart.destroy();
  if (tswSkewChart) tswSkewChart.destroy();
  if (tswKurtChart) tswKurtChart.destroy();
  tswRoughChart = mkSweepChart('tswRoughChart', 'Temperature (K)', 'RMS Roughness', '#7dd87d');
  tswSkewChart = mkSweepChart('tswSkewChart', 'Temperature (K)', 'Skewness', '#f0b429');
  tswKurtChart = mkSweepChart('tswKurtChart', 'Temperature (K)', 'Kurtosis (excess)', '#e24b4a');

  document.getElementById('tswDash').style.display = '';
  document.getElementById('tswRunBtn').disabled = true;
  document.getElementById('tswSummary').innerHTML = '';

  var results = [];
  for (var i = 0; i < pts; i++) {
    if (sweepCancelled) break;
    var t = pts === 1 ? tMin : tMin + (tMax - tMin) * i / (pts - 1);
    var pct = ((i / pts) * 100).toFixed(0);
    document.getElementById('tswProgFill').style.width = pct + '%';
    document.getElementById('tswProgText').textContent = 'T=' + t.toFixed(0) + 'K (' + (i+1) + '/' + pts + ')';

    var p = {};
    for (var k in baseParams) p[k] = baseParams[k];
    p.temp = t;
    p.niter1 = niter;
    var data = await runWorkerForParams(p);
    if (data) {
      data.t = t;
      results.push(data);
      tswRoughChart.data.datasets[0].data = results.map(function(r) { return { x: r.t, y: r.rmsht }; });
      tswRoughChart.update();
      tswSkewChart.data.datasets[0].data = results.map(function(r) { return { x: r.t, y: r.skewness }; });
      tswSkewChart.update();
      tswKurtChart.data.datasets[0].data = results.map(function(r) { return { x: r.t, y: r.kurtosis }; });
      tswKurtChart.update();
    }
  }

  if (results.length > 0) {
    var minR = results[0], maxR = results[0];
    for (var i = 1; i < results.length; i++) {
      if (results[i].rmsht < minR.rmsht) minR = results[i];
      if (results[i].rmsht > maxR.rmsht) maxR = results[i];
    }
    document.getElementById('tswSummary').innerHTML =
      '<div>Points: ' + results.length + '</div>' +
      '<div>Min roughness: ' + minR.rmsht.toFixed(4) + ' at T=' + minR.t.toFixed(0) + 'K</div>' +
      '<div>Max roughness: ' + maxR.rmsht.toFixed(4) + ' at T=' + maxR.t.toFixed(0) + 'K</div>' +
      '<div>Range: ' + (maxR.rmsht - minR.rmsht).toFixed(4) + '</div>';
  }

  document.getElementById('tswProgFill').style.width = '100%';
  document.getElementById('tswProgText').textContent = sweepCancelled ? 'Cancelled' : 'Complete';
  document.getElementById('tswRunBtn').disabled = false;
  running = false;
}

/* ── Composition (theta) Sweep ── */
async function runCompSweep() {
  if (running) return;
  running = true;
  sweepCancelled = false;
  var thMin = +document.getElementById('cswThetaMin').value;
  var thMax = +document.getElementById('cswThetaMax').value;
  var pts = +document.getElementById('cswPts').value;
  var niter = +document.getElementById('cswNiter').value;
  var baseParams = readParams();

  if (cswRoughChart) cswRoughChart.destroy();
  if (cswSkewChart) cswSkewChart.destroy();
  if (cswKurtChart) cswKurtChart.destroy();
  cswRoughChart = mkSweepChart('cswRoughChart', '\u03B8 (Ge fraction)', 'RMS Roughness', '#7dd87d');
  cswSkewChart = mkSweepChart('cswSkewChart', '\u03B8 (Ge fraction)', 'Skewness', '#f0b429');
  cswKurtChart = mkSweepChart('cswKurtChart', '\u03B8 (Ge fraction)', 'Kurtosis (excess)', '#e24b4a');

  document.getElementById('cswDash').style.display = '';
  document.getElementById('cswRunBtn').disabled = true;
  document.getElementById('cswSummary').innerHTML = '';

  var results = [];
  for (var i = 0; i < pts; i++) {
    if (sweepCancelled) break;
    var th = pts === 1 ? thMin : thMin + (thMax - thMin) * i / (pts - 1);
    var pct = ((i / pts) * 100).toFixed(0);
    document.getElementById('cswProgFill').style.width = pct + '%';
    document.getElementById('cswProgText').textContent = '\u03B8=' + th.toFixed(2) + ' (' + (i+1) + '/' + pts + ')';

    var p = {};
    for (var k in baseParams) p[k] = baseParams[k];
    p.theta = th;
    p.niter1 = niter;
    var data = await runWorkerForParams(p);
    if (data) {
      data.theta = th;
      results.push(data);
      cswRoughChart.data.datasets[0].data = results.map(function(r) { return { x: r.theta, y: r.rmsht }; });
      cswRoughChart.update();
      cswSkewChart.data.datasets[0].data = results.map(function(r) { return { x: r.theta, y: r.skewness }; });
      cswSkewChart.update();
      cswKurtChart.data.datasets[0].data = results.map(function(r) { return { x: r.theta, y: r.kurtosis }; });
      cswKurtChart.update();
    }
  }

  if (results.length > 0) {
    var minR = results[0], maxR = results[0];
    for (var i = 1; i < results.length; i++) {
      if (results[i].rmsht < minR.rmsht) minR = results[i];
      if (results[i].rmsht > maxR.rmsht) maxR = results[i];
    }
    document.getElementById('cswSummary').innerHTML =
      '<div>Points: ' + results.length + '</div>' +
      '<div>Min roughness: ' + minR.rmsht.toFixed(4) + ' at \u03B8=' + minR.theta.toFixed(2) + '</div>' +
      '<div>Max roughness: ' + maxR.rmsht.toFixed(4) + ' at \u03B8=' + maxR.theta.toFixed(2) + '</div>' +
      '<div>Range: ' + (maxR.rmsht - minR.rmsht).toFixed(4) + '</div>';
  }

  document.getElementById('cswProgFill').style.width = '100%';
  document.getElementById('cswProgText').textContent = sweepCancelled ? 'Cancelled' : 'Complete';
  document.getElementById('cswRunBtn').disabled = false;
  running = false;
}
