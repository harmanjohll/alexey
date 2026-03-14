# Experiment 04 · How Long Is a Coastline?

**Domain:** Fractal Geometry / Monte Carlo Measurement

The coastline paradox: the length you measure depends on the size of your ruler. As the ruler shrinks, the measured length grows without bound. Generate fractal shapes, measure them with different ruler sizes, and discover that fractals have dimensions between 1 and 2.

## What Alexey Does
1. Generates Koch snowflakes at increasing iteration depths (0–6)
2. Watches perimeter grow by 4/3 at each iteration
3. Measures the boundary with different ruler sizes
4. Plots a log-log graph to compute fractal dimension from the slope
5. Runs Monte Carlo area estimation with thousands of random points
6. Compares measured dimension to theoretical (log4/log3 ≈ 1.2619)

## Key Insight
Fractals have dimension between 1 and 2. The Koch snowflake's boundary is infinite in length but encloses finite area. Real coastlines behave similarly — Britain's coastline has a fractal dimension of approximately 1.25.

## Technical
- D3.js 7.8.5 (SVG fractal rendering, Monte Carlo points)
- Chart.js 4.4.0 (perimeter chart, log-log plot, convergence chart)
- Ray-casting point-in-polygon for Monte Carlo
