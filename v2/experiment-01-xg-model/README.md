# Experiment 01 · Where Do Goals Come From?

**Domain:** Computational Statistics / Probability

Build a geometric Expected Goals (xG) model for football. Every shot is assigned a probability based on distance and angle to goal. Place shots on an interactive pitch, then run 500 Monte Carlo simulations to discover the distribution of possible match outcomes.

## What Alexey Does
1. Writes a hypothesis about where goals come from
2. Places shots on a pitch canvas — each gets an xG value from the geometric model
3. Runs 500 Monte Carlo simulations with those exact shots
4. Interprets the histogram of outcomes
5. Engages in Socratic dialogue with the AI Coach

## Key Insight
The gap between xG and actual outcomes is variance. A team's shots might total 1.8 xG, but the simulation shows they could score 0, 1, 2, 3, or more — each with different probabilities.

## Technical
- Pure HTML/CSS/JS
- Chart.js 4.4.0 (histogram)
- Canvas API (pitch rendering)
