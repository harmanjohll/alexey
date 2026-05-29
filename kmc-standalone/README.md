# KMC — SiGe Thin Film Simulator

A 2D Kinetic Monte Carlo simulator for silicon-germanium thin-film etching,
ported from a Fortran 90 research code to run entirely in the browser via a
Web Worker. The physics — desorption, surface diffusion, and bulk diffusion
under a Metropolis criterion — comes from the reference implementation kept
under `FortranReference/KMC/`. The web app adds visualisation, parameter
sweeps, roughness analysis (RMS, β, α, ξ), pit tracking, a measurement
cookbook, and a composite PNG report builder.

## Running it

This app uses a Web Worker. Browsers block workers loaded from `file://`,
so opening `index.html` by double-click won't run the simulation. Serve the
folder over HTTP instead:

```bash
cd kmc-standalone
python3 -m http.server 8000
# open http://localhost:8000/
```

On GitHub Pages it works out of the box. The `.nojekyll` file in the repo
root keeps Pages from filtering `_common/` (Jekyll otherwise drops folders
that start with `_`).

## What you control

- **Lattice** — width × height (e.g. 512 × 2048).
- **Temperature** — in Kelvin (e.g. 500 K, 800 K).
- **θ (theta)** — Ge fraction, 0–1.
- **P_des** — desorption probability per surface atom.
- **Interaction energies** — Si–Si, Si–Ge, Ge–Ge, Si–vacancy, Ge–vacancy.
- **Iterations** and **seed**.

Presets (default / highGe / highTemp / noDesorp) preload sensible parameter
sets so you can compare regimes quickly.

## What you measure

- **RMS roughness** — surface height standard deviation over time.
- **β** — power-law growth exponent (RMS ∝ t^β), fitted live in log–log.
- **α** — roughness exponent (spatial scaling).
- **ξ** — correlation length.
- **Pits** — count, width, depth, nucleation and death rates.
- **Concentration profiles** — Si/Ge composition across depth.

The cookbook tab lets you repeat a measurement protocol across runs; the
report builder exports a composite PNG of the charts and stats you select.

## Layout

```
kmc-standalone/
├── index.html              UI shell
├── app.js                  app init + parameter UI + Worker glue
├── worker-kmc.js           Web Worker — the KMC engine
├── charts.js               Chart.js plots, β fitting
├── data.js                 pit registry, scaling exponents, logbook
├── sweep.js                temperature / composition / desorption sweeps
├── cookbook.js             measurement protocol
├── report.js               composite PNG report builder
├── lattice-render.js       canvas rendering of lattice and heightmap
├── styles.css              local design system
├── _common/
│   ├── theme.css           CSS custom properties (colours, fonts, accents)
│   ├── theme.js            light/dark theme toggle
│   └── store.js            unified localStorage schema (exp.<id>.<field>)
├── FortranReference/KMC/
│   ├── 2d.f                original Fortran 90 source
│   ├── input               reference parameter file
│   └── readme              header
├── .nojekyll               disable Jekyll processing on GitHub Pages
└── README.md
```

## External dependencies

All loaded from CDN at runtime; cached by the browser after first load.

- [Chart.js 4.4.0](https://cdnjs.com/libraries/Chart.js) — plots.
- Google Fonts — Instrument Serif, Space Grotesk, Space Mono.

## Credits

Web app and instrumentation by Alexey Mikhail Johll (Singapore, 2025–2026).
KMC physics from the reference Fortran implementation in
`FortranReference/KMC/2d.f`.
