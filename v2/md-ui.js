// md-ui.js — UI controls, hypothesis management, AI coach, state persistence

const MD = window.MD || {};
window.MD = MD;

MD.ui = {
  locked: false,
  slab: null,
  energy: null,
  sweepResults: [],
  savedSeries: [],
  convHist: [],
  sweepChart: null,
  coordChart: null,
  energyChart: null,

  init: function() {
    // Restore hypothesis if previously locked
    const savedHyp = localStorage.getItem('alexey_md_hypothesis');
    const savedTS = localStorage.getItem('alexey_md_timestamp');
    if (savedHyp && savedTS) {
      document.getElementById('hypText').value = savedHyp;
      MD.ui.doLock(savedTS);
    }

    // Restore saved series
    const ss = localStorage.getItem('alexey_md_series');
    if (ss) {
      try { MD.ui.savedSeries = JSON.parse(ss); } catch(e) {}
    }

    // Init viewer
    MD.viewer.init('crystalCanvas');

    // Draw empty state
    MD.viewer.render();

    // Update slider labels
    MD.ui.updateSliderLabels();
  },

  updateSliderLabels: function() {
    const nx = document.getElementById('slNx');
    const nz = document.getElementById('slNz');
    const ge = document.getElementById('slGe');
    if (nx) document.getElementById('valNx').textContent = nx.value;
    if (nz) document.getElementById('valNz').textContent = nz.value;
    if (ge) document.getElementById('valGe').textContent = ge.value + '%';
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
    const d = new Date(ts);
    tsEl.textContent = 'locked \u00b7 ' + d.toLocaleString();

    document.getElementById('lockBtn').textContent = '\u2713 Hypothesis locked';
    document.getElementById('lockBtn').disabled = true;
    document.getElementById('labHint').textContent = 'Configure and build your crystal slab';

    // Enable lab controls
    document.querySelectorAll('.lab-ctrl').forEach(el => el.disabled = false);
  },

  buildCrystal: function() {
    if (!MD.ui.locked) return;

    const nx = parseInt(document.getElementById('slNx').value);
    const ny = nx; // keep square in x-y
    const nz = parseInt(document.getElementById('slNz').value);
    const xGe = parseInt(document.getElementById('slGe').value) / 100;

    // Status
    document.getElementById('buildStatus').textContent = 'Building...';

    setTimeout(() => {
      MD.ui.slab = MD.crystal.buildSlab(nx, ny, nz, xGe);
      MD.ui.energy = MD.tersoff.computeEnergy(MD.ui.slab);
      const stats = MD.crystal.getStats(MD.ui.slab);

      // Update data panel
      document.getElementById('dAtoms').textContent = stats.total;
      document.getElementById('dSi').textContent = stats.nSi;
      document.getElementById('dGe').textContent = stats.nGe;
      document.getElementById('dXGe').textContent = (stats.xGe * 100).toFixed(1) + '%';
      document.getElementById('dA0').textContent = MD.ui.slab.a0.toFixed(3) + ' \u00c5';
      document.getElementById('dDims').textContent =
        MD.ui.slab.box.lx.toFixed(1) + ' \u00d7 ' +
        MD.ui.slab.box.ly.toFixed(1) + ' \u00d7 ' +
        MD.ui.slab.box.lz.toFixed(1) + ' \u00c5';
      document.getElementById('dEtot').textContent = MD.ui.energy.total.toFixed(2) + ' eV';
      document.getElementById('dEpa').textContent = MD.ui.energy.perAtom.toFixed(4) + ' eV';
      document.getElementById('dEsurf').textContent = MD.ui.energy.surfaceEnergy.toFixed(4) + ' eV/\u00c5\u00b2';
      document.getElementById('dSurf').textContent = stats.nSurface;
      document.getElementById('dBulk').textContent = stats.nBulk;

      // Render
      MD.viewer.render(MD.ui.slab);

      // Coordination chart
      MD.ui.updateCoordChart(stats.coordHist);

      // Enable sweep button
      document.getElementById('sweepBtn').disabled = false;
      document.getElementById('buildStatus').textContent = 'Built ' + stats.total + ' atoms';
    }, 50);
  },

  updateCoordChart: function(hist) {
    const ctx = document.getElementById('coordChart');
    if (!ctx) return;

    if (MD.ui.coordChart) MD.ui.coordChart.destroy();

    MD.ui.coordChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['0', '1', '2', '3', '4'],
        datasets: [{
          data: hist,
          backgroundColor: MD.viewer.coordColors.map(c => c + 'cc'),
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
            title: { display: true, text: 'Neighbors', color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } },
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            grid: { color: 'rgba(0,0,0,0.04)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  runSweep: function() {
    if (!MD.ui.locked) return;

    const nx = parseInt(document.getElementById('slNx').value);
    const xGe = parseInt(document.getElementById('slGe').value) / 100;
    const nzValues = [2, 3, 4, 5, 6, 7, 8];

    document.getElementById('sweepStatus').textContent = 'Running sweep...';
    document.getElementById('sweepBtn').disabled = true;

    setTimeout(() => {
      const results = MD.tersoff.thicknessSweep(nx, nx, xGe, nzValues, (i, total, r) => {
        document.getElementById('sweepStatus').textContent =
          `Layer ${i + 1}/${total}: ${r.nAtoms} atoms, E_surf = ${r.surfaceEnergy.toFixed(4)} eV/\u00c5\u00b2`;
      });

      MD.ui.sweepResults = results;

      // Show results section
      document.getElementById('stepRes').style.display = '';

      // Update results stats
      const last = results[results.length - 1];
      document.getElementById('rConv').textContent = last.surfaceEnergy.toFixed(4) + ' eV/\u00c5\u00b2';
      document.getElementById('rThick').textContent = last.thickness.toFixed(1) + ' \u00c5';
      document.getElementById('rAtoms').textContent = last.nAtoms;
      document.getElementById('rComp').textContent = (xGe * 100).toFixed(0) + '% Ge';

      // Update sweep chart
      MD.ui.updateSweepChart(results, xGe);

      // Save results
      localStorage.setItem('alexey_md_results', JSON.stringify({
        sweep: results,
        series: MD.ui.savedSeries
      }));

      document.getElementById('sweepBtn').disabled = false;
      document.getElementById('sweepStatus').textContent = 'Sweep complete';
      document.getElementById('stepRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  },

  saveSeries: function() {
    if (MD.ui.sweepResults.length === 0) return;
    const name = document.getElementById('seriesName').value.trim();
    if (!name) return;
    const xGe = parseInt(document.getElementById('slGe').value) / 100;

    MD.ui.savedSeries.push({
      name: name,
      xGe: xGe,
      data: MD.ui.sweepResults.map(r => ({
        nz: r.nz,
        thickness: r.thickness,
        surfaceEnergy: r.surfaceEnergy,
        perAtom: r.perAtom
      }))
    });

    localStorage.setItem('alexey_md_series', JSON.stringify(MD.ui.savedSeries));
    document.getElementById('seriesName').value = '';
    MD.ui.updateSweepChart(MD.ui.sweepResults, xGe);
    MD.ui.updateSeriesList();
  },

  updateSeriesList: function() {
    const el = document.getElementById('seriesList');
    if (!el) return;
    if (MD.ui.savedSeries.length === 0) {
      el.innerHTML = '<span style="color:var(--text-tertiary);font-size:12px">No saved series yet</span>';
      return;
    }
    el.innerHTML = MD.ui.savedSeries.map((s, i) =>
      `<span class="series-tag">${s.name} <button onclick="MD.ui.deleteSeries(${i})" class="series-del">\u00d7</button></span>`
    ).join('');
  },

  deleteSeries: function(idx) {
    MD.ui.savedSeries.splice(idx, 1);
    localStorage.setItem('alexey_md_series', JSON.stringify(MD.ui.savedSeries));
    MD.ui.updateSeriesList();
    if (MD.ui.sweepResults.length > 0) {
      const xGe = parseInt(document.getElementById('slGe').value) / 100;
      MD.ui.updateSweepChart(MD.ui.sweepResults, xGe);
    }
  },

  updateSweepChart: function(results, currentXGe) {
    const ctx = document.getElementById('sweepChart');
    if (!ctx) return;

    if (MD.ui.sweepChart) MD.ui.sweepChart.destroy();

    const seriesColors = ['#2d5a3d', '#c9913f', '#6b8fa3', '#c0392b', '#8e44ad', '#16a085'];

    const datasets = [];

    // Current sweep
    datasets.push({
      label: 'Current (' + (currentXGe * 100).toFixed(0) + '% Ge)',
      data: results.map(r => ({ x: r.thickness, y: r.surfaceEnergy })),
      borderColor: '#2d5a3d',
      backgroundColor: 'rgba(45, 90, 61, 0.1)',
      borderWidth: 2,
      pointRadius: 4,
      pointBackgroundColor: '#2d5a3d',
      fill: false,
      tension: 0.3
    });

    // Saved series
    MD.ui.savedSeries.forEach((s, i) => {
      const color = seriesColors[(i + 1) % seriesColors.length];
      datasets.push({
        label: s.name,
        data: s.data.map(r => ({ x: r.thickness, y: r.surfaceEnergy })),
        borderColor: color,
        borderWidth: 1.5,
        borderDash: [4, 3],
        pointRadius: 3,
        pointBackgroundColor: color,
        fill: false,
        tension: 0.3
      });
    });

    MD.ui.sweepChart = new Chart(ctx, {
      type: 'scatter',
      data: { datasets: datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: datasets.length > 1,
            labels: { color: '#6b6560', font: { family: 'JetBrains Mono', size: 10 } }
          }
        },
        scales: {
          x: {
            type: 'linear',
            title: { display: true, text: 'Slab thickness (\u00c5)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          },
          y: {
            title: { display: true, text: 'Surface energy (eV/\u00c5\u00b2)', color: '#9a9490', font: { family: 'JetBrains Mono', size: 11 } },
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { color: '#9a9490', font: { family: 'JetBrains Mono', size: 10 } }
          }
        }
      }
    });
  },

  setColorMode: function(mode) {
    MD.viewer.colorMode = mode;
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    document.querySelector(`[data-mode="${mode}"]`).classList.add('active');
    MD.viewer.render();
  },

  // AI Coach
  askCoach: async function() {
    const interp = document.getElementById('interpText').value.trim();
    if (interp.length < 20) {
      document.getElementById('interpText').style.borderColor = '#c0392b';
      return;
    }

    const hyp = document.getElementById('hypText').value;
    const sweepSummary = MD.ui.sweepResults.length > 0
      ? MD.ui.sweepResults.map(r =>
          `nz=${r.nz}: ${r.nAtoms} atoms, thickness=${r.thickness.toFixed(1)}\u00c5, E_surf=${r.surfaceEnergy.toFixed(4)} eV/\u00c5\u00b2`
        ).join('\n')
      : 'No sweep data yet.';

    const energySummary = MD.ui.energy
      ? `Total energy: ${MD.ui.energy.total.toFixed(2)} eV, Per atom: ${MD.ui.energy.perAtom.toFixed(4)} eV, Surface energy: ${MD.ui.energy.surfaceEnergy.toFixed(4)} eV/\u00c5\u00b2`
      : 'No energy computed yet.';

    const userMsg = `Alexey's hypothesis: "${hyp}"\n\nCrystal data:\n${energySummary}\n\nThickness sweep:\n${sweepSummary}\n\nSaved series: ${MD.ui.savedSeries.map(s => s.name + ' (' + (s.xGe*100).toFixed(0) + '% Ge)').join(', ') || 'none'}\n\nAlexey's interpretation: "${interp}"`;

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
          system: 'You are COACH \u2014 a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore building a computational science portfolio. Alexey has just run a molecular dynamics simulation of SiGe surfaces using a simplified Tersoff potential. He built crystal slabs, computed surface energies, and explored how germanium composition affects surface stability. Ask EXACTLY ONE question per response. Never give Alexey the answer. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.',
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
          system: 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his SiGe molecular dynamics experiment. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',
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

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', MD.ui.init);
