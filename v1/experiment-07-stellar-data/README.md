# Experiment 07 · Reading Starlight

**Domain:** Astrophysics / Data Science

Plot real star data by temperature vs luminosity and watch structure emerge: the Main Sequence, Red Giants, White Dwarfs, Supergiants. This is the Hertzsprung-Russell diagram — one of the most important plots in all of astrophysics.

## What Alexey Does
1. Predicts where different star types fall on the HR diagram before seeing data
2. Compares predictions against ~200 real stars from the Hipparcos telescope
3. Toggles stellar populations to see structure emerge
4. Explores color-coding by temperature, spectral class, and distance
5. Clicks individual stars to examine their properties
6. Traces stellar evolution — how a Sun-like star moves through the diagram over its lifetime

## Key Insight
The Main Sequence is not random — it is the physics of hydrogen fusion. Stars on it are all burning hydrogen, just at different rates depending on their mass. The HR diagram turns raw data into a physical story.

## Technical
- D3.js 7.8.5 (SVG scatter plot, zoom, brush, transitions)
- ~200 embedded star records (real + synthetic Hipparcos-based data)
- Log-scale axes, population overlays, stellar evolution track
