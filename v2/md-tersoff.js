// md-tersoff.js — Tersoff potential energy computation
// Faithfully implements PRB 39, 5566 (1989)
// Mirrors pot_ter.f and en_ter.f from the Fortran codebase

const MD = window.MD || {};
window.MD = MD;

MD.tersoff = {
  /**
   * Compute cutoff function fc(r)
   * fc = 1 if r < R
   * fc = 0.5 + 0.5*cos(pi*(r-R)/(S-R)) if R < r < S
   * fc = 0 if r > S
   */
  fc: function(r, R, S) {
    if (r < R) return 1.0;
    if (r > S) return 0.0;
    return 0.5 + 0.5 * Math.cos(Math.PI * (r - R) / (S - R));
  },

  /**
   * Angular function g(theta) for atom i with species si
   * g(theta) = 1 + c²/d² - c²/(d² + (h - cos(theta))²)
   */
  g: function(cosTheta, si) {
    const p = MD.params;
    const c2 = p.c[si] * p.c[si];
    const d2 = p.d[si] * p.d[si];
    const hc = p.h[si] - cosTheta;
    return 1.0 + c2 / d2 - c2 / (d2 + hc * hc);
  },

  /**
   * Compute total energy of the system
   * Returns { total, pair, threebody, perAtom, surfaceEnergy }
   */
  computeEnergy: function(slab) {
    const atoms = slab.atoms;
    const box = slab.box;
    const p = MD.params;
    const n = atoms.length;

    let epair = 0;
    let ethree = 0;

    // Reset per-atom energies
    for (let i = 0; i < n; i++) atoms[i].energy = 0;

    // For each atom i
    for (let i = 0; i < n; i++) {
      const ai = atoms[i];
      const si = ai.species;
      const nbs = ai.neighbors;

      // For each neighbor j of i
      for (let jn = 0; jn < nbs.length; jn++) {
        const j = nbs[jn].idx;
        const aj = atoms[j];
        const sj = aj.species;
        const rij = nbs[jn].r;

        // Mixed parameters
        const mix = p.getMixed(si, sj);
        if (rij >= mix.S) continue;

        const fcij = MD.tersoff.fc(rij, mix.R, mix.S);
        const fR = mix.A * Math.exp(-mix.lambda * rij);
        const fA = -mix.B * Math.exp(-mix.mu * rij);

        // Repulsive pair energy (counted once per pair via i<j convention and factor)
        epair += 0.5 * fcij * fR;
        ai.energy += 0.25 * fcij * fR;

        // Compute zeta_ij = sum over k != j of fc(rik) * omega * g(theta_ijk)
        let zetaij = 0;
        for (let kn = 0; kn < nbs.length; kn++) {
          if (kn === jn) continue;
          const k = nbs[kn].idx;
          const sk = atoms[k].species;
          const rik = nbs[kn].r;

          const mixIK = p.getMixed(si, sk);
          if (rik >= mixIK.S) continue;

          const fcik = MD.tersoff.fc(rik, mixIK.R, mixIK.S);

          // cos(theta_ijk)
          const dot = nbs[jn].dx * nbs[kn].dx + nbs[jn].dy * nbs[kn].dy + nbs[jn].dz * nbs[kn].dz;
          const cosTheta = dot / (rij * rik);

          const gijk = MD.tersoff.g(cosTheta, si);
          zetaij += fcik * p.omega[si][sk] * gijk;
        }

        // Bond order bij
        const bn = p.n[si];
        const bbeta = p.beta[si];
        const bz = Math.pow(bbeta * zetaij, bn);
        const bij = p.chi[si][sj] * Math.pow(1.0 + bz, -0.5 / bn);

        // Attractive three-body energy
        const eattr = 0.5 * fcij * bij * fA;
        ethree += eattr;
        ai.energy += 0.5 * eattr;
      }
    }

    // Surface energy calculation
    const stats = MD.crystal.getStats(slab);
    const bulkAtoms = atoms.filter(a => !a.isSurface);
    const eBulkPerAtom = bulkAtoms.length > 0
      ? bulkAtoms.reduce((s, a) => s + a.energy, 0) / bulkAtoms.length
      : (epair + ethree) / n;

    const totalE = epair + ethree;
    const surfE = stats.surfaceArea > 0
      ? (totalE - n * eBulkPerAtom) / stats.surfaceArea
      : 0;

    return {
      total: totalE,
      pair: epair,
      threebody: ethree,
      perAtom: totalE / n,
      bulkPerAtom: eBulkPerAtom,
      surfaceEnergy: surfE,
      surfaceArea: stats.surfaceArea
    };
  },

  /**
   * Run thickness sweep: build slabs of varying nz, compute surface energy
   * @param {number} nx
   * @param {number} ny
   * @param {number} xGe
   * @param {number[]} nzValues - array of thickness values
   * @param {function} onProgress - callback(i, total, result)
   * @returns {object[]} results array
   */
  thicknessSweep: function(nx, ny, xGe, nzValues, onProgress) {
    const results = [];

    for (let i = 0; i < nzValues.length; i++) {
      const nz = nzValues[i];
      const slab = MD.crystal.buildSlab(nx, ny, nz, xGe);
      const energy = MD.tersoff.computeEnergy(slab);
      const stats = MD.crystal.getStats(slab);

      const result = {
        nz: nz,
        nAtoms: stats.total,
        xGe: stats.xGe,
        thickness: slab.box.lz,
        totalEnergy: energy.total,
        perAtom: energy.perAtom,
        bulkPerAtom: energy.bulkPerAtom,
        surfaceEnergy: energy.surfaceEnergy,
        surfaceArea: energy.surfaceArea
      };

      results.push(result);
      if (onProgress) onProgress(i, nzValues.length, result);
    }

    return results;
  },

  /**
   * Simple steepest-descent relaxation
   * Move atoms slightly to reduce energy
   * @param {object} slab
   * @param {number} nSteps
   * @param {function} onStep - callback(step, energy)
   * @returns {number[]} energy history
   */
  relax: function(slab, nSteps, onStep) {
    const atoms = slab.atoms;
    const box = slab.box;
    const stepSize = 0.01; // Angstrom
    const energyHistory = [];

    for (let step = 0; step < nSteps; step++) {
      // Compute current energy
      const e0 = MD.tersoff.computeEnergy(slab);
      energyHistory.push(e0.total);
      if (onStep) onStep(step, e0.total);

      // For each non-fixed atom, try small perturbations
      for (let i = 0; i < atoms.length; i++) {
        const a = atoms[i];
        // Skip bottom-layer atoms (fixed substrate)
        if (a.z < slab.a0 * 0.3) continue;

        // Numerical gradient in x, y, z
        const dirs = ['x', 'y', 'z'];
        for (const dir of dirs) {
          const orig = a[dir];

          // Forward
          a[dir] = orig + stepSize;
          MD.crystal.findNeighbors(atoms, box);
          const eF = MD.tersoff.computeEnergy(slab).total;

          // Backward
          a[dir] = orig - stepSize;
          MD.crystal.findNeighbors(atoms, box);
          const eB = MD.tersoff.computeEnergy(slab).total;

          // Gradient
          const grad = (eF - eB) / (2 * stepSize);

          // Move downhill
          a[dir] = orig - 0.3 * stepSize * Math.sign(grad);
        }
      }

      // Rebuild neighbors after all moves
      MD.crystal.findNeighbors(atoms, box);
      MD.crystal.markSurface(atoms, box);
    }

    return energyHistory;
  }
};
