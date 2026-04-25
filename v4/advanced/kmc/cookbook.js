/* cookbook.js — Replaces the scripted sweep dashboard with a recipe-driven
   notebook. Each entry is a measurement protocol: write parameters, run the
   sim (in single-run mode), capture the result into a row, repeat until you
   have enough rows to derive the entry's quantity. Auto-plots and exports.

   Persistence: each entry's rows live under Store key 'cookbook.<id>'. */

var COOKBOOK_ENTRIES = [
  {
    id: 'beta-once',
    title: 'β at one condition',
    why: 'A single asymptotic β is the simplest measurement. Pick a temperature, composition, and desorption probability you want to characterise; run the sim; capture.',
    recipe: 'Single run · niter1 ≥ 5000 · default lattice. Capture the asymptotic phase β.',
    cols: [
      { key:'T',     label:'T (K)' },
      { key:'theta', label:'θ' },
      { key:'pdes',  label:'P_des' },
      { key:'L',     label:'L' },
      { key:'niter', label:'niter1' },
      { key:'beta',  label:'β' },
      { key:'r2',    label:'R²' }
    ],
    capture: function() {
      var p = (typeof readParams === 'function') ? readParams() : {};
      var lastPhase = (currentPhases && currentPhases.length) ? currentPhases[currentPhases.length-1] : null;
      return {
        T: p.temp || '', theta: p.theta || '', pdes: p.pdes || '',
        L: p.lattx || '', niter: p.niter1 || '',
        beta: lastPhase ? lastPhase.beta.toFixed(4) : '',
        r2: lastPhase ? lastPhase.r2.toFixed(4) : ''
      };
    },
    derive: null
  },
  {
    id: 'beta-vs-T',
    title: 'β vs Temperature',
    why: 'Does β change with temperature? Do an Arrhenius-style sweep: 5 runs at T = 400, 500, 600, 700, 800 K. If β shifts, kinetic rates matter for the scaling.',
    recipe: 'For each T value: set Temp in parameters, run, then capture.',
    cols: [
      { key:'T',    label:'T (K)' },
      { key:'beta', label:'β (asymptotic)' },
      { key:'r2',   label:'R²' }
    ],
    capture: function() {
      var p = (typeof readParams === 'function') ? readParams() : {};
      var lastPhase = (currentPhases && currentPhases.length) ? currentPhases[currentPhases.length-1] : null;
      return {
        T: p.temp || '',
        beta: lastPhase ? lastPhase.beta.toFixed(4) : '',
        r2:   lastPhase ? lastPhase.r2.toFixed(4) : ''
      };
    },
    suggested: [{T:400},{T:500},{T:600},{T:700},{T:800}],
    plot: { x:'T', y:'beta', xLabel:'T (K)', yLabel:'β' },
    derive: null
  },
  {
    id: 'alpha-fss',
    title: 'α from finite-size scaling',
    why: 'The roughness exponent α controls the saturated width: w_sat ∝ L^α. Run the same physics at three lattice sizes (L = 128, 256, 512) until each saturates, then fit log w_sat vs log L. The slope is α.',
    recipe: 'For each L: set lattx, niter1 large enough that the chart flattens, capture w_sat (the plateau RMS).',
    cols: [
      { key:'L',    label:'L (lattx)' },
      { key:'wsat', label:'w_sat' }
    ],
    capture: function() {
      var p = (typeof readParams === 'function') ? readParams() : {};
      // Use last 10% of roughness data as the saturation estimate.
      var w = '';
      if (typeof roughnessData !== 'undefined' && roughnessData && roughnessData.length > 10) {
        var tail = roughnessData.slice(Math.floor(roughnessData.length * 0.9));
        var s = 0;
        for (var i = 0; i < tail.length; i++) s += tail[i].y;
        w = (s / tail.length).toFixed(4);
      }
      return { L: p.lattx || '', wsat: w };
    },
    suggested: [{L:128},{L:256},{L:512}],
    plot: { x:'L', y:'wsat', xLabel:'L', yLabel:'w_sat', logLog:true, fit:true },
    derive: function(rows) {
      // Log-log slope of w_sat vs L = α
      var pts = rows.filter(function(r){return r.L > 0 && r.wsat > 0;});
      if (pts.length < 2) return null;
      var n = pts.length, sx=0, sy=0, sxy=0, sxx=0;
      for (var i = 0; i < n; i++) {
        var lx = Math.log10(pts[i].L), ly = Math.log10(pts[i].wsat);
        sx+=lx; sy+=ly; sxy+=lx*ly; sxx+=lx*lx;
      }
      var den = n*sxx - sx*sx;
      if (Math.abs(den) < 1e-15) return null;
      var alpha = (n*sxy - sx*sy) / den;
      return { alpha: alpha };
    }
  },
  {
    id: 'beta-vs-theta',
    title: 'β vs composition θ',
    why: 'Sweep θ from pure Si (0) to pure Ge (1). Watch β — does composition change the roughening exponent? In practice the answer is often subtle: morphology changes (more pits at high θ) but β can stay similar if the universality class is unchanged.',
    recipe: 'For each θ: set theta in parameters, run, capture asymptotic β.',
    cols: [
      { key:'theta', label:'θ' },
      { key:'beta',  label:'β' }
    ],
    capture: function() {
      var p = (typeof readParams === 'function') ? readParams() : {};
      var lastPhase = (currentPhases && currentPhases.length) ? currentPhases[currentPhases.length-1] : null;
      return { theta: p.theta || '', beta: lastPhase ? lastPhase.beta.toFixed(4) : '' };
    },
    suggested: [{theta:0.0},{theta:0.25},{theta:0.5},{theta:0.75},{theta:1.0}],
    plot: { x:'theta', y:'beta', xLabel:'θ', yLabel:'β' },
    derive: null
  },
  {
    id: 'pits-vs-pdes',
    title: 'Pits vs desorption probability',
    why: 'P_des controls how aggressively atoms leave the surface. More desorption → more pits, deeper pits. Quantify it: pit count and coverage as P_des increases.',
    recipe: 'For each P_des value: set pdes in parameters, run, capture pit count and coverage.',
    cols: [
      { key:'pdes',     label:'P_des' },
      { key:'pitCount', label:'Pit count' },
      { key:'coverage', label:'Coverage (%)' }
    ],
    capture: function() {
      var p = (typeof readParams === 'function') ? readParams() : {};
      var pits = window._currentPits || [];
      var coverage = '';
      if (pits.length > 0 && typeof lastFullHt !== 'undefined' && lastFullHt) {
        var sites = pits.reduce(function(s,p){return s+p.width;}, 0);
        coverage = ((sites / lastFullHt.length) * 100).toFixed(2);
      }
      return { pdes: p.pdes || '', pitCount: pits.length, coverage: coverage };
    },
    suggested: [{pdes:0.05},{pdes:0.10},{pdes:0.20},{pdes:0.50}],
    plot: { x:'pdes', y:'pitCount', xLabel:'P_des', yLabel:'pit count' },
    derive: null
  },
  {
    id: 'universality',
    title: 'Universality class — z = α / β',
    why: 'Combine α (from the FSS entry above) with β (from any single-condition β entry) to compute the dynamic exponent z. Edwards-Wilkinson: z = 2. KPZ: z = 3/2. Random deposition with diffusion: z = 4. The class tells you what physics dominates.',
    recipe: 'No new runs. Pull α from the FSS entry, β from any β entry, fill in the row, and read off z.',
    cols: [
      { key:'alpha', label:'α' },
      { key:'beta',  label:'β' },
      { key:'z',     label:'z = α / β' },
      { key:'class', label:'best match' }
    ],
    capture: null,
    derive: function(rows) {
      for (var i = 0; i < rows.length; i++) {
        var r = rows[i];
        if (r.alpha > 0 && r.beta > 0) {
          var z = r.alpha / r.beta;
          r.z = z.toFixed(3);
          if (Math.abs(z - 2.0) < 0.25) r.class = 'EW (z = 2)';
          else if (Math.abs(z - 1.5) < 0.25) r.class = 'KPZ (z = 3/2)';
          else if (Math.abs(z - 4.0) < 0.5) r.class = 'RD + diffusion (z = 4)';
          else r.class = 'unclassified';
        }
      }
      return rows;
    }
  }
];

/* ── Storage ─────────────────────────────────────────────────── */
function _ckKey(id) { return 'cookbook.' + id; }
function getCookbookRows(id) {
  if (typeof Store === 'undefined') return [];
  var saved = Store.get('kmc', _ckKey(id));
  return Array.isArray(saved) ? saved : [];
}
function setCookbookRows(id, rows) {
  if (typeof Store === 'undefined') return;
  Store.set('kmc', _ckKey(id), rows);
}

/* ── Render the entire cookbook into #cookbookRoot ───────────── */
function renderCookbook() {
  var root = document.getElementById('cookbookRoot');
  if (!root) return;
  root.innerHTML = '';
  for (var i = 0; i < COOKBOOK_ENTRIES.length; i++) {
    root.appendChild(renderCookbookCard(COOKBOOK_ENTRIES[i]));
  }
  refreshCookbookSummary();
}

/* Update the collapsed-panel summary line with live entry-count stats. */
function refreshCookbookSummary() {
  var stats = document.getElementById('cookbookSummaryStats');
  if (!stats) return;
  var totalEntries = COOKBOOK_ENTRIES.length;
  var withRows = 0, totalRows = 0;
  for (var i = 0; i < COOKBOOK_ENTRIES.length; i++) {
    var rows = getCookbookRows(COOKBOOK_ENTRIES[i].id);
    if (rows.length > 0) withRows++;
    totalRows += rows.length;
  }
  if (totalRows === 0) {
    stats.textContent = totalEntries + ' entries · click to expand';
  } else {
    stats.textContent = totalRows + ' rows across ' + withRows + '/' + totalEntries + ' entries · click to expand';
  }
}

function renderCookbookCard(entry) {
  var card = document.createElement('div');
  card.className = 'dash-card cookbook-card';
  card.setAttribute('data-cookbook-id', entry.id);

  // Header
  var hdr = document.createElement('div');
  hdr.className = 'card-hdr';
  hdr.innerHTML =
    '<span class="card-label">' + entry.title + '</span>' +
    (entry.capture ? '<button class="sm" data-action="capture">Capture from current run</button>' : '') +
    '<button class="sm" data-action="add">Add empty row</button>' +
    '<button class="sm danger" data-action="clear">Clear</button>';
  card.appendChild(hdr);

  // Why this matters
  var why = document.createElement('div');
  why.className = 'cookbook-why';
  why.textContent = entry.why;
  card.appendChild(why);

  // Recipe
  if (entry.recipe) {
    var recipe = document.createElement('div');
    recipe.className = 'cookbook-recipe';
    recipe.innerHTML = '<b>Recipe:</b> ' + entry.recipe;
    card.appendChild(recipe);
  }

  // Suggested rows hint
  if (entry.suggested && entry.suggested.length) {
    var hint = document.createElement('div');
    hint.className = 'cookbook-suggested';
    var items = entry.suggested.map(function(s) {
      return Object.keys(s).map(function(k){return k + '=' + s[k];}).join(', ');
    });
    hint.innerHTML = '<b>Suggested:</b> ' + items.join(' · ') + ' <button class="sm" data-action="seed">Seed empty rows from this</button>';
    card.appendChild(hint);
  }

  // Table
  var tableWrap = document.createElement('div');
  tableWrap.className = 'cookbook-table';
  card.appendChild(tableWrap);

  // Derived display
  if (entry.derive) {
    var derived = document.createElement('div');
    derived.className = 'cookbook-derived';
    derived.id = 'derived-' + entry.id;
    card.appendChild(derived);
  }

  // Plot canvas
  if (entry.plot) {
    var plotWrap = document.createElement('div');
    plotWrap.className = 'cookbook-plot';
    plotWrap.innerHTML = '<canvas id="plot-' + entry.id + '" style="width:100%;height:200px"></canvas>';
    card.appendChild(plotWrap);
  }

  // Wire up
  hdr.querySelectorAll('button[data-action]').forEach(function(btn) {
    btn.addEventListener('click', function() { handleCookbookAction(entry, btn.getAttribute('data-action')); });
  });
  if (entry.suggested) {
    var seedBtn = card.querySelector('button[data-action="seed"]');
    if (seedBtn) seedBtn.addEventListener('click', function() { handleCookbookAction(entry, 'seed'); });
  }

  // Initial render of table + plot
  refreshCookbookCard(entry, card);
  return card;
}

function refreshCookbookCard(entry, card) {
  if (!card) card = document.querySelector('.cookbook-card[data-cookbook-id="' + entry.id + '"]');
  if (!card) return;
  var rows = getCookbookRows(entry.id);
  if (entry.derive) entry.derive(rows);

  // Build table
  var tableWrap = card.querySelector('.cookbook-table');
  var html = '<table class="events-table"><thead><tr>';
  for (var c = 0; c < entry.cols.length; c++) html += '<th>' + entry.cols[c].label + '</th>';
  html += '<th></th></tr></thead><tbody>';
  if (rows.length === 0) {
    html += '<tr><td colspan="' + (entry.cols.length + 1) + '" style="color:var(--text-tertiary);font-style:italic;text-align:center;padding:10px">no rows yet — capture from a run, seed suggested values, or add manually</td></tr>';
  } else {
    for (var r = 0; r < rows.length; r++) {
      html += '<tr data-row="' + r + '">';
      for (var c2 = 0; c2 < entry.cols.length; c2++) {
        var k = entry.cols[c2].key;
        var v = rows[r][k] !== undefined && rows[r][k] !== null ? rows[r][k] : '';
        html += '<td><input class="cookbook-cell" data-key="' + k + '" value="' + v + '" style="width:100%;font-size:11px;padding:2px 4px;background:transparent;border:none;color:var(--text-primary);font-family:Space Mono,monospace"></td>';
      }
      html += '<td><button class="sm danger" data-row-del="' + r + '" style="padding:2px 6px;font-size:9px">×</button></td></tr>';
    }
  }
  html += '</tbody></table>';
  tableWrap.innerHTML = html;

  // Wire cell edits and row deletes
  var cells = tableWrap.querySelectorAll('.cookbook-cell');
  cells.forEach(function(cell) {
    cell.addEventListener('change', function(e) {
      var tr = e.target.closest('tr');
      var rowIdx = +tr.getAttribute('data-row');
      var key = e.target.getAttribute('data-key');
      var val = e.target.value;
      var num = parseFloat(val);
      var rows2 = getCookbookRows(entry.id);
      if (!rows2[rowIdx]) rows2[rowIdx] = {};
      rows2[rowIdx][key] = isNaN(num) || val === '' ? val : num;
      setCookbookRows(entry.id, rows2);
      refreshCookbookCard(entry);
    });
  });
  var dels = tableWrap.querySelectorAll('button[data-row-del]');
  dels.forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      var rowIdx = +e.target.getAttribute('data-row-del');
      var rows3 = getCookbookRows(entry.id);
      rows3.splice(rowIdx, 1);
      setCookbookRows(entry.id, rows3);
      refreshCookbookCard(entry);
    });
  });

  // Update derived display
  if (entry.derive) {
    var derivedEl = document.getElementById('derived-' + entry.id);
    if (derivedEl) {
      var derivedResult = entry.derive(rows);
      if (derivedResult && typeof derivedResult === 'object' && derivedResult.alpha !== undefined) {
        derivedEl.innerHTML = '<b>α (slope of log w_sat vs log L) = ' + derivedResult.alpha.toFixed(3) + '</b>';
      } else {
        derivedEl.innerHTML = '';
      }
    }
  }

  // Plot
  if (entry.plot) {
    drawCookbookPlot(entry, rows);
  }
}

function handleCookbookAction(entry, action) {
  var rows = getCookbookRows(entry.id);
  if (action === 'capture') {
    if (!entry.capture) return;
    var captured = entry.capture();
    rows.push(captured);
    setCookbookRows(entry.id, rows);
  } else if (action === 'add') {
    var blank = {};
    for (var c = 0; c < entry.cols.length; c++) blank[entry.cols[c].key] = '';
    rows.push(blank);
    setCookbookRows(entry.id, rows);
  } else if (action === 'clear') {
    if (confirm('Clear all rows for "' + entry.title + '"?')) {
      setCookbookRows(entry.id, []);
    } else return;
  } else if (action === 'seed') {
    if (!entry.suggested) return;
    var seeded = entry.suggested.map(function(s) {
      var blank = {};
      for (var c2 = 0; c2 < entry.cols.length; c2++) blank[entry.cols[c2].key] = '';
      return Object.assign(blank, s);
    });
    setCookbookRows(entry.id, rows.concat(seeded));
  }
  refreshCookbookCard(entry);
  refreshCookbookSummary();
}

/* Lightweight Chart.js plot per entry. Rebuilt every refresh. */
var _cookbookCharts = {};
function drawCookbookPlot(entry, rows) {
  var canvas = document.getElementById('plot-' + entry.id);
  if (!canvas) return;
  var pts = rows
    .filter(function(r){ var x = +r[entry.plot.x], y = +r[entry.plot.y]; return !isNaN(x) && !isNaN(y); })
    .map(function(r){ return { x: +r[entry.plot.x], y: +r[entry.plot.y] }; })
    .sort(function(a,b){ return a.x - b.x; });

  if (_cookbookCharts[entry.id]) _cookbookCharts[entry.id].destroy();
  if (pts.length < 2) { _cookbookCharts[entry.id] = null; return; }

  var datasets = [
    { label:entry.plot.y, data:pts, borderColor:'#4a9aaa', backgroundColor:'#4a9aaa',
      borderWidth:1.5, pointRadius:4, showLine:true, fill:false, tension:0.2 }
  ];

  // Optional power-law fit overlay (used by the FSS entry)
  if (entry.plot.fit && pts.length >= 2) {
    var n = pts.length, sx=0, sy=0, sxy=0, sxx=0;
    for (var i = 0; i < n; i++) {
      var lx = Math.log10(pts[i].x), ly = Math.log10(pts[i].y);
      sx+=lx; sy+=ly; sxy+=lx*ly; sxx+=lx*lx;
    }
    var den = n*sxx - sx*sx;
    if (Math.abs(den) > 1e-15) {
      var slope = (n*sxy - sx*sy) / den;
      var ic = (sy - slope*sx) / n;
      var fitPts = [
        { x: pts[0].x,         y: Math.pow(10, ic + slope * Math.log10(pts[0].x)) },
        { x: pts[n-1].x,       y: Math.pow(10, ic + slope * Math.log10(pts[n-1].x)) }
      ];
      datasets.push({
        label: 'fit (slope=' + slope.toFixed(3) + ')',
        data: fitPts, borderColor: '#f0b429', borderWidth: 2,
        borderDash: [6,3], pointRadius: 0, fill: false, showLine: true
      });
    }
  }

  var opts = {
    responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
    plugins: { legend: { display:true, labels:{color:'#7a9a7a',font:{family:'Space Mono',size:9},boxWidth:12} } },
    scales: {
      x: {
        type: entry.plot.logLog ? 'logarithmic' : 'linear',
        grid:{color:'rgba(60,160,60,0.08)'},
        ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}},
        title:{display:true,text:entry.plot.xLabel,color:'#4a6a4a',font:{family:'Space Mono',size:9}}
      },
      y: {
        type: entry.plot.logLog ? 'logarithmic' : 'linear',
        grid:{color:'rgba(60,160,60,0.08)'},
        ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}},
        title:{display:true,text:entry.plot.yLabel,color:'#4a6a4a',font:{family:'Space Mono',size:9}}
      }
    }
  };
  _cookbookCharts[entry.id] = new Chart(canvas, {
    type: 'scatter', data: { datasets: datasets }, options: opts
  });
}
