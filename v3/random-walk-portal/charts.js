/* charts.js — Random Walk: Chart.js chart management */

var batchColors = ['#7b8aef', '#4a9aaa', '#f0b429', '#e24b4a'];

function getChartTheme() {
  var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  return {
    grid: isDark ? 'rgba(123,138,239,0.08)' : 'rgba(74,90,159,0.08)',
    tick: isDark ? '#666' : '#9a9490',
    tooltip: {
      bg: isDark ? '#1a1a1a' : '#ffffff',
      border: isDark ? 'rgba(123,138,239,0.3)' : 'rgba(74,90,159,0.2)',
      title: isDark ? '#e8e8e8' : '#1a1a18',
      body: isDark ? '#999' : '#6b6560'
    },
    accent: isDark ? '#7b8aef' : '#4a5a9f',
    accentLight: isDark ? '#9da8f5' : '#5d6db8',
    muted: isDark ? '#444' : '#bbb'
  };
}

function initRMSChart(canvasId) {
  var t = getChartTheme();
  return new Chart(document.getElementById(canvasId), {
    type: 'line',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
      plugins: {
        legend: { display: true, labels: { color: t.tick, font: { family: 'JetBrains Mono', size: 9 }, boxWidth: 12 } },
        tooltip: { backgroundColor: t.tooltip.bg, borderColor: t.tooltip.border, borderWidth: 1, titleColor: t.tooltip.title, bodyColor: t.tooltip.body, titleFont: { family: 'JetBrains Mono', size: 10 }, bodyFont: { family: 'JetBrains Mono', size: 10 } }
      },
      scales: {
        x: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 9 }, maxTicksLimit: 6 } },
        y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 9 } } }
      }
    }
  });
}

function updateRMSChart(chart, rmsHist, batches) {
  var t = getChartTheme();
  var skip = Math.max(1, Math.floor(rmsHist.length / 200));
  var labels = [], actual = [], theory = [];
  for (var i = 0; i < rmsHist.length; i += skip) {
    var step = i + 1;
    labels.push(step);
    actual.push(rmsHist[i]);
    theory.push(Math.sqrt(step) * STEP_SIZE);
  }
  if (rmsHist.length > 0 && (rmsHist.length - 1) % skip !== 0) {
    labels.push(rmsHist.length);
    actual.push(rmsHist[rmsHist.length - 1]);
    theory.push(Math.sqrt(rmsHist.length) * STEP_SIZE);
  }

  var datasets = [
    { label: 'Actual RMS', data: actual, borderColor: t.accent, backgroundColor: t.accent + '18', borderWidth: 1.5, pointRadius: 0, fill: true, tension: 0.3 },
    { label: 'Theoretical √N', data: theory, borderColor: t.muted, borderWidth: 1.5, borderDash: [5, 3], pointRadius: 0, fill: false }
  ];

  for (var j = 0; j < batches.length; j++) {
    var b = batches[j];
    var bdata = [];
    for (var k = 0; k < b.data.length; k += skip) bdata.push(b.data[k]);
    if (b.data.length > 0 && (b.data.length - 1) % skip !== 0) bdata.push(b.data[b.data.length - 1]);
    datasets.push({ label: b.label, data: bdata, borderColor: batchColors[j % 4], borderWidth: 1, pointRadius: 0, borderDash: [2, 2] });
  }

  chart.data.labels = labels;
  chart.data.datasets = datasets;
  chart.update();
}

function initHistChart(canvasId) {
  var t = getChartTheme();
  return new Chart(document.getElementById(canvasId), {
    type: 'bar',
    data: { labels: [], datasets: [] },
    options: {
      responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
      plugins: {
        legend: { display: false },
        tooltip: { backgroundColor: t.tooltip.bg, borderColor: t.tooltip.border, borderWidth: 1, titleColor: t.tooltip.title, bodyColor: t.tooltip.body, titleFont: { family: 'JetBrains Mono', size: 10 }, bodyFont: { family: 'JetBrains Mono', size: 10 } }
      },
      scales: {
        x: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 8 }, maxTicksLimit: 8 } },
        y: { grid: { color: t.grid }, ticks: { color: t.tick, font: { family: 'JetBrains Mono', size: 9 } } }
      }
    }
  });
}

function updateHistChart(chart, histData) {
  var t = getChartTheme();
  chart.data.labels = histData.labels;
  chart.data.datasets = [{ data: histData.counts, backgroundColor: t.accent + '80', borderWidth: 0, borderRadius: 2 }];
  chart.update();
}
