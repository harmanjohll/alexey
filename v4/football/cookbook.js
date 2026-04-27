/* cookbook.js — Football Research Bench.

   Wraps the three sections of analysis.js (window.FootballAnalysis) in a
   click-to-run UI:

     Q1  Beyond chance? — bootstrap residual over/underperformance
     Q2  Style fingerprints — PCA + Naive Bayes league classifier
     Q3  All-leagues tournament — pairwise Poisson-Bernoulli simulation

   Each card:
     · explains the question and the method
     · runs the analysis on demand (with a shared seed for reproducibility)
     · renders results (table for Q1/Q3, scatter + confusion for Q2)
     · persists results under exp.football.research.<id> so a reload restores
   The cards optionally consume the user's BYOL Team A as a virtual team.

   Mounts into #researchRoot. Render triggered by renderResearchBench().
*/

var RESEARCH_ENTRIES = [
  {
    id: 'q1-bootstrap',
    title: 'Q1 · Beyond chance? — Bootstrap residuals',
    why: 'Liverpool scored 81 with an xG of 77.2 — a +3.8 overperformance. Is that finishing skill, or just luck? For each team we simulate 10,000 alternate seasons under a null model where each shot independently scores at the team\'s average xG-per-shot. If the real result lies outside the 95% interval of those simulated seasons, the residual is "beyond chance".',
    run: 'runBootstrapAnalysis',
    render: 'renderBootstrapResults',
    persistKey: 'research.bootstrap'
  },
  {
    id: 'q2-style',
    title: 'Q2 · Style fingerprints — PCA + Naive Bayes',
    why: 'Each team is a point in a 6-dimensional feature space (shots/match, sot ratio, xG/shot, xG ratio, finishing, conversion). PCA collapses that to a 2-D map so you can see whether leagues form clusters. A Naive Bayes classifier with leave-one-out cross-validation then tries to predict each team\'s league from those features — if it beats the 1/6 random baseline, league identity carries real information.',
    run: 'runStyleAnalysis',
    render: 'renderStyleResults',
    persistKey: 'research.style'
  },
  {
    id: 'q3-tournament',
    title: 'Q3 · All-leagues tournament — pairwise simulation',
    why: 'Take every team from every league, simulate 200 matches between every pair (~870 cells), then rank by points-per-opponent (3 for a win, 1 for a draw). Optionally add your Build-Your-Own-League Team A as a virtual entrant — see how your shot profile, scaled to a 38-match season, would rank against the actual best teams in Europe.',
    run: 'runTournamentAnalysis',
    render: 'renderTournamentResults',
    persistKey: 'research.tournament'
  }
];

var _researchSeed = 1;
var _researchCharts = {};

/* ── Public render entry point ───────────────────────────── */
function renderResearchBench() {
  var root = document.getElementById('researchRoot');
  if (!root) return;
  root.innerHTML = '';
  for (var i = 0; i < RESEARCH_ENTRIES.length; i++) {
    root.appendChild(buildResearchCard(RESEARCH_ENTRIES[i]));
  }
  refreshResearchSummary();
}

function refreshResearchSummary() {
  var stats = document.getElementById('researchSummaryStats');
  if (!stats) return;
  var done = 0;
  for (var i = 0; i < RESEARCH_ENTRIES.length; i++) {
    if (Store.get(EXP_ID, RESEARCH_ENTRIES[i].persistKey)) done++;
  }
  stats.textContent = done === 0
    ? RESEARCH_ENTRIES.length + ' investigations · click to expand'
    : done + '/' + RESEARCH_ENTRIES.length + ' investigations run · click to expand';
}

function buildResearchCard(entry) {
  var card = document.createElement('div');
  card.className = 'dash-card cookbook-card';
  card.setAttribute('data-research-id', entry.id);

  var hdr = document.createElement('div');
  hdr.className = 'card-hdr';
  hdr.innerHTML =
    '<span class="card-label" style="font-family:var(--font-mono);font-size:13px;color:var(--accent-light);font-weight:500">' + entry.title + '</span>' +
    '<button class="sm" data-action="run">Run analysis &rarr;</button>' +
    '<button class="sm danger" data-action="clear">Clear</button>';
  card.appendChild(hdr);

  var why = document.createElement('div');
  why.className = 'cookbook-why';
  why.textContent = entry.why;
  card.appendChild(why);

  var resultWrap = document.createElement('div');
  resultWrap.className = 'research-result';
  resultWrap.id = 'research-result-' + entry.id;
  resultWrap.innerHTML = '<div class="cookbook-recipe" style="margin-bottom:0">No results yet — click <b>Run analysis</b> above.</div>';
  card.appendChild(resultWrap);

  hdr.querySelector('button[data-action="run"]').addEventListener('click', function() {
    handleResearchRun(entry);
  });
  hdr.querySelector('button[data-action="clear"]').addEventListener('click', function() {
    Store.remove(EXP_ID, entry.persistKey);
    resultWrap.innerHTML = '<div class="cookbook-recipe" style="margin-bottom:0">No results yet — click <b>Run analysis</b> above.</div>';
    if (_researchCharts[entry.id]) { _researchCharts[entry.id].destroy(); _researchCharts[entry.id] = null; }
    refreshResearchSummary();
  });

  // Restore prior result if present
  var saved = Store.get(EXP_ID, entry.persistKey);
  if (saved) {
    setTimeout(function() { window[entry.render](saved, resultWrap); }, 0);
  }

  return card;
}

function handleResearchRun(entry) {
  var resultWrap = document.getElementById('research-result-' + entry.id);
  if (!resultWrap) return;
  resultWrap.innerHTML = '<div class="cookbook-recipe" style="margin-bottom:0"><span class="pulse"></span> Running analysis…</div>';

  // Defer so the spinner paints
  setTimeout(function() {
    if (!window.FootballAnalysis) {
      resultWrap.innerHTML = '<div class="cookbook-recipe" style="margin-bottom:0;border-left-color:var(--danger);color:var(--danger)">analysis.js failed to load</div>';
      return;
    }
    try {
      var result = window[entry.run]();
      Store.set(EXP_ID, entry.persistKey, result);
      window[entry.render](result, resultWrap);
      refreshResearchSummary();
    } catch (e) {
      resultWrap.innerHTML = '<div class="cookbook-recipe" style="margin-bottom:0;border-left-color:var(--danger);color:var(--danger)">Error: ' + e.message + '</div>';
    }
  }, 30);
}

/* ── Q1: Bootstrap ──────────────────────────────────────── */

function runBootstrapAnalysis() {
  var rows = window.FootballAnalysis.bootstrapAllTeams(LEAGUE_DATA, { nIter: 4000, seed: _researchSeed });
  return { rows: rows, ranAt: new Date().toISOString(), seed: _researchSeed };
}

function renderBootstrapResults(result, mount) {
  var rows = result.rows || [];
  if (!rows.length) { mount.innerHTML = '<div class="cookbook-recipe">No teams in dataset.</div>'; return; }
  var top = rows.slice(0, 8);
  var bottom = rows.slice(-8).reverse();
  var beyondCount = 0;
  for (var i = 0; i < rows.length; i++) if (rows[i].beyondChance) beyondCount++;

  var html = '';
  html += '<div class="cookbook-derived">' +
    '<b>' + beyondCount + ' / ' + rows.length + '</b> teams have a residual outside their 95% null interval. ' +
    'The rest are statistically indistinguishable from chance. Seed: ' + result.seed + '.</div>';

  function renderTbl(label, list) {
    var t = '<div class="sl" style="margin:10px 0 4px">' + label + '</div>';
    t += '<div class="cookbook-table"><table class="events-table"><thead><tr>' +
      '<th>Team</th><th>League</th><th style="text-align:right">xG</th>' +
      '<th style="text-align:right">Goals</th><th style="text-align:right">&Delta;</th>' +
      '<th style="text-align:right">95% CI</th><th style="text-align:right">p</th><th>flag</th>' +
      '</tr></thead><tbody>';
    for (var k = 0; k < list.length; k++) {
      var r = list[k];
      var sign = r.delta >= 0 ? '+' : '';
      var flag = r.beyondChance ? '<span style="color:var(--accent-light)">beyond</span>' : '<span style="color:var(--text-tertiary)">chance</span>';
      t += '<tr><td style="color:' + r.color + '">' + r.name + '</td>' +
        '<td style="color:var(--text-secondary)">' + r.league + '</td>' +
        '<td style="text-align:right">' + r.xGFor.toFixed(1) + '</td>' +
        '<td style="text-align:right">' + r.goalsFor + '</td>' +
        '<td style="text-align:right;color:' + (r.delta >= 0 ? 'var(--accent-light)' : 'var(--danger)') + '">' + sign + r.delta.toFixed(1) + '</td>' +
        '<td style="text-align:right;color:var(--text-tertiary)">[' + r.ciLow.toFixed(1) + ', ' + r.ciHigh.toFixed(1) + ']</td>' +
        '<td style="text-align:right">' + r.pValue.toFixed(3) + '</td>' +
        '<td>' + flag + '</td></tr>';
    }
    t += '</tbody></table></div>';
    return t;
  }
  html += renderTbl('TOP OVERPERFORMERS (goals &minus; xG)', top);
  html += renderTbl('TOP UNDERPERFORMERS', bottom);
  mount.innerHTML = html;
}

/* ── Q2: PCA + Naive Bayes ──────────────────────────────── */

function runStyleAnalysis() {
  var matrix = window.FootballAnalysis.buildFeatureMatrix(LEAGUE_DATA);
  var pca = window.FootballAnalysis.computePCA(matrix, { k: 2 });
  var nb  = window.FootballAnalysis.naiveBayesLeagueClassifier(matrix, { ciIter: 800 });
  return {
    points: pca.rows.map(function(r) {
      return { name: r.name, league: r.league, color: r.color, x: r.score[0], y: r.score[1] };
    }),
    explained: pca.explainedVariance,
    components: pca.components,
    featureNames: pca.featureNames,
    nb: {
      accuracy: nb.accuracy, ciLow: nb.accuracyCILow, ciHigh: nb.accuracyCIHigh,
      baseline: nb.baseline, n: nb.n, labels: nb.labels,
      perLeagueAccuracy: nb.perLeagueAccuracy, confusion: nb.confusion
    },
    ranAt: new Date().toISOString()
  };
}

function renderStyleResults(result, mount) {
  var pts = result.points || [];
  if (!pts.length) { mount.innerHTML = '<div class="cookbook-recipe">No data.</div>'; return; }
  var ev = result.explained || [0, 0];
  var nb = result.nb || {};
  var beats = (nb.ciLow || 0) > (nb.baseline || 0);

  // Group points by league for Chart.js datasets
  var byLeague = {};
  for (var i = 0; i < pts.length; i++) {
    var p = pts[i];
    if (!byLeague[p.league]) byLeague[p.league] = { color: p.color, data: [] };
    byLeague[p.league].data.push({ x: p.x, y: p.y, label: p.name });
  }
  var datasets = Object.keys(byLeague).map(function(L) {
    return {
      label: L,
      data: byLeague[L].data,
      backgroundColor: byLeague[L].color + 'cc',
      borderColor: byLeague[L].color,
      borderWidth: 1,
      pointRadius: 5,
      pointHoverRadius: 7
    };
  });

  // Loading components text
  var compLines = '';
  if (result.components && result.components.length >= 2 && result.featureNames) {
    var c1 = result.components[0], c2 = result.components[1], names = result.featureNames;
    var topPC1 = _topLoadings(c1, names, 2);
    var topPC2 = _topLoadings(c2, names, 2);
    compLines = 'PC1 ≈ ' + topPC1 + '   ·   PC2 ≈ ' + topPC2;
  }

  var html = '';
  html += '<div class="cookbook-derived">' +
    '<b>NB classifier accuracy:</b> ' + (nb.accuracy * 100).toFixed(1) + '% ' +
    '(95% CI ' + (nb.ciLow * 100).toFixed(1) + '–' + (nb.ciHigh * 100).toFixed(1) + '%) ' +
    '· random baseline = ' + (nb.baseline * 100).toFixed(1) + '% ' +
    '· n = ' + nb.n + ' teams · ' +
    (beats ? '<span style="color:var(--accent-light)">beats baseline</span>' : '<span style="color:var(--danger)">does not beat baseline</span>') +
    '</div>';

  html += '<div class="sl" style="margin:10px 0 4px">PCA — TEAMS IN STYLE-SPACE (' +
    (ev[0] * 100).toFixed(0) + '% + ' + (ev[1] * 100).toFixed(0) + '% variance)</div>';
  html += '<div class="research-plot" style="height:280px;background:var(--bg-deep);border:1px solid var(--border);border-radius:2px;padding:10px"><canvas id="pcaChart_q2"></canvas></div>';
  if (compLines) html += '<div class="poisson-note">' + compLines + '</div>';

  // Confusion + per-league
  if (nb.labels && nb.confusion) {
    html += '<div class="sl" style="margin:14px 0 4px">CONFUSION MATRIX (rows = actual league · columns = NB prediction)</div>';
    html += '<div class="cookbook-table"><table class="events-table"><thead><tr><th></th>';
    for (var c = 0; c < nb.labels.length; c++) html += '<th style="text-align:right">' + _shortLeague(nb.labels[c]) + '</th>';
    html += '<th style="text-align:right">acc</th></tr></thead><tbody>';
    for (var r = 0; r < nb.labels.length; r++) {
      var L = nb.labels[r];
      html += '<tr><td style="color:var(--accent-light)">' + L + '</td>';
      for (var c2 = 0; c2 < nb.labels.length; c2++) {
        var v = nb.confusion[L][nb.labels[c2]] || 0;
        var diag = c2 === r;
        html += '<td style="text-align:right;color:' + (diag && v > 0 ? 'var(--accent-light)' : 'var(--text-secondary)') + '">' + v + '</td>';
      }
      var acc = nb.perLeagueAccuracy && nb.perLeagueAccuracy[L] || 0;
      html += '<td style="text-align:right;color:var(--text-tertiary)">' + (acc * 100).toFixed(0) + '%</td></tr>';
    }
    html += '</tbody></table></div>';
  }

  mount.innerHTML = html;

  // Build chart after innerHTML render
  setTimeout(function() {
    var canvas = document.getElementById('pcaChart_q2');
    if (!canvas || typeof Chart === 'undefined') return;
    if (_researchCharts['q2-style']) _researchCharts['q2-style'].destroy();
    _researchCharts['q2-style'] = new Chart(canvas, {
      type: 'scatter',
      data: { datasets: datasets },
      options: {
        responsive: true, maintainAspectRatio: false, animation: { duration: 0 },
        plugins: {
          legend: { display: true, labels: { color: '#7a9a7a', font: { family: 'Space Mono', size: 9 }, boxWidth: 12 } },
          tooltip: {
            callbacks: { label: function(ctx) { return ctx.raw.label + '  (' + ctx.raw.x.toFixed(2) + ', ' + ctx.raw.y.toFixed(2) + ')'; } },
            backgroundColor: '#111a11', borderColor: 'rgba(60,160,60,0.3)', borderWidth: 1,
            titleColor: '#e8f0e8', bodyColor: '#7a9a7a',
            titleFont: { family: 'Space Mono', size: 10 }, bodyFont: { family: 'Space Mono', size: 10 }
          }
        },
        scales: {
          x: { title: { display: true, text: 'PC1', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } },
               grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 9 } } },
          y: { title: { display: true, text: 'PC2', color: '#4a6a4a', font: { family: 'Space Mono', size: 10 } },
               grid: { color: 'rgba(60,160,60,0.08)' }, ticks: { color: '#7a9a7a', font: { family: 'Space Mono', size: 9 } } }
        }
      }
    });
  }, 0);
}

function _topLoadings(component, names, k) {
  var ranked = component.map(function(v, i) { return { name: names[i], w: v, abs: Math.abs(v) }; })
    .sort(function(a, b) { return b.abs - a.abs; }).slice(0, k);
  return ranked.map(function(r) { return (r.w >= 0 ? '+' : '−') + r.name; }).join(' & ');
}

function _shortLeague(name) {
  if (name === 'Premier League') return 'EPL';
  if (name === 'La Liga') return 'Liga';
  if (name === 'Bundesliga') return 'BuLi';
  if (name === 'Serie A') return 'SerA';
  if (name === 'Ligue 1') return 'L1';
  if (name === 'Championship') return 'Cha';
  return name.slice(0, 4);
}

/* ── Q3: Tournament ─────────────────────────────────────── */

function runTournamentAnalysis() {
  var teams = window.FootballAnalysis.flattenLeagueTeams(LEAGUE_DATA);
  var includeBYOL = document.getElementById('tournIncludeBYOL') && document.getElementById('tournIncludeBYOL').checked;
  if (includeBYOL && typeof teamAShots !== 'undefined' && teamAShots.length > 0) {
    var virt = window.FootballAnalysis.byolToVirtualTeam(teamAShots, { name: 'Your Team A', league: 'Custom', color: '#7dd87d' });
    if (virt) teams.push(virt);
  }
  var matObj = window.FootballAnalysis.tournamentMatrix(teams, { nMatchesPerCell: 200, seed: _researchSeed });
  var ranking = window.FootballAnalysis.rankFromMatrix(matObj);
  return { ranking: ranking, n: teams.length, includesBYOL: !!includeBYOL, ranAt: new Date().toISOString(), seed: _researchSeed };
}

function renderTournamentResults(result, mount) {
  var ranking = result.ranking || [];
  if (!ranking.length) { mount.innerHTML = '<div class="cookbook-recipe">No teams in dataset.</div>'; return; }

  var html = '';
  html += '<div class="cookbook-derived">' +
    'Simulated <b>200 matches</b> between every pair of <b>' + result.n + '</b> teams (' +
    Math.round(result.n * (result.n - 1) / 2) + ' unique fixtures · seed ' + result.seed + ').' +
    (result.includesBYOL ? ' <span style="color:var(--accent-light)">Your Team A included as a virtual entrant.</span>' : '') +
    '</div>';

  html += '<div class="sl" style="margin:10px 0 4px">RANKING (sorted by avg points-per-opponent · 3 win / 1 draw)</div>';
  html += '<div class="cookbook-table"><table class="events-table"><thead><tr>' +
    '<th>#</th><th>Team</th><th>League</th>' +
    '<th style="text-align:right">Win %</th><th style="text-align:right">Draw %</th>' +
    '<th style="text-align:right">Loss %</th><th style="text-align:right">PPM</th>' +
    '</tr></thead><tbody>';
  for (var i = 0; i < ranking.length; i++) {
    var t = ranking[i];
    var medal = i < 3 ? ['&#129351;', '&#129352;', '&#129353;'][i] : (i + 1);
    var virt = t.league === 'Custom';
    html += '<tr' + (virt ? ' style="background:var(--accent-subtle)"' : '') + '>' +
      '<td style="color:var(--accent-light)">' + medal + '</td>' +
      '<td' + (virt ? ' style="color:var(--accent-light);font-weight:500"' : '') + '>' + t.name + '</td>' +
      '<td style="color:' + (t.color || 'var(--text-secondary)') + '">' + t.league + '</td>' +
      '<td style="text-align:right">' + (t.avgWinRate * 100).toFixed(1) + '%</td>' +
      '<td style="text-align:right;color:var(--text-tertiary)">' + (t.avgDrawRate * 100).toFixed(1) + '%</td>' +
      '<td style="text-align:right;color:var(--text-tertiary)">' + (t.avgLossRate * 100).toFixed(1) + '%</td>' +
      '<td style="text-align:right;color:var(--accent-light);font-weight:500">' + t.pointsPerOpponent.toFixed(2) + '</td>' +
      '</tr>';
  }
  html += '</tbody></table></div>';
  mount.innerHTML = html;
}

/* ── Seed control ───────────────────────────────────────── */
function setResearchSeed(v) {
  var n = parseInt(v, 10);
  if (!isNaN(n) && n > 0) _researchSeed = n;
}
