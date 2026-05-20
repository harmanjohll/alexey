# Cubelab — Learn the Rubik's Cube

An interactive Rubik's cube learning app built around Alexey's hand-drawn beginner-method flowchart.

## Modes

- **Learn** — Walks through the seven stages of the layer-by-layer method, with the chart's trigger language by default and standard cube notation behind a toggle. Click any algorithm token to demo it on the live cube.
- **Solve** — Scramble or paste a scramble, then choose:
  - ⚡ **Optimal solve** — Kociemba two-phase algorithm (~20 moves)
  - 📐 **Beginner method** — full layer-by-layer solution mirroring the chart
- **Time** — Speedcubing timer with hold-to-ready, scramble generator, personal bests (best, avg-5, avg-12), and history.

## How to use

- **Drag** the cube to rotate the view
- **Scroll** to zoom in/out
- Click the **face-turn buttons** (or press `R` `L` `U` `D` `F` `B`; hold `Shift` for prime, `Alt` for double turns)
- ⚡ **Scramble** randomises with a 22-move WCA-style sequence
- ↺ **Reset** returns to a solved cube

## Settings

In the gear menu:
- Sound effects (procedural — no audio files)
- Confetti particles on solve
- Haptic vibration on mobile
- Trigger language ⇄ standard cube notation
- (timer-mode) WCA inspection toggle

## Two corrections noted in the app

Where the app's lesson copy diverges from the original chart, a green "Updated from your chart" callout explains why:

1. **Yellow cross** uses the canonical `F R U R' U' F'` rather than `F U R U' R' F'` — the middle pair was swapped on the original.
2. **A final yellow-edge permutation step** (U-perm) is added. Without it, most scrambles can't actually finish — the chart ended one step short.

## Files

```
rubiks/
├── index.html          page structure
├── styles.css          Sottsass Arcade design system
├── cube-model.js       cube state wrapper (uses cubejs)
├── renderer.js         Three.js 3D cube + animated face turns
├── solver-beginner.js  layer-by-layer solver matching the chart
├── tutorial.js         Learn mode content (the seven stages)
├── timer.js            speedcubing timer + PB tracking
└── app.js              glue: modes, settings, sound, confetti
```

## Stack

Pure HTML / CSS / vanilla JS. Three.js for 3D, cubejs for cube state and Kociemba solver, all from public CDNs. No build step, no npm, no framework.

Open `index.html` directly or serve over any static file host.
