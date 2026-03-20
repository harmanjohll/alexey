// md-ui.js — UI controls for 4 investigation tabs, hypothesis, AI coach

const MD = window.MD || {};
window.MD = MD;

MD.ui = {
  locked: false,
  currentTab: 'comp',
  slab: null,
  energy: null,
  convHist: [],
  worker: null,
  tempSweepRunning: false,

  // Chart instances
  charts: {
    comp: null,
    temp: null,
    strain: null,
    layer: null,
    coord: null
  },

  // Results storage
  results: {
    comp: null,
    temp: null,
    strain: null,
    layers: null
  },

  init: function() {
    // Restore hypothesis
    const savedHyp = localStorage.getItem('alexey_md_hypothesis');
    const savedTS = localStorage.getItem('alexey_md_timestamp');
    if (savedHyp && savedTS) {
      document.getElementById('hypText').value = savedHyp;
      MD.ui.doLock(savedTS);
    }

    // Init viewer
    MD.viewer.init('crystalCanvas');
    MD.viewer.render();

    MD.ui.updateLabels();
  },

  updateLabels: function() {
    const s = (id) => document.getElementById(id);
    const v = (id) => parseFloat(document.getElementById(id)?.value || 0);

    // Composition tab
    if (s('valDmu')) s('valDmu').textContent = (v('slDmu') / 100).toFixed(2);
    if (s('valCompPts')) s('valCompPts').textContent = v('slCompPts');
    if (s('valNzComp')) s('valNzComp').textContent = v('slNzComp');

    // Temperature tab
    if (s('valTmin')) s('valTmin').textContent = v('slTmin');
    if (s('valTmax')) s('valTmax').textContent = v('slTmax');
    if (s('valGeTemp')) s('valGeTemp').textContent = v('slGeTemp') + '%';
    if (s('valTempPts')) s('valTempPts').textContent = v('slTempPts');
    if (s('valVVsteps')) s('valVVsteps').textContent = v('slVVsteps');
    if (s('valDt')) s('valDt').textContent = v('slDt').toFixed(1);

    // Strain tab
    if (s('valStrainX')) s('valStrainX').textContent = (v('slStrainX') / 10).toFixed(1) + '%';
    if (s('valStrainY')) s('valStrainY').textContent = (v('slStrainY') / 10).toFixed(1) + '%';
    if (s('valGeStrain')) s('valGeStrain').textContent = v('slGeStrain') + '%';
    if (s('valStrainRange')) s('valStrainRange').textContent = '\u00b1' + v('slStrainRange') + '%';
    if (s('valStrainPts')) s('valStrainPts').textContent = v('slStrainPts');

    // Layers tab
    if (s('valGeLayers')) s('valGeLayers').textContent = v('slGeLayers') + '%';
    if (s('valNzLayers')) s('valNzLayers').textContent = v('slNzLayers');
    if (s('valMCswaps')) s('valMCswaps').textContent = v('slMCswaps');
    if (s('valDmuLayers')) s('valDmuLayers').textContent = (v('slDmuLayers') / 100).toFixed(2);
  },

  lockHypothesis: function() {
    const t = document.getElementById('hypText').value.trim();
    if (t.length < 20) {
      document.getElementById('hypText').style.borderColor = '#c0392b';
      return;
    }
    const ts = new Date().toISOString();
    localStorage.setItem('alexey_md_hypothesis', t);
    localStorage.setItem('alexey_md_timestamp', ts);
    MD.ui.doLock(ts);
  },

  doLock: function(ts) {
    MD.ui.locked = true;
    const ta = document.getElementById('hypText');
    ta.disabled = true;
    ta.style.borderColor = 'rgba(45, 90, 61, 0.5)';
    ta.style.boxShadow = '0 0 0 2px rgba(45, 90, 61, 0.15)';

    const tsEl = document.getElementById('hypTS');
    tsEl.style.display = 'block';
    tsEl.textContent = 'locked \u00b7 ' + new Date(ts).toLocaleString();

    document.getElementById('lockBtn').textContent = '\u2713 Hypothesis locked';
    document.getElementById('lockBtn').disabled = true;
    document.getElementById('labHint').textContent = 'Choose an investigation tab and run it';

    document.querySelectorAll('.lab-ctrl').forEach(el => el.disabled = false);
  },

  switchTab: function(tab) {
    MD.ui.currentTab = tab;
    document.querySelectorAll('.inv-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
    document.querySelectorAll('.inv-panel').forEach(p => p.classList.remove('active'));
    const panelMap = { comp: 'panelComp', temp: 'panelTemp', strain: 'panelStrain', layers: 'panelLayers' };
    document.getElementById(panelMap[tab]).classList.add('active');
  },

  setColorMode: function(mode) {
    MD.viewer.colorMode = mode;
    document.querySelectorAll('.color-btns button').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    MD.viewer.render();
  },

  updateCrystalInfo: function(slab, energy) {
    const stats = MD.crystal.getStats(slab);
    document.getElementById('dAtoms').textContent = stats.total;
    document.getElementById('dSiGe').textContent = stats.nSi + ' / ' + stats.nGe;
    document.getElementById('dLayers').textContent = slab.nLayers;
    document.getElementById('dEsurf').textContent = energy.surfaceEnergy.toFixed(4) + ' eV/\u00c5\u00b2';
  },

  // ── Investigation A: Composition Sweep ──
  runCompSweep: function() {
    if (!MD.ui.locked) return;
    const nPts = parseInt(document.getElementById('slCompPts').value);
    const nz = parseInt(document.getElementById('slNzComp').value);
    const dmu = parseFloat(document.getElementById('slDmu').value) / 100;

    const xGeValues = [];
    for (let i = 0; i < nPts; i++) {
      xGeValues.push(i / (nPts - 1));
    }

    document.getElementById('btnCompSweep').disabled = true;
    document.getElementById('statusComp').textContent = 'Running...';

    setTimeout(() => {
      const results = MD.tersoff.compositionSweep(1, 1, nz, xGeValues, (i, total, r) => {
        document.getElementById('statusComp').textContent =
          `Point ${i + 1}/${total}: x(Ge)=${r.xGe.toFixed(2)}, E_surf=${r.surfaceEnergy.toFixed(4)} eV/\u00c5\u00b2`;
      });

      MD.ui.results.comp = results;
      MD.ui.renderCompChart(results);

      // Show last slab in viewer
      const lastXGe = xGeValues[Math.floor(xGeValues.length / 2)];
      MD.ui.slab = MD.crystal.buildDefaultSlab(1, 1, nz, lastXGe);
      MD.ui.energy = MD.tersoff.computeEnergy(MD.ui.slab);
      MD.viewer.render(MD.ui.slab);
      MD.ui.updateCrystalInfo(MD.ui.slab, MD.ui.energy);

      document.getElementById('btnCompSweep').disabled = false;
      document.getElementById('statusComp').textContent = 'Sweep complete (' + nPts + ' points)';
      document.getElementById('stepRes').style.display = '';

      MD.ui.saveResults();
    }, 50);
  },

  renderCompChart: function(results) {
    const wrap = document.getElementById('compChartWrap');
    wrap.style.display = '';
    const ctx = document.getElementById('compChart');
    if (MD.ui.charts.comp) MD.ui.charts.comp.destroy();

    MD.ui.charts.comp = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'E_surf vs x(Ge)',
          data: results.map(r => ({ x: r.xGe, y: r.surfaceEnergy })),
          borderColor: '#2d5a3d',
          backgroundColor: 'rgba(45, 90, 61, 0.15)',
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: '#2d5a3d',
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
            title: { display: true, text: 'x(Ge)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: 'E_surf (eV/\u00c5\u00b2)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  // ── Investigation B: Temperature Sweep ──
  runTempSweep: function() {
    if (!MD.ui.locked) return;
    const tMin = parseInt(document.getElementById('slTmin').value);
    const tMax = parseInt(document.getElementById('slTmax').value);
    const nPts = parseInt(document.getElementById('slTempPts').value);
    const xGe = parseInt(document.getElementById('slGeTemp').value) / 100;
    const nvv = parseInt(document.getElementById('slVVsteps').value);
    const dt = parseFloat(document.getElementById('slDt').value);

    const temps = [];
    for (let i = 0; i < nPts; i++) {
      temps.push(tMin + (tMax - tMin) * i / (nPts - 1));
    }

    document.getElementById('btnTempSweep').disabled = true;
    document.getElementById('btnTempStop').style.display = '';
    MD.ui.tempSweepRunning = true;

    const results = [];
    let idx = 0;

    const runNext = () => {
      if (idx >= temps.length || !MD.ui.tempSweepRunning) {
        MD.ui.tempSweepRunning = false;
        document.getElementById('btnTempSweep').disabled = false;
        document.getElementById('btnTempStop').style.display = 'none';
        document.getElementById('statusTemp').textContent = 'Sweep complete (' + results.length + ' points)';
        MD.ui.results.temp = results;
        MD.ui.renderTempChart(results);
        document.getElementById('stepRes').style.display = '';
        MD.ui.saveResults();
        return;
      }

      const T = temps[idx];
      document.getElementById('statusTemp').textContent =
        `Point ${idx + 1}/${temps.length}: T=${T.toFixed(0)} K, equilibrating...`;

      // Create worker, init, run steps, get energy
      const blob = new Blob(
        [document.querySelector ? '' : '', self.mdDynamicsCode || ''],
        { type: 'application/javascript' }
      );

      // Use fetch to load worker code
      fetch('md-dynamics.js').then(r => r.text()).then(code => {
        const workerBlob = new Blob([code], { type: 'application/javascript' });
        const w = new Worker(URL.createObjectURL(workerBlob));

        w.postMessage({
          type: 'init',
          params: { ncx: 1, ncy: 1, nczi: 2, nczf: 4, theta: xGe, temp: T }
        });

        let stepCount = 0;
        const stepsPerMsg = 50;
        const totalSteps = nvv;

        w.onmessage = function(e) {
          if (e.data.type === 'init_done') {
            // Start stepping
            w.postMessage({
              type: 'step',
              step: stepCount,
              params: { dt: dt, nvv: stepsPerMsg, temp: T, mcswap: 0, mcgc: 0, dmu: 0 }
            });
          } else if (e.data.type === 'update') {
            stepCount += stepsPerMsg;
            if (stepCount < totalSteps) {
              w.postMessage({
                type: 'step',
                step: stepCount,
                params: { dt: dt, nvv: stepsPerMsg, temp: T, mcswap: 0, mcgc: 0, dmu: 0 }
              });
            } else {
              // Done with this temperature
              results.push({
                temperature: T,
                energyPerAtom: e.data.energy,
                totalEnergy: e.data.totalEnergy,
                measuredTemp: e.data.temperature
              });
              w.terminate();
              idx++;
              MD.ui.renderTempChart(results);
              setTimeout(runNext, 10);
            }
          }
        };
      });
    };

    runNext();
  },

  stopTempSweep: function() {
    MD.ui.tempSweepRunning = false;
  },

  renderTempChart: function(results) {
    const wrap = document.getElementById('tempChartWrap');
    wrap.style.display = '';
    const ctx = document.getElementById('tempChart');
    if (MD.ui.charts.temp) MD.ui.charts.temp.destroy();

    MD.ui.charts.temp = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [{
          label: 'E/atom vs T',
          data: results.map(r => ({ x: r.temperature, y: r.energyPerAtom })),
          borderColor: '#c9913f',
          backgroundColor: 'rgba(201, 145, 63, 0.15)',
          borderWidth: 2,
          pointRadius: 5,
          pointBackgroundColor: '#c9913f',
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
            title: { display: true, text: 'Temperature (K)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: 'E/atom (eV)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  // ── Investigation C: Strain Sweep ──
  runStrainSweep: function() {
    if (!MD.ui.locked) return;
    const xGe = parseInt(document.getElementById('slGeStrain').value) / 100;
    const range = parseInt(document.getElementById('slStrainRange').value) / 100;
    const nPts = parseInt(document.getElementById('slStrainPts').value);

    const strainValues = [];
    for (let i = 0; i < nPts; i++) {
      strainValues.push(-range + 2 * range * i / (nPts - 1));
    }

    document.getElementById('btnStrainSweep').disabled = true;
    document.getElementById('statusStrain').textContent = 'Running strain sweep...';

    setTimeout(() => {
      const results = MD.tersoff.strainSweep(1, 1, 3, xGe, strainValues, strainValues, (i, total, r) => {
        document.getElementById('statusStrain').textContent =
          `Point ${i}/${total}: \u03b5x=${(r.strainX * 100).toFixed(1)}%, \u03b5y=${(r.strainY * 100).toFixed(1)}%, E_surf=${r.surfaceEnergy.toFixed(4)}`;
      });

      MD.ui.results.strain = results;
      document.getElementById('strainResults').style.display = '';
      MD.ui.renderStrainChart(results, strainValues);

      document.getElementById('btnStrainSweep').disabled = false;
      document.getElementById('statusStrain').textContent = 'Sweep complete (' + results.length + ' points)';
      document.getElementById('stepRes').style.display = '';
      MD.ui.saveResults();
    }, 50);
  },

  runSingleStrain: function() {
    if (!MD.ui.locked) return;
    const sx = parseInt(document.getElementById('slStrainX').value) / 1000;
    const sy = parseInt(document.getElementById('slStrainY').value) / 1000;
    const xGe = parseInt(document.getElementById('slGeStrain').value) / 100;

    const latt = MD.params.getLattice100Strained(xGe, sx, sy);
    MD.ui.slab = MD.crystal.buildDefaultSlab(1, 1, 3, xGe, latt);
    MD.ui.energy = MD.tersoff.computeEnergy(MD.ui.slab);
    MD.viewer.render(MD.ui.slab);
    MD.ui.updateCrystalInfo(MD.ui.slab, MD.ui.energy);

    document.getElementById('rLattx').textContent = latt.lattx.toFixed(3) + ' \u00c5';
    document.getElementById('rLatty').textContent = latt.latty.toFixed(3) + ' \u00c5';
    document.getElementById('rStrX').textContent = (sx * 100).toFixed(1) + '%';
    document.getElementById('rStrY').textContent = (sy * 100).toFixed(1) + '%';
    document.getElementById('rEsurfStr').textContent = MD.ui.energy.surfaceEnergy.toFixed(4) + ' eV/\u00c5\u00b2';
    document.getElementById('rEpaStr').textContent = MD.ui.energy.perAtom.toFixed(4) + ' eV';
    document.getElementById('strainResults').style.display = '';
  },

  renderStrainChart: function(results, strainValues) {
    const ctx = document.getElementById('strainChart');
    if (MD.ui.charts.strain) MD.ui.charts.strain.destroy();

    // For 2D sweep, extract the biaxial line (strainX == strainY)
    const biaxial = results.filter(r => Math.abs(r.strainX - r.strainY) < 0.001);
    const xOnly = results.filter(r => Math.abs(r.strainY) < 0.001);
    const yOnly = results.filter(r => Math.abs(r.strainX) < 0.001);

    MD.ui.charts.strain = new Chart(ctx, {
      type: 'scatter',
      data: {
        datasets: [
          {
            label: 'Biaxial (\u03b5x = \u03b5y)',
            data: biaxial.map(r => ({ x: r.strainX * 100, y: r.surfaceEnergy })),
            borderColor: '#2d5a3d',
            backgroundColor: 'rgba(45, 90, 61, 0.1)',
            borderWidth: 2,
            pointRadius: 4,
            showLine: true,
            tension: 0.3
          },
          {
            label: 'X-strain only (\u03b5y = 0)',
            data: xOnly.map(r => ({ x: r.strainX * 100, y: r.surfaceEnergy })),
            borderColor: '#c9913f',
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 3,
            showLine: true,
            tension: 0.3
          },
          {
            label: 'Y-strain only (\u03b5x = 0)',
            data: yOnly.map(r => ({ x: r.strainY * 100, y: r.surfaceEnergy })),
            borderColor: '#6b8fa3',
            borderWidth: 1.5,
            borderDash: [4, 3],
            pointRadius: 3,
            showLine: true,
            tension: 0.3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#6b6560', font: { family: 'JetBrains Mono', size: 10 } } }
        },
        scales: {
          x: {
            title: { display: true, text: 'Strain (%)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: 'E_surf (eV/\u00c5\u00b2)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  // ── Investigation D: Layer Distribution ──
  runLayerAnalysis: function() {
    if (!MD.ui.locked) return;
    const xGe = parseInt(document.getElementById('slGeLayers').value) / 100;
    const nz = parseInt(document.getElementById('slNzLayers').value);
    const mcSwaps = parseInt(document.getElementById('slMCswaps').value);
    const dmu = parseFloat(document.getElementById('slDmuLayers').value) / 100;

    document.getElementById('btnLayerAnalysis').disabled = true;
    document.getElementById('statusLayers').textContent = 'Building slab...';

    setTimeout(() => {
      MD.ui.slab = MD.crystal.buildDefaultSlab(3, 3, nz, xGe);
      MD.ui.energy = MD.tersoff.computeEnergy(MD.ui.slab);

      // If MC swaps requested, run them via worker
      if (mcSwaps > 0) {
        document.getElementById('statusLayers').textContent = 'Running MC swaps (using Web Worker)...';

        fetch('md-dynamics.js').then(r => r.text()).then(code => {
          const workerBlob = new Blob([code], { type: 'application/javascript' });
          const w = new Worker(URL.createObjectURL(workerBlob));

          w.postMessage({
            type: 'init',
            params: { ncx: 3, ncy: 3, nczi: 2, nczf: 2 + nz - 1, theta: xGe, temp: 300 }
          });

          w.onmessage = function(e) {
            if (e.data.type === 'init_done') {
              // Run with MC swaps
              w.postMessage({
                type: 'step',
                step: 0,
                params: { dt: 0.02, nvv: 10, temp: 300, mcswap: mcSwaps, mcgc: Math.floor(mcSwaps / 2), dmu: dmu }
              });
            } else if (e.data.type === 'update') {
              // Use layer composition from worker
              const comp = e.data.layers;
              MD.ui.results.layers = comp.pairs;
              MD.ui.renderLayerChart(comp.pairs);
              MD.ui.renderLayerStats(comp.pairs);

              document.getElementById('layerResults').style.display = '';
              document.getElementById('btnLayerAnalysis').disabled = false;
              document.getElementById('statusLayers').textContent =
                'Analysis complete (MC acceptance: ' + e.data.mcPct.toFixed(1) + '%)';
              document.getElementById('stepRes').style.display = '';
              MD.ui.saveResults();

              // Update viewer with last slab
              MD.viewer.render(MD.ui.slab);
              MD.ui.updateCrystalInfo(MD.ui.slab, MD.ui.energy);

              w.terminate();
            }
          };
        });
      } else {
        // No MC — just analyze static placement
        const dist = MD.crystal.getLayerDistribution(MD.ui.slab, 4);
        MD.ui.results.layers = dist;
        MD.ui.renderLayerChart(dist);
        MD.ui.renderLayerStats(dist);

        MD.viewer.render(MD.ui.slab);
        MD.ui.updateCrystalInfo(MD.ui.slab, MD.ui.energy);

        document.getElementById('layerResults').style.display = '';
        document.getElementById('btnLayerAnalysis').disabled = false;
        document.getElementById('statusLayers').textContent = 'Analysis complete (no MC swaps)';
        document.getElementById('stepRes').style.display = '';
        MD.ui.saveResults();
      }
    }, 50);
  },

  renderLayerChart: function(pairs) {
    const ctx = document.getElementById('layerChart');
    if (MD.ui.charts.layer) MD.ui.charts.layer.destroy();

    MD.ui.charts.layer = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: pairs.map(p => 'Pair ' + p.pair + '\n(' + p.layerA + ' & ' + p.layerB + ')'),
        datasets: [{
          label: 'Ge fraction',
          data: pairs.map(p => p.geFraction * 100),
          backgroundColor: [
            'rgba(45, 90, 61, 0.7)',
            'rgba(201, 145, 63, 0.7)',
            'rgba(107, 143, 163, 0.7)',
            'rgba(160, 100, 140, 0.7)'
          ],
          borderWidth: 0,
          borderRadius: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: {
            title: { display: true, text: 'Layer pair (1=surface, 4=interior)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 9 } }
          },
          y: {
            title: { display: true, text: 'Ge fraction (%)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } },
            min: 0,
            max: 100
          }
        }
      }
    });
  },

  renderLayerStats: function(pairs) {
    const el = document.getElementById('layerStats');
    el.innerHTML = pairs.map(p =>
      `<div class="rstat">
        <span class="rl">Pair ${p.pair} (layers ${p.layerA} &amp; ${p.layerB})</span>
        <span class="rv">${(p.geFraction * 100).toFixed(1)}%</span>
      </div>
      <div style="font-size:10px;color:var(--text-tertiary);margin-bottom:8px;font-family:'JetBrains Mono',monospace">
        ${p.nGe} Ge / ${p.nTotal} total
      </div>`
    ).join('');
  },

  // ── Save/Load Results ──
  saveResults: function() {
    const data = {};
    if (MD.ui.results.comp) data.comp = MD.ui.results.comp;
    if (MD.ui.results.temp) data.temp = MD.ui.results.temp;
    if (MD.ui.results.strain) data.strain = MD.ui.results.strain;
    if (MD.ui.results.layers) data.layers = MD.ui.results.layers;
    localStorage.setItem('alexey_md_results', JSON.stringify(data));
  },

  // ── AI Coach ──
  askCoach: async function() {
    const interp = document.getElementById('interpText').value.trim();
    if (interp.length < 20) {
      document.getElementById('interpText').style.borderColor = '#c0392b';
      return;
    }

    const hyp = document.getElementById('hypText').value;

    // Gather results summary
    let dataSummary = '';
    if (MD.ui.results.comp) {
      dataSummary += 'Composition sweep: ' + MD.ui.results.comp.map(r =>
        `x(Ge)=${r.xGe.toFixed(2)}, E_surf=${r.surfaceEnergy.toFixed(4)}`
      ).join('; ') + '\n';
    }
    if (MD.ui.results.temp) {
      dataSummary += 'Temperature sweep: ' + MD.ui.results.temp.map(r =>
        `T=${r.temperature.toFixed(0)}K, E/atom=${r.energyPerAtom.toFixed(4)}`
      ).join('; ') + '\n';
    }
    if (MD.ui.results.strain) {
      const biax = MD.ui.results.strain.filter(r => Math.abs(r.strainX - r.strainY) < 0.001);
      dataSummary += 'Strain (biaxial): ' + biax.map(r =>
        `\u03b5=${(r.strainX*100).toFixed(1)}%, E_surf=${r.surfaceEnergy.toFixed(4)}`
      ).join('; ') + '\n';
    }
    if (MD.ui.results.layers) {
      dataSummary += 'Layer distribution: ' + MD.ui.results.layers.map(p =>
        `Pair ${p.pair}: ${(p.geFraction*100).toFixed(1)}% Ge (${p.nGe}/${p.nTotal})`
      ).join('; ') + '\n';
    }

    const userMsg = `Alexey's hypothesis: "${hyp}"\n\nSimulation data:\n${dataSummary || 'No data yet.'}\n\nAlexey's interpretation: "${interp}"`;
    const aiEl = document.getElementById('aiQ');
    aiEl.innerHTML = '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px">Coach is thinking...</span>';
    document.getElementById('askBtn').disabled = true;

    MD.ui.convHist = [{ role: 'user', content: userMsg }];

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are COACH \u2014 a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore building a computational science portfolio. Alexey has just run molecular dynamics simulations of SiGe (100) surfaces using the Tersoff potential. He explored how surface energy depends on germanium composition, temperature, lattice strain, and layer-by-layer Ge distribution. Ask EXACTLY ONE question per response. Never give Alexey the answer. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.',
          messages: MD.ui.convHist
        })
      });
      const d = await r.json();
      const q = d.content[0].text;
      aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
      MD.ui.convHist.push({ role: 'assistant', content: q });
      localStorage.setItem('alexey_md_dialogue', JSON.stringify(MD.ui.convHist));
      document.getElementById('replySec').style.display = 'block';
    } catch(e) {
      aiEl.innerHTML = '<span style="color:#c0392b;font-size:12px">Coach unavailable. Write your own follow-up question.</span>';
    }
    document.getElementById('askBtn').disabled = false;
  },

  sendReply: async function() {
    const reply = document.getElementById('replyText').value.trim();
    if (reply.length < 3) return;

    const prevQ = document.getElementById('aiQ').innerText;
    const thr = document.getElementById('thread');
    thr.innerHTML += '<div class="tcoach"><div class="t-lbl coach-lbl">coach</div>' + prevQ + '</div>' +
      '<div class="talex"><div class="t-lbl alex-lbl">alexey</div>' + reply + '</div>';

    document.getElementById('replyText').value = '';
    MD.ui.convHist.push({ role: 'user', content: reply });

    const aiEl = document.getElementById('aiQ');
    aiEl.innerHTML = '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px">Coach is thinking...</span>';

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          system: 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his SiGe (100) surface dynamics simulations. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',
          messages: MD.ui.convHist
        })
      });
      const d = await r.json();
      const q = d.content[0].text;
      aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
      MD.ui.convHist.push({ role: 'assistant', content: q });
      localStorage.setItem('alexey_md_dialogue', JSON.stringify(MD.ui.convHist));
    } catch(e) {
      aiEl.innerHTML = '<span style="color:#c0392b;font-size:12px">Connection issue \u2014 try again.</span>';
    }
  }
};

document.addEventListener('DOMContentLoaded', MD.ui.init);
