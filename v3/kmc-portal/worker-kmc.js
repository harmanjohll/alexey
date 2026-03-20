/* worker-kmc.js — 2D KMC simulation engine (Web Worker)
   Faithful port of FORTRAN 2d.f: desorption, surface diffusion, bulk diffusion
   with Metropolis energy criterion on a 2D SiGe lattice */

var ZTOP = 20, ZBUFF = 20;
var XDEL = [-1, 0, 1, 0, -1, 1, 1, -1];
var ZDEL = [ 0,-1, 0, 1, -1,-1, 1, 1];
var XDIFF = [1, -1];
var SNAP_ITERS = [1,10,20,50,100,200,500];

var lattx, lattz, niter1, totalInner;
var theta, pdes, pge, psi, envt;
var esisi, esige, egege, esivc, egevc;
var zstop, zlo;
var oc, ht, hadd;
var ndes, nsdf, bdiff, ngedes, nsides;
var rng, paused = false, cancelled = false;
var currentIter = 0;

function createRng(seed) {
  var a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    var t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

var tmpA = new Int32Array(5);
var tmpB = new Int32Array(5);

function countBonds(x, z, out) {
  out[0]=0; out[1]=0; out[2]=0; out[3]=0; out[4]=0;
  var s = oc[x * lattz + z];
  for (var n = 0; n < 8; n++) {
    var xn = x + XDEL[n];
    if (xn < 0) xn += lattx; else if (xn >= lattx) xn -= lattx;
    var zn = z + ZDEL[n];
    if (zn < 0 || zn >= lattz) continue;
    var nb = oc[xn * lattz + zn];
    if (s === 1) {
      if (nb === 1) out[0]++; else if (nb === 2) out[2]++; else out[3]++;
    } else if (s === 2) {
      if (nb === 1) out[2]++; else if (nb === 2) out[1]++; else out[4]++;
    } else {
      if (nb === 1) out[3]++; else if (nb === 2) out[4]++;
    }
  }
}

function metropolisSwap(x1, z1, x2, z2) {
  countBonds(x1, z1, tmpA);
  var i0=tmpA[0], i1=tmpA[1], i2=tmpA[2], i3=tmpA[3], i4=tmpA[4];
  countBonds(x2, z2, tmpB);
  var isisi=i0+tmpB[0], igege=i1+tmpB[1], isige_=i2+tmpB[2], isivc=i3+tmpB[3], igevc=i4+tmpB[4];
  var o1 = x1 * lattz + z1, o2 = x2 * lattz + z2;
  var v1 = oc[o1], v2 = oc[o2];
  oc[o1] = v2; oc[o2] = v1;
  countBonds(x1, z1, tmpA);
  countBonds(x2, z2, tmpB);
  var fsisi=tmpA[0]+tmpB[0], fgege=tmpA[1]+tmpB[1], fsige_=tmpA[2]+tmpB[2], fsivc=tmpA[3]+tmpB[3], fgevc=tmpA[4]+tmpB[4];
  oc[o1] = v1; oc[o2] = v2;
  var dE = esisi*(fsisi-isisi) + egege*(fgege-igege) + esige*(fsige_-isige_) + esivc*(fsivc-isivc) + egevc*(fgevc-igevc);
  if (dE <= 0.0) { oc[o1] = v2; oc[o2] = v1; return true; }
  if (rng() <= Math.exp(-dE)) { oc[o1] = v2; oc[o2] = v1; return true; }
  return false;
}

function initialize(params) {
  lattx = params.lattx; lattz = params.lattz;
  niter1 = params.niter1;
  totalInner = params.niter2 * lattx;
  theta = params.theta; pdes = params.pdes; pge = params.pge; psi = params.psi;
  envt = params.envt; zstop = params.zstop; zlo = params.zlo;
  var conv = 23.0 * 4184.0 / (8.314 * params.temp);
  esisi = params.esisi * conv;
  esige = params.esige * conv;
  egege = params.egege * conv;
  esivc = params.esivc * conv;
  egevc = params.egevc * conv;
  rng = createRng(Math.abs(params.seed));
  oc = new Uint8Array(lattx * lattz);
  ht = new Int32Array(lattx);
  hadd = 0; ndes = 0; nsdf = 0; bdiff = 0; ngedes = 0; nsides = 0;
  for (var x = 0; x < lattx; x++) {
    ht[x] = ZTOP;
    var ox = x * lattz;
    for (var z = 0; z < ZTOP; z++) oc[ox + z] = 0;
    for (var z = ZTOP; z < lattz; z++) oc[ox + z] = rng() <= theta ? 2 : 1;
  }
  currentIter = 0; paused = false; cancelled = false;
}

function computeOutput(iiter1) {
  var aveht = 0;
  for (var x = 0; x < lattx; x++) aveht += ht[x];
  aveht /= lattx;

  var m2 = 0, m3 = 0, m4 = 0;
  for (var x = 0; x < lattx; x++) {
    var d = ht[x] - aveht;
    var d2 = d * d;
    m2 += d2;
    m3 += d2 * d;
    m4 += d2 * d2;
  }
  m2 /= lattx; m3 /= lattx; m4 /= lattx;
  var rmsht = Math.sqrt(m2);
  var stdev = rmsht;
  var skewness = m2 > 0 ? m3 / (m2 * Math.sqrt(m2)) : 0;
  var kurtosis = m2 > 0 ? m4 / (m2 * m2) - 3 : 0;

  var zmin = 0, zmax = lattz;
  for (var x = 0; x < lattx; x++) {
    if (ht[x] > zmin) zmin = ht[x];
    if (ht[x] < zmax) zmax = ht[x];
  }

  // Height histogram (40 bins)
  var hBins = 40;
  var hMin = zmax, hMax = zmin;
  var hRange = hMax - hMin || 1;
  var hBw = hRange / hBins;
  var htHistCounts = new Int32Array(hBins);
  var htHistLabels = new Float64Array(hBins);
  for (var b = 0; b < hBins; b++) htHistLabels[b] = hMin + (b + 0.5) * hBw + hadd;
  for (var x = 0; x < lattx; x++) {
    var b = Math.min(hBins - 1, Math.max(0, Math.floor((ht[x] - hMin) / hBw)));
    htHistCounts[b]++;
  }

  // Concentration profile
  var concZ = [], concGe = [];
  var cStart = Math.max(0, zmax - 5);
  var cEnd = Math.min(lattz, zmin + 20);
  for (var z = cStart; z < cEnd; z += 2) {
    var nSi = 0, nGe = 0;
    for (var x = 0; x < lattx; x++) {
      var v = oc[x * lattz + z];
      if (v === 1) nSi++; else if (v === 2) nGe++;
    }
    if (nSi + nGe > 0) { concZ.push(z + hadd); concGe.push(nGe / (nSi + nGe)); }
  }

  // Surface height array (downsampled)
  var htStep = Math.max(1, Math.floor(lattx / 500));
  var htX = [], htY = [];
  for (var x = 0; x < lattx; x += htStep) { htX.push(x); htY.push(ht[x] + hadd); }

  // Lattice slice — window around surface
  var sliceStart = Math.max(0, zmax - 50);
  var sliceEnd = Math.min(lattz, zmin + 100);
  var sliceH = sliceEnd - sliceStart;
  var sliceData = new Uint8Array(lattx * sliceH);
  for (var x = 0; x < lattx; x++) {
    var ox = x * lattz;
    for (var z = 0; z < sliceH; z++) sliceData[x * sliceH + z] = oc[ox + sliceStart + z];
  }

  return {
    type: 'iteration', iter: iiter1,
    aveht: aveht + hadd, rmsht: rmsht, stdev: stdev, skewness: skewness, kurtosis: kurtosis,
    zmin: zmin + hadd, zmax: zmax + hadd, surfWidth: zmin - zmax,
    events: { ndes: ndes, nsdf: nsdf, bdiff: bdiff, ngedes: ngedes, nsides: nsides },
    concZ: concZ, concGe: concGe, htX: htX, htY: htY,
    htHistCounts: Array.from(htHistCounts), htHistLabels: Array.from(htHistLabels),
    sliceData: sliceData.buffer, sliceStart: sliceStart, sliceH: sliceH,
    htRaw: new Int32Array(ht).buffer
  };
}

function doShift() {
  var zmin = 0, zmax = lattz;
  for (var x = 0; x < lattx; x++) {
    if (ht[x] > zmin) zmin = ht[x];
    if (ht[x] < zmax) zmax = ht[x];
  }
  if (zmin > zlo) {
    var shift = zmax - ZTOP - 2;
    if (shift <= 0) return;
    for (var z = zmax - 1; z < lattz; z++) {
      var destZ = z - shift;
      if (destZ < 0 || destZ >= lattz) continue;
      for (var x = 0; x < lattx; x++) oc[x * lattz + destZ] = oc[x * lattz + z];
    }
    for (var z = lattz - shift; z < lattz; z++) {
      for (var x = 0; x < lattx; x++) oc[x * lattz + z] = rng() < theta ? 2 : 1;
    }
    for (var x = 0; x < lattx; x++) ht[x] -= shift;
    hadd += shift;
  }
}

function runInnerLoop() {
  for (var i = 0; i < totalInner; i++) {
    var xpick, zpick;
    for (;;) {
      xpick = (rng() * lattx) | 0;
      if (xpick >= lattx) xpick = lattx - 1;
      zpick = (rng() * lattz) | 0;
      if (zpick >= lattz) zpick = lattz - 1;
      if (zpick >= ht[xpick]) break;
    }
    if (zpick === ht[xpick]) {
      var ox = xpick * lattz;
      var species = oc[ox + zpick];
      if (species === 0) continue;
      if (rng() <= pdes) {
        if (species === 2) {
          if (rng() <= pge) {
            var dc = 0;
            for (var n = 0; n < 8; n++) {
              var xn = xpick + XDEL[n];
              if (xn < 0) xn += lattx; else if (xn >= lattx) xn -= lattx;
              var zn = zpick + ZDEL[n];
              if (zn < 0 || zn >= lattz) { dc++; continue; }
              if (oc[xn * lattz + zn] !== 1) dc++;
            }
            if (dc >= envt) { oc[ox + zpick] = 0; ht[xpick]++; ndes++; ngedes++; }
          }
        } else if (species === 1) {
          if (rng() <= psi) {
            var dc = 0;
            for (var n = 0; n < 8; n++) {
              var xn = xpick + XDEL[n];
              if (xn < 0) xn += lattx; else if (xn >= lattx) xn -= lattx;
              var zn = zpick + ZDEL[n];
              if (zn < 0 || zn >= lattz) { dc++; continue; }
              if (oc[xn * lattz + zn] !== 1) dc++;
            }
            if (dc >= envt) { oc[ox + zpick] = 0; ht[xpick]++; ndes++; nsides++; }
          }
        }
      } else {
        var nd; do { nd = (rng() * 2) | 0; } while (nd < 0 || nd > 1);
        var xp2 = xpick + XDIFF[nd];
        if (xp2 >= lattx) xp2 -= lattx; else if (xp2 < 0) xp2 += lattx;
        var zp2 = ht[xp2] - 1;
        if (zp2 < 0) continue;
        var o1 = ox + zpick, o2 = xp2 * lattz + zp2;
        if (oc[o1] !== oc[o2]) {
          if (oc[xp2 * lattz + zp2 + 1] !== 0) {
            var oc2 = oc[o2];
            if (metropolisSwap(xpick, zpick, xp2, zp2)) {
              nsdf++;
              if (oc2 === 0) { ht[xpick]++; ht[xp2]--; }
            }
          }
        }
      }
    } else if (zpick < lattz - ZBUFF) {
      var nd; do { nd = (rng() * 8) | 0; } while (nd < 0 || nd > 7);
      var xp2 = xpick + XDEL[nd];
      if (xp2 >= lattx) xp2 -= lattx; else if (xp2 < 0) xp2 += lattx;
      var zp2 = zpick + ZDEL[nd];
      if (zp2 < 0 || zp2 >= lattz) continue;
      var v1 = oc[xpick * lattz + zpick], v2 = oc[xp2 * lattz + zp2];
      if (v1 !== 0 && v2 !== 0 && v1 !== v2) { if (metropolisSwap(xpick, zpick, xp2, zp2)) bdiff++; }
    } else {
      oc[xpick * lattz + zpick] = rng() < theta ? 2 : 1;
    }
  }
}

function runNextIteration() {
  if (currentIter >= niter1 || cancelled) { self.postMessage({ type: 'done' }); return; }
  if (paused) return;
  currentIter++;
  runInnerLoop();
  var out = computeOutput(currentIter);
  var transfers = [out.sliceData, out.htRaw];
  var zmin = 0;
  for (var x = 0; x < lattx; x++) if (ht[x] > zmin) zmin = ht[x];
  if (zmin > zstop) {
    out.stopped = true;
    self.postMessage(out, transfers);
    self.postMessage({ type: 'done', reason: 'zstop reached' });
    return;
  }
  if (SNAP_ITERS.indexOf(currentIter) >= 0) out.isSnapshot = true;
  self.postMessage(out, transfers);
  doShift();
  setTimeout(runNextIteration, 0);
}

self.onmessage = function(e) {
  var d = e.data;
  if (d.type === 'start') { initialize(d.params); runNextIteration(); }
  else if (d.type === 'pause') { paused = true; }
  else if (d.type === 'resume') { paused = false; runNextIteration(); }
  else if (d.type === 'cancel') { cancelled = true; }
};
