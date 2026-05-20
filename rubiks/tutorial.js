/* =========================================================
   TUTORIAL — Learn mode content
   Faithful to Alexey's flowchart, with two corrections noted:
     1. Yellow cross uses canonical F R U R' U' F'
     2. Final stage adds yellow-edge permutation (U-perm)
   Trigger language is the default; standard notation behind a toggle.
   ========================================================= */

const TUTORIAL_STAGES = [
  {
    id: 1,
    name: 'White daisy & cross',
    badge: '01',
    color: 'mint',
    intro: 'Start by forming a "daisy" — four white edge pieces around the yellow centre on top. Then drop them down to form the white cross on the bottom.',
    highlight: {
      label: 'D-layer edges',
      pieces: [{x:0,y:-1,z:1},{x:1,y:-1,z:0},{x:0,y:-1,z:-1},{x:-1,y:-1,z:0}],
    },
    blocks: [
      {
        kind: 'step',
        title: 'Form the daisy',
        body: 'Find each white edge piece and bring it to the top layer with the white sticker facing up — around the yellow centre.',
      },
      {
        kind: 'step',
        title: 'Match and drop',
        body: 'For each daisy petal, rotate the top until the non-white sticker matches its centre below. Then turn that face <b>twice</b> (e.g. <span class="alg-token" data-alg="F2">F2</span>) to bring the white edge down.',
      },
      {
        kind: 'tip',
        body: '<b>Tip:</b> Solve for <i>pieces</i>, not stickers. Every edge has two colours — you\'re placing the whole piece, not just one face.',
      },
      {
        kind: 'check',
        body: 'When done: a white cross on the bottom, with each side sticker matching the centre next to it.',
      },
    ],
    triggerTerms: [],
  },
  {
    id: 2,
    name: 'White corners',
    badge: '02',
    color: 'sunshine',
    intro: 'Now slot the four white corners in to complete the first layer. The "trigger" pattern does most of the work.',
    highlight: {
      label: 'D-layer corners',
      pieces: [{x:1,y:-1,z:1},{x:-1,y:-1,z:1},{x:1,y:-1,z:-1},{x:-1,y:-1,z:-1}],
    },
    blocks: [
      {
        kind: 'step',
        title: 'Find a white corner in the top layer',
        body: 'Search the top and bottom layers for a white sticker. The corner should sit above the slot it belongs in.',
      },
      {
        kind: 'case',
        title: 'Case A — white sticker faces outward (top layer)',
        body: 'Ignore the top sticker; look at the side colour and rotate the top so the matching centre is <b>diagonally</b> across from it.',
        cases: [
          { label: 'Diagonally to the LEFT', algo: 'left-trigger', display: "L' U' L" },
          { label: 'Diagonally to the RIGHT', algo: 'right-trigger', display: "R U R'" },
        ],
      },
      {
        kind: 'case',
        title: 'Case B — white sticker faces UP (top layer)',
        body: 'Rotate the top so the white-up corner is directly above its target slot; then check which side of the top its white sticker is on.',
        cases: [
          { label: 'White faces LEFT — left trigger twice', algo: 'left-trigger-2', display: "(L' U' L) ×2" },
          { label: 'White faces RIGHT — right trigger twice', algo: 'right-trigger-2', display: "(R U R') ×2" },
        ],
      },
      {
        kind: 'case',
        title: 'Case C — white sticker faces outward on BOTTOM',
        body: 'Check which side of the front face the white sticker is on.',
        cases: [
          { label: 'White faces LEFT — left trigger', algo: 'left-trigger', display: "L' U' L" },
          { label: 'White faces RIGHT — right trigger', algo: 'right-trigger', display: "R U R'" },
        ],
      },
      {
        kind: 'tip',
        body: '<b>Stuck corner already in the bottom layer but wrong?</b> Apply a right trigger once to kick it back up to the top, then start again.',
      },
    ],
    triggerTerms: ['right-trigger', 'left-trigger'],
  },
  {
    id: 3,
    name: 'Middle layer edges',
    badge: '03',
    color: 'electric',
    intro: 'The middle layer edges click in next. Find a non-yellow edge in the top layer that forms an "inverted T".',
    highlight: {
      label: 'Equator edges',
      pieces: [{x:1,y:0,z:1},{x:-1,y:0,z:1},{x:1,y:0,z:-1},{x:-1,y:0,z:-1}],
    },
    blocks: [
      {
        kind: 'step',
        title: 'Find a top edge with no yellow',
        body: 'Match its side colour to the matching centre on the side, so it forms an inverted T.',
      },
      {
        kind: 'case',
        title: 'Which way does it go?',
        body: 'Look at the top sticker — that colour\'s centre is to the left or right of the matching front.',
        cases: [
          { label: 'Top sticker matches the LEFT adjacent face', algo: 'middle-left', display: "U' L' U L  U F U' F'" },
          { label: 'Top sticker matches the RIGHT adjacent face', algo: 'middle-right', display: "U R U' R'  U' F' U F" },
        ],
      },
      {
        kind: 'note',
        body: '<b>Updated from your chart:</b> middle-layer insertion is the full 8-move sequence (not just a single trigger) — otherwise the edge won\'t actually settle.',
        variant: 'updated',
      },
      {
        kind: 'step',
        title: 'Edge stuck in the middle wrong?',
        body: 'Treat it as if you were placing any edge there: apply the right-side insertion once to kick it out, then place it properly with the algorithm above.',
      },
    ],
    triggerTerms: ['middle-right', 'middle-left'],
  },
  {
    id: 4,
    name: 'Yellow cross',
    badge: '04',
    color: 'sunshine',
    intro: 'Yellow is on top. Form a yellow cross using one algorithm, repeated up to three times.',
    highlight: {
      label: 'U-layer edges',
      pieces: [{x:0,y:1,z:1},{x:1,y:1,z:0},{x:0,y:1,z:-1},{x:-1,y:1,z:0}],
    },
    blocks: [
      {
        kind: 'step',
        title: 'Look at the yellow edges',
        body: 'You might see: a dot (no yellow edges), an L-shape (two edges at 90°), a line (two edges across), or a cross (done!).',
      },
      {
        kind: 'algo',
        title: 'The algorithm',
        display: "F R U R' U' F'",
        body: 'Apply it once for each stage: dot → L → line → cross.',
      },
      {
        kind: 'note',
        body: '<b>Updated from your chart:</b> the canonical yellow-cross algorithm is <code>F R U R\' U\' F\'</code>, not <code>F U R U\' R\' F\'</code>. The middle pair was swapped.',
        variant: 'updated',
      },
      {
        kind: 'case',
        title: 'Setup before the algorithm',
        cases: [
          { label: 'L-shape — point it to 9 & 12 o\'clock', algo: '', display: "(setup with U)" },
          { label: 'Line — make it horizontal across (left↔right)', algo: '', display: "(setup with U)" },
          { label: 'Dot — no setup, just apply', algo: '', display: '—' },
        ],
      },
    ],
    triggerTerms: [],
  },
  {
    id: 5,
    name: 'Orient yellow corners',
    badge: '05',
    color: 'coral',
    intro: 'Get all four corner stickers to face yellow-up. Sune is your tool.',
    highlight: {
      label: 'U-layer corners',
      pieces: [{x:1,y:1,z:1},{x:-1,y:1,z:1},{x:1,y:1,z:-1},{x:-1,y:1,z:-1}],
    },
    blocks: [
      {
        kind: 'algo',
        title: 'Sune',
        display: "R U R' U R U2 R'",
        body: 'A single, powerful algorithm — applied repeatedly with different setups.',
      },
      {
        kind: 'case',
        title: 'Count yellow stickers facing UP',
        cases: [
          { label: '0 or 2 yellow up — face a yellow outward on the LEFT, then Sune', algo: 'sune', display: "R U R' U R U2 R'" },
          { label: '1 yellow up — position the "fish" with head at bottom-left, then Sune', algo: 'sune', display: "R U R' U R U2 R'" },
          { label: '4 yellow up — corners are oriented, move on', algo: '', display: '—' },
        ],
      },
      {
        kind: 'tip',
        body: '<b>"Fish" shape:</b> when only one corner has yellow on top, the colours on the sides form a fish silhouette. Point its head (the lone yellow corner) to the bottom-left.',
      },
    ],
    triggerTerms: [],
  },
  {
    id: 6,
    name: 'Permute yellow corners',
    badge: '06',
    color: 'plum',
    intro: 'All yellow now points up — but the corner colours probably don\'t match their sides yet. Cycle the corners into place.',
    highlight: {
      label: 'U-layer corners',
      pieces: [{x:1,y:1,z:1},{x:-1,y:1,z:1},{x:1,y:1,z:-1},{x:-1,y:1,z:-1}],
    },
    blocks: [
      {
        kind: 'step',
        title: 'Find the matched side',
        body: 'Look at the side faces and find one (or two) where the two top-corner stickers are the same colour. That\'s the side that\'s already done.',
      },
      {
        kind: 'algo',
        title: 'Corner-3-cycle (A-perm)',
        display: "R' F R' B2 R F' R' B2 R2",
        body: 'Hold the matched side on the LEFT and apply the algorithm. If no sides match, just apply it once — a matched pair will appear.',
      },
      {
        kind: 'tip',
        body: 'Up to two applications. After this, every corner should be in its correct slot.',
      },
    ],
    triggerTerms: [],
  },
  {
    id: 7,
    name: 'Permute yellow edges',
    badge: '07',
    color: 'electric',
    intro: 'The last step: cycle the yellow edges into their slots.',
    highlight: {
      label: 'U-layer edges',
      pieces: [{x:0,y:1,z:1},{x:1,y:1,z:0},{x:0,y:1,z:-1},{x:-1,y:1,z:0}],
    },
    blocks: [
      {
        kind: 'note',
        body: '<b>Added to your chart:</b> this final step is missing from the original flow. Without it, ~75% of scrambles won\'t finish.',
        variant: 'updated',
      },
      {
        kind: 'algo',
        title: 'U-perm (anticlockwise)',
        display: "R U' R U R U R U' R' U' R2",
        body: 'Cycles three top edges anticlockwise. If your edges cycle the wrong way, just apply it twice.',
      },
      {
        kind: 'algo',
        title: 'U-perm (clockwise)',
        display: "R2 U R U R' U' R' U' R' U R'",
        body: 'The mirror — cycles three top edges clockwise.',
      },
      {
        kind: 'tip',
        body: '<b>How to pick:</b> If one edge is correct, hold it at the BACK and apply U-perm. If no edges are correct, apply U-perm once — one edge will lock in, then continue.',
      },
    ],
    triggerTerms: [],
  },
];

const TRIGGER_DEFS = {
  'right-trigger':   { trigger: 'right trigger',          standard: "R U R'",            desc: 'right-hand "sexy" insertion' },
  'left-trigger':    { trigger: 'left trigger',           standard: "L' U' L",           desc: 'mirror of the right trigger' },
  'right-trigger-2': { trigger: 'right trigger ×2',       standard: "R U R' R U R'",     desc: 'apply the right trigger twice' },
  'left-trigger-2':  { trigger: 'left trigger ×2',        standard: "L' U' L L' U' L",   desc: 'apply the left trigger twice' },
  'middle-right':    { trigger: 'right middle-insertion', standard: "U R U' R' U' F' U F", desc: 'inserts an edge into the front-right middle slot' },
  'middle-left':     { trigger: 'left middle-insertion',  standard: "U' L' U L U F U' F'", desc: 'inserts an edge into the front-left middle slot' },
  'sune':            { trigger: 'sune',                   standard: "R U R' U R U2 R'",  desc: 'classic OLL corner-orientation algorithm' },
};

window.TUTORIAL_STAGES = TUTORIAL_STAGES;
window.TRIGGER_DEFS = TRIGGER_DEFS;
