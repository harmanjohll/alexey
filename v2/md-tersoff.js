// md-tersoff.js — Tersoff potential energy computation
// Faithfully implements PRB 39, 5566 (1989)
// Mirrors pot_ter.f and en_ter.f from the Fortran codebase

const MD = window.MD || {};
window.MD = MD;

MD.tersoff = {
  /**
   * Cutoff function fc(r)
   */
  fc: function(r, R, S) {
    if (r < R) return 1.0;
    if (r > S) return 0.0;
    return 0.5 + 0.5 * Math.cos(Math.PI * (r - R) / (S - R));
  },

  /**
   * Angular function g(theta) for atom i with species si
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
   * Returns { total, pair, threebody, perAtom, surfaceEnergy, bulkPerAtom, surfaceArea }
   */
  computeEnergy: function(slab) {
    const atoms = slab.atoms;
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

      for (let jn = 0; jn < nbs.length; jn++) {
        const j = nbs[jn].idx;
        const aj = atoms[j];
        const sj = aj.species;
        const rij = nbs[jn].r;

        const mix = p.getMixed(si, sj);
        if (rij >= mix.S) continue;

        const fcij = MD.tersoff.fc(rij, mix.R, mix.S);
        const fR = mix.A * Math.exp(-mix.lambda * rij);
        const fA = -mix.B * Math.exp(-mix.mu * rij);

        // Repulsive pair energy
        epair += 0.5 * fcij * fR;
        ai.energy += 0.25 * fcij * fR;

        // Compute zeta_ij
        let zetaij = 0;
        for (let kn = 0; kn < nbs.length; kn++) {
          if (kn === jn) continue;
          const sk = atoms[nbs[kn].idx].species;
          const rik = nbs[kn].r;

          const mixIK = p.getMixed(si, sk);
          if (rik >= mixIK.S) continue;

          const fcik = MD.tersoff.fc(rik, mixIK.R, mixIK.S);
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
   * Composition sweep: surface energy vs Ge fraction
   * @param {number} nx, ny - xy cell count
   * @param {number} nz - number of z cells (uses buildDefaultSlab)
   * @param {number[]} xGeValues - array of Ge fractions to test
   * @param {function} onProgress - callback(i, total, result)
   * @returns {object[]} results
   */
  compositionSweep: function(nx, ny, nz, xGeValues, onProgress) {
    const results = [];
    for (let i = 0; i < xGeValues.length; i++) {
      const xGe = xGeValues[i];
      const slab = MD.crystal.buildDefaultSlab(nx, ny, nz, xGe);
      const energy = MD.tersoff.computeEnergy(slab);
      const stats = MD.crystal.getStats(slab);
      const layerDist = MD.crystal.getLayerDistribution(slab, 4);

      const result = {
        xGe: xGe,
        nAtoms: stats.total,
        totalEnergy: energy.total,
        perAtom: energy.perAtom,
        surfaceEnergy: energy.surfaceEnergy,
        surfaceArea: energy.surfaceArea,
        layerDistribution: layerDist
      };
      results.push(result);
      if (onProgress) onProgress(i, xGeValues.length, result);
    }
    return results;
  },

  /**
   * Strain sweep: surface energy vs lattice strain
   * @param {number} nx, ny, nz
   * @param {number} xGe
   * @param {number[]} strainXValues - array of x strains
   * @param {number[]} strainYValues - array of y strains
   * @param {function} onProgress
   * @returns {object[]} results (flat array for 2D sweep)
   */
  strainSweep: function(nx, ny, nz, xGe, strainXValues, strainYValues, onProgress) {
    const results = [];
    let count = 0;
    const total = strainXValues.length * strainYValues.length;

    for (let ix = 0; ix < strainXValues.length; ix++) {
      for (let iy = 0; iy < strainYValues.length; iy++) {
        const sx = strainXValues[ix];
        const sy = strainYValues[iy];
        const latt = MD.params.getLattice100Strained(xGe, sx, sy);
        const slab = MD.crystal.buildDefaultSlab(nx, ny, nz, xGe, latt);
        const energy = MD.tersoff.computeEnergy(slab);

        const result = {
          strainX: sx,
          strainY: sy,
          lattx: latt.lattx,
          latty: latt.latty,
          surfaceEnergy: energy.surfaceEnergy,
          perAtom: energy.perAtom,
          totalEnergy: energy.total
        };
        results.push(result);
        count++;
        if (onProgress) onProgress(count, total, result);
      }
    }
    return results;
  },

  /**
   * Thickness sweep: surface energy vs slab thickness
   * @param {number} nx, ny
   * @param {number} xGe
   * @param {number[]} nzValues
   * @param {function} onProgress
   * @returns {object[]} results
   */
  thicknessSweep: function(nx, ny, xGe, nzValues, onProgress) {
    const results = [];
    for (let i = 0; i < nzValues.length; i++) {
      const nz = nzValues[i];
      const slab = MD.crystal.buildDefaultSlab(nx, ny, nz, xGe);
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
  }
};
