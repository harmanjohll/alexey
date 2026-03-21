/* charts.js — Fractal Portal: Chart.js wrappers */

var _charts = {};

var _chartTheme = {
  gridColor: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'rgba(61,207,192,0.06)' : 'rgba(45,90,90,0.08)';
  },
  tickColor: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? '#5a5a5a' : '#9a9490';
  },
  tooltipBg: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? '#141414' : '#ffffff';
  },
  tooltipBorder: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? 'rgba(61,207,192,0.2)' : 'rgba(45,90,90,0.2)';
  },
  tooltipTitle: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? '#e8e8e8' : '#1a1a18';
  },
  tooltipBody: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? '#8a8a8a' : '#6b6560';
  },
  accentColor: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? '#3dcfc0' : '#2d5a5a';
  },
  accentLight: function() {
    return document.documentElement.getAttribute('data-theme') === 'dark'
      ? '#6eddd2' : '#3d7a7a';
  }
};

function _tooltipOpts() {
  return {
    backgroundColor: _chartTheme.tooltipBg(),
    borderColor: _chartTheme.tooltipBorder(),
    borderWidth: 1,
    titleColor: _chartTheme.tooltipTitle(),
    bodyColor: _chartTheme.tooltipBody(),
    titleFont: {family: 'JetBrains Mono', size: 10},
    bodyFont: {family: 'JetBrains Mono', size: 10}
  };
}

function _axOpts(label) {
  var o = {
    grid: {color: _chartTheme.gridColor()},
    ticks: {color: _chartTheme.tickColor(), font: {family: 'JetBrains Mono', size: 9}}
  };
  if (label) o.title = {display: true, text: label, color: _chartTheme.tickColor(), font: {family: 'JetBrains Mono', size: 9}};
  return o;
}

/* ── M(r) Mass Chart (DLA) ── */
function initMassChart(canvasId) {
  var cc = document.getElementById(canvasId);
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(cc, {
    type: 'scatter',
    data: {datasets: [
      {data: [], backgroundColor: _chartTheme.accentLight(), pointRadius: 3, label: 'M(r)'},
      {data: [], type: 'line', borderColor: 'rgba(240,180,41,0.6)', borderWidth: 1.5, pointRadius: 0, label: 'Fit', fill: false}
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: false}, tooltip: _tooltipOpts()},
      scales: {x: _axOpts('log₁₀(r)'), y: _axOpts('log₁₀(M)')}
    }
  });
  return _charts[canvasId];
}

function updateMassChart(chart, data, D) {
  if (!data || data.length < 2) return;
  var pts = data.map(function(d) { return {x: Math.log10(d.r), y: Math.log10(d.M)}; });
  var xs = pts.map(function(p) { return p.x; });
  var ys = pts.map(function(p) { return p.y; });
  var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (var i = 0; i < n; i++) { sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; }
  var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  var intercept = (sy - slope * sx) / n;
  var fitXs = [Math.min.apply(null, xs) - 0.1, Math.max.apply(null, xs) + 0.1];
  var fitYs = fitXs.map(function(x) { return slope * x + intercept; });

  chart.data.datasets[0].data = pts;
  chart.data.datasets[0].backgroundColor = _chartTheme.accentLight();
  chart.data.datasets[1].data = fitXs.map(function(x, i) { return {x: x, y: fitYs[i]}; });
  chart.update('none');
}

/* ── Sweep Chart (D vs sticking probability) ── */
function initSweepChart(canvasId) {
  var cc = document.getElementById(canvasId);
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(cc, {
    type: 'scatter',
    data: {datasets: [{
      data: [],
      backgroundColor: _chartTheme.accentLight(),
      borderColor: _chartTheme.accentColor(),
      pointRadius: 5,
      showLine: true,
      borderWidth: 1.5,
      label: 'D vs sticking'
    }]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: false}, tooltip: _tooltipOpts()},
      scales: {
        x: _axOpts('Sticking probability'),
        y: _axOpts('Fractal dimension D')
      }
    }
  });
  return _charts[canvasId];
}

function updateSweepChart(chart, results) {
  chart.data.datasets[0].data = results.map(function(r) { return {x: r.stick, y: r.D}; });
  chart.data.datasets[0].backgroundColor = _chartTheme.accentLight();
  chart.data.datasets[0].borderColor = _chartTheme.accentColor();
  chart.update('none');
}

/* ── Seed Comparison Chart ── */
function initSeedCompChart(canvasId) {
  var cc = document.getElementById(canvasId);
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(cc, {
    type: 'bar',
    data: {
      labels: ['Point', 'Line', 'Circle'],
      datasets: [{
        data: [0, 0, 0],
        backgroundColor: [
          'rgba(61,207,192,0.6)',
          'rgba(109,221,210,0.6)',
          'rgba(240,180,41,0.6)'
        ],
        borderWidth: 0,
        borderRadius: 2
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: false}, tooltip: _tooltipOpts()},
      scales: {x: _axOpts(), y: _axOpts('Fractal dimension D')}
    }
  });
  return _charts[canvasId];
}

function updateSeedCompChart(chart, results) {
  chart.data.datasets[0].data = results.map(function(r) { return r.D; });
  chart.update('none');
}

/* ── Perimeter Chart (Koch) ── */
function initPerimeterChart(canvasId) {
  var cc = document.getElementById(canvasId);
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(cc, {
    type: 'bar',
    data: {
      labels: [],
      datasets: [
        {data: [], backgroundColor: 'rgba(61,207,192,0.6)', borderWidth: 0, borderRadius: 2, label: 'Explored'},
        {data: [], type: 'line', borderColor: 'rgba(109,221,210,0.3)', borderWidth: 1, pointRadius: 0, borderDash: [4, 3], label: 'Theoretical', fill: false}
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: false}, tooltip: _tooltipOpts()},
      scales: {x: _axOpts(), y: _axOpts('Perimeter')}
    }
  });
  return _charts[canvasId];
}

function updatePerimeterChart(chart, currentIter, fracType) {
  var labels = [], data = [], theoData = [];
  for (var i = 0; i <= 6; i++) {
    labels.push('n=' + i);
    var info = getKochPerimInfo(i, fracType);
    data.push(i <= currentIter ? info.perim : null);
    theoData.push(info.perim);
  }
  chart.data.labels = labels;
  chart.data.datasets[0].data = data;
  chart.data.datasets[1].data = theoData;
  chart.update('none');
}

/* ── Ruler Chart (log-log) ── */
function initRulerChart(canvasId) {
  var cc = document.getElementById(canvasId);
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(cc, {
    type: 'scatter',
    data: {datasets: [
      {data: [], backgroundColor: _chartTheme.accentLight(), pointRadius: 4, label: 'Measurements'},
      {data: [], type: 'line', borderColor: 'rgba(240,180,41,0.6)', borderWidth: 1.5, pointRadius: 0, label: 'Fit', fill: false}
    ]},
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: false}, tooltip: _tooltipOpts()},
      scales: {x: _axOpts('ln(1/ruler)'), y: _axOpts('ln(length)')}
    }
  });
  return _charts[canvasId];
}

function updateRulerChart(chart, rulerData) {
  if (rulerData.length < 2) return;
  var xs = [], ys = [];
  for (var i = 0; i < rulerData.length; i++) {
    xs.push(Math.log(1 / rulerData[i].size));
    ys.push(Math.log(rulerData[i].length));
  }
  var pts = xs.map(function(x, i) { return {x: x, y: ys[i]}; });

  var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (var j = 0; j < n; j++) { sx += xs[j]; sy += ys[j]; sxx += xs[j] * xs[j]; sxy += xs[j] * ys[j]; }
  var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  var intercept = (sy - slope * sx) / n;
  var fitXs = [Math.min.apply(null, xs) - 0.2, Math.max.apply(null, xs) + 0.2];
  var fitYs = fitXs.map(function(x) { return slope * x + intercept; });

  chart.data.datasets[0].data = pts;
  chart.data.datasets[0].backgroundColor = _chartTheme.accentLight();
  chart.data.datasets[1].data = fitXs.map(function(x, i) { return {x: x, y: fitYs[i]}; });
  chart.update('none');
}

/* ── Convergence Chart (MC area) ── */
function initConvergenceChart(canvasId) {
  var cc = document.getElementById(canvasId);
  if (_charts[canvasId]) _charts[canvasId].destroy();
  _charts[canvasId] = new Chart(cc, {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        {data: [], borderColor: _chartTheme.accentColor(), borderWidth: 1.5, pointRadius: 0, label: 'Estimate', fill: false},
        {data: [], borderColor: 'rgba(240,180,41,0.5)', borderWidth: 1, borderDash: [4, 3], pointRadius: 0, label: 'Theoretical', fill: false}
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {legend: {display: false}, tooltip: _tooltipOpts()},
      scales: {
        x: _axOpts('Points'),
        y: _axOpts('Area')
      }
    }
  });
  return _charts[canvasId];
}

function updateConvergenceChart(chart, convergence, theoArea) {
  chart.data.labels = convergence.map(function(d) { return d.n; });
  chart.data.datasets[0].data = convergence.map(function(d) { return d.area; });
  chart.data.datasets[0].borderColor = _chartTheme.accentColor();
  chart.data.datasets[1].data = convergence.map(function() { return theoArea; });
  chart.update('none');
}
