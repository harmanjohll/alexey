/* app.js — Main initialization and UI glue for v3 KMC portal
   Loads LAST (after lattice-render.js, charts.js, data.js, sweep.js) */

var currentMode = 'single';

var PRESETS = {
  default: {theta:0.2,pdes:0.1,pge:1.0,psi:0.0,envt:0,esisi:-1.6835,esige:-1.534,egege:-1.365,esivc:0.37375,egevc:0.0,temp:500,niter1:10000,niter2:100,lattx:512,lattz:2048,zstop:1843,zlo:1536,seed:-381791011},
  highGe: {theta:0.5,pdes:0.1,pge:1.0,psi:0.0,envt:0,esisi:-1.6835,esige:-1.534,egege:-1.365,esivc:0.37375,egevc:0.0,temp:500,niter1:10000,niter2:100,lattx:512,lattz:2048,zstop:1843,zlo:1536,seed:-381791011},
  highTemp: {theta:0.2,pdes:0.1,pge:1.0,psi:0.0,envt:0,esisi:-1.6835,esige:-1.534,egege:-1.365,esivc:0.37375,egevc:0.0,temp:800,niter1:10000,niter2:100,lattx:512,lattz:2048,zstop:1843,zlo:1536,seed:-381791011},
  noDesorp: {theta:0.2,pdes:0.0,pge:1.0,psi:0.0,envt:0,esisi:-1.6835,esige:-1.534,egege:-1.365,esivc:0.37375,egevc:0.0,temp:500,niter1:10000,niter2:100,lattx:512,lattz:2048,zstop:1843,zlo:1536,seed:-381791011}
};

function toggleTheme() {
  var h = document.documentElement;
  var c = h.getAttribute('data-theme') || 'light';
  var n = c === 'light' ? 'dark' : 'light';
  h.setAttribute('data-theme', n);
  localStorage.setItem('alexey_theme', n);
}

function togglePanel(id) {
  var panel = document.getElementById(id);
  panel.classList.toggle('collapsed');
  var toggle = panel.querySelector('.toggle');
  if (toggle) toggle.innerHTML = panel.classList.contains('collapsed') ? '&#9654; expand' : '&#9660; collapse';
}

function readParams() {
  return {
    theta:+document.getElementById('pTheta').value,
    pdes:+document.getElementById('pPdes').value,
    pge:+document.getElementById('pPge').value,
    psi:+document.getElementById('pPsi').value,
    envt:+document.getElementById('pEnvt').value,
    esisi:+document.getElementById('pEsisi').value,
    esige:+document.getElementById('pEsige').value,
    egege:+document.getElementById('pEgege').value,
    esivc:+document.getElementById('pEsivc').value,
    egevc:+document.getElementById('pEgevc').value,
    temp:+document.getElementById('pTemp').value,
    niter1:+document.getElementById('pNiter1').value,
    niter2:+document.getElementById('pNiter2').value,
    lattx:+document.getElementById('pLattx').value,
    lattz:+document.getElementById('pLattz').value,
    zstop:+document.getElementById('pZstop').value,
    zlo:+document.getElementById('pZlo').value,
    seed:+document.getElementById('pSeed').value
  };
}

function setParams(p) {
  var ids = ['pTheta','pPdes','pPge','pPsi','pEnvt','pEsisi','pEsige','pEgege','pEsivc','pEgevc','pTemp','pNiter1','pNiter2','pLattx','pLattz','pZstop','pZlo','pSeed'];
  var vals = [p.theta,p.pdes,p.pge,p.psi,p.envt,p.esisi,p.esige,p.egege,p.esivc,p.egevc,p.temp,p.niter1,p.niter2,p.lattx,p.lattz,p.zstop,p.zlo,p.seed];
  for (var i = 0; i < ids.length; i++) document.getElementById(ids[i]).value = vals[i];
}

function loadPreset(name, btn) {
  if (running) return;
  setParams(PRESETS[name]);
  var btns = document.querySelectorAll('.preset-btn');
  for (var i = 0; i < btns.length; i++) btns[i].classList.remove('active');
  if (btn) btn.classList.add('active');
}

function setInputsEnabled(en) {
  var inputs = document.querySelectorAll('#paramPanel input, #paramPanel select');
  for (var i = 0; i < inputs.length; i++) inputs[i].disabled = !en;
}

function autoAdjustZstopZlo() {
  var lattz = +document.getElementById('pLattz').value;
  document.getElementById('pZstop').value = Math.round(lattz * 0.9);
  document.getElementById('pZlo').value = Math.round(lattz * 0.75);
}

function setMode(m) {
  if (running) return;
  currentMode = m;
  var tabs = document.querySelectorAll('.mode-tab');
  var modes = ['single', 'tsweep', 'csweep', 'dsweep'];
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', modes[i] === m);
  }
  var sections = document.querySelectorAll('.mode-section');
  for (var i = 0; i < sections.length; i++) sections[i].classList.remove('active');
  var map = {single:'modeSingle', tsweep:'modeTsweep', csweep:'modeCsweep', dsweep:'modeDsweep'};
  document.getElementById(map[m]).classList.add('active');
  document.getElementById('singleDash').style.display = m === 'single' ? '' : 'none';
  document.getElementById('tswDash').style.display = m === 'tsweep' ? '' : 'none';
  document.getElementById('cswDash').style.display = m === 'csweep' ? '' : 'none';
  document.getElementById('dswDash').style.display = m === 'dsweep' ? '' : 'none';
}

function startSim() {
  if (running) return;
  var params = readParams();
  if (params.lattx < 10 || params.lattz < 100) { alert('Lattice too small'); return; }
  running = true; pausedState = false;
  roughnessData = []; etchDepthData = []; etchRateData = []; rmsHistory = []; skewHistory = []; kurtHistory = [];
  initialAveHt = null;
  destroyCharts(); initCharts();
  document.getElementById('snapStrip').innerHTML = '<div style="font-size:11px;color:var(--text-tertiary);font-family:\'JetBrains Mono\',monospace;padding:20px">Running...</div>';
  setInputsEnabled(false);
  document.getElementById('runBtn').disabled = true;
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('resumeBtn').style.display = 'none';
  document.getElementById('progText').textContent = 'Initializing...';
  document.getElementById('progFill').style.width = '0%';

  worker = new Worker('worker-kmc.js');

  worker.onmessage = function(e) {
    var d = e.data;
    if (d.type === 'iteration') {
      var pct = (d.iter / params.niter1 * 100).toFixed(0);
      document.getElementById('progFill').style.width = pct + '%';
      document.getElementById('progText').textContent = 'iter ' + d.iter + ' / ' + params.niter1;
      document.getElementById('stIter').textContent = d.iter;
      document.getElementById('stAveht').textContent = d.aveht.toFixed(2);
      document.getElementById('stRms').textContent = d.rmsht.toFixed(4);
      document.getElementById('stStd').textContent = d.stdev.toFixed(4);
      document.getElementById('stSkew').textContent = d.skewness.toFixed(4);
      document.getElementById('stKurt').textContent = d.kurtosis.toFixed(4);
      document.getElementById('stRange').textContent = d.zmax + ' \u2013 ' + d.zmin;
      document.getElementById('stWidth').textContent = d.surfWidth;
      document.getElementById('evDes').textContent = d.events.ndes.toLocaleString();
      document.getElementById('evGeD').textContent = d.events.ngedes.toLocaleString();
      document.getElementById('evSiD').textContent = d.events.nsides.toLocaleString();
      document.getElementById('evSdf').textContent = d.events.nsdf.toLocaleString();
      document.getElementById('evBdf').textContent = d.events.bdiff.toLocaleString();

      updateCharts(d);
      renderLattice(d.sliceData, d.sliceH, params.lattx);

      // Etch stats
      var depth = etchDepthData.length > 0 ? etchDepthData[etchDepthData.length - 1].y : 0;
      var rate = etchRateData.length > 0 ? etchRateData[etchRateData.length - 1].y : 0;
      document.getElementById('stEtchDepth').textContent = depth.toFixed(2);
      document.getElementById('stEtchRate').textContent = rate.toFixed(4);
      // Ge/Si selectivity
      var ngedes = d.events.ngedes || 0;
      var nsides = d.events.nsides || 0;
      if (nsides > 0) {
        document.getElementById('stSelectivity').textContent = (ngedes / nsides).toFixed(2);
      } else {
        document.getElementById('stSelectivity').textContent = ngedes > 0 ? '\u221E' : '\u2014';
      }

      if (d.htRaw) {
        renderHeightMap(d.htRaw, params.lattx);
        if (lastFullHt) {
          updatePitAnalysis();
          updateCorrelation();
        }
      }

      if (d.isSnapshot) {
        addSnapshotFromCanvas(document.getElementById('latticeCanvas'), d);
      }
    } else if (d.type === 'done') {
      running = false; pausedState = false;
      document.getElementById('progText').textContent = d.reason || 'Complete';
      document.getElementById('runBtn').disabled = false;
      document.getElementById('pauseBtn').disabled = true;
      document.getElementById('resumeBtn').style.display = 'none';
      setInputsEnabled(true);
      worker.terminate(); worker = null;
    }
  };
  worker.postMessage({ type: 'start', params: params });
}

function pauseSim() {
  if (!running || !worker) return;
  worker.postMessage({ type: 'pause' });
  pausedState = true;
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('pauseBtn').style.display = 'none';
  document.getElementById('resumeBtn').disabled = false;
  document.getElementById('resumeBtn').style.display = '';
  document.getElementById('progText').textContent += ' (paused)';
}

function resumeSim() {
  if (!running || !worker || !pausedState) return;
  worker.postMessage({ type: 'resume' });
  pausedState = false;
  document.getElementById('pauseBtn').disabled = false;
  document.getElementById('pauseBtn').style.display = '';
  document.getElementById('resumeBtn').style.display = 'none';
}

function resetSim() {
  if (worker) { worker.postMessage({ type: 'cancel' }); worker.terminate(); worker = null; }
  running = false; pausedState = false;
  roughnessData = []; etchDepthData = []; etchRateData = []; rmsHistory = []; skewHistory = []; kurtHistory = [];
  initialAveHt = null;
  window._lastCorr = null; window._lastAlphaResult = null;
  lastSliceData = null; lastSliceH = 0; lastFullHt = null;
  destroyCharts(); initCharts();
  document.getElementById('runBtn').disabled = false;
  document.getElementById('pauseBtn').disabled = true;
  document.getElementById('pauseBtn').style.display = '';
  document.getElementById('resumeBtn').style.display = 'none';
  document.getElementById('progFill').style.width = '0%';
  document.getElementById('progText').textContent = 'Ready';
  document.getElementById('betaDisp').textContent = '\u03B2 = \u2014';
  ['stIter','stAveht','stRms','stStd','stSkew','stKurt','stRange','stWidth','stEtchDepth','stEtchRate','stSelectivity','pitCount','pitAvgW','pitMaxW','pitAvgD','pitMaxD','pitCoverage','pitCutoff','pitMeanH'].forEach(function(id) { document.getElementById(id).textContent = '\u2014'; });
  ['evDes','evGeD','evSiD','evSdf','evBdf'].forEach(function(id) { document.getElementById(id).textContent = '0'; });
  ['alphaCorr','xiCorrStat','gInfRms','rmsDirectCorr','alphaCorr2','xiCorr2'].forEach(function(id) { var el = document.getElementById(id); if (el) el.textContent = '\u2014'; });
  var stabEl = document.getElementById('roughnessStabilized'); if (stabEl) stabEl.innerHTML = '';
  setInputsEnabled(true);
  document.getElementById('latticeCanvas').getContext('2d').clearRect(0, 0, 500, 150);
  document.getElementById('hmapCanvas').getContext('2d').clearRect(0, 0, 500, 40);
  document.getElementById('snapStrip').innerHTML = '<div style="font-size:11px;color:var(--text-tertiary);font-family:\'JetBrains Mono\',monospace;padding:20px">Snapshots at iterations 1, 10, 20, 50, 100, 200, 500</div>';
}

/* Initialize on DOM ready */
document.addEventListener('DOMContentLoaded', function() {
  renderLogbook();
  renderScalingTable();
  initCharts();
  updateScalingPlots();
});
