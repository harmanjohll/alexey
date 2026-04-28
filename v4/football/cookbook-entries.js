/* cookbook-entries.js — The five research entries.

   Reads:
     - LEAGUE_DATA (global, from league-data.js)
     - window.shots (the user's main pitch shots — for BYOL fallback)
     - window.teamAShots (the user's BYOL Team A shots — primary BYOL source)
     - window.FootballAnalysis (from analysis.js)

   Writes: nothing directly. Cookbook scaffolding handles persistence. */

var FOOTBALL_COOKBOOK = [];

/* Shared rendering helpers ─────────────────────────────────────── */

function _ckMakeCanvas(mount, id, height) {
  mount.innerHTML = '';
  var wrap = document.createElement('div');
  wrap.className = 'chart-wrap';
  if (height) wrap.style.height = height + 'px';
  var c = document.createElement('canvas');
  c.id = id;
  wrap.appendChild(c);
  mount.appendChild(wrap);
  return c;
}

function _ckMakeMixed(mount) {
  mount.innerHTML = '';
  return mount;
}

function _ckTable(rows, cols) {
  var t = document.createElement('table');
  t.className = 'cookbook-result-table';
  var thead = '<thead><tr>';
  for (var i = 0; i < cols.length; i++) thead += '<th>' + cols[i].label + '</th>';
  thead += '</tr></thead>';
  var tbody = '<tbody>';
  for (var r = 0; r < rows.length; r++) {
    tbody += '<tr>';
    for (var c = 0; c < cols.length; c++) {
      var k = cols[c].key;
      var v = rows[r][k];
      var cls = cols[c].cls ? (' class="' + cols[c].cls + '"') : '';
      var style = cols[c].style ? (' style="' + cols[c].style + '"') : '';
      var fmt = cols[c].fmt;
      var disp = (fmt && v !== undefined && v !== null) ? fmt(v, rows[r]) : (v === undefined || v === null ? '' : v);
      tbody += '<td' + cls + style + '>' + disp + '</td>';
    }
    tbody += '</tr>';
  }
  tbody += '</tbody>';
  t.innerHTML = thead + tbody;
  return t;
}

function _ckCleanupChart(id) {
  if (window._ckCharts && window._ckCharts[id]) {
    try { window._ckCharts[id].destroy(); } catch (e) {}
    delete window._ckCharts[id];
  }
}
window._ckCharts = window._ckCharts || {};

function _ckColorMix(hex, alpha) {
  if (!hex) return 'rgba(125,216,125,' + (alpha || 1) + ')';
  var r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (alpha || 1) + ')';
}

/* ── Entry 1: Residual outperformance — single league ─────────── */
FOOTBALL_COOKBOOK.push({
  id: 'residual-single-league',
  title: 'Residual outperformance — single league',
  why: 'Are some teams genuinely better finishers than xG predicts, or are they just lucky? Bootstrap each team\'s residual (goals − xG) under the null model that every shot scores at the team\'s average xG/shot. If the observed Δ falls outside the 95% bootstrap CI, that\'s evidence of real outperformance — though n is small.',
  recipe: 'Pick a league. The five teams sorted by Δ are shown with bootstrap 95% CI bars; teams whose Δ falls outside the CI are flagged ★.',
  controls: [
    { id: 'league', label: 'League', type: 'leagueSelect', 'default': 'Premier League' },
    { id: 'nIter',  label: 'Bootstrap iterations', type: 'select', options: ['1000','5000','10000'], 'default': '5000' }
  ],
  notes: 'Caveat — bootstrap assumes shot independence (no rebounds, no momentum). One season per team. CIs will look wide because each team has only ~500–630 shots.',
  run: function(params) {
    var lname = params.league;
    var lg = LEAGUE_DATA[lname];
    if (!lg) throw new Error('League not found: ' + lname);
    var nIter = parseInt(params.nIter || '5000', 10);
    var seed = 1;
    var rows = [];
    for (var i = 0; i < lg.teams.length; i++) {
      var t = lg.teams[i];
      var br = window.FootballAnalysis.bootstrapResidual(t, { nIter: nIter, seed: seed + i });
      rows.push({
        name: t.name, league: lname, color: lg.color,
        xGFor: t.xGFor, goalsFor: t.goalsFor, shots: t.shots,
        delta: br.delta, ciLow: br.ciLow, ciHigh: br.ciHigh,
        pValue: br.pValue, beyondChance: br.beyondChance
      });
    }
    rows.sort(function(a, b) { return b.delta - a.delta; });
    return { league: lname, color: lg.color, nIter: nIter, rows: rows };
  },
  render: function(result, mount) {
    _ckCleanupChart('chart-residual-single-league');
    mount.innerHTML = '';

    var summary = document.createElement('div');
    summary.className = 'cookbook-summary-line';
    summary.innerHTML = '<b>' + result.league + '</b> — ' + result.rows.length + ' teams · ' +
      result.nIter.toLocaleString() + ' bootstrap iterations';
    mount.appendChild(summary);

    var canvas = _ckMakeCanvas(document.createElement('div'), 'chart-residual-single-league', 280);
    canvas.parentNode.style.height = '280px';
    mount.appendChild(canvas.parentNode);

    var labels = result.rows.map(function(r) { return r.name + (r.beyondChance ? ' ★' : ''); });
    var deltas = result.rows.map(function(r) { return r.delta; });
    var ciErrLow  = result.rows.map(function(r) { return r.delta - r.ciLow; });
    var ciErrHigh = result.rows.map(function(r) { return r.ciHigh - r.delta; });
    var bg = result.rows.map(function(r) {
      return r.beyondChance
        ? _ckColorMix(r.color, 0.85)
        : _ckColorMix(r.color, 0.35);
    });

    window._ckCharts['chart-residual-single-league'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Δ = goals − xG',
          data: deltas,
          backgroundColor: bg,
          borderColor: result.color,
          borderWidth: 1,
          errorBars: { ciLow: ciErrLow, ciHigh: ciErrHigh }  // metadata for our annotation plugin (optional)
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function(c) {
                var r = result.rows[c.dataIndex];
                return 'CI [' + r.ciLow.toFixed(2) + ', ' + r.ciHigh.toFixed(2) + '] · p=' + r.pValue.toFixed(3);
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 } }, title: { display: true, text: 'Δ goals − xG', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } } },
          y: { grid: { color: 'rgba(60,160,60,0.04)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 } } }
        }
      }
    });

    var tab = _ckTable(result.rows, [
      { key: 'name',     label: 'Team' },
      { key: 'goalsFor', label: 'Goals' },
      { key: 'xGFor',    label: 'xG', fmt: function(v){ return v.toFixed(1); } },
      { key: 'delta',    label: 'Δ', fmt: function(v){ return (v >= 0 ? '+' : '') + v.toFixed(2); } },
      { key: 'ciLow',    label: 'CI low',  fmt: function(v){ return v.toFixed(2); } },
      { key: 'ciHigh',   label: 'CI high', fmt: function(v){ return v.toFixed(2); } },
      { key: 'pValue',   label: 'p',       fmt: function(v){ return v.toFixed(3); } },
      { key: 'beyondChance', label: '', fmt: function(v){ return v ? '★' : ''; } }
    ]);
    mount.appendChild(tab);
  }
});
/* ── Entry 2: Cross-league residual ranking ──────────────────── */
FOOTBALL_COOKBOOK.push({
  id: 'residual-cross-league',
  title: 'Cross-league residual ranking',
  why: 'Pool every team across all six leagues. Who outperforms xG most across European football? Bars are coloured by league, so you can spot whether outperformance clusters in any one league.',
  recipe: 'Bootstrap each team\'s 95% Δ CI, then sort all teams by Δ.',
  controls: [
    { id: 'nIter', label: 'Bootstrap iterations', type: 'select', options: ['1000','5000'], 'default': '1000' }
  ],
  notes: 'Caveat — same independence assumption as Entry 1. With ~30 teams, almost no team will be flagged ★ unless its Δ is enormous; this is honest, not a bug.',
  run: function(params) {
    var nIter = parseInt(params.nIter || '1000', 10);
    var rows = window.FootballAnalysis.bootstrapAllTeams(LEAGUE_DATA, { nIter: nIter, seed: 1 });
    return { rows: rows, nIter: nIter };
  },
  render: function(result, mount) {
    _ckCleanupChart('chart-residual-cross-league');
    mount.innerHTML = '';

    var summary = document.createElement('div');
    summary.className = 'cookbook-summary-line';
    var nBeyond = result.rows.filter(function(r){ return r.beyondChance; }).length;
    summary.innerHTML = '<b>' + result.rows.length + ' teams</b> across all leagues · ' +
      result.nIter.toLocaleString() + ' bootstrap iterations · ' +
      nBeyond + ' team' + (nBeyond === 1 ? '' : 's') + ' beyond 95% CI';
    mount.appendChild(summary);

    var canvas = _ckMakeCanvas(document.createElement('div'), 'chart-residual-cross-league', 520);
    canvas.parentNode.style.height = '520px';
    mount.appendChild(canvas.parentNode);

    var labels = result.rows.map(function(r) { return r.name + (r.beyondChance ? ' ★' : ''); });
    var deltas = result.rows.map(function(r) { return r.delta; });
    var bg = result.rows.map(function(r) { return _ckColorMix(r.color, r.beyondChance ? 0.9 : 0.45); });

    window._ckCharts['chart-residual-cross-league'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Δ', data: deltas, backgroundColor: bg, borderWidth: 0 }]
      },
      options: {
        indexAxis: 'y',
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function(c) {
                var r = result.rows[c.dataIndex];
                return r.league + ' · CI [' + r.ciLow.toFixed(2) + ', ' + r.ciHigh.toFixed(2) + ']';
              }
            }
          }
        },
        scales: {
          x: { grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 } }, title: { display: true, text: 'Δ goals − xG', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } } },
          y: { grid: { color: 'rgba(60,160,60,0.04)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 9 } } }
        }
      }
    });

    // Per-league legend strip
    var legendStrip = document.createElement('div');
    legendStrip.className = 'cookbook-legend-strip';
    var leagues = {};
    for (var i = 0; i < result.rows.length; i++) leagues[result.rows[i].league] = result.rows[i].color;
    Object.keys(leagues).forEach(function(L) {
      var dot = document.createElement('span');
      dot.className = 'legend-dot';
      dot.innerHTML = '<i style="background:' + leagues[L] + '"></i>' + L;
      legendStrip.appendChild(dot);
    });
    mount.appendChild(legendStrip);
  }
});

/* ── Entry 3: Style fingerprint — PCA + classifier ───────────── */
FOOTBALL_COOKBOOK.push({
  id: 'style-fingerprint',
  title: 'Style fingerprint — PCA + league classifier',
  why: 'Do leagues have a distinct shot DNA? Build a 6-dim feature vector per team (shots/match, sot%, xG/shot, xGFor/xGAgainst, goals/xG, conversion), reduce to 2D with PCA, and train a Gaussian naive-Bayes classifier with leave-one-out cross-validation. If accuracy beats the 1/L baseline by a meaningful margin, leagues have separable styles.',
  recipe: 'Build feature matrix → standardise → PCA → 2D scatter coloured by league. Then run LOO-CV classifier and report accuracy with bootstrap CI.',
  notes: 'Caveat — n = ~30 means PCA components are coarse and the classifier CI will be wide. Read the gap between accuracy and baseline as evidence of signal, not as a definitive answer.',
  run: function(params) {
    var fm = window.FootballAnalysis.buildFeatureMatrix(LEAGUE_DATA);
    var pca = window.FootballAnalysis.computePCA(fm, { k: 2 });
    var clf = window.FootballAnalysis.naiveBayesLeagueClassifier(fm, { ciIter: 500 });
    var leagues = {};
    for (var i = 0; i < pca.rows.length; i++) {
      var r = pca.rows[i];
      leagues[r.league] = r.color;
    }
    return {
      pca: {
        explainedVariance: pca.explainedVariance,
        rows: pca.rows.map(function(r) { return { name: r.name, league: r.league, color: r.color, score: r.score }; }),
        components: pca.components,
        featureNames: pca.featureNames
      },
      classifier: {
        accuracy: clf.accuracy, ciLow: clf.accuracyCILow, ciHigh: clf.accuracyCIHigh,
        baseline: clf.baseline, perLeagueAccuracy: clf.perLeagueAccuracy,
        confusion: clf.confusion, labels: clf.labels, n: clf.n
      },
      leagues: leagues
    };
  },
  render: function(result, mount) {
    _ckCleanupChart('chart-style-pca');
    mount.innerHTML = '';

    var summary = document.createElement('div');
    summary.className = 'cookbook-summary-line';
    summary.innerHTML =
      '<b>Classifier:</b> ' + (result.classifier.accuracy * 100).toFixed(1) + '% accuracy ' +
      '(95% CI ' + (result.classifier.ciLow * 100).toFixed(0) + '–' + (result.classifier.ciHigh * 100).toFixed(0) + '%) ' +
      'vs ' + (result.classifier.baseline * 100).toFixed(1) + '% baseline · ' +
      'PC1 ' + (result.pca.explainedVariance[0] * 100).toFixed(1) + '% · ' +
      'PC2 ' + (result.pca.explainedVariance[1] * 100).toFixed(1) + '% variance';
    mount.appendChild(summary);

    var canvas = _ckMakeCanvas(document.createElement('div'), 'chart-style-pca', 360);
    canvas.parentNode.style.height = '360px';
    mount.appendChild(canvas.parentNode);

    var leagueDatasets = {};
    Object.keys(result.leagues).forEach(function(L) {
      leagueDatasets[L] = {
        label: L, backgroundColor: result.leagues[L], borderColor: result.leagues[L],
        pointRadius: 5, pointHoverRadius: 7, data: []
      };
    });
    for (var i = 0; i < result.pca.rows.length; i++) {
      var r = result.pca.rows[i];
      leagueDatasets[r.league].data.push({ x: r.score[0], y: r.score[1], _name: r.name });
    }
    window._ckCharts['chart-style-pca'] = new Chart(canvas, {
      type: 'scatter',
      data: { datasets: Object.keys(leagueDatasets).map(function(L) { return leagueDatasets[L]; }) },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { labels: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 }, boxWidth: 12 } },
          tooltip: {
            callbacks: {
              label: function(c) { return c.raw._name + ' (' + c.dataset.label + ')'; }
            }
          }
        },
        scales: {
          x: { title: { display: true, text: 'PC1', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } }, grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 } } },
          y: { title: { display: true, text: 'PC2', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } }, grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 } } }
        }
      }
    });

    // Confusion matrix as a table
    var labels = result.classifier.labels;
    var conf = result.classifier.confusion;
    var confTable = document.createElement('table');
    confTable.className = 'cookbook-result-table cookbook-confusion';
    var head = '<thead><tr><th>actual ↓ / predicted →</th>';
    for (var li = 0; li < labels.length; li++) head += '<th>' + labels[li] + '</th>';
    head += '<th>acc</th></tr></thead>';
    var body = '<tbody>';
    for (var ai = 0; ai < labels.length; ai++) {
      var row = '<tr><td><b>' + labels[ai] + '</b></td>';
      var rowSum = 0;
      for (var pi = 0; pi < labels.length; pi++) rowSum += conf[labels[ai]][labels[pi]];
      for (var pj = 0; pj < labels.length; pj++) {
        var v = conf[labels[ai]][labels[pj]];
        var diag = (ai === pj) ? ' style="background:rgba(60,160,60,0.18);font-weight:600"' : '';
        row += '<td' + diag + '>' + (v || '·') + '</td>';
      }
      var perLA = result.classifier.perLeagueAccuracy[labels[ai]] || 0;
      row += '<td>' + (perLA * 100).toFixed(0) + '%</td></tr>';
      body += row;
    }
    body += '</tbody>';
    confTable.innerHTML = head + body;
    var confTitle = document.createElement('div');
    confTitle.className = 'sl';
    confTitle.style.margin = '12px 0 6px';
    confTitle.textContent = 'CONFUSION MATRIX (LEAVE-ONE-OUT)';
    mount.appendChild(confTitle);
    mount.appendChild(confTable);
  }
});

/* ── Entry 4: Pairwise tournament — 30×30 heatmap + ranking ──── */
FOOTBALL_COOKBOOK.push({
  id: 'tournament-30x30',
  title: 'Pairwise tournament — every team vs every team',
  why: 'If we forced every team in our six-league dataset to play every other team a thousand times, what ranking would emerge? Each match: shot count ~ Poisson(team\'s shots/38), each shot resolves Bernoulli at the team\'s xG/shot. A 30×30 heatmap shows pairwise win-rates; the points-per-opponent column is the resulting ranking.',
  recipe: 'Flatten LEAGUE_DATA → pairwise tournament with N matches per cell → upper triangle is computed, lower triangle mirrors it → ranking is points-per-opponent (3 win, 1 draw).',
  controls: [
    { id: 'nMatches', label: 'Matches per cell', type: 'select', options: ['100','200','500'], 'default': '200' }
  ],
  notes: 'Caveat — uses only season-aggregate shots/xG. Real matches depend on form, injuries, tactics, and the specific opposition. This is "season-average vs season-average," not "this fixture this weekend."',
  run: function(params) {
    var nMatches = parseInt(params.nMatches || '200', 10);
    var teams = window.FootballAnalysis.flattenLeagueTeams(LEAGUE_DATA);
    var T = window.FootballAnalysis.tournamentMatrix(teams, { nMatchesPerCell: nMatches, seed: 7 });
    var ranking = window.FootballAnalysis.rankFromMatrix(T);
    return {
      n: T.n,
      teams: teams.map(function(t) { return { name: t.name, league: t.league, color: t.color }; }),
      // Persist only winRateA — small enough for localStorage at 30×30
      winRateA: T.matrix.map(function(row) { return row.map(function(c) { return c.winRateA; }); }),
      drawRate: T.matrix.map(function(row) { return row.map(function(c) { return c.drawRate; }); }),
      ranking: ranking,
      nMatches: nMatches
    };
  },
  render: function(result, mount) {
    mount.innerHTML = '';

    var summary = document.createElement('div');
    summary.className = 'cookbook-summary-line';
    summary.innerHTML =
      '<b>' + result.n + ' teams</b> · ' + result.nMatches.toLocaleString() + ' matches per pair · ' +
      'top: <b>' + result.ranking[0].name + '</b> (' + (result.ranking[0].avgWinRate * 100).toFixed(1) + '% win-rate) · ' +
      'bottom: <b>' + result.ranking[result.ranking.length - 1].name + '</b> (' +
      (result.ranking[result.ranking.length - 1].avgWinRate * 100).toFixed(1) + '%)';
    mount.appendChild(summary);

    // Heatmap canvas
    var hWrap = document.createElement('div');
    hWrap.className = 'cookbook-heatmap-wrap';
    hWrap.style.position = 'relative';
    var canvas = document.createElement('canvas');
    canvas.id = 'cookbook-tournament-heatmap';
    canvas.width = 600; canvas.height = 600;
    canvas.style.maxWidth = '100%'; canvas.style.height = 'auto';
    hWrap.appendChild(canvas);
    mount.appendChild(hWrap);

    _drawTournamentHeatmap(canvas, result);

    // Ranking table (top 10 + bottom 5)
    var top = result.ranking.slice(0, 10);
    var bottom = result.ranking.slice(-5);
    var rkTitle = document.createElement('div');
    rkTitle.className = 'sl';
    rkTitle.style.margin = '12px 0 6px';
    rkTitle.textContent = 'RANKING (TOP 10 / BOTTOM 5)';
    mount.appendChild(rkTitle);

    var rk = document.createElement('div');
    rk.className = 'cookbook-rk-grid';
    rk.appendChild(_ckTable(
      top.map(function(r, i) { return Object.assign({}, r, { rank: i + 1 }); }),
      [
        { key: 'rank', label: '#' },
        { key: 'name', label: 'Team', fmt: function(_, r){ return '<span style="color:' + r.color + '">' + r.name + '</span>'; } },
        { key: 'league', label: 'League' },
        { key: 'pointsPerOpponent', label: 'PPG', fmt: function(v){ return v.toFixed(2); } },
        { key: 'avgWinRate', label: 'win%', fmt: function(v){ return (v*100).toFixed(1); } }
      ]
    ));
    rk.appendChild(_ckTable(
      bottom.map(function(r, i) { return Object.assign({}, r, { rank: result.ranking.length - bottom.length + i + 1 }); }),
      [
        { key: 'rank', label: '#' },
        { key: 'name', label: 'Team', fmt: function(_, r){ return '<span style="color:' + r.color + '">' + r.name + '</span>'; } },
        { key: 'league', label: 'League' },
        { key: 'pointsPerOpponent', label: 'PPG', fmt: function(v){ return v.toFixed(2); } },
        { key: 'avgWinRate', label: 'win%', fmt: function(v){ return (v*100).toFixed(1); } }
      ]
    ));
    mount.appendChild(rk);
  }
});

/* Heatmap renderer for entry 4. Pure 2D canvas — colour cells by
   winRateA; rows ordered by the ranking, so the diagonal slopes from
   strong to weak. */
function _drawTournamentHeatmap(canvas, result) {
  var ctx = canvas.getContext('2d');
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0f0a';
  ctx.fillRect(0, 0, W, H);

  // Order indices by ranking
  var order = result.ranking.map(function(r) {
    for (var i = 0; i < result.teams.length; i++) if (result.teams[i].name === r.name) return i;
    return 0;
  });
  var n = result.n;
  var pad = 110;
  var cell = Math.floor((W - pad - 8) / n);
  var x0 = pad, y0 = 8;

  // Cells
  for (var i = 0; i < n; i++) {
    for (var j = 0; j < n; j++) {
      var oi = order[i], oj = order[j];
      var w = result.winRateA[oi][oj];
      var c = _winRateColor(i === j ? null : w);
      ctx.fillStyle = c;
      ctx.fillRect(x0 + j * cell, y0 + i * cell, cell - 0.5, cell - 0.5);
    }
  }

  // Row labels (left)
  ctx.font = '9px "Space Mono", monospace';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  for (var ri = 0; ri < n; ri++) {
    var t = result.teams[order[ri]];
    ctx.fillStyle = t.color;
    ctx.fillText(t.name, x0 - 4, y0 + ri * cell + cell / 2);
  }

  // Diagonal label
  ctx.fillStyle = '#4a6a4a';
  ctx.textAlign = 'left';
  ctx.fillText('rows: team A · cols: team B · cell colour = team A win-rate', 8, H - 12);
}

function _winRateColor(w) {
  if (w == null) return 'rgba(40,40,40,0.6)';      // diagonal
  // 0 = red, 0.5 = yellow, 1 = green
  if (w < 0.5) {
    var t = w / 0.5;
    return 'rgba(' + Math.round(220 - t * 100) + ',' + Math.round(60 + t * 160) + ',60,0.92)';
  } else {
    var t2 = (w - 0.5) / 0.5;
    return 'rgba(' + Math.round(120 - t2 * 60) + ',' + Math.round(220 - t2 * 60) + ',60,0.92)';
  }
}

/* ── Entry 5: Your team vs every team (BYOL row) ─────────────── */
FOOTBALL_COOKBOOK.push({
  id: 'byol-vs-everyone',
  title: 'Your team vs every team',
  why: 'Take the shots you placed on Team A in Step 06 (Build Your Own League), extrapolate to a 38-match season, and pit them against every real team in the dataset. Sorted bar chart shows your win-rate vs each opponent.',
  recipe: 'BYOL Team A shots → virtual season-team → pairwise tournament vs each of the ' + (typeof LEAGUE_DATA !== 'undefined' ? Object.keys(LEAGUE_DATA).reduce(function(s,k){return s + LEAGUE_DATA[k].teams.length;}, 0) : '~30') + ' real teams.',
  controls: [
    { id: 'nMatches', label: 'Matches per opponent', type: 'select', options: ['200','500','1000'], 'default': '500' }
  ],
  notes: 'Caveat — virtual team has unknown defence (we approximate xGAgainst as 0.7×xGFor). Treat the result as "could your shot profile beat them on volume," not a literal scoreline prediction.',
  run: function(params) {
    var byolShots = window.teamAShots && window.teamAShots.length ? window.teamAShots : [];
    var fellBack = false;
    if (!byolShots.length && window.shots && window.shots.length) {
      byolShots = window.shots;
      fellBack = true;
    }
    if (!byolShots.length) {
      throw new Error('No shots found. Place shots in Step 03 (or BYOL Team A in Step 06) first, then re-run.');
    }
    var nMatches = parseInt(params.nMatches || '500', 10);
    var virtual = window.FootballAnalysis.byolToVirtualTeam(byolShots, { name: 'Your Team' });
    var teams = window.FootballAnalysis.flattenLeagueTeams(LEAGUE_DATA);
    var rows = [];
    var rng = (function(){ var s = 11 >>> 0;
      return function(){ s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    })();
    for (var i = 0; i < teams.length; i++) {
      var r = window.FootballAnalysis.pairwiseTournament(virtual, teams[i], { nMatches: nMatches, rng: rng });
      rows.push({
        opponent: teams[i].name,
        league: teams[i].league,
        color: teams[i].color,
        winRate: r.winRateA,
        drawRate: r.drawRate,
        lossRate: r.winRateB,
        avgGoalsFor: r.avgGoalsA,
        avgGoalsAgainst: r.avgGoalsB
      });
    }
    rows.sort(function(a, b) { return b.winRate - a.winRate; });
    var summary = {
      totalOpponents: rows.length,
      wins: rows.filter(function(r){ return r.winRate > 0.5; }).length,
      avgWinRate: rows.reduce(function(s, r){ return s + r.winRate; }, 0) / rows.length,
      perMatchShots: virtual.perMatchShots,
      seasonShots: virtual.shots,
      seasonXG: virtual.xGFor,
      nMatches: nMatches
    };
    return { virtual: { name: virtual.name, perMatchShots: virtual.perMatchShots, seasonShots: virtual.shots, seasonXG: virtual.xGFor, source: fellBack ? 'main pitch (Step 03 fallback)' : 'BYOL Team A (Step 06)' }, rows: rows, summary: summary };
  },
  render: function(result, mount) {
    _ckCleanupChart('chart-byol-row');
    mount.innerHTML = '';

    var summary = document.createElement('div');
    summary.className = 'cookbook-summary-line';
    summary.innerHTML =
      '<b>Your virtual team</b> (source: ' + (result.virtual.source || 'BYOL') + ') · ' +
      result.virtual.perMatchShots + ' shots/match · ' +
      result.virtual.seasonShots + ' season shots · ' +
      result.virtual.seasonXG.toFixed(1) + ' season xG · ' +
      'beat <b>' + result.summary.wins + ' / ' + result.summary.totalOpponents + '</b> opponents · ' +
      'avg win-rate <b>' + (result.summary.avgWinRate * 100).toFixed(1) + '%</b>';
    mount.appendChild(summary);

    var canvas = _ckMakeCanvas(document.createElement('div'), 'chart-byol-row', 480);
    canvas.parentNode.style.height = '480px';
    mount.appendChild(canvas.parentNode);

    var labels = result.rows.map(function(r) { return r.opponent; });
    var winRates = result.rows.map(function(r) { return r.winRate * 100; });
    var bg = result.rows.map(function(r) { return _ckColorMix(r.color, r.winRate >= 0.5 ? 0.85 : 0.4); });

    window._ckCharts['chart-byol-row'] = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'win-rate %', data: winRates, backgroundColor: bg, borderWidth: 0 }]
      },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: function(c) {
                var r = result.rows[c.dataIndex];
                return r.league + ' · draw ' + (r.drawRate*100).toFixed(0) + '% · loss ' + (r.lossRate*100).toFixed(0) + '% · avg ' + r.avgGoalsFor.toFixed(2) + '–' + r.avgGoalsAgainst.toFixed(2);
              }
            }
          },
          annotation: undefined
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 10 } }, title: { display: true, text: 'win-rate (%)', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } } },
          y: { grid: { color: 'rgba(60,160,60,0.04)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 9 } } }
        }
      }
    });
  }
});

/* End of entries. */

if (typeof window !== 'undefined') {
  window.FOOTBALL_COOKBOOK = FOOTBALL_COOKBOOK;
}
