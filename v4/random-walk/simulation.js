/* simulation.js — Random Walk: walker logic, RMS, batch management */

var STEP_SIZE = 5;

function boxMuller() {
  var u = 0, v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function dist2D(w) { return Math.sqrt(w.x * w.x + w.y * w.y); }
function dist1D(w) { return Math.abs(w.pos); }

function createWalkers(n, dim) {
  var walkers = [];
  for (var i = 0; i < n; i++) {
    if (dim === 2) walkers.push({ x: 0, y: 0, path: [[0, 0]] });
    else walkers.push({ pos: 0, path: [0] });
  }
  return walkers;
}

function stepWalkersOnce(walkers, dim, stepType, curStep, totalSteps) {
  var sampleInterval = totalSteps <= 500 ? 1 : Math.ceil(totalSteps / 500);
  for (var i = 0; i < walkers.length; i++) {
    var w = walkers[i];
    var ss = stepType === 'gaussian' ? STEP_SIZE * Math.abs(boxMuller()) : STEP_SIZE;
    if (dim === 2) {
      var a = Math.random() * Math.PI * 2;
      w.x += Math.cos(a) * ss;
      w.y += Math.sin(a) * ss;
      if (curStep % sampleInterval === 0 || curStep === totalSteps) w.path.push([w.x, w.y]);
    } else {
      w.pos += (Math.random() < 0.5 ? -1 : 1) * ss;
      if (curStep % sampleInterval === 0 || curStep === totalSteps) w.path.push(w.pos);
    }
  }
}

function calcRMS(walkers, dim) {
  var sum = 0;
  for (var i = 0; i < walkers.length; i++) {
    var d = dim === 2 ? dist2D(walkers[i]) : dist1D(walkers[i]);
    sum += d * d;
  }
  return Math.sqrt(sum / walkers.length);
}

function calcMean(walkers, dim) {
  var sum = 0;
  for (var i = 0; i < walkers.length; i++) {
    sum += (dim === 2 ? dist2D(walkers[i]) : dist1D(walkers[i]));
  }
  return sum / walkers.length;
}

function calcMax(walkers, dim) {
  var mx = 0;
  for (var i = 0; i < walkers.length; i++) {
    var d = dim === 2 ? dist2D(walkers[i]) : dist1D(walkers[i]);
    if (d > mx) mx = d;
  }
  return mx;
}

function countBeyond(walkers, dim, threshold) {
  var count = 0;
  for (var i = 0; i < walkers.length; i++) {
    if ((dim === 2 ? dist2D(walkers[i]) : dist1D(walkers[i])) > threshold) count++;
  }
  return count;
}

function buildHistogram(walkers, dim) {
  var dists = [];
  for (var i = 0; i < walkers.length; i++) {
    dists.push(dim === 2 ? dist2D(walkers[i]) : walkers[i].pos);
  }
  var bins, labels, counts;
  if (dim === 2) {
    var mx = 1;
    for (var j = 0; j < dists.length; j++) if (dists[j] > mx) mx = dists[j];
    var nb = 20, bw = mx / nb;
    bins = new Array(nb).fill(0); labels = [];
    for (var k = 0; k < nb; k++) labels.push((k * bw).toFixed(0));
    for (var m = 0; m < dists.length; m++) {
      var bi = Math.min(nb - 1, Math.floor(dists[m] / bw));
      bins[bi]++;
    }
    counts = bins;
  } else {
    var mx2 = 1;
    for (var j2 = 0; j2 < dists.length; j2++) if (Math.abs(dists[j2]) > mx2) mx2 = Math.abs(dists[j2]);
    var nb2 = 21, bw2 = 2 * mx2 / nb2, lo = -mx2;
    bins = new Array(nb2).fill(0); labels = [];
    for (var k2 = 0; k2 < nb2; k2++) labels.push((lo + k2 * bw2 + bw2 / 2).toFixed(0));
    for (var m2 = 0; m2 < dists.length; m2++) {
      var bi2 = Math.min(nb2 - 1, Math.max(0, Math.floor((dists[m2] - lo) / bw2)));
      bins[bi2]++;
    }
    counts = bins;
  }
  return { labels: labels, counts: counts };
}
