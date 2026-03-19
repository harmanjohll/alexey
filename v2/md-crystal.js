// md-crystal.js — Diamond cubic crystal builder
// Generates SiGe slab structures for the MD simulation

const MD = window.MD || {};
window.MD = MD;

MD.crystal = {
  // Diamond cubic basis positions (fractional coordinates)
  // 8 atoms per conventional cubic cell
  basis: [
    [0.00, 0.00, 0.00],
    [0.50, 0.50, 0.00],
    [0.50, 0.00, 0.50],
    [0.00, 0.50, 0.50],
    [0.25, 0.25, 0.25],
    [0.75, 0.75, 0.25],
    [0.75, 0.25, 0.75],
    [0.25, 0.75, 0.75]
  ],

  /**
   * Build a slab with given dimensions and Ge composition
   * @param {number} nx - unit cells in x
   * @param {number} ny - unit cells in y
   * @param {number} nz - unit cells in z (thickness direction)
   * @param {number} xGe - Ge fraction 0..1
   * @returns {object} { atoms: [{x,y,z,species,neighbors}], box: {lx,ly,lz}, a0 }
   */
  buildSlab: function(nx, ny, nz, xGe) {
    const a0 = MD.params.getLattice(xGe);
    const atoms = [];

    for (let iz = 0; iz < nz; iz++) {
      for (let iy = 0; iy < ny; iy++) {
        for (let ix = 0; ix < nx; ix++) {
          for (let ib = 0; ib < 8; ib++) {
            const bx = MD.crystal.basis[ib][0];
            const by = MD.crystal.basis[ib][1];
            const bz = MD.crystal.basis[ib][2];

            const x = (ix + bx) * a0;
            const y = (iy + by) * a0;
            const z = (iz + bz) * a0;

            // Assign species: 0=Si, 1=Ge based on composition
            const species = Math.random() < xGe ? 1 : 0;

            atoms.push({
              x: x, y: y, z: z,
              species: species,
              neighbors: [],
              coordination: 0,
              isSurface: false,
              energy: 0
            });
          }
        }
      }
    }

    const box = {
      lx: nx * a0,
      ly: ny * a0,
      lz: nz * a0
    };

    // Find neighbors within cutoff
    MD.crystal.findNeighbors(atoms, box);

    // Mark surface atoms (z near top or bottom, or low coordination)
    MD.crystal.markSurface(atoms, box);

    return { atoms: atoms, box: box, a0: a0, nx: nx, ny: ny, nz: nz, xGe: xGe };
  },

  /**
   * Find neighbors for each atom using max cutoff
   */
  findNeighbors: function(atoms, box) {
    const rcut = 3.1; // Max S parameter
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

        // Periodic BC in x, y only (slab has free surface in z)
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

    // Count coordination (bonds within ~2.6 A, typical Si-Si bond ~ 2.35 A)
    for (let i = 0; i < n; i++) {
      atoms[i].coordination = atoms[i].neighbors.filter(nb => nb.r < 2.6).length;
    }
  },

  /**
   * Mark surface atoms — those with coordination < 4
   */
  markSurface: function(atoms, box) {
    const zmin = Math.min(...atoms.map(a => a.z));
    const zmax = Math.max(...atoms.map(a => a.z));

    for (let i = 0; i < atoms.length; i++) {
      const a = atoms[i];
      // Surface if undercoordinated or near z boundaries
      a.isSurface = (a.coordination < 4) ||
                    (a.z - zmin < 1.5) ||
                    (zmax - a.z < 1.5);
    }
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
      surfaceArea: 2 * slab.box.lx * slab.box.ly // top + bottom
    };
  }
};
