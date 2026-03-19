// md-crystal.js — (100) surface slab builder (Structure 8)
// Matches tersoff/main.f line 1243: slab 100 surfaces oriented along dimer row
// x-axis: dimer row, y-axis: dimer bond, z: perpendicular to (100) surface
// 16 atoms per unit cell, dimer reconstruction on top and bottom surfaces

const MD = window.MD || {};
window.MD = MD;

MD.crystal = {
  // Structure 8 basis: 16 atoms per unit cell (a-set and b-set)
  // Positions as fractions of (lattx, latty, lattz)
  // Atoms 1-8 (a-set, x < 0.5*lattx) and 1b-8b (b-set, x >= 0.5*lattx)
  basis: [
    // a-set
    { fx: 0.00, fy: 0.00, fz: 0.00, dimerBottom: true  },  // 1
    { fx: 0.00, fy: 0.25, fz: 0.25, dimerBottom: false },  // 2
    { fx: 0.00, fy: 0.50, fz: 0.00, dimerBottom: true  },  // 3
    { fx: 0.00, fy: 0.75, fz: 0.25, dimerBottom: false },  // 4
    { fx: 0.25, fy: 0.25, fz: 0.50, dimerBottom: false },  // 5
    { fx: 0.25, fy: 0.75, fz: 0.50, dimerBottom: false },  // 6
    { fx: 0.25, fy: 0.00, fz: 0.75, dimerBottom: false },  // 7
    { fx: 0.25, fy: 0.50, fz: 0.75, dimerBottom: false },  // 8
    // b-set
    { fx: 0.50, fy: 0.00, fz: 0.00, dimerBottom: true  },  // 1b
    { fx: 0.50, fy: 0.25, fz: 0.25, dimerBottom: false },  // 2b
    { fx: 0.50, fy: 0.50, fz: 0.00, dimerBottom: true  },  // 3b
    { fx: 0.50, fy: 0.75, fz: 0.25, dimerBottom: false },  // 4b
    { fx: 0.75, fy: 0.25, fz: 0.50, dimerBottom: false },  // 5b
    { fx: 0.75, fy: 0.75, fz: 0.50, dimerBottom: false },  // 6b
    { fx: 0.75, fy: 0.00, fz: 0.75, dimerBottom: false },  // 7b
    { fx: 0.75, fy: 0.50, fz: 0.75, dimerBottom: false },  // 8b
  ],

  // Top surface dimer atoms: 4 per xy cell, placed at z = ncellzf * lattz
  // These form dimers along y-direction (dimer bond axis)
  topDimerBasis: [
    { fx: 0.00, fy_disp: +1 },  // y = j*latty + disp
    { fx: 0.50, fy_disp: +1 },  // y = j*latty + disp
    { fx: 0.00, fy_disp: -1 },  // y = (j+0.5)*latty - disp
    { fx: 0.50, fy_disp: -1 },  // y = (j+0.5)*latty - disp
  ],

  /**
   * Build a (100) surface slab with Structure 8 geometry
   * @param {number} nx - unit cells in x (typically 1 for 1×1, 3 for research)
   * @param {number} ny - unit cells in y
   * @param {number} nczi - starting z cell index (Fortran: ncellzi, typically 2)
   * @param {number} nczf - ending z cell index (Fortran: ncellzf, typically 4)
   * @param {number} xGe - Ge fraction 0..1
   * @param {object} [lattOverride] - optional {lattx, latty, lattz} for strain studies
   * @returns {object} slab object
   */
  buildSlab: function(nx, ny, nczi, nczf, xGe, lattOverride) {
    const p = MD.params;
    const latt = lattOverride || p.getLattice100(xGe);
    const { lattx, latty, lattz } = latt;
    const disp = p.disp;
    const atoms = [];
    const nzCells = nczf - nczi + 1;

    // Build bulk layers: loop over cells (i, j, k)
    for (let k = nczi; k <= nczf; k++) {
      for (let j = 0; j < ny; j++) {
        for (let i = 0; i < nx; i++) {
          for (let ib = 0; ib < 16; ib++) {
            const b = MD.crystal.basis[ib];
            let x = (i + b.fx) * lattx;
            let y = (j + b.fy) * latty;
            let z = ((k - nczi) + b.fz) * lattz;

            // Dimer reconstruction on bottom surface (k == nczi, fz == 0)
            if (b.dimerBottom && k === nczi) {
              // a-set atoms 1,3 shift +disp in x; b-set atoms 1b,3b shift -disp in x
              if (b.fx < 0.5) {
                x += disp;
              } else {
                x -= disp;
              }
            }

            const species = Math.random() < xGe ? 1 : 0;
            atoms.push({
              x: x, y: y, z: z,
              species: species,
              neighbors: [],
              coordination: 0,
              isSurface: false,
              energy: 0,
              layer: -1  // assigned later
            });
          }
        }
      }
    }

    // Top surface dimer atoms: added at z = nzCells * lattz (top of slab)
    const zTop = nzCells * lattz;
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        for (let id = 0; id < 4; id++) {
          const td = MD.crystal.topDimerBasis[id];
          const x = (i + td.fx) * lattx;
          let y;
          if (td.fy_disp > 0) {
            y = j * latty + disp;
          } else {
            y = (j + 0.50) * latty - disp;
          }

          const species = Math.random() < xGe ? 1 : 0;
          atoms.push({
            x: x, y: y, z: zTop,
            species: species,
            neighbors: [],
            coordination: 0,
            isSurface: true,
            energy: 0,
            layer: -1
          });
        }
      }
    }

    const box = {
      lx: nx * lattx,
      ly: ny * latty,
      lz: nzCells * lattz
    };

    const slab = {
      atoms: atoms,
      box: box,
      lattx: lattx,
      latty: latty,
      lattz: lattz,
      a0: p.getLattice(xGe),
      nx: nx, ny: ny,
      nczi: nczi, nczf: nczf,
      nzCells: nzCells,
      xGe: xGe
    };

    // Assign layer indices
    MD.crystal.assignLayers(slab);

    // Find neighbors
    MD.crystal.findNeighbors(atoms, box);

    // Mark surface atoms
    MD.crystal.markSurface(atoms, box);

    return slab;
  },

  /**
   * Convenience: build slab with default nczi=2, nczf=4 (3 cells, matching Fortran defaults)
   */
  buildDefaultSlab: function(nx, ny, nz, xGe, lattOverride) {
    return MD.crystal.buildSlab(nx, ny, 2, 2 + nz - 1, xGe, lattOverride);
  },

  /**
   * Assign each atom to a z-sublayer index.
   * Structure 8 has 4 z-sublayers per unit cell at fz = 0, 0.25, 0.50, 0.75.
   * Plus top dimer atoms form their own layer.
   * Layers numbered 1..N from bottom to top.
   */
  assignLayers: function(slab) {
    const atoms = slab.atoms;
    const lattz = slab.lattz;
    const tol = 0.5; // tolerance in Angstroms for grouping

    // Collect unique z values
    const zVals = [];
    for (let i = 0; i < atoms.length; i++) {
      const z = atoms[i].z;
      let found = false;
      for (let j = 0; j < zVals.length; j++) {
        if (Math.abs(z - zVals[j]) < tol) {
          found = true;
          break;
        }
      }
      if (!found) zVals.push(z);
    }
    zVals.sort((a, b) => a - b);

    // Assign layer index (1-based from bottom)
    for (let i = 0; i < atoms.length; i++) {
      const z = atoms[i].z;
      for (let j = 0; j < zVals.length; j++) {
        if (Math.abs(z - zVals[j]) < tol) {
          atoms[i].layer = j + 1;
          break;
        }
      }
    }

    slab.nLayers = zVals.length;
    slab.layerZ = zVals;
  },

  /**
   * Find neighbors within Tersoff cutoff
   */
  findNeighbors: function(atoms, box) {
    const rcut = 3.1; // max S parameter
    const rcut2 = rcut * rcut;
    const n = atoms.length;

    for (let i = 0; i < n; i++) {
      atoms[i].neighbors = [];
      atoms[i].coordination = 0;
    }

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        let dx = atoms[j].x - atoms[i].x;
        let dy = atoms[j].y - atoms[i].y;
        let dz = atoms[j].z - atoms[i].z;

        // Periodic BC in x, y only (free surface in z)
        if (dx > box.lx / 2) dx -= box.lx;
        else if (dx < -box.lx / 2) dx += box.lx;
        if (dy > box.ly / 2) dy -= box.ly;
        else if (dy < -box.ly / 2) dy += box.ly;

        const r2 = dx * dx + dy * dy + dz * dz;
        if (r2 < rcut2) {
          const r = Math.sqrt(r2);
          atoms[i].neighbors.push({ idx: j, r: r, dx: dx, dy: dy, dz: dz });
          atoms[j].neighbors.push({ idx: i, r: r, dx: -dx, dy: -dy, dz: -dz });
        }
      }
    }

    // Count coordination (bonds within ~2.6 A)
    for (let i = 0; i < n; i++) {
      atoms[i].coordination = atoms[i].neighbors.filter(nb => nb.r < 2.6).length;
    }
  },

  /**
   * Mark surface atoms — those with coordination < 4 or near z boundaries
   */
  markSurface: function(atoms, box) {
    const zmin = Math.min(...atoms.map(a => a.z));
    const zmax = Math.max(...atoms.map(a => a.z));

    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      a.isSurface = (a.coordination < 4) ||
                    (a.z - zmin < 1.5) ||
                    (zmax - a.z < 1.5);
    }
  },

  /**
   * Get Ge distribution across symmetric layer pairs.
   * Layer 1 & N are both surfaces, layer 2 & N-1 are sub-surface, etc.
   * Returns averaged Ge fraction for first nPairs pairs.
   *
   * @param {object} slab
   * @param {number} nPairs - number of symmetric pairs to compute (default 4)
   * @returns {object[]} array of { pair, layerA, layerB, nGe, nTotal, geFraction }
   */
  getLayerDistribution: function(slab, nPairs) {
    nPairs = nPairs || 4;
    const atoms = slab.atoms;
    const N = slab.nLayers;
    const results = [];

    for (let p = 0; p < nPairs && p < Math.floor(N / 2); p++) {
      const layerA = p + 1;        // bottom side
      const layerB = N - p;        // top side (symmetric partner)

      let nGe = 0;
      let nTotal = 0;

      for (let i = 0; i < atoms.length; i++) {
        if (atoms[i].layer === layerA || atoms[i].layer === layerB) {
          nTotal++;
          if (atoms[i].species === 1) nGe++;
        }
      }

      results.push({
        pair: p + 1,
        layerA: layerA,
        layerB: layerB,
        nGe: nGe,
        nTotal: nTotal,
        geFraction: nTotal > 0 ? nGe / nTotal : 0
      });
    }

    return results;
  },

  /**
   * Count stats for the slab
   */
  getStats: function(slab) {
    const atoms = slab.atoms;
    const nSi = atoms.filter(a => a.species === 0).length;
    const nGe = atoms.filter(a => a.species === 1).length;
    const nSurf = atoms.filter(a => a.isSurface).length;
    const nBulk = atoms.length - nSurf;

    // Coordination histogram
    const coordHist = [0, 0, 0, 0, 0];
    atoms.forEach(a => {
      const c = Math.min(a.coordination, 4);
      coordHist[c]++;
    });

    return {
      total: atoms.length,
      nSi: nSi,
      nGe: nGe,
      xGe: nGe / atoms.length,
      nSurface: nSurf,
      nBulk: nBulk,
      coordHist: coordHist,
      nLayers: slab.nLayers,
      surfaceArea: 2 * slab.box.lx * slab.box.ly  // top + bottom
    };
  },

  /**
   * Swap species of two atoms (for MC moves)
   */
  swapSpecies: function(atoms, i, j) {
    const tmp = atoms[i].species;
    atoms[i].species = atoms[j].species;
    atoms[j].species = tmp;
  },

  /**
   * Change species of one atom (for grand canonical MC)
   */
  changeSpecies: function(atoms, i) {
    atoms[i].species = atoms[i].species === 0 ? 1 : 0;
  }
};
