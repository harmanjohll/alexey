# CLAUDE.md — Alexey's Science Portfolio
# Read this file completely before doing anything.
# This is the canonical specification for every session.

---

## WHO THIS IS FOR

**Student:** Alexey Mikhail Johll, age 14, Singapore
**Purpose:** University and scholarship portfolio — demonstrating capacity
in scientific thinking, STEM reasoning, and science communication
**Interests:** Football, astronomy, mathematics, systems thinking
**Coding level:** Zero. He never touches code. Ever.

---

## THE ONE RULE THAT OVERRIDES EVERYTHING

This platform exists to capture **Alexey's thinking**, not to demonstrate AI capability.

Every experiment enforces this sequence — no exceptions:
1. Alexey writes his hypothesis **in his own words**
2. He locks it (timestamped, read-only, saved to localStorage)
3. Only then does the simulation unlock
4. He interprets the results in his own words
5. The AI Coach asks him **one Socratic question** — never gives answers

His hypothesis and interpretation are the primary evidence of his intellectual work.
The computation is the tool. His thinking is the product.

---

## REPOSITORY STRUCTURE

```
alexey-science-portfolio/
├── CLAUDE.md                          ← this file
├── README.md                          ← GitHub-facing project description
├── index.html                         ← Portfolio home / cockpit
├── experiment-01-xg-model/
│   ├── index.html                     ← REFERENCE IMPLEMENTATION (see below)
│   └── README.md
├── experiment-02-orbital-mechanics/
│   ├── index.html
│   └── README.md
├── experiment-03-chaos-logistic/
│   ├── index.html
│   └── README.md
├── experiment-04-fractal-coastline/
│   ├── index.html
│   └── README.md
├── experiment-05-random-walk/
│   ├── index.html
│   └── README.md
├── experiment-06-double-pendulum/
│   ├── index.html
│   └── README.md
└── experiment-07-stellar-data/
    ├── index.html
    └── README.md
```

Each experiment is a **single self-contained HTML file**.
No build tools. No npm. No frameworks. No package.json.
Pure HTML + CSS + JS + CDN libraries only.
Must work when opened directly in a browser AND via GitHub Pages.

---

## THE 7 EXPERIMENTS

### Experiment 01 · Where Do Goals Come From? (xG Model)
- **Domain:** Computational statistics / probability
- **Core concept:** Expected Goals (xG) — probability assigned to football shots based on geometry (distance + angle to goal)
- **Method:** Interactive pitch canvas, geometric xG model, Monte Carlo simulation (500 runs), histogram of outcomes
- **Key insight:** The gap between xG and actual outcomes is variance. Why do teams outperform their xG?
- **Status:** REFERENCE IMPLEMENTATION PROVIDED BELOW — rebuild faithfully

### Experiment 02 · Planets That Never Collide (Orbital Mechanics)
- **Domain:** Computational physics / Newtonian mechanics
- **Core concept:** F = GMm/r². No calculus. Euler integration (simple timestep arithmetic: Δv per frame).
- **Method:** 2D solar system simulation. User adds planets, sets initial velocity, watches orbits form or destabilise. Show force vectors as arrows.
- **Alexey controls:** Mass of central body, initial velocity, distance from centre
- **Key insight:** Too fast → escape. Too slow → spiral in. The sweet spot is a stable orbit.
- **No calculus:** All forces computed as Δv per frame. Just multiplication and addition.

### Experiment 03 · The Edge of Chaos (Logistic Map)
- **Domain:** Dynamical systems / chaos theory
- **Core concept:** x(n+1) = r · x(n) · (1 - x(n)). One equation. One parameter r. Completely deterministic. Produces chaos.
- **Method:** Bifurcation diagram — plot long-term behaviour for every r from 1 to 4. Also: time series view for chosen r.
- **Alexey controls:** r slider (drag 1 → 4, watch order break), starting population x₀, iterations shown
- **Key insight:** At r ≈ 3.57, the system becomes chaotic. Tiny changes → wildly different outcomes.
- **No calculus:** Just repeated multiplication. Have Alexey compute 3 steps by hand in his hypothesis.

### Experiment 04 · How Long Is a Coastline? (Fractal Dimension)
- **Domain:** Fractal geometry / Monte Carlo measurement
- **Core concept:** The coastline paradox — measured length depends on ruler size. As ruler shrinks, length grows toward infinity.
- **Method:** (a) Koch snowflake generator showing perimeter growth per iteration. (b) Monte Carlo area estimator — drop 5000 random points, count fraction inside fractal.
- **Alexey controls:** Iteration depth (1–6), number of Monte Carlo points
- **Key insight:** Fractals have dimension between 1 and 2. Introduce fractal dimension qualitatively.

### Experiment 05 · The Drunkard's Walk (Random Walk)
- **Domain:** Probability / statistical physics / Monte Carlo
- **Core concept:** After N steps, average distance from origin ≈ √N. Underlies Brownian motion, stock prices, diffusion.
- **Method:** Simulate 50–200 walkers simultaneously. Show paths as faint traces, envelope of spread, histogram of final positions.
- **Alexey controls:** Number of walkers, number of steps, step size (uniform vs variable)
- **Key insight:** Spread grows as √N not N. 4× more steps → only 2× further on average.
- **Extension:** Compare 1D vs 2D walk.

### Experiment 06 · Two Pendulums, Two Futures (Double Pendulum)
- **Domain:** Classical mechanics / chaos theory
- **Core concept:** Two double pendulums with almost identical starting conditions diverge rapidly and completely.
- **Method:** Simulate two pendulums simultaneously. Pendulum A: θ = 120°. Pendulum B: θ = 120.001°. Show paths overlaid. Show divergence. Draw tip trace.
- **Alexey controls:** Starting angle difference (0.001° to 5°), arm length ratio, preset: "near vertical" vs "wild"
- **Implementation:** Use pre-computed Runge-Kutta integration in the simulation. Alexey adjusts and observes — does not need to understand the integration.
- **Key insight:** Introduce Lyapunov exponent qualitatively — how many steps until paths differ by more than 10°?

### Experiment 07 · Reading Starlight (HR Diagram)
- **Domain:** Astrophysics / data science
- **Core concept:** Hertzsprung-Russell diagram — plot real stars by temperature vs luminosity. Structure emerges: Main Sequence, Red Giants, White Dwarfs.
- **Method:** Embed ~1000 real Hipparcos dataset star points as JSON in the HTML. Interactive scatter plot. Click individual stars for data.
- **Alexey controls:** Toggle stellar populations, colour coding (by temperature / distance / mass), zoom and pan
- **Key insight:** The Main Sequence is not random — it's the physics of hydrogen fusion. Data telling a physical story, like xG did for football.

---

## MANDATORY STRUCTURE — EVERY EXPERIMENT

Every experiment HTML must have exactly these four sections:

### Step 01 — Hypothesis
- Textarea where Alexey writes his prediction
- "Lock hypothesis and begin" button
- Once locked: text becomes read-only, green glow border, timestamp displayed
- Simulation is DISABLED until hypothesis is locked
- Save to localStorage: `alexey_exp_[N]_hypothesis` and `alexey_exp_[N]_timestamp`

### Step 02 — The Lab
- The interactive simulation / canvas
- Real-time parameter controls (sliders, buttons)
- Live data readouts
- Enabled ONLY after hypothesis is locked

### Step 03 — Results
- Appears after simulation is run
- Summary statistics and visualisation
- Note on model assumptions and limitations
- Save to localStorage: `alexey_exp_[N]_results`

### Step 04 — Your Findings (AI Coach Dialogue)
- Alexey writes his interpretation in a textarea
- "Ask Coach" button triggers Claude API call
- Coach reads: hypothesis + simulation data + interpretation
- Coach returns EXACTLY ONE Socratic question — never gives answers
- Alexey can reply; Coach asks another question
- Full dialogue saved to localStorage: `alexey_exp_[N]_dialogue`
- Dialogue is scrollable and timestamped per message

---

## AI COACH — SYSTEM PROMPT TEMPLATE

Use this system prompt for every experiment's Coach, substituting [EXPERIMENT_CONTEXT]:

```
You are COACH — a Socratic science mentor for Alexey Mikhail Johll, a 
14-year-old in Singapore who is building a computational science portfolio.

[EXPERIMENT_CONTEXT]

Your rules:
- Ask EXACTLY ONE question per response. Never two. Never zero.
- Never give Alexey the answer.
- Never explain the science to him — make him work it out.
- Reference his specific data and his own words back to him.
- Accessible language for a bright, curious 14-year-old.
- No effusive praise. No filler. Just one sharp question.
- End every response with a question mark.
```

For Experiment 01, [EXPERIMENT_CONTEXT] is:
```
Alexey has just run a computational xG (Expected Goals) model for football.
He placed shots on a pitch, calculated geometric probabilities, and ran
500 Monte Carlo simulations to see the distribution of possible match outcomes.
```

Adapt the context description for each subsequent experiment.

---

## TECHNICAL STACK

- **HTML/CSS/JS:** Vanilla only. No build tools. No package.json.
- **CDN:** Load libraries ONLY from `cdnjs.cloudflare.com`
  - Chart.js 4.4.0 — bar charts, scatter plots, line charts
  - p5.js 1.9.0 — canvas simulations (orbits, pendulum, walks)
  - D3.js 7.8.5 — fractal rendering, HR diagram
  - Do not mix p5 and D3 in the same file — pick one per experiment
- **Storage:** localStorage only. No backend. No server. No login.
- **Claude API:** `fetch` to `https://api.anthropic.com/v1/messages`
  - Model: `claude-sonnet-4-20250514`
  - Max tokens: 1000
  - No API key in code — handled by platform environment

---

## DESIGN SYSTEM

### Colour Palette
```css
--bg:           #0a0f0a;   /* near-black, green-tinted */
--surface:      #111a11;
--card:         #162016;
--border:       rgba(60, 160, 60, 0.2);
--accent:       #3ca03c;   /* science green */
--text-primary: #e8f0e8;
--text-muted:   #7a9a7a;
--highlight:    #7dd87d;
--warning:      #f0b429;
--danger:       #e24b4a;
```

### Typography
- **Display / headers:** `'Space Mono', monospace` (load from Google Fonts)
- **Body:** system sans-serif stack
- **Data / numbers / code:** `'Space Mono', monospace`

### Layout
- Max content width: 920px, centred
- Step cards: `border: 0.5px solid rgba(60,160,60,0.25); border-radius: 8px`
- Step header: dark background, monospace step number badge in green
- Locked hypothesis: subtle green glow — `box-shadow: 0 0 0 2px rgba(60,160,60,0.4)`
- All simulations run on canvas with dark background
- Mobile responsive (min-width: 320px)

### Step Badge Style
```css
background: rgba(60,160,60,0.15);
color: #7dd87d;
font-family: 'Space Mono', monospace;
font-size: 10px;
padding: 2px 8px;
border-radius: 4px;
border: 0.5px solid rgba(60,160,60,0.4);
```

---

## PORTFOLIO HOME PAGE (index.html)

Build a home page with:

**Hero section:**
- "ALEXEY MIKHAIL JOHLL" — large, Space Mono
- "Computational Science Portfolio"
- "Singapore · 2025–2026"

**Experiment grid (7 cards):**
Each card shows: experiment number badge, title, one-line description,
domain tags (e.g. "statistics", "monte carlo"), status indicator
(reads from localStorage — COMPLETE / IN PROGRESS / NOT STARTED),
and a link to the experiment folder.

**About section:**
```
Each experiment begins with a question Alexey writes himself.
The computation amplifies his thinking — it does not replace it.
Every hypothesis, every interpretation, every dialogue with the
AI coach is logged and timestamped. The ideas are his.
```

**Logbook link:** "View full logbook →" (links to logbook.html — stub for now)

---

## VERIFICATION CHECKLIST — RUN AFTER EACH EXPERIMENT

- [ ] Hypothesis textarea works and saves text
- [ ] Lock button timestamps and freezes hypothesis
- [ ] Simulation is disabled before locking
- [ ] Simulation works correctly after locking
- [ ] Results section appears after simulation runs
- [ ] AI Coach receives hypothesis + data + interpretation
- [ ] Coach returns exactly ONE question
- [ ] Coach dialogue saves to localStorage
- [ ] All localStorage keys follow naming convention
- [ ] Page loads and works with no internet (except CDN)
- [ ] Page is usable on mobile (min 320px wide)
- [ ] No API key hardcoded anywhere

---

## BUILD ORDER

1. Create full folder structure
2. Build `index.html` (portfolio home)
3. Implement `experiment-01-xg-model/index.html` from reference below
4. Build experiments 02 through 07 in sequence
5. Write `README.md` for each experiment folder
6. Write root `README.md` for GitHub

Do not skip ahead. Verify each experiment before moving to the next.

---

## EXPERIMENT 01 — COMPLETE REFERENCE IMPLEMENTATION

The following is the complete, tested HTML for Experiment 01.
Reproduce it faithfully as `experiment-01-xg-model/index.html`.
All subsequent experiments must follow its structure and design language.

```html
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Experiment 01 · xG Model · Alexey Mikhail Johll</title>
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{background:#0a0f0a;color:#e8f0e8;font-family:system-ui,sans-serif;padding:2rem 1rem;line-height:1.65}
.wrap{max-width:920px;margin:0 auto}
.exp-tag{display:inline-block;font-size:11px;font-weight:500;background:rgba(60,160,60,0.15);color:#7dd87d;border:0.5px solid rgba(60,160,60,0.4);padding:3px 10px;border-radius:4px;margin-bottom:12px;font-family:'Space Mono',monospace}
.exp-title{font-size:26px;font-family:'Space Mono',monospace;font-weight:700;color:#e8f0e8;margin-bottom:6px;line-height:1.2}
.exp-sub{font-size:14px;color:#7a9a7a;line-height:1.7;max-width:620px;margin-bottom:2rem}
.step{background:#111a11;border:0.5px solid rgba(60,160,60,0.2);border-radius:8px;margin-bottom:14px;overflow:hidden}
.step-hdr{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:0.5px solid rgba(60,160,60,0.15);background:#0d150d}
.snum{font-size:10px;font-weight:700;background:rgba(60,160,60,0.15);color:#7dd87d;padding:2px 8px;border-radius:4px;font-family:'Space Mono',monospace;border:0.5px solid rgba(60,160,60,0.4);white-space:nowrap}
.sname{font-size:13px;font-weight:600;color:#e8f0e8;font-family:'Space Mono',monospace}
.shint{margin-left:auto;font-size:11px;color:#4a6a4a;text-align:right}
.sbody{padding:18px}
.note{font-size:12px;color:#7a9a7a;line-height:1.65;padding:10px 14px;border-left:2px solid #3ca03c;background:rgba(60,160,60,0.06);margin-bottom:14px;border-radius:0 4px 4px 0}
.note b{color:#7dd87d;font-weight:600}
textarea{width:100%;background:#0d150d;border:0.5px solid rgba(60,160,60,0.25);color:#e8f0e8;font-family:system-ui,sans-serif;font-size:13px;line-height:1.65;padding:12px;resize:vertical;border-radius:6px;transition:border-color .2s;min-height:110px}
textarea:focus{outline:none;border-color:#3ca03c}
textarea::placeholder{color:#4a6a4a}
textarea:disabled{color:#7a9a7a;background:#0f1a0f;font-style:italic;cursor:default}
.row{display:flex;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap;gap:8px}
.ts-label{font-size:10px;color:#3ca03c;font-family:'Space Mono',monospace;display:none}
button{background:transparent;border:0.5px solid rgba(60,160,60,0.5);color:#7dd87d;font-family:'Space Mono',monospace;font-size:11px;padding:7px 16px;border-radius:4px;cursor:pointer;transition:all .15s}
button:hover:not(:disabled){background:rgba(60,160,60,0.1);border-color:#3ca03c}
button:disabled{opacity:.35;cursor:not-allowed}
button.danger{color:#e24b4a;border-color:rgba(226,75,74,0.4)}
button.danger:hover:not(:disabled){background:rgba(226,75,74,0.08)}
.lab-grid{display:grid;grid-template-columns:auto 1fr;gap:22px;align-items:start}
canvas#pitch{border:0.5px solid rgba(60,160,60,0.3);border-radius:4px;display:block;cursor:crosshair}
.sl{font-size:10px;font-weight:700;color:#4a6a4a;font-family:'Space Mono',monospace;letter-spacing:.8px;margin-bottom:4px;text-transform:uppercase}
.sv{font-size:26px;font-weight:700;color:#e8f0e8;font-family:'Space Mono',monospace;line-height:1.1;margin-bottom:14px}
.sv.green{color:#7dd87d}
.sv.sm{font-size:15px}
.legend{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:10px;color:#4a6a4a;font-family:'Space Mono',monospace}
.lgbar{width:80px;height:5px;background:linear-gradient(to right,#4080ff,#ffcc00,#ff2244);border-radius:3px}
.shot-log{max-height:140px;overflow-y:auto;border:0.5px solid rgba(60,160,60,0.15);border-radius:6px;margin-top:10px;background:#0d150d}
.sli{display:flex;justify-content:space-between;padding:5px 10px;font-size:10px;font-family:'Space Mono',monospace;color:#7a9a7a;border-bottom:0.5px solid rgba(60,160,60,0.1)}
.sli:last-child{border-bottom:none}
.brow{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
.res-grid{display:grid;grid-template-columns:1fr 1fr;gap:22px;align-items:start}
.chart-wrap{background:#0d150d;border:0.5px solid rgba(60,160,60,0.2);border-radius:6px;padding:14px;height:230px;position:relative}
.rstat{display:flex;justify-content:space-between;align-items:baseline;padding:9px 0;border-bottom:0.5px solid rgba(60,160,60,0.1)}
.rstat:last-child{border-bottom:none}
.rl{font-size:11px;color:#7a9a7a}
.rv{font-size:16px;font-weight:700;color:#7dd87d;font-family:'Space Mono',monospace}
.model-note{font-size:11px;color:#4a6a4a;line-height:1.6;padding:10px 12px;background:#0d150d;border:0.5px solid rgba(60,160,60,0.15);border-radius:6px;margin-top:14px}
.interp-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;align-items:start}
.ai-box{background:#0d150d;border:0.5px solid rgba(60,160,60,0.2);border-left:2px solid #3ca03c;border-radius:0 6px 6px 0;padding:14px;min-height:130px;display:flex;flex-direction:column}
.ai-lbl{font-size:10px;font-weight:700;color:#3ca03c;font-family:'Space Mono',monospace;margin-bottom:8px;text-transform:uppercase;letter-spacing:.8px}
.ai-q{font-size:13px;color:#e8f0e8;line-height:1.7;font-style:italic;flex:1}
.ai-ph{font-size:12px;color:#4a6a4a;font-style:italic;flex:1}
.pulse{display:inline-block;width:6px;height:6px;border-radius:50%;background:#3ca03c;animation:pd 1.2s infinite;margin-right:6px;vertical-align:middle}
@keyframes pd{0%,100%{opacity:1}50%{opacity:.15}}
.thread{margin-top:14px;display:flex;flex-direction:column;gap:8px}
.tcoach{background:rgba(60,160,60,0.06);border:0.5px solid rgba(60,160,60,0.25);border-radius:6px;padding:10px 14px;font-size:12px;color:#e8f0e8;line-height:1.65;font-style:italic}
.tcoach-lbl{font-size:9px;font-weight:700;color:#3ca03c;font-family:'Space Mono',monospace;margin-bottom:5px;font-style:normal;text-transform:uppercase;letter-spacing:.8px}
.talex{background:#0d150d;border:0.5px solid rgba(60,160,60,0.15);border-radius:6px;padding:10px 14px;font-size:12px;color:#e8f0e8;line-height:1.65}
.talex-lbl{font-size:9px;font-weight:700;color:#4a9aaa;font-family:'Space Mono',monospace;margin-bottom:5px;text-transform:uppercase;letter-spacing:.8px}
.reply-sec{margin-top:12px;display:none}
.nav-back{display:inline-block;font-size:11px;color:#4a6a4a;font-family:'Space Mono',monospace;text-decoration:none;margin-bottom:1.5rem;border:0.5px solid rgba(60,160,60,0.2);padding:5px 12px;border-radius:4px;transition:all .15s}
.nav-back:hover{color:#7dd87d;border-color:rgba(60,160,60,0.5)}
@media(max-width:680px){.lab-grid{grid-template-columns:1fr}.res-grid{grid-template-columns:1fr}.interp-grid{grid-template-columns:1fr}canvas#pitch{max-width:100%;height:auto}}
</style>
</head>
<body>
<div class="wrap">
<a href="../index.html" class="nav-back">← portfolio home</a>
<div class="exp-tag">ALEXEY MIKHAIL JOHLL · EXPERIMENT 01 OF 07 · COMPUTATIONAL STATISTICS</div>
<div class="exp-title">Where do goals come from?<br>The xG Model.</div>
<div class="exp-sub">Professional clubs use Expected Goals (xG) — a probability assigned to every shot based on where it was taken from. You'll build a geometric model, place shots on a real pitch, run 500 Monte Carlo simulations, and discover what the data actually says about scoring.</div>

<div class="step" id="stepHyp">
  <div class="step-hdr">
    <span class="snum">step 01</span>
    <span class="sname">Your hypothesis</span>
    <span class="shint">Write your prediction before running anything</span>
  </div>
  <div class="sbody">
    <div class="note"><b>Scientific method:</b> Before placing any shots, write down what you predict. Where do you think goals come from? What effect does angle vs distance have? Be specific — you'll compare this against what the model shows.</div>
    <textarea id="hypText" placeholder="e.g. I predict that shots taken centrally and close to goal will have the highest xG because the angle to the goal is widest from there. Shots from the corners of the penalty box will score less even at the same distance because the angle becomes too narrow. I think past 20 metres the probability drops sharply..."></textarea>
    <div class="row">
      <span class="ts-label" id="hypTS"></span>
      <button id="lockBtn" onclick="lockHyp()">Lock hypothesis and begin →</button>
    </div>
  </div>
</div>

<div class="step" id="stepLab">
  <div class="step-hdr">
    <span class="snum">step 02</span>
    <span class="sname">The pitch lab</span>
    <span class="shint" id="labHint">Lock your hypothesis first</span>
  </div>
  <div class="sbody">
    <div class="lab-grid">
      <div>
        <canvas id="pitch" width="460" height="360"></canvas>
        <div class="legend">
          <span>low xG</span>
          <div class="lgbar"></div>
          <span>high xG</span>
          <span style="margin-left:8px">— click pitch to place shots</span>
        </div>
      </div>
      <div>
        <div class="sl">xG at cursor</div>
        <div class="sv green" id="hXG">—</div>
        <div class="sl">angle to goal</div>
        <div class="sv sm" id="hAng">—</div>
        <div class="sl">distance</div>
        <div class="sv sm" id="hDist">—</div>
        <div class="sl" style="margin-top:4px">shots placed · total xG</div>
        <div class="sv sm" id="totXG" style="color:#e8f0e8">0 shots · 0.000</div>
        <div class="shot-log" id="shotLog">
          <div class="sli" style="color:#4a6a4a">no shots placed yet</div>
        </div>
        <div class="brow">
          <button id="simBtn" onclick="runMC()" disabled>Run 500 simulations →</button>
          <button class="danger" onclick="clearShots()">Clear shots</button>
        </div>
      </div>
    </div>
  </div>
</div>

<div class="step" id="stepRes" style="display:none">
  <div class="step-hdr">
    <span class="snum">step 03</span>
    <span class="sname">Monte Carlo results</span>
    <span class="shint">500 simulated matches with your exact shots</span>
  </div>
  <div class="sbody">
    <div class="res-grid">
      <div>
        <div class="sl" style="margin-bottom:10px">goals per simulated match (500 runs)</div>
        <div class="chart-wrap"><canvas id="mcChart"></canvas></div>
      </div>
      <div>
        <div class="sl" style="margin-bottom:12px">simulation summary</div>
        <div class="rstat"><span class="rl">Expected xG (sum of shots)</span><span class="rv" id="rXG">—</span></div>
        <div class="rstat"><span class="rl">Average goals per simulation</span><span class="rv" id="rAvg">—</span></div>
        <div class="rstat"><span class="rl">Maximum goals in one run</span><span class="rv" id="rMax">—</span></div>
        <div class="rstat"><span class="rl">Probability of 0 goals</span><span class="rv" id="rP0">—</span></div>
        <div class="rstat"><span class="rl">Probability of 2+ goals</span><span class="rv" id="rP2">—</span></div>
        <div class="model-note">This model uses geometry only — distance and shot angle. Real professional xG models also include: foot vs head, assisted vs solo, game state, and pressure from defenders. Your model captures the most important factors.</div>
      </div>
    </div>
  </div>
</div>

<div class="step" id="stepInterp">
  <div class="step-hdr">
    <span class="snum">step 04</span>
    <span class="sname">Your findings</span>
    <span class="shint">Interpret the results — what do they actually mean?</span>
  </div>
  <div class="sbody">
    <div class="interp-grid">
      <div>
        <div class="sl" style="margin-bottom:8px">your interpretation</div>
        <textarea id="interpText" placeholder="What did the simulation show? Did it match your hypothesis? What surprised you? What patterns do you see in where goals come from? What are the limitations of this model — what does it NOT capture?"></textarea>
        <div class="brow">
          <button id="askBtn" onclick="askCoach()">Ask coach →</button>
        </div>
        <div class="thread" id="thread"></div>
        <div class="reply-sec" id="replySec">
          <div class="sl" style="margin:12px 0 6px">your reply to coach</div>
          <textarea id="replyText" style="min-height:70px" placeholder="Answer coach's question here..."></textarea>
          <div class="brow"><button onclick="sendReply()">Send reply →</button></div>
        </div>
      </div>
      <div>
        <div class="sl" style="margin-bottom:8px">coach's question</div>
        <div class="ai-box">
          <div class="ai-lbl">Alexey's coach</div>
          <div class="ai-q" id="aiQ">
            <span class="ai-ph">Write your interpretation and click "Ask coach" — your coach will challenge your thinking with one precise question.</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>

</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"></script>
<script>
const cvs=document.getElementById('pitch'),ctx=cvs.getContext('2d');
const W=460,H=360,SC=6.5;
const GY=28,GX=W/2,GHW=Math.round(3.66*SC);
const PY=GY+Math.round(11*SC),PBY2=GY+Math.round(16.5*SC),PBHW=Math.round(20.16*SC);
const SYY2=GY+Math.round(5.5*SC),SYHW=Math.round(9.16*SC);
const DRAD=Math.round(9.15*SC);
let shots=[],locked=false,hx=null,hy=null,mcInst=null,convHist=[];

function dp(){
  for(let i=0;i<7;i++){ctx.fillStyle=i%2===0?'#061a0a':'#071e0c';ctx.fillRect(i*(W/7),0,Math.ceil(W/7)+1,H)}
  ctx.lineWidth=1.2;ctx.strokeStyle='rgba(60,160,60,.35)';
  ctx.strokeRect(10,GY,W-20,H-GY-8);
  ctx.beginPath();ctx.moveTo(10,H/2);ctx.lineTo(W-10,H/2);ctx.stroke();
  ctx.strokeRect(GX-PBHW,GY,PBHW*2,PBY2-GY);
  ctx.strokeRect(GX-SYHW,GY,SYHW*2,SYY2-GY);
  ctx.fillStyle='rgba(60,160,60,.6)';ctx.beginPath();ctx.arc(GX,PY,3,0,Math.PI*2);ctx.fill();
  ctx.save();ctx.beginPath();ctx.rect(0,PBY2,W,H);ctx.clip();
  ctx.beginPath();ctx.arc(GX,PY,DRAD,0,Math.PI*2);ctx.stroke();ctx.restore();
  ctx.lineWidth=2;ctx.strokeStyle='rgba(255,255,255,.7)';
  ctx.beginPath();ctx.moveTo(GX-GHW,GY);ctx.lineTo(GX-GHW,GY-12);ctx.lineTo(GX+GHW,GY-12);ctx.lineTo(GX+GHW,GY);ctx.stroke();
  ctx.lineWidth=.4;ctx.strokeStyle='rgba(255,255,255,.08)';
  for(let x=GX-GHW+7;x<GX+GHW;x+=7){ctx.beginPath();ctx.moveTo(x,GY);ctx.lineTo(x,GY-12);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(GX-GHW,GY-6);ctx.lineTo(GX+GHW,GY-6);ctx.stroke();
}

function calcXG(x,y){
  if(y<=GY)return{xg:0,d:0,a:0};
  const dx=x-GX,dy=y-GY,dp=Math.sqrt(dx*dx+dy*dy),dm=dp/SC;
  if(dm<.8)return{xg:.96,d:dm,a:180};
  const lx=(GX-GHW)-x,ly=GY-y,rx=(GX+GHW)-x,ry=GY-y;
  const ll=Math.sqrt(lx*lx+ly*ly),rl=Math.sqrt(rx*rx+ry*ry);
  const dot=(lx*rx+ly*ry)/(ll*rl);
  const ar=Math.acos(Math.max(-1,Math.min(1,dot)));
  const xg=Math.min(.96,(ar/Math.PI)*Math.exp(-dm/14)*3.5);
  return{xg,d:dm,a:ar*180/Math.PI};
}

function xgCol(xg){
  const t=Math.min(1,xg/.7);
  if(t<.5){const s=t*2;return`rgb(${Math.round(64+s*191)},${Math.round(128+s*92)},${Math.round(255-s*255)})`}
  const s=(t-.5)*2;return`rgb(255,${Math.round(220-s*220)},0)`;
}

function redraw(){
  dp();
  shots.forEach((s,i)=>{
    const c=xgCol(s.xg);
    ctx.beginPath();ctx.arc(s.x,s.y,10,0,Math.PI*2);ctx.fillStyle=c+'22';ctx.fill();
    ctx.beginPath();ctx.arc(s.x,s.y,5.5,0,Math.PI*2);ctx.fillStyle=c;ctx.fill();
    ctx.font='bold 7px monospace';ctx.fillStyle='#000';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillText(i+1,s.x,s.y);ctx.textBaseline='alphabetic';ctx.textAlign='left';
  });
  if(hx!==null&&locked){
    const{xg}=calcXG(hx,hy);
    if(xg>0){const c=xgCol(xg);ctx.beginPath();ctx.arc(hx,hy,9,0,Math.PI*2);ctx.strokeStyle=c;ctx.lineWidth=1.5;ctx.setLineDash([3,3]);ctx.stroke();ctx.setLineDash([])}
  }
}

cvs.addEventListener('mousemove',e=>{
  if(!locked)return;
  const r=cvs.getBoundingClientRect(),scaleX=cvs.width/r.width,scaleY=cvs.height/r.height;
  hx=(e.clientX-r.left)*scaleX;hy=(e.clientY-r.top)*scaleY;
  const{xg,d,a}=calcXG(hx,hy);
  document.getElementById('hXG').textContent=xg>0?xg.toFixed(3):'—';
  document.getElementById('hXG').style.color=xg>0?xgCol(xg):'#7dd87d';
  document.getElementById('hAng').textContent=xg>0?a.toFixed(1)+'°':'—';
  document.getElementById('hDist').textContent=xg>0?d.toFixed(1)+'m':'—';
  redraw();
});
cvs.addEventListener('mouseleave',()=>{hx=null;hy=null;document.getElementById('hXG').textContent='—';document.getElementById('hXG').style.color='#7dd87d';document.getElementById('hAng').textContent='—';document.getElementById('hDist').textContent='—';redraw()});
cvs.addEventListener('click',e=>{
  if(!locked)return;
  const r=cvs.getBoundingClientRect(),scaleX=cvs.width/r.width,scaleY=cvs.height/r.height;
  const x=(e.clientX-r.left)*scaleX,y=(e.clientY-r.top)*scaleY;
  const{xg,d,a}=calcXG(x,y);if(xg===0)return;
  shots.push({x,y,xg,d,a});updateLog();redraw();
  document.getElementById('simBtn').disabled=false;
  saveState();
});

function updateLog(){
  const tot=shots.reduce((s,sh)=>s+sh.xg,0);
  document.getElementById('totXG').textContent=`${shots.length} shot${shots.length!==1?'s':''} · ${tot.toFixed(3)}`;
  const log=document.getElementById('shotLog');
  if(shots.length===0){log.innerHTML='<div class="sli" style="color:#4a6a4a">no shots placed yet</div>';return}
  log.innerHTML=shots.map((s,i)=>`<div class="sli"><span>#${i+1} · ${s.d.toFixed(1)}m · ${s.a.toFixed(0)}°</span><span style="color:${xgCol(s.xg)};font-weight:700">${s.xg.toFixed(3)}</span></div>`).join('');
}

function clearShots(){shots=[];updateLog();redraw();document.getElementById('simBtn').disabled=true;document.getElementById('stepRes').style.display='none';saveState()}

function lockHyp(){
  const t=document.getElementById('hypText').value.trim();
  if(t.length<20){document.getElementById('hypText').style.borderColor='#e24b4a';return}
  locked=true;
  const ta=document.getElementById('hypText');
  ta.disabled=true;ta.style.borderColor='rgba(60,160,60,0.6)';
  ta.style.boxShadow='0 0 0 2px rgba(60,160,60,0.2)';
  const ts=document.getElementById('hypTS');
  ts.style.display='block';
  ts.textContent='locked · '+new Date().toLocaleString();
  const lb=document.getElementById('lockBtn');lb.textContent='✓ Hypothesis locked';lb.disabled=true;
  document.getElementById('labHint').textContent='Click on the pitch to place shots';
  localStorage.setItem('alexey_exp_01_hypothesis',t);
  localStorage.setItem('alexey_exp_01_timestamp',new Date().toISOString());
  redraw();
}

function saveState(){
  localStorage.setItem('alexey_exp_01_shots',JSON.stringify(shots));
}

function runMC(){
  if(shots.length===0)return;
  const N=500,counts=new Array(shots.length+2).fill(0);
  for(let i=0;i<N;i++){let g=0;shots.forEach(s=>{if(Math.random()<s.xg)g++});if(g<counts.length)counts[g]++}
  const tot=shots.reduce((s,sh)=>s+sh.xg,0);
  const avg=counts.reduce((s,c,i)=>s+c*i,0)/N;
  const mx=counts.length-1-[...counts].reverse().findIndex(c=>c>0);
  document.getElementById('rXG').textContent=tot.toFixed(3);
  document.getElementById('rAvg').textContent=avg.toFixed(2);
  document.getElementById('rMax').textContent=mx;
  document.getElementById('rP0').textContent=(counts[0]/N*100).toFixed(1)+'%';
  document.getElementById('rP2').textContent=(counts.slice(2).reduce((a,b)=>a+b,0)/N*100).toFixed(1)+'%';
  const el=document.getElementById('stepRes');el.style.display='';
  const cc=document.getElementById('mcChart');
  if(mcInst)mcInst.destroy();
  const maxC=counts.reduce((a,b)=>Math.max(a,b),0);
  const labels=counts.map((_,i)=>i===1?`${i} goal`:`${i} goals`);
  mcInst=new Chart(cc,{type:'bar',data:{labels,datasets:[{data:counts,backgroundColor:counts.map((_,i)=>{const t=i/Math.max(1,mx);return`rgba(${Math.round(60+t*166)},${Math.round(160-t*100)},60,0.75)`}),borderWidth:0,borderRadius:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.raw} runs (${(c.raw/N*100).toFixed(1)}%)`},backgroundColor:'#111a11',borderColor:'rgba(60,160,60,0.3)',borderWidth:1,titleColor:'#e8f0e8',bodyColor:'#7a9a7a',titleFont:{family:'Space Mono',size:10},bodyFont:{family:'Space Mono',size:10}}},scales:{x:{grid:{color:'rgba(60,160,60,0.08)'},ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}},y:{grid:{color:'rgba(60,160,60,0.08)'},ticks:{color:'#7a9a7a',font:{family:'Space Mono',size:9}}}}}});
  localStorage.setItem('alexey_exp_01_results',JSON.stringify({xg:tot,avg,max:mx,p0:counts[0]/N,p2:counts.slice(2).reduce((a,b)=>a+b,0)/N}));
  el.scrollIntoView({behavior:'smooth',block:'start'});
}

async function askCoach(){
  const interp=document.getElementById('interpText').value.trim();
  if(interp.length<20){document.getElementById('interpText').style.borderColor='#e24b4a';return}
  const hyp=document.getElementById('hypText').value;
  const tot=shots.reduce((s,sh)=>s+sh.xg,0);
  const sd=shots.length>0?shots.map((s,i)=>`Shot ${i+1}: ${s.d.toFixed(1)}m from goal, angle ${s.a.toFixed(0)}°, xG=${s.xg.toFixed(3)}`).join('\n'):'No shots placed.';
  const userMsg=`Alexey's hypothesis: "${hyp}"\n\nShot data:\n${sd}\nTotal xG: ${tot.toFixed(3)}\n\nAlexey's interpretation: "${interp}"`;
  const aiEl=document.getElementById('aiQ');
  aiEl.innerHTML='<span class="pulse"></span><span style="color:#4a6a4a;font-size:12px;font-style:italic">Coach is thinking...</span>';
  document.getElementById('askBtn').disabled=true;
  convHist=[{role:'user',content:userMsg}];
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'You are COACH — a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore who is building a computational science portfolio. Alexey has just run a computational xG (Expected Goals) model for football. He placed shots on a pitch, calculated geometric probabilities, and ran 500 Monte Carlo simulations to see the distribution of possible match outcomes. Your rules: Ask EXACTLY ONE question per response. Never give Alexey the answer. Reference his specific data and his own words back to him. Accessible language for a bright 14-year-old. No effusive praise. End every response with a question mark.',messages:convHist})});
    const d=await r.json();const q=d.content[0].text;
    aiEl.innerHTML=`<span style="font-style:italic">${q}</span>`;
    convHist.push({role:'assistant',content:q});
    localStorage.setItem('alexey_exp_01_dialogue',JSON.stringify(convHist));
    document.getElementById('replySec').style.display='block';
  }catch(e){aiEl.innerHTML='<span style="color:#e24b4a;font-size:12px">Coach unavailable. Write your own follow-up question to push your thinking further.</span>'}
  document.getElementById('askBtn').disabled=false;
}

async function sendReply(){
  const reply=document.getElementById('replyText').value.trim();if(reply.length<3)return;
  const prevQ=document.getElementById('aiQ').innerText;
  const thr=document.getElementById('thread');
  thr.innerHTML+=`<div class="tcoach"><div class="tcoach-lbl">coach's question</div>${prevQ}</div><div class="talex"><div class="talex-lbl">alexey</div>${reply}</div>`;
  document.getElementById('replyText').value='';
  convHist.push({role:'user',content:reply});
  const aiEl=document.getElementById('aiQ');
  aiEl.innerHTML='<span class="pulse"></span><span style="color:#4a6a4a;font-size:12px;font-style:italic">Coach is thinking...</span>';
  try{
    const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({model:'claude-sonnet-4-20250514',max_tokens:1000,system:'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his football xG experiment. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',messages:convHist})});
    const d=await r.json();const q=d.content[0].text;
    aiEl.innerHTML=`<span style="font-style:italic">${q}</span>`;
    convHist.push({role:'assistant',content:q});
    localStorage.setItem('alexey_exp_01_dialogue',JSON.stringify(convHist));
  }catch(e){aiEl.innerHTML='<span style="color:#e24b4a;font-size:12px">Connection issue — try again.</span>'}
}

redraw();
</script>
</body>
</html>
```

---

*End of CLAUDE.md — this file is the complete specification. Read it fully before every session.*
