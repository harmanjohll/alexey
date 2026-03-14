# Experiment 05 · The Drunkard's Walk

**Domain:** Probability / Statistical Physics / Monte Carlo

Simulate hundreds of random walkers taking steps in random directions. Watch them spread out and discover the fundamental law: average distance grows as √N, not N. This principle underlies Brownian motion, stock prices, and diffusion.

## What Alexey Does
1. Predicts how far walkers will spread after N steps
2. Runs animated simulations with 10–500 walkers in 1D and 2D
3. Watches the RMS distance track the theoretical √N curve in real time
4. Compares final position histograms to theoretical distributions
5. Saves batches with different parameters to verify: 4× steps → 2× spread
6. Highlights individual walker paths to study single trajectories

## Key Insight
Spread grows as √N, not N. Four times more steps gives only twice the average distance from the start. This square-root scaling is universal across random processes.

## Technical
- p5.js 1.9.0 (instance mode, walker animation)
- Chart.js 4.4.0 (RMS chart, histogram)
- Box-Muller transform for Gaussian step option
