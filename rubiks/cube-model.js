/* =========================================================
   CUBE MODEL — wraps cubejs Cube with helpers we need
   Face order: U R F D L B  (Singmaster URFDLB)
   Sticker indices per face (row-major, looking at face from outside):
       0 1 2
       3 4 5
       6 7 8
   ========================================================= */

const FACES = ['U', 'R', 'F', 'D', 'L', 'B'];
// Color convention: yellow on top (U), white on bottom (D) — matches
// the chart's "form yellow daisy on top, drop white cross to the bottom"
// and lets the beginner solver's D-stickers correspond to white pieces.
const COLOR_BY_FACE = {
  U: '#FFD500',  // yellow  (top)
  R: '#DC2626',  // red
  F: '#009B48',  // green
  D: '#FAFAFA',  // white   (bottom)
  L: '#FF6F1A',  // orange
  B: '#0046AD',  // blue
};

class CubeModel {
  constructor() {
    if (typeof Cube === 'undefined') {
      throw new Error('cubejs not loaded — include cube.min.js before cube-model.js');
    }
    this.cube = new Cube();
    this.history = [];
    this.listeners = new Set();
    this._solverReady = false;
  }

  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }
  _emit(payload) { this.listeners.forEach(fn => { try { fn(payload); } catch (e) { console.error(e); } }); }

  apply(notation, opts = {}) {
    const moves = this._tokenize(notation);
    for (const m of moves) {
      this.cube.move(m);
      this.history.push({ move: m, t: Date.now() });
    }
    this._emit({ kind: 'move', moves, animate: opts.animate !== false });
  }

  applySilent(notation) {
    // apply moves to model + snap visuals (no animation)
    const moves = this._tokenize(notation);
    for (const m of moves) {
      this.cube.move(m);
      this.history.push({ move: m, t: Date.now() });
    }
    this._emit({ kind: 'move', moves, animate: false });
  }

  /**
   * Update the logical state + history WITHOUT touching the visuals. Used by the
   * live drag-to-turn: the renderer has already rotated the cubies itself, so it
   * must not re-animate or snap. We emit a 'sync' event — the renderer ignores it
   * for animation, but app listeners (move count, solved badge) still refresh.
   */
  applyNoAnim(notation) {
    const moves = this._tokenize(notation);
    for (const m of moves) {
      this.cube.move(m);
      this.history.push({ move: m, t: Date.now() });
    }
    this._emit({ kind: 'sync', moves });
  }

  reset() {
    this.cube = new Cube();
    this.history = [];
    this._emit({ kind: 'reset' });
  }

  isSolved() { return this.cube.isSolved(); }
  asString() { return this.cube.asString(); }

  /* ---------- Scrambling ---------- */
  scramble(n = 22) {
    const moves = this.scrambleMoves(n);
    const str = moves.join(' ');
    this.apply(str, { animate: false });
    return str;
  }

  /**
   * Generate a scramble move list WITHOUT applying it.
   * Lets the renderer drive a cinematic per-move sequence.
   */
  scrambleMoves(n = 22) {
    const moves = [];
    const axes = { U: 'y', D: 'y', R: 'x', L: 'x', F: 'z', B: 'z' };
    let lastAxis = '';
    let lastFace = '';
    for (let i = 0; i < n; i++) {
      let face;
      for (let attempt = 0; attempt < 20; attempt++) {
        face = FACES[Math.floor(Math.random() * 6)];
        if (face !== lastFace && axes[face] !== lastAxis) break;
      }
      const mods = ['', "'", '2'];
      const mod = mods[Math.floor(Math.random() * 3)];
      moves.push(face + mod);
      lastAxis = axes[face];
      lastFace = face;
    }
    return moves;
  }

  /* ---------- Optimal (Kociemba) solve ---------- */
  async ensureSolver() {
    if (this._solverReady) return;
    if (typeof Cube.initSolver !== 'function') {
      throw new Error('Kociemba solver script not loaded — include solve.min.js');
    }
    // initSolver is synchronous-blocking; offload via worker if available, else inline
    await new Promise(res => {
      // give the UI a tick to repaint before the heavy compute
      setTimeout(() => { Cube.initSolver(); this._solverReady = true; res(); }, 30);
    });
  }

  async solveOptimal() {
    await this.ensureSolver();
    if (this.cube.isSolved()) return '';
    return this.cube.solve();
  }

  /* ---------- Beginner method solver (layer-by-layer) ---------- */
  solveBeginner() {
    // Implemented in solver-beginner.js (attached as global window.solveBeginnerMethod)
    if (typeof window.solveBeginnerMethod !== 'function') {
      throw new Error('Beginner solver not loaded');
    }
    // Operate on a CLONE so we don't disturb our state
    const clone = Cube.fromString(this.asString());
    return window.solveBeginnerMethod(clone);
  }

  /* ---------- Sticker access for renderer ---------- */
  /**
   * Returns the colour string at face[index].
   * face: 'U'|'R'|'F'|'D'|'L'|'B'
   * index: 0..8
   */
  stickerColor(face, index) {
    const str = this.asString();
    const faceIdx = FACES.indexOf(face);
    const char = str[faceIdx * 9 + index];
    return COLOR_BY_FACE[char];
  }

  /**
   * Returns full 54-sticker array as colour strings, ordered URFDLB row-major.
   */
  stickerColors() {
    const str = this.asString();
    return str.split('').map(c => COLOR_BY_FACE[c]);
  }

  /* ---------- Tokenizer ---------- */
  _tokenize(notation) {
    if (Array.isArray(notation)) return notation.flatMap(n => this._tokenize(n));
    return notation.trim().split(/\s+/).filter(Boolean);
  }
}

/* ---------- Public globals ---------- */
window.CubeModel = CubeModel;
window.CUBE_FACES = FACES;
window.CUBE_COLORS = COLOR_BY_FACE;
