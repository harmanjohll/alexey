# Experiment 02 · Planets That Never Collide

**Domain:** Computational Physics / Newtonian Mechanics

Simulate a 2D solar system with Newtonian gravity (F = GMm/r²). Place planets around a central star, set their velocities by dragging, and watch orbits form, destabilise, or escape. No calculus — all forces computed as small velocity changes each frame.

## What Alexey Does
1. Predicts what conditions create stable vs unstable orbits
2. Places up to 5 planets and sets their velocities by drag interaction
3. Observes orbit trails, force vectors, and energy conservation
4. Tests preset configurations (stable, elliptical, binary, near-escape)
5. Analyses energy drift from Euler integration

## Key Insight
Too fast → escape. Too slow → spiral in. The sweet spot is a stable orbit. Energy should be conserved, but Euler integration introduces drift — revealing the difference between mathematical idealisation and computational approximation.

## Technical
- p5.js 1.9.0 (instance mode, orbital simulation)
- Chart.js 4.4.0 (energy conservation chart)
- Euler integration per frame
