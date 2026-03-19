---
name: frontend-design
description: Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, or applications. Generates creative, polished code that avoids generic AI aesthetics.
---

This skill guides creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

The user provides frontend requirements: a component, page, application, or interface to build. They may include context about the purpose, audience, or technical constraints.

## Design Thinking

Before coding, understand the context and commit to a BOLD aesthetic direction:
- **Purpose**: What problem does this interface solve? Who uses it?
- **Tone**: Pick an extreme: brutally minimal, maximalist chaos, retro-futuristic, organic/natural, luxury/refined, playful/toy-like, editorial/magazine, brutalist/raw, art deco/geometric, soft/pastel, industrial/utilitarian, etc. There are so many flavors to choose from. Use these for inspiration but design one that is true to the aesthetic direction.
- **Constraints**: Technical requirements (framework, performance, accessibility).
- **Differentiation**: What makes this UNFORGETTABLE? What's the one thing someone will remember?

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is intentionality, not intensity.

Then implement working code (HTML/CSS/JS, React, Vue, etc.) that is:
- Production-grade and functional
- Visually striking and memorable
- Cohesive with a clear aesthetic point-of-view
- Meticulously refined in every detail

## Frontend Aesthetics Guidelines

Focus on:
- **Typography**: Choose fonts that are beautiful, unique, and interesting. Avoid generic fonts like Arial and Inter; opt instead for distinctive choices that elevate the frontend's aesthetics; unexpected, characterful font choices. Pair a distinctive display font with a refined body font.
- **Color & Theme**: Commit to a cohesive aesthetic. Use CSS variables for consistency. Dominant colors with sharp accents outperform timid, evenly-distributed palettes.
- **Motion**: Use animations for effects and micro-interactions. Prioritize CSS-only solutions for HTML. Focus on high-impact moments: one well-orchestrated page load with staggered reveals (animation-delay) creates more delight than scattered micro-interactions. Use scroll-triggering and hover states that surprise.
- **Spatial Composition**: Unexpected layouts. Asymmetry. Overlap. Diagonal flow. Grid-breaking elements. Generous negative space OR controlled density.
- **Backgrounds & Visual Details**: Create atmosphere and depth rather than defaulting to solid colors. Add contextual effects and textures that match the overall aesthetic.

NEVER use generic AI-generated aesthetics like overused font families (Inter, Roboto, Arial, system fonts), cliched color schemes (particularly purple gradients on white backgrounds), predictable layouts and component patterns, and cookie-cutter design that lacks context-specific character.

Interpret creatively and make unexpected choices that feel genuinely designed for the context. No design should be the same.

**IMPORTANT**: Match implementation complexity to the aesthetic vision. Minimalist or refined designs need restraint, precision, and careful attention to spacing, typography, and subtle details. Elegance comes from executing the vision well.

---

## PROJECT-SPECIFIC: Alexey's Science Portfolio

### Aesthetic Direction: Nordic-Japandi Scientific

A fusion of Scandinavian warmth, Japanese restraint, and scientific precision. Think: a well-curated research lab in Copenhagen designed by a Japanese architect.

**Core Principles:**
- **Ma (間)** — intentional emptiness. Let content breathe. Generous whitespace is structural.
- **Lagom** — just the right amount. Never over-decorated. Every element earns its place.
- **Craft over flash** — subtle details that reward attention, not animations that demand it.

### Typography System
- **Display/Headers**: `'Instrument Serif', serif` — warm, editorial, distinctive
- **Body text**: `'DM Sans', sans-serif` — clean, highly readable, slightly warm
- **Data/Code/Monospace**: `'JetBrains Mono', monospace` — technically precise, excellent for numbers
- Load all from Google Fonts

### Colour Palette v2
```css
:root {
  /* Base — warm off-whites and deep charcoals, not pure black/white */
  --bg:            #f7f5f0;    /* warm parchment */
  --bg-deep:       #edeae3;    /* slightly darker surface */
  --surface:       #ffffff;    /* card backgrounds */
  --border:        #d4cfc5;    /* warm grey borders */
  --border-light:  #e8e4dc;    /* subtle dividers */

  /* Text — charcoal, never pure black */
  --text-primary:  #1a1a18;    /* near-black, warm */
  --text-secondary:#6b6560;    /* muted body */
  --text-tertiary: #9a9490;    /* hints, captions */

  /* Accent — restrained, purposeful */
  --accent:        #2d5a3d;    /* deep forest green — science, nature, growth */
  --accent-light:  #3d7a52;    /* hover state */
  --accent-subtle: rgba(45, 90, 61, 0.08); /* background tint */
  --accent-border: rgba(45, 90, 61, 0.2);  /* accent borders */

  /* Functional */
  --warning:       #c4880d;
  --danger:        #b84233;
  --success:       #2d5a3d;

  /* Dark mode (for simulation canvases only) */
  --canvas-bg:     #1a1a18;
  --canvas-grid:   rgba(255,255,255,0.06);
  --canvas-accent: #5ba670;
}
```

### Layout Principles
- Max content width: 780px (narrower = more editorial, easier to read)
- Card radius: 2px (Japandi — nearly sharp, not rounded)
- Card border: 1px solid var(--border)
- Card shadow: none (or very subtle: `0 1px 3px rgba(0,0,0,0.04)`)
- Section spacing: 3rem between major sections
- Simulations: dark canvas (--canvas-bg) inside light page — creates natural visual hierarchy
- Step numbers: small, understated, not badges — think chapter markers in a book

### Interaction Design
- Hover states: subtle colour shift, never scale transforms
- Buttons: text-based or minimal border, never heavy fills
- Locked hypothesis: thin left border accent, not glowing box-shadow
- Transitions: 200ms ease, never bounce or spring
- No loading spinners — use skeleton states or simple fade-in

### Mobile
- Stack gracefully, maintain generous padding
- Touch targets: minimum 44px
- Canvas simulations: full-width, maintain aspect ratio

### What This Is NOT
- Not dark theme with neon green (that was v1)
- Not a dashboard with cards everywhere
- Not a science-fair poster
- It's a portfolio that says: "this student thinks carefully and presents clearly"
