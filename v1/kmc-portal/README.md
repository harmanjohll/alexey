# KMC Portal · SiGe Thin Film Simulator

**Domain:** Kinetic Monte Carlo / Materials Science

Faithful browser implementation of a 2D Kinetic Monte Carlo simulation for Silicon-Germanium thin film etching, translated from FORTRAN90 (`2d.f`).

## Physics

Three processes on a 2D lattice (1000×5000):
- **Desorption**: surface atoms removed with configurable probability, gated by neighbor environment
- **Surface diffusion**: atoms hop between adjacent columns via Metropolis energy criterion
- **Bulk diffusion**: interior atoms swap species via Metropolis criterion

Five pair interaction energies (Si-Si, Si-Ge, Ge-Ge, Si-vacancy, Ge-vacancy) converted from kcal/mol to Boltzmann units at the specified temperature.

## Features
- Full-scale lattice matching FORTRAN parameters
- Web Worker for non-blocking computation
- Live lattice cross-section visualization
- Log-log roughness plot, surface profile, concentration profile
- Iteration snapshots at 1, 10, 20, 50, 100, 200, 500
- Parameter presets (default, high Ge, high temp, no desorption)

## Technical
- Pure HTML/CSS/JS with inline Web Worker (Blob URL)
- Chart.js 4.4.0 for plots
- Canvas API for lattice rendering
