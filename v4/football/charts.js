/* charts.js — Chart.js chart management for the Football Portal */

// Store chart instances for cleanup
var _charts = {};

/**
 * Get Chart.js default styling options matching the portal theme.
 * Reads CSS custom properties for theme-aware colors.
 */
function chartDefaults() {
  var style = getComputedStyle(document.documentElement);
  var textMuted = style.getPropertyValue('--text-tertiary').trim() || '#5a5a5a';
  var borderLight = style.getPropertyValue('--border-light').trim() || 'rgba(61,207,176,0.06)';
  var surface = style.getPropertyValue('--surface').trim() || '#141414';
  var textPrimary = style.getPropertyValue('--text-primary').trim() || '#e8e8e8';
  var textSec = style.getPropertyValue('--text-secondary').trim() || '#8a8a8a';
  return {
    fontFamily: "'JetBrains Mono', monospace",
    gridColor: borderLight,
    tickColor: textMuted,
    tooltipBg: surface,
    tooltipBorder: borderLight,
    tooltipTitle: textPrimary,
    tooltipBody: textSec,
    legendColor: textMuted
  };
}

/**
 * Initialize the Monte Carlo histogram chart with optional Poisson overlay.
 * @param {string} canvasId - Canvas element ID
 * @returns {Chart} Chart instance
 */
function initMCChart(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var d = chartDefaults();
  var chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: { color: d.legendColor, font: { family: d.fontFamily, size: 9 }, boxWidth: 12 }
        },
        tooltip: {
          backgroundColor: d.tooltipBg,
          borderColor: d.tooltipBorder,
          borderWidth: 1,
          titleColor: d.tooltipTitle,
          bodyColor: d.tooltipBody,
          titleFont: { family: d.fontFamily, size: 10 },
          bodyFont: { family: d.fontFamily, size: 10 }
        }
      },
      scales: {
        x: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } } },
        y: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } } }
      }
    }
  });
  _charts[canvasId] = chart;
  return chart;
}

/**
 * Update the Monte Carlo histogram with new data and Poisson overlay.
 * @param {Chart} chart - Chart instance
 * @param {Array} counts - Goal count distribution from MC
 * @param {Array} poissonData - Poisson expected counts
 * @param {number} numSims - Number of simulations
 */
function updateMCChart(chart, counts, poissonData, numSims) {
  if (!chart) return;
  var N = numSims || 500;
  var mx = 0;
  for (var i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) { mx = i; break; }
  }
  var labels = [];
  for (var k = 0; k < counts.length; k++) {
    labels.push(k === 1 ? '1 goal' : k + ' goals');
  }
  var bgColors = [];
  for (var j = 0; j < counts.length; j++) {
    var t = j / Math.max(1, mx);
    bgColors.push('rgba(' + Math.round(60 + t * 166) + ',' + Math.round(160 - t * 100) + ',60,0.75)');
  }
  chart.data.labels = labels;
  chart.data.datasets = [
    {
      label: 'Monte Carlo',
      data: counts,
      backgroundColor: bgColors,
      borderWidth: 0,
      borderRadius: 2,
      order: 2
    },
    {
      label: 'Poisson',
      data: poissonData,
      type: 'line',
      borderColor: '#f0b429',
      borderWidth: 1.5,
      borderDash: [4, 4],
      pointRadius: 3,
      pointBackgroundColor: '#f0b429',
      fill: false,
      order: 1
    }
  ];
  chart.options.plugins.tooltip.callbacks = {
    label: function(ctx) {
      if (ctx.dataset.label === 'Monte Carlo') return ctx.raw + ' runs (' + (ctx.raw / N * 100).toFixed(1) + '%)';
      return 'Poisson: ' + ctx.raw;
    }
  };
  chart.update();
}

/**
 * Initialize the overperformance scatter chart (xG vs Goals).
 * @param {string} canvasId - Canvas element ID
 * @returns {Chart} Chart instance
 */
function initOverPerfChart(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var d = chartDefaults();
  var chart = new Chart(canvas, {
    type: 'scatter',
    data: { datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: {
            color: d.legendColor,
            font: { family: d.fontFamily, size: 9 },
            boxWidth: 8,
            filter: function(item) { return item.text !== 'xG = Goals'; }
          }
        },
        tooltip: {
          backgroundColor: d.tooltipBg,
          borderColor: d.tooltipBorder,
          borderWidth: 1,
          titleColor: d.tooltipTitle,
          bodyColor: d.tooltipBody,
          titleFont: { family: d.fontFamily, size: 10 },
          bodyFont: { family: d.fontFamily, size: 10 },
          callbacks: {
            label: function(ctx) {
              if (ctx.dataset.label === 'xG = Goals') return '';
              var p = ctx.raw;
              return p.label + ': ' + p.y + ' goals / ' + p.x.toFixed(1) + ' xG (' + (p.y > p.x ? '+' : '') + (p.y - p.x).toFixed(1) + ')';
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'xG (Expected Goals)', color: d.tickColor, font: { family: d.fontFamily, size: 9 } },
          grid: { color: d.gridColor },
          ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } }
        },
        y: {
          title: { display: true, text: 'Actual Goals', color: d.tickColor, font: { family: d.fontFamily, size: 9 } },
          grid: { color: d.gridColor },
          ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } }
        }
      }
    }
  });
  _charts[canvasId] = chart;
  return chart;
}

/**
 * Update the overperformance scatter chart with team data.
 * @param {Chart} chart - Chart instance
 * @param {Array} datasets - Array of dataset objects
 */
function updateOverPerfChart(chart, datasets) {
  if (!chart) return;
  chart.data.datasets = datasets;
  // Calculate bounds
  var allVals = [];
  datasets.forEach(function(ds) {
    if (ds.label === 'xG = Goals') return;
    ds.data.forEach(function(p) {
      allVals.push(p.x);
      allVals.push(p.y);
    });
  });
  if (allVals.length > 0) {
    var minV = Math.min.apply(null, allVals) - 5;
    var maxV = Math.max.apply(null, allVals) + 5;
    chart.options.scales.x.min = minV;
    chart.options.scales.x.max = maxV;
    chart.options.scales.y.min = minV;
    chart.options.scales.y.max = maxV;
  }
  chart.update();
}

/**
 * Initialize a shot distribution bar chart.
 * @param {string} canvasId - Canvas element ID
 * @returns {Chart} Chart instance
 */
function initShotZoneChart(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var d = chartDefaults();
  var chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: { color: d.legendColor, font: { family: d.fontFamily, size: 9 }, boxWidth: 10 }
        },
        tooltip: {
          callbacks: { label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw + '%'; } },
          backgroundColor: d.tooltipBg,
          borderColor: d.tooltipBorder,
          borderWidth: 1,
          titleColor: d.tooltipTitle,
          bodyColor: d.tooltipBody,
          titleFont: { family: d.fontFamily, size: 10 },
          bodyFont: { family: d.fontFamily, size: 10 }
        }
      },
      scales: {
        x: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 8 }, maxRotation: 30 } },
        y: {
          grid: { color: d.gridColor },
          ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 }, callback: function(v) { return v + '%'; } }
        }
      }
    }
  });
  _charts[canvasId] = chart;
  return chart;
}

/**
 * Initialize the cumulative xG timeline chart.
 * @param {string} canvasId - Canvas element ID
 * @returns {Chart} Chart instance
 */
function initTimelineChart(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var d = chartDefaults();
  var chart = new Chart(canvas, {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: d.tooltipBg,
          borderColor: d.tooltipBorder,
          borderWidth: 1,
          titleColor: d.tooltipTitle,
          bodyColor: d.tooltipBody,
          titleFont: { family: d.fontFamily, size: 10 },
          bodyFont: { family: d.fontFamily, size: 10 },
          callbacks: {
            label: function(ctx) { return 'Cumulative xG: ' + ctx.raw.toFixed(3); }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Shot #', color: d.tickColor, font: { family: d.fontFamily, size: 9 } },
          grid: { color: d.gridColor },
          ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } }
        },
        y: {
          title: { display: true, text: 'Cumulative xG', color: d.tickColor, font: { family: d.fontFamily, size: 9 } },
          grid: { color: d.gridColor },
          ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } },
          beginAtZero: true
        }
      }
    }
  });
  _charts[canvasId] = chart;
  return chart;
}

/**
 * Update the timeline chart with cumulative xG data.
 */
function updateTimelineChart(chart, timeline, accentColor) {
  if (!chart) return;
  var labels = [];
  var data = [];
  for (var i = 0; i < timeline.length; i++) {
    labels.push(timeline[i].shotIndex === 0 ? 'Start' : '#' + timeline[i].shotIndex);
    data.push(timeline[i].cumulativeXG);
  }
  chart.data.labels = labels;
  chart.data.datasets = [{
    data: data,
    borderColor: accentColor || '#3dcfb0',
    borderWidth: 2,
    pointRadius: 3,
    pointBackgroundColor: accentColor || '#3dcfb0',
    fill: false,
    stepped: 'after'
  }];
  chart.update();
}

/**
 * Initialize the Build Your Own League match results chart.
 * @param {string} canvasId - Canvas element ID
 * @returns {Chart} Chart instance
 */
function initLeagueMatchChart(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var d = chartDefaults();
  var chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true, position: 'top',
          labels: { color: d.legendColor, font: { family: d.fontFamily, size: 9 }, boxWidth: 10 }
        },
        tooltip: {
          backgroundColor: d.tooltipBg,
          borderColor: d.tooltipBorder,
          borderWidth: 1,
          titleColor: d.tooltipTitle,
          bodyColor: d.tooltipBody,
          titleFont: { family: d.fontFamily, size: 10 },
          bodyFont: { family: d.fontFamily, size: 10 }
        }
      },
      scales: {
        x: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } } },
        y: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } } }
      }
    }
  });
  _charts[canvasId] = chart;
  return chart;
}

/**
 * Update the league match chart with goal distributions for both teams.
 */
function updateLeagueMatchChart(chart, teamADist, teamBDist) {
  if (!chart) return;
  var maxLen = Math.max(teamADist.length, teamBDist.length);
  var labels = [];
  var dataA = [], dataB = [];
  for (var i = 0; i < maxLen; i++) {
    labels.push(i === 1 ? '1 goal' : i + ' goals');
    dataA.push(i < teamADist.length ? teamADist[i] : 0);
    dataB.push(i < teamBDist.length ? teamBDist[i] : 0);
  }
  chart.data.labels = labels;
  chart.data.datasets = [
    {
      label: 'Team A',
      data: dataA,
      backgroundColor: 'rgba(45,90,61,0.6)',
      borderColor: 'rgba(45,90,61,1)',
      borderWidth: 1,
      borderRadius: 2
    },
    {
      label: 'Team B',
      data: dataB,
      backgroundColor: 'rgba(74,128,192,0.6)',
      borderColor: 'rgba(74,128,192,1)',
      borderWidth: 1,
      borderRadius: 2
    }
  ];
  chart.update();
}

/**
 * Initialize a sensitivity comparison chart (original vs shifted distributions).
 */
function initSensitivityChart(canvasId) {
  var canvas = document.getElementById(canvasId);
  if (!canvas) return null;
  var d = chartDefaults();
  var chart = new Chart(canvas, {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { color: d.legendColor, font: { family: d.fontFamily, size: 9 }, boxWidth: 12 } },
        tooltip: { backgroundColor: d.tooltipBg, borderColor: d.tooltipBorder, borderWidth: 1, titleColor: d.tooltipTitle, bodyColor: d.tooltipBody, titleFont: { family: d.fontFamily, size: 10 }, bodyFont: { family: d.fontFamily, size: 10 } }
      },
      scales: {
        x: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } } },
        y: { grid: { color: d.gridColor }, ticks: { color: d.tickColor, font: { family: d.fontFamily, size: 9 } } }
      }
    }
  });
  _charts[canvasId] = chart;
  return chart;
}

/**
 * Update the sensitivity chart with original vs shifted distributions.
 */
function updateSensitivityChart(chart, originalCounts, shiftedCounts, N, factor) {
  if (!chart) return;
  var maxLen = Math.max(originalCounts.length, shiftedCounts.length);
  var labels = [], origData = [], shiftData = [];
  for (var i = 0; i < maxLen; i++) {
    labels.push(i === 1 ? '1 goal' : i + ' goals');
    origData.push(i < originalCounts.length ? originalCounts[i] : 0);
    shiftData.push(i < shiftedCounts.length ? shiftedCounts[i] : 0);
  }
  chart.data.labels = labels;
  chart.data.datasets = [
    { label: 'Original (1.0×)', data: origData, backgroundColor: 'rgba(60,160,60,0.6)', borderWidth: 0, borderRadius: 2 },
    { label: factor.toFixed(1) + '× xG', data: shiftData, backgroundColor: 'rgba(240,180,41,0.5)', borderColor: '#f0b429', borderWidth: 1, borderRadius: 2 }
  ];
  chart.options.plugins.tooltip.callbacks = {
    label: function(ctx) { return ctx.dataset.label + ': ' + ctx.raw + ' (' + (ctx.raw / N * 100).toFixed(1) + '%)'; }
  };
  chart.update();
}

/**
 * Destroy all tracked chart instances and clear registry.
 */
function destroyAllCharts() {
  for (var key in _charts) {
    if (_charts[key] && typeof _charts[key].destroy === 'function') {
      _charts[key].destroy();
    }
  }
  _charts = {};
}
