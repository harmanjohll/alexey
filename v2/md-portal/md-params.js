// md-params.js — Tersoff potential parameters for Si and Ge
// Reference: PRB 39, 5566 (1989) — Tersoff T3 parameterization
// Mirrors common1.f90 from the Fortran codebase

var MD = window.MD || {};
window.MD = MD;

MD.params = {
  // Species indices: 0 = Si, 1 = Ge
  species: ['Si', 'Ge'],

  // Single-element parameters [Si, Ge]
  A:      [1830.8,    1769.0],
  B:      [471.18,    419.23],
  lambda: [2.4799,    2.4451],
  mu:     [1.7322,    1.7047],
  beta:   [1.1e-6,    9.0166e-7],
  n:      [0.78734,   0.75627],
  c:      [100390.0,  106430.0],
  d:      [16.217,    15.652],
  h:      [-0.59825,  -0.43884],
  R:      [2.85,      2.95],    // Rij cutoff inner
  S:      [3.00,      3.10],    // Sij cutoff outer

  // Mixing: chi and omega matrices [i][j]
  chi: [
    [1.0, 1.00061],
    [1.00061, 1.0]
  ],
  omega: [
    [1.0, 1.0],
    [1.0, 1.0]
  ],

  // Lattice constants (Angstroms)
  a0_Si: 5.431,
  a0_Ge: 5.657,

  // Masses (amu)
  mass_Si: 28.0855,
  mass_Ge: 72.630,

  // Dimer reconstruction parameters (from common1.f90)
  disp: 0.745,    // dimer bond displacement (Angstrom)
  dispz: 0.1,     // dimer z-buckling (Angstrom)

  // Boltzmann constant in eV/K
  kB: 8.617333262e-5,

  // Mixed pair parameters (combining rules)
  getMixed: function(s1, s2) {
    const p = MD.params;
    return {
      A: Math.sqrt(p.A[s1] * p.A[s2]),
      B: Math.sqrt(p.B[s1] * p.B[s2]),
      lambda: (p.lambda[s1] + p.lambda[s2]) / 2,
      mu: (p.mu[s1] + p.mu[s2]) / 2,
      R: Math.sqrt(p.R[s1] * p.R[s2]),
      S: Math.sqrt(p.S[s1] * p.S[s2]),
      chi: p.chi[s1][s2],
      omega: p.omega[s1][s2]
    };
  },

  // Vegard's law for bulk cubic lattice constant
  getLattice: function(xGe) {
    return MD.params.a0_Si * (1 - xGe) + MD.params.a0_Ge * xGe;
  },

  // (100) surface lattice parameters
  // x-axis: dimer row, y-axis: dimer bond, z: perpendicular to (100)
  // lattx = latty = 2 * a0 / sqrt(2), lattz = a0
  getLattice100: function(xGe) {
    const a0 = MD.params.getLattice(xGe);
    return {
      lattx: 2 * a0 / Math.sqrt(2),
      latty: 2 * a0 / Math.sqrt(2),
      lattz: a0
    };
  },

  // (100) surface lattice with independent strain override
  // strainX, strainY are fractional strains (e.g. 0.05 = 5% tensile)
  getLattice100Strained: function(xGe, strainX, strainY) {
    const eq = MD.params.getLattice100(xGe);
    return {
      lattx: eq.lattx * (1 + strainX),
      latty: eq.latty * (1 + strainY),
      lattz: eq.lattz  // z relaxes freely (free surface)
    };
  },

  // Mass in eV·fs²/Å² (for dynamics)
  getMass: function(species) {
    const amu = species === 0 ? MD.params.mass_Si : MD.params.mass_Ge;
    return amu * 1.0364e-4; // 1 amu = 1.0364e-4 eV·fs²/Å²
  }
};
