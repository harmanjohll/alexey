/* simulation.js — Monte Carlo engine and simulation utilities for the Football Portal */

/**
 * Run Monte Carlo simulation for a set of shots.
 * Each shot has an xg probability. Each simulation independently resolves every shot.
 * @param {Array} shots - Array of shot objects with .xg property
 * @param {number} numSims - Number of simulations to run (default 500)
 * @returns {Object} { counts, avg, max, p0, p2plus, totalXG }
 */
function runMonteCarlo(shots, numSims) {
  var N = numSims || 500;
  var maxGoals = shots.length + 2;
  var counts = [];
  var i, j;
  for (i = 0; i < maxGoals; i++) counts.push(0);

  for (i = 0; i < N; i++) {
    var g = 0;
    for (j = 0; j < shots.length; j++) {
      if (Math.random() < shots[j].xg) g++;
    }
    if (g < counts.length) counts[g]++;
  }

  var totalXG = 0;
  for (j = 0; j < shots.length; j++) totalXG += shots[j].xg;

  var avg = 0;
  for (i = 0; i < counts.length; i++) avg += counts[i] * i;
  avg = avg / N;

  var mx = 0;
  for (i = counts.length - 1; i >= 0; i--) {
    if (counts[i] > 0) { mx = i; break; }
  }

  var p2sum = 0;
  for (i = 2; i < counts.length; i++) p2sum += counts[i];

  return {
    counts: counts,
    avg: avg,
    max: mx,
    p0: counts[0] / N,
    p2plus: p2sum / N,
    totalXG: totalXG
  };
}

/**
 * Poisson probability mass function.
 * P(X=k) = e^(-lambda) * lambda^k / k!
 * Computed in log-space for numerical stability.
 */
function poissonPMF(k, lambda) {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  var logP = -lambda + k * Math.log(lambda);
  for (var i = 2; i <= k; i++) logP -= Math.log(i);
  return Math.exp(logP);
}

/**
 * Simulate a league of matches between two teams.
 * Each team has a set of shots (with xg). Each match independently resolves all shots.
 * @param {Array} teamAShots - Shots for Team A
 * @param {Array} teamBShots - Shots for Team B
 * @param {number} numMatches - Number of matches to simulate (default 1000)
 * @returns {Object} { teamAWins, teamBWins, draws, teamAGoalDist, teamBGoalDist, teamAAvg, teamBAvg }
 */
function simulateLeague(teamAShots, teamBShots, numMatches) {
  var N = numMatches || 1000;
  var teamAWins = 0, teamBWins = 0, draws = 0;
  var maxA = teamAShots.length + 2;
  var maxB = teamBShots.length + 2;
  var teamAGoalDist = [];
  var teamBGoalDist = [];
  var i, j;

  for (i = 0; i < maxA; i++) teamAGoalDist.push(0);
  for (i = 0; i < maxB; i++) teamBGoalDist.push(0);

  for (i = 0; i < N; i++) {
    var gA = 0, gB = 0;
    for (j = 0; j < teamAShots.length; j++) {
      if (Math.random() < teamAShots[j].xg) gA++;
    }
    for (j = 0; j < teamBShots.length; j++) {
      if (Math.random() < teamBShots[j].xg) gB++;
    }
    if (gA < teamAGoalDist.length) teamAGoalDist[gA]++;
    if (gB < teamBGoalDist.length) teamBGoalDist[gB]++;
    if (gA > gB) teamAWins++;
    else if (gB > gA) teamBWins++;
    else draws++;
  }

  var teamATotal = 0, teamBTotal = 0;
  for (i = 0; i < teamAGoalDist.length; i++) teamATotal += teamAGoalDist[i] * i;
  for (i = 0; i < teamBGoalDist.length; i++) teamBTotal += teamBGoalDist[i] * i;

  return {
    teamAWins: teamAWins,
    teamBWins: teamBWins,
    draws: draws,
    teamAGoalDist: teamAGoalDist,
    teamBGoalDist: teamBGoalDist,
    teamAAvg: teamATotal / N,
    teamBAvg: teamBTotal / N,
    totalMatches: N
  };
}

/**
 * Run sensitivity Monte Carlo — same as runMonteCarlo but scales all xG by a factor.
 * Useful for "what if shots were X% better/worse?" analysis.
 */
function runSensitivityMC(shots, factor, numSims) {
  var scaled = [];
  for (var i = 0; i < shots.length; i++) {
    scaled.push({ xg: Math.min(0.96, Math.max(0.001, shots[i].xg * factor)) });
  }
  return runMonteCarlo(scaled, numSims);
}

/**
 * Build cumulative xG timeline data from a list of shots.
 * Returns array of { shotIndex, cumulativeXG } for step-chart plotting.
 */
function buildShotTimeline(shots) {
  var timeline = [{ shotIndex: 0, cumulativeXG: 0 }];
  var cumXG = 0;
  for (var i = 0; i < shots.length; i++) {
    cumXG += shots[i].xg;
    timeline.push({ shotIndex: i + 1, cumulativeXG: cumXG });
  }
  return timeline;
}
