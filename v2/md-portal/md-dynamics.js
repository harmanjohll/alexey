// md-dynamics.js — Web Worker for velocity Verlet MD + Monte Carlo
// Ported from md-portal/index.html Web Worker (v1)
// Runs in a separate thread to keep UI responsive

// Tersoff parameters: Si=0, Ge=1
const PARAMS = {
  beta: [1.1e-6, 9.0166e-7],
  nexp: [0.78734, 0.75627],
  c: [1.0039e5, 1.0643e5],
  d: [16.217, 15.652],
  h: [-0.59825, -0.43884],
  ri: [2.7, 2.8],
  si: [3.0, 3.1],
  ai: [1830.8, 1769.0],
  bi: [471.18, 419.23],
  li: [2.4799, 2.4451],
  mi: [1.7322, 1.7047]
};
const CHI = [[1.0, 1.00769],[1.00769, 1.0]];
const OMEGA = 1.0;
const kB = 8.6166560553e-5; // eV/K
const PI = Math.PI;

// Precompute cross-species
const A = [[0,0],[0,0]], B = [[0,0],[0,0]], LAM = [[0,0],[0,0]], MU = [[0,0],[0,0]];
const R = [[0,0],[0,0]], S = [[0,0],[0,0]];
for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
  A[i][j] = Math.sqrt(PARAMS.ai[i] * PARAMS.ai[j]);
  B[i][j] = Math.sqrt(PARAMS.bi[i] * PARAMS.bi[j]);
  R[i][j] = Math.sqrt(PARAMS.ri[i] * PARAMS.ri[j]);
  S[i][j] = Math.sqrt(PARAMS.si[i] * PARAMS.si[j]);
  LAM[i][j] = 0.5 * (PARAMS.li[i] + PARAMS.li[j]);
  MU[i][j] = 0.5 * (PARAMS.mi[i] + PARAMS.mi[j]);
}
const MASS = [28.09, 72.61]; // amu
const SMAX = Math.max(S[0][0], S[0][1], S[1][0], S[1][1]);

let natom = 0, pos, vel, acc, species, fx, fy, fz;
let totlx, totly, totlz, energy;
let mcAccept = 0, mcTotal = 0;

function buildSlab(ncx, ncy, nczi, nczf, theta, lattOverride) {
  const aSi = 5.431, aGe = 5.657;
  const a0 = (1 - theta) * aSi + theta * aGe;
  const disp = 0.745;

  let lattx, latty, lattz;
  if (lattOverride) {
    lattx = lattOverride.lattx;
    latty = lattOverride.latty;
    lattz = lattOverride.lattz;
  } else {
    lattx = a0 * Math.SQRT2;
    latty = a0 * Math.SQRT2;
    lattz = a0;
  }

  const nzCells = nczf - nczi + 1;
  totlx = ncx * lattx;
  totly = ncy * latty;
  totlz = nzCells * lattz;

  // Structure 8 basis: 16 atoms per unit cell
  const basis = [
    [0, 0, 0, true],
    [0, 0.25, 0.25, false],
    [0, 0.50, 0, true],
    [0, 0.75, 0.25, false],
    [0.25, 0.25, 0.50, false],
    [0.25, 0.75, 0.50, false],
    [0.25, 0, 0.75, false],
    [0.25, 0.50, 0.75, false],
    [0.50, 0, 0, true],
    [0.50, 0.25, 0.25, false],
    [0.50, 0.50, 0, true],
    [0.50, 0.75, 0.25, false],
    [0.75, 0.25, 0.50, false],
    [0.75, 0.75, 0.50, false],
    [0.75, 0, 0.75, false],
    [0.75, 0.50, 0.75, false]
  ];

  const atoms = [];
  for (let k = nczi; k <= nczf; k++)
  for (let j = 0; j < ncy; j++)
  for (let i = 0; i < ncx; i++) {
    for (let b = 0; b < basis.length; b++) {
      let x = (i + basis[b][0]) * lattx;
      let y = (j + basis[b][1]) * latty;
      let z = ((k - nczi) + basis[b][2]) * lattz;

      // Dimer reconstruction on bottom surface
      if (basis[b][3] && k === nczi) {
        if (basis[b][0] < 0.5) x += disp;
        else x -= disp;
      }

      atoms.push({ x, y, z, sp: Math.random() < theta ? 1 : 0 });
    }
  }

  // Top surface dimer atoms
  const zTop = nzCells * lattz;
  for (let j = 0; j < ncy; j++)
  for (let i = 0; i < ncx; i++) {
    atoms.push({ x: i * lattx, y: j * latty + disp, z: zTop, sp: Math.random() < theta ? 1 : 0 });
    atoms.push({ x: (i + 0.50) * lattx, y: j * latty + disp, z: zTop, sp: Math.random() < theta ? 1 : 0 });
    atoms.push({ x: i * lattx, y: (j + 0.50) * latty - disp, z: zTop, sp: Math.random() < theta ? 1 : 0 });
    atoms.push({ x: (i + 0.50) * lattx, y: (j + 0.50) * latty - disp, z: zTop, sp: Math.random() < theta ? 1 : 0 });
  }

  natom = atoms.length;
  pos = new Float64Array(natom * 3);
  vel = new Float64Array(natom * 3);
  acc = new Float64Array(natom * 3);
  fx = new Float64Array(natom);
  fy = new Float64Array(natom);
  fz = new Float64Array(natom);
  species = new Uint8Array(natom);

  for (let i = 0; i < natom; i++) {
    pos[i*3] = atoms[i].x;
    pos[i*3+1] = atoms[i].y;
    pos[i*3+2] = atoms[i].z;
    species[i] = atoms[i].sp;
  }

  return { natom, lattx, latty, lattz, a0 };
}

function cutoffFunc(r, Rij, Sij) {
  if (r < Rij) return 1.0;
  if (r >= Sij) return 0.0;
  return 0.5 + 0.5 * Math.cos(PI * (r - Rij) / (Sij - Rij));
}

function dcutoffFunc(r, Rij, Sij) {
  if (r < Rij || r >= Sij) return 0.0;
  return -0.5 * PI * Math.sin(PI * (r - Rij) / (Sij - Rij)) / (Sij - Rij);
}

function computeForces() {
  energy = 0;
  for (let i = 0; i < natom; i++) { fx[i] = 0; fy[i] = 0; fz[i] = 0; }

  const neighbors = new Array(natom);
  const nbrDx = new Array(natom);
  const nbrDy = new Array(natom);
  const nbrDz = new Array(natom);
  const nbrR = new Array(natom);
  for (let i = 0; i < natom; i++) {
    neighbors[i] = []; nbrDx[i] = []; nbrDy[i] = []; nbrDz[i] = []; nbrR[i] = [];
  }

  for (let i = 0; i < natom - 1; i++) {
    const si = species[i];
    for (let j = i + 1; j < natom; j++) {
      const sj = species[j];
      let dx = pos[j*3] - pos[i*3];
      let dy = pos[j*3+1] - pos[i*3+1];
      let dz = pos[j*3+2] - pos[i*3+2];
      if (dx > totlx/2) dx -= totlx; else if (dx < -totlx/2) dx += totlx;
      if (dy > totly/2) dy -= totly; else if (dy < -totly/2) dy += totly;
      const r = Math.sqrt(dx*dx + dy*dy + dz*dz);

      const Sij = S[si][sj];
      if (r < Sij) {
        neighbors[i].push(j); nbrDx[i].push(dx); nbrDy[i].push(dy); nbrDz[i].push(dz); nbrR[i].push(r);
        neighbors[j].push(i); nbrDx[j].push(-dx); nbrDy[j].push(-dy); nbrDz[j].push(-dz); nbrR[j].push(r);

        const Rij = R[si][sj];
        const fc = cutoffFunc(r, Rij, Sij);
        const fR = A[si][sj] * Math.exp(-LAM[si][sj] * r);
        energy += fc * fR;

        const dfR_dr = -LAM[si][sj] * fR;
        const dfc_dr = dcutoffFunc(r, Rij, Sij);
        const fpair = -(fc * dfR_dr + dfc_dr * fR) / r;
        fx[i] += fpair * dx; fy[i] += fpair * dy; fz[i] += fpair * dz;
        fx[j] -= fpair * dx; fy[j] -= fpair * dy; fz[j] -= fpair * dz;
      }
    }
  }

  // Three-body terms
  for (let i = 0; i < natom; i++) {
    const si = species[i];
    const nn = neighbors[i].length;
    for (let pa = 0; pa < nn; pa++) {
      const j = neighbors[i][pa];
      const sj = species[j];
      const xij = nbrDx[i][pa], yij = nbrDy[i][pa], zij = nbrDz[i][pa];
      const rij = nbrR[i][pa];
      const Rij = R[si][sj], Sij = S[si][sj];
      const fcij = cutoffFunc(rij, Rij, Sij);
      const fAij = -B[si][sj] * Math.exp(-MU[si][sj] * rij);

      let zetaij = 0;
      for (let pb = 0; pb < nn; pb++) {
        if (pb === pa) continue;
        const sk = species[neighbors[i][pb]];
        const xik = nbrDx[i][pb], yik = nbrDy[i][pb], zik = nbrDz[i][pb];
        const rik = nbrR[i][pb];
        const fcik = cutoffFunc(rik, R[si][sk], S[si][sk]);
        const cosTheta = (xij*xik + yij*yik + zij*zik) / (rij * rik);
        const denom = PARAMS.d[si]*PARAMS.d[si] + (PARAMS.h[si] - cosTheta)*(PARAMS.h[si] - cosTheta);
        const g = 1.0 + (PARAMS.c[si]/PARAMS.d[si])*(PARAMS.c[si]/PARAMS.d[si]) - PARAMS.c[si]*PARAMS.c[si]/denom;
        zetaij += fcik * OMEGA * g;
      }

      const bz = PARAMS.beta[si] * zetaij;
      const bzn = Math.pow(Math.abs(bz), PARAMS.nexp[si]);
      const bij = CHI[si][sj] * Math.pow(1.0 + bzn, -0.5 / PARAMS.nexp[si]);

      energy += 0.5 * fcij * bij * fAij;

      const dfA_dr = -MU[si][sj] * fAij;
      const dfc_dr = dcutoffFunc(rij, Rij, Sij);
      const fattr = -0.5 * (fcij * bij * dfA_dr + dfc_dr * bij * fAij) / rij;
      fx[i] += fattr * xij; fy[i] += fattr * yij; fz[i] += fattr * zij;
    }
  }
}

function velocityVerlet(dt) {
  for (let i = 0; i < natom; i++) {
    const m = MASS[species[i]];
    vel[i*3]   += 0.5 * dt * fx[i] / m;
    vel[i*3+1] += 0.5 * dt * fy[i] / m;
    vel[i*3+2] += 0.5 * dt * fz[i] / m;
    pos[i*3]   += dt * vel[i*3];
    pos[i*3+1] += dt * vel[i*3+1];
    pos[i*3+2] += dt * vel[i*3+2];
    if (pos[i*3] < 0) pos[i*3] += totlx; else if (pos[i*3] >= totlx) pos[i*3] -= totlx;
    if (pos[i*3+1] < 0) pos[i*3+1] += totly; else if (pos[i*3+1] >= totly) pos[i*3+1] -= totly;
  }
  computeForces();
  for (let i = 0; i < natom; i++) {
    const m = MASS[species[i]];
    vel[i*3]   += 0.5 * dt * fx[i] / m;
    vel[i*3+1] += 0.5 * dt * fy[i] / m;
    vel[i*3+2] += 0.5 * dt * fz[i] / m;
  }
}

function kineticEnergy() {
  let ke = 0;
  for (let i = 0; i < natom; i++) {
    const m = MASS[species[i]];
    ke += 0.5 * m * (vel[i*3]*vel[i*3] + vel[i*3+1]*vel[i*3+1] + vel[i*3+2]*vel[i*3+2]);
  }
  return ke;
}

function temperature() {
  return 2.0 * kineticEnergy() / (3.0 * natom * kB);
}

let spareG = null;
function gaussRandom() {
  if (spareG !== null) { const v = spareG; spareG = null; return v; }
  let u, v, s;
  do { u = Math.random()*2-1; v = Math.random()*2-1; s = u*u+v*v; } while (s >= 1 || s === 0);
  s = Math.sqrt(-2*Math.log(s)/s);
  spareG = v * s;
  return u * s;
}

function rescaleVelocities(targetT) {
  const currentT = temperature();
  if (currentT < 1e-10) {
    for (let i = 0; i < natom; i++) {
      const m = MASS[species[i]];
      const sigma = Math.sqrt(kB * targetT / m);
      vel[i*3] = gaussRandom() * sigma;
      vel[i*3+1] = gaussRandom() * sigma;
      vel[i*3+2] = gaussRandom() * sigma;
    }
    let vx=0,vy=0,vz=0,tm=0;
    for (let i=0;i<natom;i++){const m=MASS[species[i]];vx+=m*vel[i*3];vy+=m*vel[i*3+1];vz+=m*vel[i*3+2];tm+=m;}
    vx/=tm;vy/=tm;vz/=tm;
    for (let i=0;i<natom;i++){vel[i*3]-=vx;vel[i*3+1]-=vy;vel[i*3+2]-=vz;}
    const t2 = temperature();
    if (t2 > 1e-10) {
      const scale = Math.sqrt(targetT / t2);
      for (let i=0;i<natom;i++){vel[i*3]*=scale;vel[i*3+1]*=scale;vel[i*3+2]*=scale;}
    }
  } else {
    const scale = Math.sqrt(targetT / currentT);
    for (let i = 0; i < natom; i++) {
      vel[i*3] *= scale; vel[i*3+1] *= scale; vel[i*3+2] *= scale;
    }
  }
}

function mcSwap(nSteps, kT) {
  if (nSteps <= 0 || natom < 2) return;
  let nSi = 0, nGe = 0;
  for (let i = 0; i < natom; i++) { if (species[i] === 0) nSi++; else nGe++; }
  if (nSi === 0 || nGe === 0) return;

  for (let s = 0; s < nSteps; s++) {
    let a = Math.floor(Math.random() * natom);
    let b = Math.floor(Math.random() * natom);
    if (species[a] === species[b] || a === b) continue;
    if (species[a] === 1) { const t = a; a = b; b = t; }

    const eBefore = energy;
    species[a] = 1; species[b] = 0;
    computeForces();
    const eAfter = energy;
    const dE = eAfter - eBefore;

    mcTotal++;
    if (dE <= 0 || Math.random() < Math.exp(-dE / kT)) {
      mcAccept++;
    } else {
      species[a] = 0; species[b] = 1;
      computeForces();
    }
  }
}

function mcGrandCanonical(nSteps, kT, dmu) {
  if (nSteps <= 0 || natom < 1 || kT < 1e-12) return;

  for (let s = 0; s < nSteps; s++) {
    const a = Math.floor(Math.random() * natom);
    if (a < 0 || a >= natom) continue;
    const s1i = species[a];
    const s1f = s1i === 0 ? 1 : 0;

    const eBefore = energy;
    species[a] = s1f;
    computeForces();
    const eAfter = energy;
    const dE = eAfter - eBefore;
    const del_mu = s1i === 0 ? dmu : -dmu;

    mcTotal++;
    if (dE - del_mu <= 0 || Math.random() < Math.exp(-(dE - del_mu) / kT)) {
      mcAccept++;
    } else {
      species[a] = s1i;
      computeForces();
    }
  }
}

function layerComposition() {
  // Group atoms by z-coordinate into sublayers (tolerance 0.5 A)
  const tol = 0.5;
  const zVals = [];
  for (let i = 0; i < natom; i++) {
    const z = pos[i*3+2];
    let found = false;
    for (let j = 0; j < zVals.length; j++) {
      if (Math.abs(z - zVals[j]) < tol) { found = true; break; }
    }
    if (!found) zVals.push(z);
  }
  zVals.sort((a, b) => a - b);

  const layers = [];
  for (let l = 0; l < zVals.length; l++) layers.push({ si: 0, ge: 0, z: zVals[l] });

  for (let i = 0; i < natom; i++) {
    const z = pos[i*3+2];
    for (let l = 0; l < zVals.length; l++) {
      if (Math.abs(z - zVals[l]) < tol) {
        if (species[i] === 0) layers[l].si++; else layers[l].ge++;
        break;
      }
    }
  }

  // Compute symmetric-pair averages (first 4 pairs)
  const N = layers.length;
  const pairs = [];
  for (let p = 0; p < 4 && p < Math.floor(N / 2); p++) {
    const la = layers[p];
    const lb = layers[N - 1 - p];
    const nGe = la.ge + lb.ge;
    const nTotal = la.si + la.ge + lb.si + lb.ge;
    pairs.push({
      pair: p + 1,
      layerA: p + 1,
      layerB: N - p,
      nGe: nGe,
      nTotal: nTotal,
      geFraction: nTotal > 0 ? nGe / nTotal : 0
    });
  }

  return { layers, pairs };
}

// Worker message handler
self.onmessage = function(e) {
  const msg = e.data;

  if (msg.type === 'init') {
    const p = msg.params;
    const info = buildSlab(p.ncx, p.ncy, p.nczi || 2, p.nczf || 4, p.theta, p.lattOverride);
    computeForces();
    rescaleVelocities(p.temp);
    mcAccept = 0; mcTotal = 0;
    const comp = layerComposition();
    self.postMessage({ type: 'init_done', natom, totlx, totly, totlz, info, layers: comp });
  }
  else if (msg.type === 'step') {
    const p = msg.params;
    const dt = p.dt * 1.01804956609e-2; // fs to internal units

    for (let s = 0; s < p.nvv; s++) {
      velocityVerlet(dt);
    }
    rescaleVelocities(p.temp);

    const kT = kB * p.temp;
    mcSwap(p.mcswap || 0, kT);
    mcGrandCanonical(p.mcgc || 0, kT, p.dmu || 0);

    const T = temperature();
    const epa = energy / natom;
    let nSi = 0, nGe = 0;
    for (let i = 0; i < natom; i++) { if (species[i] === 0) nSi++; else nGe++; }
    const comp = layerComposition();
    const mcPct = mcTotal > 0 ? (mcAccept / mcTotal * 100) : 0;

    const posOut = new Float64Array(pos);
    const spOut = new Uint8Array(species);

    self.postMessage({
      type: 'update',
      step: msg.step,
      energy: epa,
      totalEnergy: energy,
      temperature: T,
      nSi, nGe,
      positions: posOut.buffer,
      species: spOut.buffer,
      layers: comp,
      mcPct,
      natom
    }, [posOut.buffer, spOut.buffer]);
  }
  else if (msg.type === 'get_surface_energy') {
    // Compute surface energy from current state
    const surfArea = 2 * totlx * totly;
    // Find bulk atoms (coordination 4) — approximate by interior z
    let zmin = Infinity, zmax = -Infinity;
    for (let i = 0; i < natom; i++) {
      if (pos[i*3+2] < zmin) zmin = pos[i*3+2];
      if (pos[i*3+2] > zmax) zmax = pos[i*3+2];
    }
    const zRange = zmax - zmin;
    let eBulk = 0, nBulk = 0;
    // Approximate: atoms in middle 50% are "bulk"
    for (let i = 0; i < natom; i++) {
      const zf = (pos[i*3+2] - zmin) / zRange;
      if (zf > 0.25 && zf < 0.75) { nBulk++; }
    }
    // Use energy/atom as bulk estimate (simplified)
    const eBulkPerAtom = energy / natom; // simplified
    const eSurf = surfArea > 0 ? (energy - natom * eBulkPerAtom) / surfArea : 0;

    self.postMessage({
      type: 'surface_energy',
      surfaceEnergy: eSurf,
      surfaceArea: surfArea,
      energyPerAtom: energy / natom,
      temperature: temperature()
    });
  }
};
