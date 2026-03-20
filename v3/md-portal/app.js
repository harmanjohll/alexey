/* app.js — main initialization and UI glue for v3 MD portal
   Loads LAST (after viz3d.js, charts.js, data.js, sweep.js) */

function toggleTheme() {
  var current = document.documentElement.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('alexey_theme', next);
}

function togglePanel(id) {
  var p = document.getElementById(id);
  p.classList.toggle('collapsed');
  var t = p.querySelector('.toggle');
  if (t) t.innerHTML = p.classList.contains('collapsed') ? '&#9654; expand' : '&#9660; collapse';
}

function vegardLattice(f) {
  var aSi = 5.431, aGe = 5.6575;
  var a0 = (1 - f) * aSi + f * aGe;
  return {
    lattx: a0 * Math.SQRT2,
    latty: a0 * Math.SQRT2,
    lattz: a0
  };
}

function updateLatticeDisplay() {
  var f = parseFloat(document.getElementById('paramVegard').value) || 0;
  var latt = vegardLattice(f);
  document.getElementById('dispLattx').textContent = latt.lattx.toFixed(3);
  document.getElementById('dispLatty').textContent = latt.latty.toFixed(3);
  document.getElementById('dispLattz').textContent = latt.lattz.toFixed(3);
}

function getParams() {
  var f = parseFloat(document.getElementById('paramVegard').value) || 0;
  var latt = vegardLattice(f);
  return {
    ncx: 3,
    ncy: 3,
    theta: 0.0,
    temp: parseFloat(document.getElementById('paramTemp').value) || 300,
    dt: parseFloat(document.getElementById('paramDt').value) || 0.02,
    niter1: parseInt(document.getElementById('paramNiter1').value) || 200,
    niter2: parseInt(document.getElementById('paramNiter2').value) || 50,
    niter3: parseInt(document.getElementById('paramNiter3').value) || 0,
    niter4: parseInt(document.getElementById('paramNiter4').value) || 50,
    muStart: parseFloat(document.getElementById('paramMuStart').value) || 0.50,
    muEnd: parseFloat(document.getElementById('paramMuEnd').value) || 1.10,
    muStep: parseFloat(document.getElementById('paramMuStep').value) || 0.05,
    vegardF: f,
    lattx: latt.lattx,
    latty: latt.latty,
    lattz: latt.lattz
  };
}

function getSelectedNcz() {
  var checks = document.querySelectorAll('#nczChecks input[type=checkbox]:checked');
  var values = [];
  checks.forEach(function(cb) { values.push(parseInt(cb.value)); });
  values.sort(function(a, b) { return a - b; });
  return values.length > 0 ? values : [2, 3, 4, 5, 6, 7];
}

function updateProgress(current, total, mu, ncz) {
  var pct = (current / total * 100).toFixed(0);
  document.getElementById('progressFill').style.width = pct + '%';
  document.getElementById('progressText').textContent = '\u03BC=' + mu.toFixed(2) + ' ncz=' + ncz + ' (' + current + '/' + total + ')';
}

function updateLiveStats(msg) {
  document.getElementById('statEpa').textContent = msg.energy.toFixed(4);
  document.getElementById('statTemp').textContent = msg.temperature.toFixed(0);
  document.getElementById('statNSi').textContent = msg.nSi;
  document.getElementById('statNGe').textContent = msg.nGe;
  document.getElementById('statGeFrac').textContent = (msg.nGe / msg.natom).toFixed(3);
  document.getElementById('statStep').textContent = msg.step + 1;
  document.getElementById('statMcPct').textContent = msg.mcPct.toFixed(1);
}

document.addEventListener('DOMContentLoaded', function() {
  document.getElementById('paramVegard').addEventListener('input', updateLatticeDisplay);
  updateLatticeDisplay();

  init3D('viewer3d');

  var saved = loadExperiment();
  if (saved) {
    window.summaryData = saved.summaryData || [];
    window.rawDataMap = saved.rawData || {};
    if (window.summaryData.length > 0) {
      renderSummaryTable(window.summaryData);
      updateMasterPlot(window.summaryData);
    }
  }
});
