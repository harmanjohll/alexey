// md-ui.js — Unified simulation UI: parameter panel, pipeline, sweep, results table

const MD = window.MD || {};
window.MD = MD;

MD.ui = {
  locked: false,
  sweepParam: null,       // null | 'T' | 'dmu' | 'ex' | 'ey'
  stages: { equil: false, mc: false },
  running: false,
  stopRequested: false,

  results: [],            // [{T, dmu, ex, ey, esurf, epa, xge, layers}]
  chart: null,
  yMetric: 'esurf',

  slab: null,
  energy: null,
  convHist: [],

  // ── Init ──
  init: function() {
    var savedHyp = localStorage.getItem('alexey_md_hypothesis');
    var savedTS = localStorage.getItem('alexey_md_timestamp');
    if (savedHyp && savedTS) {
      document.getElementById('hypText').value = savedHyp;
      MD.ui.doLock(savedTS);
    }
    MD.viewer.init('crystalCanvas');
    MD.viewer.render();
    MD.ui.updateLabels();
  },

  // ── Labels ──
  updateLabels: function() {
    var el = function(id) { return document.getElementById(id); };
    var v = function(id) { return parseFloat(document.getElementById(id).value); };

    el('valNx').textContent = v('slNx');
    el('valNy').textContent = v('slNy');
    el('valNz').textContent = v('slNz');
    el('valEx').textContent = (v('slEx') / 10).toFixed(1) + '%';
    el('valEy').textContent = (v('slEy') / 10).toFixed(1) + '%';
    el('valT').textContent = v('slT');
    el('valDt').textContent = (v('slDt') / 10).toFixed(1);
    el('valVV').textContent = v('slVV');
    el('valMC').textContent = v('slMC');
    el('valDmu').textContent = (v('slDmu') / 100).toFixed(2);
  },

  // ── Hypothesis ──
  lockHypothesis: function() {
    var t = document.getElementById('hypText').value.trim();
    if (t.length < 20) {
      document.getElementById('hypText').style.borderColor = '#c0392b';
      return;
    }
    var ts = new Date().toISOString();
    localStorage.setItem('alexey_md_hypothesis', t);
    localStorage.setItem('alexey_md_timestamp', ts);
    MD.ui.doLock(ts);
  },

  doLock: function(ts) {
    MD.ui.locked = true;
    var ta = document.getElementById('hypText');
    ta.disabled = true;
    ta.style.borderColor = 'rgba(45,90,61,0.5)';
    ta.style.boxShadow = '0 0 0 2px rgba(45,90,61,0.15)';

    var tsEl = document.getElementById('hypTS');
    tsEl.style.display = 'block';
    tsEl.textContent = 'locked \u00b7 ' + new Date(ts).toLocaleString();

    document.getElementById('lockBtn').textContent = '\u2713 Hypothesis locked';
    document.getElementById('lockBtn').disabled = true;
    document.getElementById('labHint').textContent = 'Set parameters, configure pipeline, and run';

    document.querySelectorAll('.lab-ctrl').forEach(function(el) { el.disabled = false; });
  },

  // ── Sweep ──
  toggleSweep: function(param) {
    var allSweeps = ['T', 'dmu', 'ex', 'ey'];

    if (MD.ui.sweepParam === param) {
      // Deactivate
      MD.ui.sweepParam = null;
      document.getElementById('sweep' + MD.ui._sweepId(param)).classList.remove('active');
      document.querySelector('[data-sweep="' + param + '"]').classList.remove('active');
      document.querySelector('[data-sweep="' + param + '"]').textContent = 'sweep';
      return;
    }

    // Deactivate previous
    if (MD.ui.sweepParam) {
      var prev = MD.ui.sweepParam;
      document.getElementById('sweep' + MD.ui._sweepId(prev)).classList.remove('active');
      document.querySelector('[data-sweep="' + prev + '"]').classList.remove('active');
      document.querySelector('[data-sweep="' + prev + '"]').textContent = 'sweep';
    }

    // Activate new
    MD.ui.sweepParam = param;
    document.getElementById('sweep' + MD.ui._sweepId(param)).classList.add('active');
    document.querySelector('[data-sweep="' + param + '"]').classList.add('active');
    document.querySelector('[data-sweep="' + param + '"]').textContent = 'sweeping';
  },

  _sweepId: function(param) {
    var map = { T: 'T', dmu: 'Dmu', ex: 'Ex', ey: 'Ey' };
    return map[param] || param;
  },

  // ── Pipeline ──
  toggleStage: function(stage) {
    if (MD.ui.running) return;
    MD.ui.stages[stage] = !MD.ui.stages[stage];
    var el = document.querySelector('[data-stage="' + stage + '"]');
    if (MD.ui.stages[stage]) {
      el.classList.add('on');
      el.innerHTML = (stage === 'equil' ? 'Equilibrate' : 'MC') + ' &#10003;';
    } else {
      el.classList.remove('on');
      el.innerHTML = (stage === 'equil' ? 'Equilibrate' : 'MC') + ' &#9675;';
    }
  },

  // ── Color mode ──
  setColorMode: function(mode) {
    MD.viewer.colorMode = mode;
    document.querySelectorAll('.color-btns button').forEach(function(b) { b.classList.remove('active'); });
    document.querySelector('[data-mode="' + mode + '"]').classList.add('active');
    MD.viewer.render();
  },

  updateCrystalInfo: function(slab, energy) {
    var stats = MD.crystal.getStats(slab);
    document.getElementById('dAtoms').textContent = stats.total;
    document.getElementById('dSiGe').textContent = stats.nSi + ' / ' + stats.nGe;
    document.getElementById('dLayers').textContent = slab.nLayers;
    document.getElementById('dEsurf').textContent = energy.surfaceEnergy.toFixed(4) + ' eV/\u00c5\u00b2';
  },

  // ── Read params ──
  readParams: function() {
    return {
      nx: parseInt(document.getElementById('slNx').value),
      ny: parseInt(document.getElementById('slNy').value),
      nz: parseInt(document.getElementById('slNz').value),
      T: parseInt(document.getElementById('slT').value),
      dt: parseFloat(document.getElementById('slDt').value) / 10,
      vv: parseInt(document.getElementById('slVV').value),
      mc: parseInt(document.getElementById('slMC').value),
      dmu: parseInt(document.getElementById('slDmu').value) / 100,
      ex: parseInt(document.getElementById('slEx').value) / 10,
      ey: parseInt(document.getElementById('slEy').value) / 10
    };
  },

  readSweepConfig: function(param) {
    var id = MD.ui._sweepId(param);
    return {
      min: parseFloat(document.getElementById('sw' + id + 'Min').value),
      max: parseFloat(document.getElementById('sw' + id + 'Max').value),
      n: parseInt(document.getElementById('sw' + id + 'N').value) || 6
    };
  },

  // ── Run simulation ──
  runSimulation: async function() {
    if (!MD.ui.locked || MD.ui.running) return;
    MD.ui.running = true;
    MD.ui.stopRequested = false;

    document.getElementById('btnRun').disabled = true;
    document.getElementById('btnStop').style.display = '';

    var params = MD.ui.readParams();

    // Sweep values
    var sweepValues = [null];
    if (MD.ui.sweepParam) {
      var cfg = MD.ui.readSweepConfig(MD.ui.sweepParam);
      sweepValues = [];
      for (var i = 0; i < cfg.n; i++) {
        sweepValues.push(cfg.min + (cfg.max - cfg.min) * i / Math.max(1, cfg.n - 1));
      }
    }

    document.getElementById('resultsArea').style.display = '';

    for (var i = 0; i < sweepValues.length; i++) {
      if (MD.ui.stopRequested) break;

      var runParams = Object.assign({}, params);
      if (MD.ui.sweepParam && sweepValues[i] !== null) {
        runParams[MD.ui.sweepParam] = sweepValues[i];
      }

      MD.ui.updateStatus('Run ' + (i + 1) + '/' + sweepValues.length + '...');

      var result = await MD.ui.executePipeline(runParams);
      if (result) {
        MD.ui.results.push(result);
        MD.ui.renderChart();
        MD.ui.renderTable();
      }
    }

    MD.ui.running = false;
    document.getElementById('btnRun').disabled = false;
    document.getElementById('btnStop').style.display = 'none';
    MD.ui.updateStatus('Done (' + MD.ui.results.length + ' points)');
    MD.ui.saveResults();
  },

  stopRun: function() {
    MD.ui.stopRequested = true;
  },

  updateStatus: function(msg) {
    document.getElementById('runStatus').textContent = msg;
  },

  // ── Execute pipeline for one parameter set ──
  executePipeline: function(p) {
    var needsWorker = MD.ui.stages.equil || MD.ui.stages.mc;

    if (!needsWorker) {
      // Static calculation on main thread
      var strainX = p.ex / 100;
      var strainY = p.ey / 100;
      var latt = MD.params.getLattice100Strained(0, strainX, strainY);
      var slab = MD.crystal.buildDefaultSlab(p.nx, p.ny, p.nz, 0, latt);
      var energy = MD.tersoff.computeEnergy(slab);

      MD.ui.slab = slab;
      MD.ui.energy = energy;
      MD.viewer.render(slab);
      MD.ui.updateCrystalInfo(slab, energy);

      var stats = MD.crystal.getStats(slab);
      return Promise.resolve({
        T: p.T, dmu: p.dmu, ex: p.ex, ey: p.ey,
        esurf: energy.surfaceEnergy,
        epa: energy.perAtom,
        xge: stats.nGe / stats.total,
        layers: null
      });
    }

    // Dynamic: use web worker
    return new Promise(function(resolve) {
      fetch('md-dynamics.js').then(function(r) { return r.text(); }).then(function(code) {
        var workerBlob = new Blob([code], { type: 'application/javascript' });
        var w = new Worker(URL.createObjectURL(workerBlob));

        var strainX = p.ex / 100;
        var strainY = p.ey / 100;
        var latt = MD.params.getLattice100Strained(0, strainX, strainY);

        var lastUpdate = null;

        w.postMessage({
          type: 'init',
          params: {
            ncx: p.nx, ncy: p.ny,
            nczi: 2, nczf: 2 + p.nz - 1,
            theta: 0,   // Pure Si start
            temp: p.T,
            lattOverride: latt
          }
        });

        w.onmessage = function(e) {
          if (e.data.type === 'init_done') {
            if (MD.ui.stages.equil) {
              MD.ui.updateStatus(MD.ui._statusPrefix() + ' equilibrating...');
              w.postMessage({
                type: 'step', step: 0,
                params: { dt: p.dt, nvv: p.vv, temp: p.T, mcswap: 0, mcgc: 0, dmu: 0 }
              });
            } else if (MD.ui.stages.mc) {
              MD.ui.updateStatus(MD.ui._statusPrefix() + ' MC...');
              w.postMessage({
                type: 'step', step: 0,
                params: { dt: p.dt, nvv: 0, temp: p.T, mcswap: p.mc, mcgc: Math.floor(p.mc / 2), dmu: p.dmu }
              });
            } else {
              w.postMessage({ type: 'get_surface_energy' });
            }
          } else if (e.data.type === 'update') {
            lastUpdate = e.data;
            if (MD.ui.stages.equil && MD.ui.stages.mc && e.data.step === 0) {
              // Equilibrated, now run MC
              MD.ui.updateStatus(MD.ui._statusPrefix() + ' MC...');
              w.postMessage({
                type: 'step', step: 1,
                params: { dt: p.dt, nvv: 0, temp: p.T, mcswap: p.mc, mcgc: Math.floor(p.mc / 2), dmu: p.dmu }
              });
            } else {
              w.postMessage({ type: 'get_surface_energy' });
            }
          } else if (e.data.type === 'surface_energy') {
            w.terminate();
            var xge = lastUpdate ? lastUpdate.nGe / lastUpdate.natom : 0;
            resolve({
              T: p.T, dmu: p.dmu, ex: p.ex, ey: p.ey,
              esurf: e.data.surfaceEnergy,
              epa: e.data.energyPerAtom,
              xge: xge,
              layers: lastUpdate ? lastUpdate.layers : null
            });
          }
        };

        w.onerror = function() { w.terminate(); resolve(null); };
      });
    });
  },

  _statusPrefix: function() {
    var el = document.getElementById('runStatus');
    var t = el.textContent;
    var m = t.match(/^Run \d+\/\d+/);
    return m ? m[0] : 'Running';
  },

  // ── Chart ──
  renderChart: function() {
    var ctx = document.getElementById('mainChart');
    if (MD.ui.chart) MD.ui.chart.destroy();
    if (MD.ui.results.length === 0) return;

    var xKey = MD.ui.sweepParam || 'T';
    var xLabels = { T: 'Temperature (K)', dmu: '\u0394\u03bc (eV)', ex: '\u03b5x (%)', ey: '\u03b5y (%)' };
    var yLabels = { esurf: 'E_surf (eV/\u00c5\u00b2)', epa: 'E/atom (eV)', xge: 'x(Ge)' };
    var yKey = MD.ui.yMetric;

    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var lineColor = isDark ? '#3dcfb0' : '#2d5a3d';
    var gridColor = isDark ? 'rgba(61,207,176,0.08)' : 'rgba(0,0,0,0.05)';
    var tickColor = isDark ? '#5a5a5a' : '#9a9490';

    MD.ui.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: yLabels[yKey],
          data: MD.ui.results.map(function(r) { return { x: r[xKey], y: r[yKey] }; }),
          borderColor: lineColor,
          backgroundColor: lineColor + '22',
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: lineColor,
          showLine: true,
          tension: 0.3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            title: { display: true, text: xLabels[xKey] || xKey, color: tickColor, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: yLabels[yKey], color: tickColor, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  // ── Table ──
  renderTable: function() {
    var body = document.getElementById('dataTableBody');
    body.innerHTML = MD.ui.results.map(function(r, i) {
      var cls = i === MD.ui.results.length - 1 ? ' class="selected"' : '';
      return '<tr' + cls + ' onclick="MD.ui.selectRow(' + i + ')">' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td class="num">' + r.T + '</td>' +
        '<td class="num">' + r.dmu.toFixed(2) + '</td>' +
        '<td class="num">' + r.ex.toFixed(1) + '</td>' +
        '<td class="num">' + r.ey.toFixed(1) + '</td>' +
        '<td class="num">' + r.esurf.toFixed(4) + '</td>' +
        '<td class="num">' + r.epa.toFixed(4) + '</td>' +
        '<td class="num">' + (r.xge * 100).toFixed(1) + '%</td>' +
        '<td>' + (r.layers ? '\u2713' : '\u2014') + '</td>' +
        '</tr>';
    }).join('');
  },

  selectRow: function(idx) {
    document.querySelectorAll('.data-table tbody tr').forEach(function(tr) { tr.classList.remove('selected'); });
    var rows = document.querySelectorAll('.data-table tbody tr');
    if (rows[idx]) rows[idx].classList.add('selected');
  },

  // ── Y metric toggle ──
  setYMetric: function(metric) {
    MD.ui.yMetric = metric;
    document.querySelectorAll('.y-tog').forEach(function(b) { b.classList.remove('active'); });
    var btn = document.querySelector('.y-tog[data-metric="' + metric + '"]');
    if (btn) btn.classList.add('active');
    MD.ui.renderChart();
  },

  // ── Clear / Export ──
  clearResults: function() {
    MD.ui.results = [];
    if (MD.ui.chart) { MD.ui.chart.destroy(); MD.ui.chart = null; }
    document.getElementById('dataTableBody').innerHTML = '';
    document.getElementById('resultsArea').style.display = 'none';
    MD.ui.updateStatus('');
  },

  exportCSV: function() {
    if (MD.ui.results.length === 0) return;
    var header = 'Run,T(K),dmu(eV),ex(%),ey(%),E_surf(eV/A2),E/atom(eV),x(Ge)\n';
    var rows = MD.ui.results.map(function(r, i) {
      return [i + 1, r.T, r.dmu.toFixed(3), r.ex.toFixed(2), r.ey.toFixed(2),
              r.esurf.toFixed(6), r.epa.toFixed(6), r.xge.toFixed(4)].join(',');
    }).join('\n');
    var blob = new Blob([header + rows], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'md_results.csv';
    a.click();
  },

  // ── Save ──
  saveResults: function() {
    localStorage.setItem('alexey_md_results', JSON.stringify(MD.ui.results));
  },

  // ── AI Coach ──
  askCoach: async function() {
    var interp = document.getElementById('interpText').value.trim();
    if (interp.length < 20) {
      document.getElementById('interpText').style.borderColor = '#c0392b';
      return;
    }

    var hyp = document.getElementById('hypText').value;
    var dataSummary = '';
    if (MD.ui.results.length > 0) {
      dataSummary = MD.ui.results.map(function(r, i) {
        return 'Run ' + (i + 1) + ': T=' + r.T + 'K, \u0394\u03bc=' + r.dmu.toFixed(2) + 'eV, ' +
          '\u03b5x=' + r.ex.toFixed(1) + '%, \u03b5y=' + r.ey.toFixed(1) + '%, ' +
          'E_surf=' + r.esurf.toFixed(4) + ', E/atom=' + r.epa.toFixed(4) + ', x(Ge)=' + (r.xge * 100).toFixed(1) + '%';
      }).join('\n');
    }

    var userMsg = 'Alexey\'s hypothesis: "' + hyp + '"\n\nSimulation data:\n' +
      (dataSummary || 'No data yet.') + '\n\nAlexey\'s interpretation: "' + interp + '"';

    var aiEl = document.getElementById('aiQ');
    aiEl.innerHTML = '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px">Coach is thinking...</span>';
    document.getElementById('askBtn').disabled = true;

    MD.ui.convHist = [{ role: 'user', content: userMsg }];

    try {
      var r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are COACH \u2014 a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore building a computational science portfolio. Alexey has run molecular dynamics simulations of SiGe (100) surfaces using the Tersoff potential. He built pure Si slabs and used grand canonical Monte Carlo to introduce Ge atoms via chemical potential. He explored how surface energy depends on temperature, strain, and chemical potential. Ask EXACTLY ONE question per response. Never give Alexey the answer. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.',
          messages: MD.ui.convHist
        })
      });
      var d = await r.json();
      var q = d.content[0].text;
      aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
      MD.ui.convHist.push({ role: 'assistant', content: q });
      localStorage.setItem('alexey_md_dialogue', JSON.stringify(MD.ui.convHist));
      document.getElementById('replySec').style.display = 'block';
    } catch (e) {
      aiEl.innerHTML = '<span style="color:#c0392b;font-size:12px">Coach unavailable. Write your own follow-up question.</span>';
    }
    document.getElementById('askBtn').disabled = false;
  },

  sendReply: async function() {
    var reply = document.getElementById('replyText').value.trim();
    if (reply.length < 3) return;

    var prevQ = document.getElementById('aiQ').innerText;
    var thr = document.getElementById('thread');
    thr.innerHTML += '<div class="tcoach"><div class="t-lbl coach-lbl">coach</div>' + prevQ + '</div>' +
      '<div class="talex"><div class="t-lbl alex-lbl">alexey</div>' + reply + '</div>';

    document.getElementById('replyText').value = '';
    MD.ui.convHist.push({ role: 'user', content: reply });

    var aiEl = document.getElementById('aiQ');
    aiEl.innerHTML = '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px">Coach is thinking...</span>';

    try {
      var r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his SiGe (100) surface dynamics simulations. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',
          messages: MD.ui.convHist
        })
      });
      var d = await r.json();
      var q = d.content[0].text;
      aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
      MD.ui.convHist.push({ role: 'assistant', content: q });
      localStorage.setItem('alexey_md_dialogue', JSON.stringify(MD.ui.convHist));
    } catch (e) {
      aiEl.innerHTML = '<span style="color:#c0392b;font-size:12px">Connection issue \u2014 try again.</span>';
    }
  }
};

document.addEventListener('DOMContentLoaded', MD.ui.init);
