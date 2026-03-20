/* sweep.js — sweep orchestrator for v3 MD portal
   Depends on: worker-tersoff.js (Worker), charts.js, data.js, viz3d.js, app.js
*/

var running = false;
var cancelled = false;
var currentLayerData = [];
var energyHistory = [];
var tempHistory = [];

window.summaryData = [];
window.rawDataMap = {};

function runSinglePoint(params) {
  return new Promise(function(resolve) {
    var w = new Worker('worker-tersoff.js');
    var step = 0;
    var halfSteps = Math.floor(params.niter1 / 2);
    var prodEnergies = [];
    // Production-averaged composition data
    var prodGeFracs = [];
    var prodLayerAccum = null; // accumulated {si, ge} per layer over production steps
    var prodLayerCount = 0;
    var lastUpdate = null;
    var boxDims = null;

    // Reset energy/temp history for this specific run
    energyHistory = [];
    tempHistory = [];

    w.onmessage = function(e) {
      var msg = e.data;
      if (msg.type === 'init_done') {
        boxDims = {lx: msg.totlx, ly: msg.totly, lz: msg.totlz};
        step = 0;
        doStep();
      } else if (msg.type === 'update') {
        lastUpdate = msg;

        updateLiveStats(msg);
        updateAtoms(msg.positions, msg.species, msg.natom, boxDims.lx, boxDims.ly, boxDims.lz);

        energyHistory.push(msg.energy);
        tempHistory.push(msg.temperature);
        updateLiveCharts(energyHistory, tempHistory, msg.layers);

        if (step >= halfSteps) {
          prodEnergies.push(msg.energy);
          prodGeFracs.push(msg.nGe / msg.natom);

          // Accumulate layer composition for production averaging
          if (msg.layers && msg.layers.length > 0) {
            if (!prodLayerAccum) {
              prodLayerAccum = [];
              for (var li = 0; li < msg.layers.length; li++) {
                prodLayerAccum.push({si: 0, ge: 0});
              }
            }
            for (var li = 0; li < msg.layers.length && li < prodLayerAccum.length; li++) {
              prodLayerAccum[li].si += msg.layers[li].si;
              prodLayerAccum[li].ge += msg.layers[li].ge;
            }
            prodLayerCount++;
          }
        }

        var progEl = document.getElementById('progressText');
        if (progEl && params._sweepLabel) {
          progEl.textContent = params._sweepLabel + ' · loop ' + (step + 1) + '/' + params.niter1;
        }

        step++;
        if (step < params.niter1 && !cancelled) {
          setTimeout(doStep, 2);
        } else {
          w.terminate();
          var avgE = prodEnergies.length > 0 ? prodEnergies.reduce(function(a, b) { return a + b; }, 0) / prodEnergies.length : 0;
          var avgGeFrac = prodGeFracs.length > 0 ? prodGeFracs.reduce(function(a, b) { return a + b; }, 0) / prodGeFracs.length : 0;

          // Compute production-averaged layer composition
          var avgLayers = [];
          if (prodLayerAccum && prodLayerCount > 0) {
            for (var li = 0; li < prodLayerAccum.length; li++) {
              avgLayers.push({
                si: prodLayerAccum[li].si / prodLayerCount,
                ge: prodLayerAccum[li].ge / prodLayerCount
              });
            }
          }

          var nLayers = 4 * params.ncz + 1;
          resolve({
            ncz: params.ncz,
            nLayers: nLayers,
            natom: msg.natom,
            epa: avgE,
            etotal: avgE * msg.natom,
            nSi: msg.nSi,
            nGe: msg.nGe,
            geFrac: avgGeFrac,
            layers: avgLayers.length > 0 ? avgLayers : (msg.layers || [])
          });
        }
      }
    };

    function doStep() {
      w.postMessage({type: 'step', step: step, params: {
        dt: params.dt,
        nvv: params.niter2,
        temp: params.temp,
        mcswap: params.niter3,
        mcgc: params.niter4,
        dmu: params.dmu
      }});
    }

    w.postMessage({type: 'init', params: {
      ncx: params.ncx || 3,
      ncy: params.ncy || 3,
      ncz: params.ncz,
      theta: params.theta,
      temp: params.temp,
      lattx: params.lattx,
      latty: params.latty,
      lattz: params.lattz
    }});
  });
}

async function runFullSweep() {
  if (running) return;
  running = true;
  cancelled = false;

  document.getElementById('btnRunSweep').disabled = true;
  document.getElementById('btnRunSingle').disabled = true;
  document.getElementById('btnCancel').disabled = false;

  var params = getParams();
  var nczValues = getSelectedNcz();
  var muValues = [];
  for (var mu = params.muStart; mu <= params.muEnd + 0.001; mu += params.muStep) {
    muValues.push(Math.round(mu * 1000) / 1000);
  }

  var totalPoints = muValues.length * nczValues.length;
  var pointNum = 0;

  window.summaryData = [];
  window.rawDataMap = {};
  renderSummaryTable(window.summaryData);

  for (var mi = 0; mi < muValues.length; mi++) {
    if (cancelled) break;
    var mu = muValues[mi];
    var layerData = [];
    currentLayerData = layerData;

    destroyAllCharts();

    document.getElementById('statMuGe').textContent = mu.toFixed(2);

    for (var ni = 0; ni < nczValues.length; ni++) {
      if (cancelled) break;
      var ncz = nczValues[ni];
      pointNum++;

      updateProgress(pointNum, totalPoints, mu, ncz);

      var result = await runSinglePoint({
        ncx: 3, ncy: 3, ncz: ncz,
        theta: params.theta,
        temp: params.temp,
        dt: params.dt,
        niter1: params.niter1,
        niter2: params.niter2,
        niter3: params.niter3,
        niter4: params.niter4,
        dmu: mu,  // dmu = mu_ge (positive favors Ge incorporation); mu_si = 0 reference
        lattx: params.lattx,
        latty: params.latty,
        lattz: params.lattz,
        _sweepLabel: '\u03BC=' + mu.toFixed(2) + ' ncz=' + ncz + ' (' + pointNum + '/' + totalPoints + ')'
      });

      layerData.push(result);
      renderRawTable(currentLayerData);

      var partialFit = layerData.length >= 2 ? fitLinear(layerData.map(function(d) { return {x: d.nLayers, y: d.etotal}; })) : null;
      updateLayerPlot(layerData, partialFit);

      // Composition regression: N_Ge vs N_layers (progressive)
      var partialCompFit = layerData.length >= 2 ? fitLinear(layerData.map(function(d) { return {x: d.nLayers, y: d.geFrac * d.natom}; })) : null;
      updateCompositionPlot(layerData, partialCompFit);

      // Show symmetric layer profile averaged across all ncz runs so far
      updateGeLayerPlot(layerData);
    }

    if (cancelled) break;

    // --- Energy regression ---
    var fitData = layerData.map(function(d) { return {x: d.nLayers, y: d.etotal}; });
    var fit = fitLinear(fitData);
    var surfE = fit.intercept / 2;

    document.getElementById('fitResult').style.display = '';
    document.getElementById('fitValue').textContent = surfE.toFixed(4) + ' eV';
    document.getElementById('fitDetail').textContent = 'E = ' + fit.slope.toFixed(4) + ' \u00D7 N + ' + fit.intercept.toFixed(4) + '  |  R\u00B2 = ' + fit.r2.toFixed(6);

    // --- Composition regression: N_Ge vs N_layers ---
    var compFitData = layerData.map(function(d) { return {x: d.nLayers, y: d.geFrac * d.natom}; });
    var compFit = fitLinear(compFitData);
    // atoms per bulk layer = ncx * ncy * 4 = 3 * 3 * 4 = 36
    var atomsPerLayer = params.ncx * params.ncy * 4;
    var xBulk = compFit.slope / atomsPerLayer;
    var geExcess = compFit.intercept / 2; // Ge excess per surface (in atoms)

    document.getElementById('compFitResult').style.display = '';
    document.getElementById('compFitValue').textContent = xBulk.toFixed(4);
    document.getElementById('compFitDetail').textContent = 'N_Ge = ' + compFit.slope.toFixed(2) + ' \u00D7 N + ' + compFit.intercept.toFixed(2) + '  |  R\u00B2 = ' + compFit.r2.toFixed(6) + '  |  \u0394\u0393 = ' + geExcess.toFixed(1) + ' atoms/surface';

    var avgGeFrac = layerData.reduce(function(s, d) { return s + d.geFrac; }, 0) / layerData.length;
    var symLayers = computeSymmetricLayers(layerData);

    var entry = {mu: mu, surfE: surfE, r2: fit.r2, xBulk: xBulk, geFrac: avgGeFrac, geExcess: geExcess, compR2: compFit.r2, layers: symLayers};
    window.summaryData.push(entry);
    window.rawDataMap[mu.toFixed(3)] = layerData;

    renderSummaryTable(window.summaryData);
    updateMasterPlot(window.summaryData);
    updateLayerPlot(layerData, fit);
    updateCompositionPlot(layerData, compFit);
  }

  running = false;
  document.getElementById('btnRunSweep').disabled = false;
  document.getElementById('btnRunSingle').disabled = false;
  document.getElementById('btnCancel').disabled = true;
  document.getElementById('progressText').textContent = cancelled ? 'Cancelled' : 'Complete';
}

async function runSingleMuSweep() {
  if (running) return;
  running = true;
  cancelled = false;

  document.getElementById('btnRunSweep').disabled = true;
  document.getElementById('btnRunSingle').disabled = true;
  document.getElementById('btnCancel').disabled = false;

  var params = getParams();
  var nczValues = getSelectedNcz();
  var mu = params.muStart;

  currentLayerData = [];
  destroyAllCharts();

  document.getElementById('statMuGe').textContent = mu.toFixed(2);

  for (var ni = 0; ni < nczValues.length; ni++) {
    if (cancelled) break;
    var ncz = nczValues[ni];
    updateProgress(ni + 1, nczValues.length, mu, ncz);

    var result = await runSinglePoint({
      ncx: 3, ncy: 3, ncz: ncz,
      theta: params.theta,
      temp: params.temp,
      dt: params.dt,
      niter1: params.niter1,
      niter2: params.niter2,
      niter3: params.niter3,
      niter4: params.niter4,
      dmu: mu,  // dmu = mu_ge (positive favors Ge incorporation); mu_si = 0 reference
      lattx: params.lattx,
      latty: params.latty,
      lattz: params.lattz,
      _sweepLabel: '\u03BC=' + mu.toFixed(2) + ' ncz=' + ncz + ' (' + (ni + 1) + '/' + nczValues.length + ')'
    });

    currentLayerData.push(result);
    renderRawTable(currentLayerData);
    var partialFit = currentLayerData.length >= 2 ? fitLinear(currentLayerData.map(function(d) { return {x: d.nLayers, y: d.etotal}; })) : null;
    updateLayerPlot(currentLayerData, partialFit);
    var partialCompFit = currentLayerData.length >= 2 ? fitLinear(currentLayerData.map(function(d) { return {x: d.nLayers, y: d.geFrac * d.natom}; })) : null;
    updateCompositionPlot(currentLayerData, partialCompFit);
    updateGeLayerPlot(currentLayerData);
  }

  if (!cancelled && currentLayerData.length >= 2) {
    recalcFitFromTable(currentLayerData);

    // Composition regression for single mu sweep
    var compFitData = currentLayerData.map(function(d) { return {x: d.nLayers, y: d.geFrac * d.natom}; });
    var compFit = fitLinear(compFitData);
    var atomsPerLayer = params.ncx * params.ncy * 4;
    var xBulk = compFit.slope / atomsPerLayer;
    var geExcess = compFit.intercept / 2;

    document.getElementById('compFitResult').style.display = '';
    document.getElementById('compFitValue').textContent = xBulk.toFixed(4);
    document.getElementById('compFitDetail').textContent = 'N_Ge = ' + compFit.slope.toFixed(2) + ' \u00D7 N + ' + compFit.intercept.toFixed(2) + '  |  R\u00B2 = ' + compFit.r2.toFixed(6) + '  |  \u0394\u0393 = ' + geExcess.toFixed(1) + ' atoms/surface';
    updateCompositionPlot(currentLayerData, compFit);
  }

  running = false;
  document.getElementById('btnRunSweep').disabled = false;
  document.getElementById('btnRunSingle').disabled = false;
  document.getElementById('btnCancel').disabled = true;
  document.getElementById('progressText').textContent = cancelled ? 'Cancelled' : 'Complete';
}

function cancelSweep() {
  cancelled = true;
}

function clearRawTable() {
  currentLayerData = [];
  renderRawTable(currentLayerData);
  document.getElementById('fitResult').style.display = 'none';
}

function clearAllData() {
  window.summaryData = [];
  window.rawDataMap = {};
  currentLayerData = [];
  renderSummaryTable(window.summaryData);
  renderRawTable(currentLayerData);
  destroyAllCharts();
  document.getElementById('fitResult').style.display = 'none';
  localStorage.removeItem('alexey_v3_md_experiment');
}

function addLayerRow() {
  var lastNcz = currentLayerData.length > 0 ? currentLayerData[currentLayerData.length - 1].ncz + 1 : 2;
  currentLayerData.push({ncz: lastNcz, nLayers: 4 * lastNcz + 1, natom: 0, epa: 0, etotal: 0, layers: [], geFrac: 0});
  renderRawTable(currentLayerData);
}
