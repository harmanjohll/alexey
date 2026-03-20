// md-ui.js — Unified simulation UI: parameter panel, pipeline, sweep, results table + chart

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
  yMetric: 'esurf',       // 'esurf' | 'epa' | 'xge'

  slab: null,
  energy: null,
  convHist: [],

  // ── Initialization ──

  init: function() {
    // Restore hypothesis
    var savedHyp = localStorage.getItem('alexey_md_hypothesis');
    var savedTS = localStorage.getItem('alexey_md_timestamp');
    if (savedHyp && savedTS) {
      document.getElementById('hypText').value = savedHyp;
      MD.ui.doLock(savedTS);
    }

    // Restore saved results
    var savedResults = localStorage.getItem('alexey_md_results');
    if (savedResults) {
      try {
        MD.ui.results = JSON.parse(savedResults);
        if (MD.ui.results.length > 0) {
          var area = document.getElementById('resultsArea');
          if (area) area.style.display = '';
          MD.ui.renderChart();
          MD.ui.renderTable();
          document.getElementById('stepRes').style.display = '';
        }
      } catch (e) { /* ignore corrupt data */ }
    }

    // Restore dialogue
    var savedDialogue = localStorage.getItem('alexey_md_dialogue');
    if (savedDialogue) {
      try { MD.ui.convHist = JSON.parse(savedDialogue); } catch (e) { /* ignore */ }
    }

    // Init crystal viewer (non-fatal if it fails)
    try {
      MD.viewer.init('crystalCanvas');
      MD.viewer.render();
    } catch (e) {
      console.warn('Crystal viewer init failed:', e.message);
    }

    // Bind y-metric toggles
    document.querySelectorAll('.y-tog').forEach(function(btn) {
      btn.addEventListener('click', function() {
        MD.ui.setYMetric(btn.getAttribute('data-metric'));
      });
    });

    // Hide all sweep config rows initially
    ['sweepT', 'sweepDmu', 'sweepEx', 'sweepEy'].forEach(function(id) {
      var cfg = document.getElementById(id);
      if (cfg) cfg.style.display = 'none';
    });
  },

  // ── Segmented button selector ──

  setSeg: function(param, val) {
    var group = document.getElementById('seg' + param.charAt(0).toUpperCase() + param.slice(1));
    if (!group) return;
    group.setAttribute('data-value', val);
    group.querySelectorAll('.seg-btn').forEach(function(b) {
      b.classList.toggle('on', parseInt(b.textContent) === val);
    });
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
    ta.style.borderColor = 'rgba(45, 90, 61, 0.5)';
    ta.style.boxShadow = '0 0 0 2px rgba(45, 90, 61, 0.15)';

    var tsEl = document.getElementById('hypTS');
    tsEl.style.display = 'block';
    tsEl.textContent = 'locked \u00b7 ' + new Date(ts).toLocaleString();

    document.getElementById('lockBtn').textContent = '\u2713 Hypothesis locked';
    document.getElementById('lockBtn').disabled = true;
  },

  // ── Sweep toggles ──

  toggleSweep: function(param) {
    var validParams = ['T', 'dmu', 'ex', 'ey'];
    if (validParams.indexOf(param) === -1) return;

    // Map sweep params to HTML IDs
    var inputMap = { T: 'inT', dmu: 'inDmu', ex: 'inEx', ey: 'inEy' };
    var cfgMap = { T: 'sweepT', dmu: 'sweepDmu', ex: 'sweepEx', ey: 'sweepEy' };

    if (MD.ui.sweepParam === param) {
      MD.ui.sweepParam = null;
    } else {
      MD.ui.sweepParam = param;
    }

    // Update all toggle buttons, config rows, and slider visibility
    for (var i = 0; i < validParams.length; i++) {
      var p = validParams[i];
      var togBtn = document.querySelector('[data-sweep="' + p + '"]');
      var cfgRow = document.getElementById(cfgMap[p]);
      var inp = document.getElementById(inputMap[p]);

      if (p === MD.ui.sweepParam) {
        if (togBtn) { togBtn.classList.add('active'); togBtn.textContent = 'sweeping'; }
        if (cfgRow) cfgRow.style.display = 'flex';
        if (inp) { inp.disabled = true; inp.style.opacity = '0.3'; }
      } else {
        if (togBtn) { togBtn.classList.remove('active'); togBtn.textContent = 'sweep'; }
        if (cfgRow) cfgRow.style.display = 'none';
        if (inp) { inp.disabled = false; inp.style.opacity = '1'; }
      }
    }
  },

  // ── Pipeline stage toggles ──

  toggleStage: function(stage) {
    if (stage !== 'equil' && stage !== 'mc') return;
    if (MD.ui.running) return;

    MD.ui.stages[stage] = !MD.ui.stages[stage];

    var el = document.querySelector('[data-stage="' + stage + '"]');
    if (el) {
      if (MD.ui.stages[stage]) {
        el.classList.add('on');
        el.innerHTML = (stage === 'equil' ? 'Equilibrate' : 'MC') + ' &#10003;';
      } else {
        el.classList.remove('on');
        el.innerHTML = (stage === 'equil' ? 'Equilibrate' : 'MC') + ' &#9675;';
      }
    }
  },

  // ── Color mode ──

  setColorMode: function(mode) {
    MD.viewer.colorMode = mode;
    document.querySelectorAll('.color-btns button').forEach(function(b) { b.classList.remove('active'); });
    var active = document.querySelector('[data-mode="' + mode + '"]');
    if (active) active.classList.add('active');
    MD.viewer.render();
  },

  updateCrystalInfo: function(slab, energy) {
    var stats = MD.crystal.getStats(slab);
    var el;
    el = document.getElementById('dAtoms');
    if (el) el.textContent = stats.total;
    el = document.getElementById('dSiGe');
    if (el) el.textContent = stats.nSi + ' / ' + stats.nGe;
    el = document.getElementById('dLayers');
    if (el) el.textContent = slab.nLayers;
    el = document.getElementById('dEsurf');
    if (el) el.textContent = energy.surfaceEnergy.toFixed(4) + ' eV/\u00c5\u00b2';
  },

  // ── Read parameter values from sliders ──

  readParams: function() {
    return {
      nx: parseInt(document.getElementById('segNx').getAttribute('data-value')),
      ny: parseInt(document.getElementById('segNy').getAttribute('data-value')),
      nz: parseInt(document.getElementById('segNz').getAttribute('data-value')),
      T: parseFloat(document.getElementById('inT').value),
      dt: parseFloat(document.getElementById('inDt').value),
      niter1: parseInt(document.getElementById('inNiter1').value),
      niter2: parseInt(document.getElementById('inNiter2').value),
      niter3: parseInt(document.getElementById('inNiter3').value),
      niter4: parseInt(document.getElementById('inNiter4').value),
      dmu: parseFloat(document.getElementById('inDmu').value),
      ex: parseFloat(document.getElementById('inEx').value),
      ey: parseFloat(document.getElementById('inEy').value)
    };
  },

  readSweepConfig: function(param) {
    // HTML IDs: swTMin/swTMax/swTN, swExMin/swExMax/swExN, swDmuMin etc.
    var idMap = { T: 'T', dmu: 'Dmu', ex: 'Ex', ey: 'Ey' };
    var id = idMap[param] || param;
    return {
      min: parseFloat(document.getElementById('sw' + id + 'Min').value),
      max: parseFloat(document.getElementById('sw' + id + 'Max').value),
      n: parseInt(document.getElementById('sw' + id + 'N').value) || 6
    };
  },

  // ── Main run logic ──

  runSimulation: async function() {
    if (MD.ui.running) return;
    MD.ui.running = true;
    MD.ui.stopRequested = false;

    // UI: disable run, show stop
    var btnRun = document.getElementById('btnRun');
    var btnStop = document.getElementById('btnStop');
    if (btnRun) btnRun.disabled = true;
    if (btnStop) btnStop.style.display = '';

    // Read all param values
    var params = MD.ui.readParams();

    // Determine sweep values
    var sweepValues = [null]; // no sweep = single run
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
    if (btnRun) btnRun.disabled = false;
    if (btnStop) btnStop.style.display = 'none';
    MD.ui.updateStatus('Done (' + MD.ui.results.length + ' points)');
    MD.ui.saveResults();

    // Show step 03
    document.getElementById('stepRes').style.display = '';
  },

  // ── Execute pipeline for one parameter set ──

  executePipeline: function(p) {
    var needsWorker = MD.ui.stages.equil || MD.ui.stages.mc;

    if (!needsWorker) {
      // STATIC: main-thread Tersoff computation
      try {
        var strainX = p.ex / 100;   // percent to fraction
        var strainY = p.ey / 100;
        var latt = MD.params.getLattice100Strained(0, strainX, strainY);
        var slab = MD.crystal.buildDefaultSlab(p.nx, p.ny, p.nz, 0, latt);
        var energy = MD.tersoff.computeEnergy(slab);

        MD.ui.slab = slab;
        MD.ui.energy = energy;
        try { MD.viewer.render(slab); } catch (ve) { console.warn('Viewer render error:', ve.message); }
        MD.ui.updateCrystalInfo(slab, energy);

        var stats = MD.crystal.getStats(slab);
        return Promise.resolve({
          T: p.T, dmu: p.dmu, ex: p.ex, ey: p.ey,
          esurf: energy.surfaceEnergy,
          epa: energy.perAtom,
          xge: stats.nGe / stats.total,
          layers: null
        });
      } catch (err) {
        console.error('Static pipeline error:', err);
        MD.ui.updateStatus('Error: ' + err.message);
        return Promise.resolve(null);
      }
    }

    // DYNAMIC: use web worker
    return new Promise(function(resolve) {
      fetch('md-dynamics.js').then(function(r) { return r.text(); }).then(function(code) {
        var workerBlob = new Blob([code], { type: 'application/javascript' });
        var w = new Worker(URL.createObjectURL(workerBlob));

        var strainX = p.ex / 100;
        var strainY = p.ey / 100;
        var latt = MD.params.getLattice100Strained(0, strainX, strainY);

        // Closure variable for storing intermediate update data
        // (cannot store on worker object since transferable buffers invalidate it)
        var lastUpdate = null;
        var phase = 'init';

        w.postMessage({
          type: 'init',
          params: {
            ncx: p.nx, ncy: p.ny,
            nczi: 2, nczf: 2 + p.nz - 1,
            theta: 0,   // Pure Si start; MC will introduce Ge via dmu
            temp: p.T,
            lattOverride: latt
          }
        });

        w.onmessage = function(e) {
          if (e.data.type === 'init_done') {
            if (MD.ui.stages.equil) {
              phase = 'equil';
              MD.ui.updateStatus(MD.ui._statusPrefix() + ' equilibrating...');
              w.postMessage({
                type: 'step',
                step: 0,
                params: {
                  dt: p.dt,
                  niter1: p.niter1,
                  niter2: p.niter2,
                  temp: p.T,
                  niter3: 0,
                  niter4: 0,
                  dmu: 0
                }
              });
            } else if (MD.ui.stages.mc) {
              phase = 'mc';
              MD.ui.updateStatus(MD.ui._statusPrefix() + ' MC...');
              w.postMessage({
                type: 'step',
                step: 0,
                params: {
                  dt: p.dt,
                  niter1: 0,
                  niter2: 0,
                  temp: p.T,
                  niter3: p.niter3,
                  niter4: p.niter4,
                  dmu: p.dmu
                }
              });
            } else {
              // Just measure from initial state
              phase = 'measure';
              w.postMessage({ type: 'get_surface_energy' });
            }
          } else if (e.data.type === 'update') {
            lastUpdate = {
              nGe: e.data.nGe,
              nSi: e.data.nSi,
              natom: e.data.natom,
              energy: e.data.energy,
              temperature: e.data.temperature,
              layers: e.data.layers,
              mcPct: e.data.mcPct
            };

            if (phase === 'equil' && MD.ui.stages.mc) {
              // Equilibration done, now run MC phase
              phase = 'mc';
              MD.ui.updateStatus(MD.ui._statusPrefix() + ' MC...');
              w.postMessage({
                type: 'step',
                step: 1,
                params: {
                  dt: p.dt,
                  niter1: 0,
                  niter2: 0,
                  temp: p.T,
                  niter3: p.niter3,
                  niter4: p.niter4,
                  dmu: p.dmu
                }
              });
            } else {
              // Done with dynamics/MC - request surface energy measurement
              phase = 'final';
              w.postMessage({ type: 'get_surface_energy' });
            }
          } else if (e.data.type === 'surface_energy') {
            w.terminate();
            var update = lastUpdate || {};
            resolve({
              T: p.T, dmu: p.dmu, ex: p.ex, ey: p.ey,
              esurf: e.data.surfaceEnergy,
              epa: e.data.energyPerAtom,
              xge: (update.nGe || 0) / (update.natom || 1),
              layers: update.layers || null
            });
          }
        };

        w.onerror = function() { w.terminate(); resolve(null); };
      });
    });
  },

  stopRun: function() {
    MD.ui.stopRequested = true;
  },

  updateStatus: function(msg) {
    var el = document.getElementById('runStatus');
    if (el) el.textContent = msg;
    MD.ui.updateStatus.last = msg;
  },

  _statusPrefix: function() {
    var el = document.getElementById('runStatus');
    if (!el) return 'Running';
    var t = el.textContent;
    var m = t.match(/^Run \d+\/\d+/);
    return m ? m[0] : 'Running';
  },

  // ── Results chart ──

  renderChart: function() {
    var ctx = document.getElementById('mainChart');
    if (!ctx) return;
    if (MD.ui.chart) MD.ui.chart.destroy();
    if (MD.ui.results.length === 0) return;

    // Determine x-axis from sweep param
    var xKey = MD.ui.sweepParam || 'T';
    var xLabels = { T: 'Temperature (K)', dmu: '\u0394\u03bc (eV)', ex: '\u03b5x (%)', ey: '\u03b5y (%)' };
    var yLabels = { esurf: 'E_surf (eV/\u00c5\u00b2)', epa: 'E/atom (eV)', xge: 'x(Ge)' };
    var yKey = MD.ui.yMetric;

    // Theme-aware colors
    var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    var lineColor = isDark ? '#3dcfb0' : '#2d5a3d';
    var gridColor = isDark ? 'rgba(61,207,176,0.08)' : 'rgba(0,0,0,0.05)';
    var tickColor = isDark ? '#5a5a5a' : '#9a9490';

    MD.ui.chart = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: yLabels[yKey] || yKey,
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
            title: { display: true, text: yLabels[yKey] || yKey, color: tickColor, font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: gridColor },
            ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  // ── Results table ──

  renderTable: function() {
    var body = document.getElementById('dataTableBody');
    if (!body) return;
    body.innerHTML = MD.ui.results.map(function(r, i) {
      var sel = (i === MD.ui.results.length - 1) ? ' class="selected"' : '';
      return '<tr onclick="MD.ui.selectRow(' + i + ')"' + sel + '>' +
        '<td class="num">' + (i + 1) + '</td>' +
        '<td class="num">' + r.T + '</td>' +
        '<td class="num">' + r.dmu.toFixed(2) + '</td>' +
        '<td class="num">' + r.ex.toFixed(1) + '</td>' +
        '<td class="num">' + r.ey.toFixed(1) + '</td>' +
        '<td class="num">' + r.esurf.toFixed(4) + '</td>' +
        '<td class="num">' + r.epa.toFixed(4) + '</td>' +
        '<td class="num">' + (r.xge * 100).toFixed(1) + '%</td>' +
        '</tr>';
    }).join('');
  },

  selectRow: function(idx) {
    document.querySelectorAll('.data-table tr').forEach(function(tr) { tr.classList.remove('selected'); });
    var rows = document.querySelectorAll('.data-table tbody tr');
    if (rows[idx]) rows[idx].classList.add('selected');
  },

  // ── Y-axis metric toggle ──

  setYMetric: function(metric) {
    MD.ui.yMetric = metric;
    document.querySelectorAll('.y-tog').forEach(function(b) { b.classList.remove('active'); });
    var active = document.querySelector('.y-tog[data-metric="' + metric + '"]');
    if (active) active.classList.add('active');
    MD.ui.renderChart();
  },

  // ── Clear results ──

  clearResults: function() {
    MD.ui.results = [];
    if (MD.ui.chart) { MD.ui.chart.destroy(); MD.ui.chart = null; }
    var body = document.getElementById('dataTableBody');
    if (body) body.innerHTML = '';
    var area = document.getElementById('resultsArea');
    if (area) area.style.display = 'none';
    MD.ui.updateStatus('');
    localStorage.removeItem('alexey_md_results');
  },

  // ── Export CSV ──

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

  // ── Save / Load ──

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

    // Gather results summary
    var dataSummary = '';
    if (MD.ui.results.length > 0) {
      dataSummary = MD.ui.results.map(function(r, i) {
        return 'Run ' + (i + 1) + ': T=' + r.T + 'K, \u0394\u03bc=' + r.dmu.toFixed(2) + 'eV, ' +
          '\u03b5x=' + r.ex.toFixed(1) + '%, \u03b5y=' + r.ey.toFixed(1) + '%, ' +
          'E_surf=' + r.esurf.toFixed(4) + ' eV/\u00c5\u00b2, E/atom=' + r.epa.toFixed(4) + ' eV, ' +
          'x(Ge)=' + (r.xge * 100).toFixed(1) + '%';
      }).join('\n');
    }

    var sweepInfo = MD.ui.sweepParam
      ? 'Sweep parameter: ' + MD.ui.sweepParam
      : 'No sweep (single parameter set)';

    var pipelineInfo = 'Pipeline: Build' +
      (MD.ui.stages.equil ? ' \u2192 Equilibrate' : '') +
      (MD.ui.stages.mc ? ' \u2192 MC' : '') +
      ' \u2192 Measure';

    var userMsg = 'Alexey\'s hypothesis: "' + hyp + '"\n\n' +
      'Setup: ' + sweepInfo + '. ' + pipelineInfo + '.\n\n' +
      'Simulation data:\n' + (dataSummary || 'No data yet.') + '\n\n' +
      'Alexey\'s interpretation: "' + interp + '"';

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
          system: 'You are COACH \u2014 a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore building a computational science portfolio. Alexey has run molecular dynamics simulations of SiGe (100) surfaces using the Tersoff potential. He uses a unified simulation with a configurable pipeline (Build \u2192 Equilibrate \u2192 Monte Carlo \u2192 Measure) and can sweep temperature, chemical potential \u0394\u03bc, or strain \u03b5x/\u03b5y to study how surface energy, energy per atom, and Ge fraction respond. Ask EXACTLY ONE question per response. Never give Alexey the answer. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.',
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
          system: 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his SiGe (100) surface dynamics simulations using a unified pipeline (Build \u2192 Equilibrate \u2192 MC \u2192 Measure) with parameter sweeps. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',
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
