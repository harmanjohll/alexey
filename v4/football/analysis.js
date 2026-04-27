/* analysis.js — Football research analysis layer.

   Pure-data compute functions consumed by cookbook.js and report.js.
   No simulations, no DOM access — just deterministic numerics over
   LEAGUE_DATA plus optionally the user's Build-Your-Own-League shots.

   All functions are deterministic except where they explicitly take an
   `rng` option for bootstrap / Monte Carlo. In those cases passing a
   seeded RNG makes the results reproducible. */

/* ── Utilities: RNG, Poisson, Bernoulli ─────────────────────────── */

/* Simple Mulberry32 PRNG. Seedable; deterministic across calls. */
function _makeRNG(seed) {
  var s = (seed >>> 0) || (Date.now() >>> 0);
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    var t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function _poissonSample(lambda, rng) {
  // Knuth's method; fine for λ up to ~30.
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Normal approximation for large λ
    var z = _normalSample(rng);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }
  var L = Math.exp(-lambda);
  var k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

function _normalSample(rng) {
  // Box-Muller
  var u1 = Math.max(rng(), 1e-12);
  var u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/* ── Q1: Bootstrap residual outperformance ────────────────────────
   For team {xGFor, goalsFor, shots}:
     observed Δ = goalsFor − xGFor
     null hypothesis: each shot independently scores at avg-xG/shot
     bootstrap distribution: simulate N seasons, record Δ_null each time
     beyondChance = |observed Δ| ≥ 95th percentile of |Δ_null|
     p-value = fraction of |Δ_null| ≥ |observed Δ|. */
function bootstrapResidual(team, opts) {
  opts = opts || {};
  var nIter = opts.nIter || 10000;
  var rng = opts.rng || _makeRNG(opts.seed);
  if (!team || !team.shots || team.shots <= 0) {
    return { delta: 0, ciLow: 0, ciHigh: 0, pValue: 1, beyondChance: false, n: 0 };
  }
  var pPerShot = team.xGFor / team.shots;
  var observed = team.goalsFor - team.xGFor;
  var samples = new Array(nIter);
  for (var i = 0; i < nIter; i++) {
    var goals = 0;
    for (var s = 0; s < team.shots; s++) {
      if (rng() < pPerShot) goals++;
    }
    samples[i] = goals - team.xGFor;
  }
  samples.sort(function(a, b) { return a - b; });
  var ciLow  = samples[Math.floor(nIter * 0.025)];
  var ciHigh = samples[Math.floor(nIter * 0.975)];
  // Two-sided p-value: fraction of |samples| >= |observed|
  var absObs = Math.abs(observed);
  var hits = 0;
  for (var k = 0; k < nIter; k++) if (Math.abs(samples[k]) >= absObs) hits++;
  var pValue = hits / nIter;
  return {
    delta: observed,
    ciLow: ciLow,
    ciHigh: ciHigh,
    pValue: pValue,
    beyondChance: observed > ciHigh || observed < ciLow,
    n: team.shots
  };
}

/* Run bootstrap on every team across every league. Returns sorted array
   (descending by Δ) of {name, league, color, ...bootstrap fields}. */
function bootstrapAllTeams(leagueData, opts) {
  opts = opts || {};
  var out = [];
  Object.keys(leagueData).forEach(function (lname) {
    var lg = leagueData[lname];
    if (!lg || !lg.teams) return;
    for (var i = 0; i < lg.teams.length; i++) {
      var t = lg.teams[i];
      var res = bootstrapResidual(t, opts);
      out.push({
        name: t.name, league: lname, color: lg.color,
        xGFor: t.xGFor, goalsFor: t.goalsFor, shots: t.shots,
        delta: res.delta, ciLow: res.ciLow, ciHigh: res.ciHigh,
        pValue: res.pValue, beyondChance: res.beyondChance
      });
    }
  });
  out.sort(function(a, b) { return b.delta - a.delta; });
  return out;
}

/* ── Q2: Style fingerprints (PCA + Naive Bayes) ───────────────────── */

/* Build per-team feature matrix.
   Features (6): shotsPerMatch, sot/shots, xGFor/shots, xGFor/xGAgainst,
                 goalsFor/xGFor, goalsFor/shots (conversion). */
function buildFeatureMatrix(leagueData, opts) {
  opts = opts || {};
  var matchesPerSeason = opts.matchesPerSeason || 38;
  var rows = [];
  Object.keys(leagueData).forEach(function (lname) {
    var lg = leagueData[lname];
    if (!lg || !lg.teams) return;
    for (var i = 0; i < lg.teams.length; i++) {
      var t = lg.teams[i];
      var f = [
        t.shots / matchesPerSeason,
        t.shotsOnTarget / Math.max(1, t.shots),
        t.xGFor / Math.max(1, t.shots),
        t.xGFor / Math.max(1, t.xGAgainst),
        t.goalsFor / Math.max(0.1, t.xGFor),
        t.goalsFor / Math.max(1, t.shots)
      ];
      rows.push({ name: t.name, league: lname, color: lg.color, features: f });
    }
  });
  return {
    rows: rows,
    featureNames: ['shots/match', 'sot/shots', 'xGFor/shots', 'xGFor/xGAgst', 'goals/xGFor', 'conv'],
    n: rows.length, d: 6
  };
}

/* Standardise features: subtract mean, divide by std-dev per column.
   Returns new matrix object with .rows[i].featuresStd. */
function _standardise(matrix) {
  var rows = matrix.rows, d = matrix.d, n = rows.length;
  var means = new Array(d).fill(0), vars = new Array(d).fill(0);
  for (var j = 0; j < d; j++) {
    for (var i = 0; i < n; i++) means[j] += rows[i].features[j];
    means[j] /= n;
  }
  for (var j2 = 0; j2 < d; j2++) {
    for (var i2 = 0; i2 < n; i2++) {
      var d_ = rows[i2].features[j2] - means[j2];
      vars[j2] += d_ * d_;
    }
    vars[j2] = Math.max(1e-12, vars[j2] / Math.max(1, n - 1));
  }
  var stds = vars.map(Math.sqrt);
  var out = rows.map(function(r) {
    return Object.assign({}, r, {
      featuresStd: r.features.map(function(v, j) { return (v - means[j]) / stds[j]; })
    });
  });
  return { rows: out, featureNames: matrix.featureNames, n: n, d: d, means: means, stds: stds };
}

/* Power iteration for top-K principal components. Returns
   {scores: [[pc1, pc2, ...], ...], components: [[w1, ...], ...],
    explainedVariance: [...]}. */
function computePCA(matrix, opts) {
  opts = opts || {};
  var k = opts.k || 2;
  var std = _standardise(matrix);
  var n = std.n, d = std.d;
  // Covariance matrix d×d
  var X = std.rows.map(function(r) { return r.featuresStd; });
  var C = [];
  for (var i = 0; i < d; i++) {
    C[i] = new Array(d).fill(0);
    for (var j = 0; j < d; j++) {
      var s = 0;
      for (var r = 0; r < n; r++) s += X[r][i] * X[r][j];
      C[i][j] = s / Math.max(1, n - 1);
    }
  }
  var components = [];
  var eigenvalues = [];
  var Cwork = C.map(function(row) { return row.slice(); });
  for (var pc = 0; pc < k; pc++) {
    // Power iteration
    var v = new Array(d).fill(0).map(function() { return Math.random() - 0.5; });
    _normalize(v);
    var lambda = 0;
    for (var iter = 0; iter < 200; iter++) {
      var nv = _matVec(Cwork, v);
      _normalize(nv);
      // Convergence check
      var dot = 0;
      for (var ii = 0; ii < d; ii++) dot += nv[ii] * v[ii];
      v = nv;
      if (Math.abs(Math.abs(dot) - 1) < 1e-8) break;
    }
    var Cv = _matVec(Cwork, v);
    lambda = 0;
    for (var ll = 0; ll < d; ll++) lambda += v[ll] * Cv[ll];
    components.push(v.slice());
    eigenvalues.push(lambda);
    // Deflate: Cwork = Cwork - lambda * v v^T
    for (var ai = 0; ai < d; ai++) {
      for (var aj = 0; aj < d; aj++) {
        Cwork[ai][aj] -= lambda * v[ai] * v[aj];
      }
    }
  }
  // Project rows onto components
  var scores = std.rows.map(function(r) {
    return components.map(function(comp) {
      var dotp = 0;
      for (var jj = 0; jj < d; jj++) dotp += r.featuresStd[jj] * comp[jj];
      return dotp;
    });
  });
  var totalVar = 0;
  for (var di = 0; di < d; di++) totalVar += C[di][di];
  var explained = eigenvalues.map(function(ev) { return totalVar > 0 ? ev / totalVar : 0; });
  return {
    rows: std.rows.map(function(r, idx) { return Object.assign({}, r, { score: scores[idx] }); }),
    components: components,
    eigenvalues: eigenvalues,
    explainedVariance: explained,
    featureNames: std.featureNames
  };
}

function _normalize(v) {
  var mag = 0;
  for (var i = 0; i < v.length; i++) mag += v[i] * v[i];
  mag = Math.sqrt(mag) || 1;
  for (var j = 0; j < v.length; j++) v[j] /= mag;
}
function _matVec(M, v) {
  var d = v.length;
  var out = new Array(d).fill(0);
  for (var i = 0; i < d; i++) {
    for (var j = 0; j < d; j++) out[i] += M[i][j] * v[j];
  }
  return out;
}

/* Gaussian Naive Bayes classifier with leave-one-out cross-validation.
   Predicts the league of each team from the standardised features. */
function naiveBayesLeagueClassifier(matrix, opts) {
  opts = opts || {};
  var std = _standardise(matrix);
  var rows = std.rows;
  var n = rows.length, d = std.d;
  var allLabels = {};
  rows.forEach(function(r){ allLabels[r.league] = true; });
  var labels = Object.keys(allLabels);

  function fit(trainRows) {
    var stats = {};
    labels.forEach(function(L){ stats[L] = { mean: new Array(d).fill(0), variance: new Array(d).fill(0), count: 0 }; });
    trainRows.forEach(function(r) {
      var s = stats[r.league]; s.count++;
      for (var j = 0; j < d; j++) s.mean[j] += r.featuresStd[j];
    });
    labels.forEach(function(L) {
      var s = stats[L];
      if (s.count > 0) for (var j = 0; j < d; j++) s.mean[j] /= s.count;
    });
    trainRows.forEach(function(r) {
      var s = stats[r.league];
      for (var j = 0; j < d; j++) {
        var diff = r.featuresStd[j] - s.mean[j];
        s.variance[j] += diff * diff;
      }
    });
    labels.forEach(function(L) {
      var s = stats[L];
      var df = Math.max(1, s.count - 1);
      for (var j = 0; j < d; j++) {
        s.variance[j] = Math.max(0.05, s.variance[j] / df); // floor for stability
      }
    });
    return stats;
  }

  function predict(stats, x) {
    var bestL = null, bestLogP = -Infinity;
    var perClass = {};
    labels.forEach(function(L) {
      var s = stats[L];
      if (s.count === 0) { perClass[L] = -Infinity; return; }
      var logP = Math.log(s.count / n); // prior
      for (var j = 0; j < d; j++) {
        var v = s.variance[j];
        var diff = x[j] - s.mean[j];
        logP += -0.5 * Math.log(2 * Math.PI * v) - 0.5 * diff * diff / v;
      }
      perClass[L] = logP;
      if (logP > bestLogP) { bestLogP = logP; bestL = L; }
    });
    return { label: bestL, logP: bestLogP, perClass: perClass };
  }

  // Leave-one-out
  var predictions = [];
  var correct = 0;
  var perLeagueCount = {}, perLeagueCorrect = {};
  var confusion = {};
  labels.forEach(function(L){ confusion[L] = {}; labels.forEach(function(M){ confusion[L][M] = 0; }); });
  for (var i = 0; i < n; i++) {
    var hold = rows[i];
    var train = rows.filter(function(_, idx){ return idx !== i; });
    var stats = fit(train);
    var pred = predict(stats, hold.featuresStd);
    var ok = pred.label === hold.league;
    if (ok) correct++;
    perLeagueCount[hold.league] = (perLeagueCount[hold.league] || 0) + 1;
    if (ok) perLeagueCorrect[hold.league] = (perLeagueCorrect[hold.league] || 0) + 1;
    confusion[hold.league][pred.label]++;
    predictions.push({ name: hold.name, league: hold.league, predicted: pred.label, correct: ok });
  }
  var accuracy = n > 0 ? correct / n : 0;
  // Bootstrap-style accuracy CI: sample with replacement, recompute LOO accuracy
  var accuracyCI = _bootstrapAccuracyCI(predictions, opts.ciIter || 1000, opts.rng);
  var perLeagueAcc = {};
  labels.forEach(function(L) {
    perLeagueAcc[L] = perLeagueCount[L] > 0 ? (perLeagueCorrect[L] || 0) / perLeagueCount[L] : 0;
  });
  return {
    predictions: predictions,
    accuracy: accuracy,
    accuracyCILow: accuracyCI[0],
    accuracyCIHigh: accuracyCI[1],
    perLeagueAccuracy: perLeagueAcc,
    confusion: confusion,
    labels: labels,
    n: n,
    baseline: 1 / labels.length
  };
}

function _bootstrapAccuracyCI(predictions, nIter, rng) {
  rng = rng || _makeRNG(42);
  var n = predictions.length;
  var accs = [];
  for (var k = 0; k < nIter; k++) {
    var c = 0;
    for (var i = 0; i < n; i++) {
      var idx = Math.floor(rng() * n);
      if (predictions[idx].correct) c++;
    }
    accs.push(c / n);
  }
  accs.sort(function(a, b){ return a - b; });
  return [accs[Math.floor(nIter * 0.025)], accs[Math.floor(nIter * 0.975)]];
}

/* ── Q3: Pairwise tournament ─────────────────────────────────────── */

/* Single matchup. Returns {winA, draws, winB, avgGoalsA, avgGoalsB, scores}. */
function pairwiseTournament(teamA, teamB, opts) {
  opts = opts || {};
  var nMatches = opts.nMatches || 1000;
  var matchesPerSeason = opts.matchesPerSeason || 38;
  var rng = opts.rng || _makeRNG(opts.seed);
  var lambdaA = teamA.shots / matchesPerSeason;
  var lambdaB = teamB.shots / matchesPerSeason;
  var pA = teamA.xGFor / Math.max(1, teamA.shots);
  var pB = teamB.xGFor / Math.max(1, teamB.shots);
  var winA = 0, draw = 0, winB = 0;
  var sumA = 0, sumB = 0;
  var scoreCounts = {};  // "a-b" → count
  for (var m = 0; m < nMatches; m++) {
    var sA = _poissonSample(lambdaA, rng);
    var sB = _poissonSample(lambdaB, rng);
    var gA = 0, gB = 0;
    for (var i = 0; i < sA; i++) if (rng() < pA) gA++;
    for (var j = 0; j < sB; j++) if (rng() < pB) gB++;
    sumA += gA; sumB += gB;
    if (gA > gB) winA++;
    else if (gA < gB) winB++;
    else draw++;
    var key = gA + '-' + gB;
    scoreCounts[key] = (scoreCounts[key] || 0) + 1;
  }
  return {
    winA: winA, draws: draw, winB: winB, n: nMatches,
    avgGoalsA: sumA / nMatches, avgGoalsB: sumB / nMatches,
    winRateA: winA / nMatches, drawRate: draw / nMatches, winRateB: winB / nMatches,
    scores: scoreCounts
  };
}

/* Compute the full N×N tournament matrix. Uses fewer matches per cell
   (default 200) so runs feel responsive even with 30 teams (~870 cells). */
function tournamentMatrix(teams, opts) {
  opts = opts || {};
  var nMatches = opts.nMatchesPerCell || 200;
  var rng = opts.rng || _makeRNG(opts.seed || 1);
  var n = teams.length;
  var mat = [];
  for (var i = 0; i < n; i++) {
    mat[i] = new Array(n);
    for (var j = 0; j < n; j++) {
      if (i === j) {
        mat[i][j] = { winA: 0, draws: nMatches, winB: 0, winRateA: 0, drawRate: 1, winRateB: 0 };
      } else if (j < i) {
        // mirror previous result
        var prev = mat[j][i];
        mat[i][j] = {
          winA: prev.winB, draws: prev.draws, winB: prev.winA,
          winRateA: prev.winRateB, drawRate: prev.drawRate, winRateB: prev.winRateA
        };
      } else {
        mat[i][j] = pairwiseTournament(teams[i], teams[j], { nMatches: nMatches, rng: rng });
      }
    }
  }
  return { matrix: mat, teams: teams, n: n };
}

/* Simple ranking from tournament matrix: average win-rate across all
   opponents (excluding self), plus a 3-1-0 points sum. Returns sorted. */
function rankFromMatrix(matrixObj) {
  var mat = matrixObj.matrix, teams = matrixObj.teams, n = matrixObj.n;
  var ranking = [];
  for (var i = 0; i < n; i++) {
    var winSum = 0, drawSum = 0, lossSum = 0, points = 0, count = 0;
    for (var j = 0; j < n; j++) {
      if (i === j) continue;
      var c = mat[i][j];
      winSum += c.winRateA; drawSum += c.drawRate; lossSum += c.winRateB;
      points += 3 * c.winRateA + 1 * c.drawRate;
      count++;
    }
    ranking.push({
      name: teams[i].name, league: teams[i].league || '—', color: teams[i].color,
      avgWinRate: count > 0 ? winSum / count : 0,
      avgDrawRate: count > 0 ? drawSum / count : 0,
      avgLossRate: count > 0 ? lossSum / count : 0,
      pointsPerOpponent: count > 0 ? points / count : 0
    });
  }
  ranking.sort(function(a, b) { return b.pointsPerOpponent - a.pointsPerOpponent; });
  return ranking;
}

/* Flatten LEAGUE_DATA to a flat teams array suitable for the matrix
   (each entry carries .league and .color). */
function flattenLeagueTeams(leagueData) {
  var out = [];
  Object.keys(leagueData).forEach(function (lname) {
    var lg = leagueData[lname];
    if (!lg || !lg.teams) return;
    for (var i = 0; i < lg.teams.length; i++) {
      var t = lg.teams[i];
      out.push(Object.assign({}, t, { league: lname, color: lg.color }));
    }
  });
  return out;
}

/* ── BYOL → virtual team ─────────────────────────────────────────── */

/* Convert the user's BYOL Team A shots into a team-shaped object so it
   can join the tournament. We extrapolate per-match shots from the
   user's placed sample (n shots → assumed to represent one match worth
   of effort). xGFor scales to a 38-match season equivalent. */
function byolToVirtualTeam(shots, opts) {
  opts = opts || {};
  var name = opts.name || 'Your Team';
  var matchesPerSeason = opts.matchesPerSeason || 38;
  var league = opts.league || 'Custom';
  var color = opts.color || '#7dd87d';
  if (!shots || !shots.length) {
    return null;
  }
  var perMatchShots = shots.length;
  var totalXG = 0;
  for (var i = 0; i < shots.length; i++) totalXG += (shots[i].xg || 0);
  var seasonShots = perMatchShots * matchesPerSeason;
  var seasonXG    = totalXG * matchesPerSeason;
  // Reasonable defaults so the team plugs into the matrix without
  // breaking the math; defensive stats are unknown so we use league-avg-ish.
  var defXG = seasonXG * 0.7;  // assume slightly better defense than offense
  var goalsFor = Math.round(seasonXG);
  var goalsAgainst = Math.round(defXG);
  var sotEstimate = Math.round(seasonShots * 0.34); // typical SOT% ~34%
  return {
    name: name, league: league, color: color,
    shots: seasonShots, shotsOnTarget: sotEstimate,
    xGFor: seasonXG, xGAgainst: defXG,
    goalsFor: goalsFor, goalsAgainst: goalsAgainst,
    isVirtual: true, perMatchShots: perMatchShots
  };
}

/* Expose the analysis surface. */
if (typeof window !== 'undefined') {
  window.FootballAnalysis = {
    bootstrapResidual: bootstrapResidual,
    bootstrapAllTeams: bootstrapAllTeams,
    buildFeatureMatrix: buildFeatureMatrix,
    computePCA: computePCA,
    naiveBayesLeagueClassifier: naiveBayesLeagueClassifier,
    pairwiseTournament: pairwiseTournament,
    tournamentMatrix: tournamentMatrix,
    rankFromMatrix: rankFromMatrix,
    flattenLeagueTeams: flattenLeagueTeams,
    byolToVirtualTeam: byolToVirtualTeam
  };
}
