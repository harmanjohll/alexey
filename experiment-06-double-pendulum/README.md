# Experiment 06 · Two Pendulums, Two Futures

**Domain:** Classical Mechanics / Chaos Theory

Two double pendulums start almost identically — one angle differs by a fraction of a degree. Watch them diverge completely. The physics is perfectly deterministic, yet prediction becomes impossible. This is sensitive dependence on initial conditions.

## What Alexey Does
1. Predicts how quickly two near-identical pendulums will diverge
2. Watches twin pendulums (green and amber) evolve side by side
3. Observes tip trace art — beautiful chaotic patterns drawn by the pendulum tips
4. Measures divergence rate from the real-time chart
5. Estimates the Lyapunov exponent (how fast divergence doubles)
6. Tests presets from "near vertical" (extreme sensitivity) to "low energy" (mostly periodic)

## Key Insight
Chaos is not randomness — it is extreme sensitivity to initial conditions in a fully deterministic system. The Lyapunov exponent quantifies this: a positive exponent means nearby trajectories diverge exponentially.

## Technical
- p5.js 1.9.0 (instance mode, pendulum animation)
- Chart.js 4.4.0 (divergence chart)
- Runge-Kutta 4 integration of Lagrangian equations of motion
