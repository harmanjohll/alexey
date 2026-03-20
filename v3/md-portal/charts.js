/* charts.js — Chart.js chart creation and update functions for v3 MD portal */
/* All functions are plain globals. No modules. */

var energyChartInst = null;
var tempChartInst   = null;
var layerChartInst  = null;
var dlLayerChartInst   = null;
var dlGeLayerChartInst = null;
var dlSurfGeChartInst  = null;

var chartDefaults = {
  responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: 'rgba(20,20,20,0.95)',
      borderColor: 'rgba(61,207,176,0.3)',
      borderWidth: 1,
      titleColor: '#e8e8e8',
      bodyColor: '#8a8a8a',
      titleFont: { family: 'JetBrains Mono', size: 10 },
      bodyFont:  { family: 'JetBrains Mono', size: 10 }
    }
  },
  scales: {
    x: { grid: { color: 'rgba(61,207,176,0.06)' }, ticks: { color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } } },
    y: { grid: { color: 'rgba(61,207,176,0.06)' }, ticks: { color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } } }
  }
};

function cloneDefaults() {
  return JSON.parse(JSON.stringify(chartDefaults));
}

/* ─── 1. destroyAllCharts ─── */

function destroyAllCharts() {
  if (energyChartInst)    { energyChartInst.destroy();    energyChartInst    = null; }
  if (tempChartInst)      { tempChartInst.destroy();      tempChartInst      = null; }
  if (layerChartInst)     { layerChartInst.destroy();     layerChartInst     = null; }
  if (dlLayerChartInst)   { dlLayerChartInst.destroy();   dlLayerChartInst   = null; }
  if (dlGeLayerChartInst) { dlGeLayerChartInst.destroy(); dlGeLayerChartInst = null; }
  if (dlSurfGeChartInst)  { dlSurfGeChartInst.destroy();  dlSurfGeChartInst  = null; }
}

/* ─── 2. updateLiveCharts ─── */

function updateLiveCharts(energyHistory, tempHistory, layers) {
  /* --- Energy chart --- */
  var eCanvas = document.getElementById('energyChart');
  if (eCanvas) {
    if (energyChartInst) {
      var eData = energyChartInst.data;
      // Sync labels and data to match full history length
      eData.labels = energyHistory.map(function(_, i) { return i; });
      eData.datasets[0].data = energyHistory.slice();
      energyChartInst.update('none');
    } else {
      var eOpts = cloneDefaults();
      eOpts.scales.x.title = { display: true, text: 'Loop', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
      eOpts.scales.y.title = { display: true, text: 'eV/atom', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
      energyChartInst = new Chart(eCanvas, {
        type: 'line',
        data: {
          labels: energyHistory.map(function(_, i) { return i; }),
          datasets: [{
            data: energyHistory.slice(),
            borderColor: '#ddb84d',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }]
        },
        options: eOpts
      });
    }
  }

  /* --- Temperature chart --- */
  var tCanvas = document.getElementById('tempChart');
  if (tCanvas) {
    if (tempChartInst) {
      var tData = tempChartInst.data;
      tData.labels = tempHistory.map(function(_, i) { return i; });
      tData.datasets[0].data = tempHistory.slice();
      tempChartInst.update('none');
    } else {
      var tOpts = cloneDefaults();
      tOpts.scales.x.title = { display: true, text: 'Loop', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
      tOpts.scales.y.title = { display: true, text: 'K', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
      tempChartInst = new Chart(tCanvas, {
        type: 'line',
        data: {
          labels: tempHistory.map(function(_, i) { return i; }),
          datasets: [{
            data: tempHistory.slice(),
            borderColor: '#e24b4a',
            borderWidth: 1.5,
            pointRadius: 0,
            fill: false
          }]
        },
        options: tOpts
      });
    }
  }

  /* --- Layer chart (Ge fraction per layer) --- */
  var lCanvas = document.getElementById('layerChart');
  if (lCanvas && layers && layers.length > 0) {
    var lLabels = layers.map(function(_, i) { return 'L' + (i + 1); });
    var lData   = layers.map(function(l) { return l.ge / Math.max(1, l.si + l.ge); });
    // Color surface layers (first 2 and last 2) differently from bulk
    var nL = layers.length;
    var lColors = layers.map(function(_, i) {
      if (i <= 1 || i >= nL - 2) return 'rgba(226,75,74,0.5)'; // surface: reddish
      return 'rgba(221,136,68,0.5)'; // bulk: orange
    });
    var lBorders = layers.map(function(_, i) {
      if (i <= 1 || i >= nL - 2) return '#e24b4a';
      return '#dd8844';
    });

    // Destroy and recreate when layer count changes (different ncz)
    if (layerChartInst) {
      if (layerChartInst.data.labels.length !== lLabels.length) {
        layerChartInst.destroy();
        layerChartInst = null;
      } else {
        layerChartInst.data.labels = lLabels;
        layerChartInst.data.datasets[0].data = lData;
        layerChartInst.data.datasets[0].backgroundColor = lColors;
        layerChartInst.data.datasets[0].borderColor = lBorders;
        layerChartInst.update('none');
      }
    }
    if (!layerChartInst) {
      var lOpts = cloneDefaults();
      lOpts.scales.x.title = { display: true, text: 'Layer (bottom\u2192top)', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
      lOpts.scales.y.title = { display: true, text: 'Ge fraction', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
      lOpts.scales.y.min = 0;
      lOpts.scales.y.max = 1;
      layerChartInst = new Chart(lCanvas, {
        type: 'bar',
        data: {
          labels: lLabels,
          datasets: [{
            data: lData,
            backgroundColor: lColors,
            borderColor: lBorders,
            borderWidth: 1,
            borderRadius: 2
          }]
        },
        options: lOpts
      });
    }
  }
}

/* ─── 3. updateLayerPlot ─── */

function updateLayerPlot(sweepData, fitResult) {
  var canvas = document.getElementById('dlLayerChart');
  if (!canvas) return;

  if (dlLayerChartInst) { dlLayerChartInst.destroy(); dlLayerChartInst = null; }

  var points = sweepData.map(function(d) { return { x: d.nLayers, y: d.etotal }; });

  var datasets = [{
    label: 'E_total',
    data: points,
    type: 'scatter',
    backgroundColor: '#ddb84d',
    pointRadius: 6,
    borderColor: '#a08020',
    borderWidth: 1
  }];

  var hasFit = fitResult && fitResult.slope !== undefined && fitResult.intercept !== undefined;

  if (hasFit) {
    var xVals = points.map(function(p) { return p.x; });
    var xMin  = Math.min.apply(null, xVals);
    var xMax  = Math.max.apply(null, xVals);
    var range = xMax - xMin || 1;
    var x0 = xMin - range * 0.15;
    var x1 = xMax + range * 0.15;
    datasets.push({
      label: 'Linear fit',
      data: [
        { x: x0, y: fitResult.slope * x0 + fitResult.intercept },
        { x: x1, y: fitResult.slope * x1 + fitResult.intercept }
      ],
      type: 'scatter',
      showLine: true,
      borderColor: 'rgba(221,136,68,0.6)',
      borderWidth: 2,
      borderDash: [6, 3],
      pointRadius: 0,
      fill: false
    });
  }

  var opts = cloneDefaults();
  opts.scales.x.title = { display: true, text: 'N_layers (4\u00d7ncz + 1)', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
  opts.scales.y.title = { display: true, text: 'E_total (eV)', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
  opts.plugins.legend.display = hasFit;
  if (hasFit) {
    opts.plugins.legend.labels = { color: '#8a8a8a', font: { family: 'JetBrains Mono', size: 9 } };
  }

  dlLayerChartInst = new Chart(canvas, {
    type: 'scatter',
    data: { datasets: datasets },
    options: opts
  });
}

/* ─── 4. updateGeLayerPlot ─── */
/* Shows symmetric Ge layer profile (surface → bulk) averaged across all ncz runs */

function updateGeLayerPlot(layerDataArray) {
  var canvas = document.getElementById('dlGeLayerChart');
  if (!canvas) return;

  if (dlGeLayerChartInst) { dlGeLayerChartInst.destroy(); dlGeLayerChartInst = null; }

  if (!layerDataArray || layerDataArray.length === 0) return;

  // If passed a single layers array (backward compat), wrap it
  var dataArr = layerDataArray;
  if (layerDataArray[0] && layerDataArray[0].si !== undefined) {
    // Single layers array passed — compute Ge fraction per layer
    var labels = layerDataArray.map(function(_, i) { return 'L' + (i + 1); });
    var data = layerDataArray.map(function(l) { return l.ge / Math.max(1, l.si + l.ge); });
    var opts = cloneDefaults();
    opts.scales.x.title = { display: true, text: 'Layer (bottom\u2192top)', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
    opts.scales.y.title = { display: true, text: 'Ge fraction', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
    opts.scales.y.min = 0;
    opts.scales.y.max = 1;
    dlGeLayerChartInst = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: 'rgba(221,136,68,0.6)',
          borderColor: '#dd8844',
          borderWidth: 1,
          borderRadius: 2
        }]
      },
      options: opts
    });
    return;
  }

  // Array of simulation results — compute symmetric layer profile
  var symLayers = computeSymmetricLayers(dataArr);
  var labels = ['Surface', 'Surface-1', 'Surface-2', 'Surface-3'];
  var colors = [
    'rgba(226,75,74,0.6)', 'rgba(221,136,68,0.6)',
    'rgba(221,184,77,0.5)', 'rgba(180,180,100,0.4)'
  ];
  var borders = ['#e24b4a', '#dd8844', '#ddb84d', '#b4b464'];

  var opts = cloneDefaults();
  opts.scales.x.title = { display: true, text: 'Layer (surface \u2192 bulk)', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
  opts.scales.y.title = { display: true, text: 'Avg Ge fraction', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
  opts.scales.y.min = 0;
  opts.scales.y.max = 1;
  opts.plugins.legend.display = false;

  dlGeLayerChartInst = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        data: symLayers,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 1,
        borderRadius: 2
      }]
    },
    options: opts
  });
}

/* ─── 5. updateMasterPlot ─── */

function updateMasterPlot(surfaceEnergyData) {
  var canvas = document.getElementById('dlSurfGeChart');
  if (!canvas) return;

  if (dlSurfGeChartInst) { dlSurfGeChartInst.destroy(); dlSurfGeChartInst = null; }

  var points = surfaceEnergyData.map(function(d) { return { x: d.geFrac, y: d.surfE }; });

  var opts = cloneDefaults();
  opts.scales.x.title = { display: true, text: 'Ge Fraction', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };
  opts.scales.y.title = { display: true, text: 'Surface Energy (eV)', color: '#5a5a5a', font: { family: 'JetBrains Mono', size: 9 } };

  dlSurfGeChartInst = new Chart(canvas, {
    type: 'scatter',
    data: {
      datasets: [{
        data: points,
        backgroundColor: '#dd8844',
        pointRadius: 6,
        borderColor: '#a06020',
        borderWidth: 1
      }]
    },
    options: opts
  });
}
