# Experiment 03 · The Edge of Chaos

**Domain:** Dynamical Systems / Chaos Theory

One equation: x(n+1) = r · x(n) · (1 - x(n)). One parameter r. Completely deterministic. Yet it produces chaos. Explore the bifurcation diagram, watch order break down, and discover that simple rules can generate infinite complexity.

## What Alexey Does
1. Computes 3 iterations by hand before the simulation unlocks
2. Explores the bifurcation diagram across r = 1 to 4
3. Watches time series behaviour change from stable → periodic → chaotic
4. Uses the cobweb diagram to visualise the iteration process geometrically
5. Zooms into the bifurcation diagram to discover fractal self-similarity
6. Computes Lyapunov exponents to quantify chaos

## Key Insight
At r ≈ 3.57, the system becomes chaotic. Tiny changes in r produce wildly different long-term behaviour. The Feigenbaum ratio (4.669...) governs the rate of period-doubling — a universal constant that appears in many chaotic systems.

## Technical
- Chart.js 4.4.0 (time series)
- Canvas API (bifurcation diagram, cobweb diagram)
- Progressive rendering to avoid UI freezing
