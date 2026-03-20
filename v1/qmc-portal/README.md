# QMC Portal · Quantum Particle in a Box

**Domain:** Quantum Monte Carlo / Quantum Mechanics

Variational Monte Carlo (VMC) and Diffusion Monte Carlo (DMC) for the quantum particle-in-a-box problem in 1D, 2D, and 3D, with optional fractal boundary conditions.

## Physics

- **Standard box**: analytical eigenstates E_n = n²π²ℏ²/(2mL²)
- **VMC**: Metropolis sampling of |ψ_trial|² to estimate ground-state energy via local energy
- **DMC**: diffusion-branching random walk that projects out the ground state
- **Fractal boundaries**: Koch snowflake, Sierpinski carpet, Menger sponge — confinement in fractal geometry changes the effective dimension and eigenvalue spectrum

## Features
- 1D, 2D, 3D dimension switching
- Variational and Diffusion Monte Carlo methods
- Energy convergence chart with running average and exact reference
- Walker distribution histogram (1D) / scatter (2D) / projection (3D)
- Wavefunction visualization with analytical comparison
- Local energy histogram
- Fractal boundary visualization and point-in-fractal tests
- Analytical reference panel (exact energy, quantum numbers, degeneracy, nodes)

## Technical
- Pure HTML/CSS/JS
- Chart.js 4.4.0 for plots
- Canvas API for wavefunction and boundary rendering
- Box-Muller transform for Gaussian random steps
