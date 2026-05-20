/* =========================================================
   APP — main glue: mode switching, settings, sound, confetti
   ========================================================= */

const STORAGE = {
  settings: 'alexey_rubiks_settings_v1',
  progress: 'alexey_rubiks_progress_v1',
};

const DEFAULT_SETTINGS = {
  sound: true,
  particles: true,
  haptics: true,
  notation: 'trigger',   // 'trigger' | 'standard'
  inspection: 0,          // 0 = off, 15 = WCA
};

/* ---------------------------------------------------------
   Sound — generated via WebAudio, no external files
   --------------------------------------------------------- */
class SoundFX {
  constructor() {
    this.enabled = true;
    this.ctx = null;
  }
  _ensureCtx() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch {}
  }
  _beep(freq, duration = 0.08, type = 'square', vol = 0.04) {
    if (!this.enabled) return;
    this._ensureCtx();
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(vol, now + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(now);
    osc.stop(now + duration);
  }
  click() { this._beep(180 + Math.random() * 60, 0.04, 'square', 0.03); }
  tap() { this._beep(800, 0.04, 'sine', 0.025); }
  success() {
    if (!this.enabled) return;
    // Cheerful arpeggio
    [523, 659, 784, 1047].forEach((f, i) => {
      setTimeout(() => this._beep(f, 0.18, 'triangle', 0.05), i * 90);
    });
  }
  inspection() { this._beep(660, 0.05, 'sine', 0.04); }
  go() { this._beep(880, 0.12, 'triangle', 0.06); }
  buzz() { this._beep(140, 0.18, 'sawtooth', 0.04); }
}

/* ---------------------------------------------------------
   Confetti helpers — uses canvas-confetti from CDN
   --------------------------------------------------------- */
const MEMPHIS_COLORS = ['#FF5043', '#FFC83D', '#2966FF', '#00C16E', '#8847FF', '#FAFAFA', '#FF6F1A'];

function fireBurst(opts = {}) {
  if (typeof confetti !== 'function') return;
  confetti({
    particleCount: opts.particleCount || 140,
    spread: opts.spread || 80,
    startVelocity: opts.startVelocity || 38,
    decay: 0.92,
    gravity: 1.1,
    ticks: 220,
    origin: opts.origin || { x: 0.5, y: 0.55 },
    colors: opts.colors || MEMPHIS_COLORS,
    shapes: opts.shapes || ['square', 'circle'],
    scalar: opts.scalar || 1.05,
    zIndex: 999,
  });
}

function fireStars(origin) {
  if (typeof confetti !== 'function') return;
  confetti({
    particleCount: 120,
    spread: 100,
    startVelocity: 42,
    gravity: 1.1,
    ticks: 240,
    origin: origin || { x: 0.5, y: 0.35 },
    colors: ['#FFC83D', '#FF5043', '#FAFAFA', '#2966FF'],
    shapes: ['star'],
    scalar: 1.2,
    zIndex: 999,
  });
}

/* ---------------------------------------------------------
   Main app controller
   --------------------------------------------------------- */
class App {
  constructor() {
    this.settings = this._loadSettings();
    this.cube = new CubeModel();
    this.sound = new SoundFX();
    this.sound.enabled = this.settings.sound;

    const canvas = document.getElementById('cubeCanvas');
    this.renderer = new CubeRenderer(canvas, this.cube, {
      sound: this.sound,
      haptics: this.settings.haptics,
      onMove: (m) => { /* face-grab moves */ },
    });

    // optional Lottie celebration
    this._initLottie();

    this.mode = 'learn';
    this.tutorialIdx = 0;
    this.timer = new SpeedTimer({
      inspectionSeconds: this.settings.inspection,
      onTick: ms => this._onTimerTick(ms),
      onStateChange: s => this._onTimerStateChange(s),
      onResult: (entry, stats) => this._onTimerResult(entry, stats),
    });

    this._wireUI();
    this._renderMode();
    this._renderSettings();
    this._wireKeyboard();

    // initial scramble for solve & timer modes
    this._initialScramble();

    // celebrate on solve
    this.renderer.onIdle = () => this._maybeCelebrate();

    // wire move count + solved indicator
    this.cube.onChange(() => this._updateIndicators());
    this._updateIndicators();
  }

  _loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORAGE.settings) || '{}');
      return Object.assign({}, DEFAULT_SETTINGS, raw);
    } catch { return { ...DEFAULT_SETTINGS }; }
  }
  _saveSettings() {
    try { localStorage.setItem(STORAGE.settings, JSON.stringify(this.settings)); } catch {}
  }

  _wireUI() {
    document.querySelectorAll('.mode-btn').forEach(b => {
      b.addEventListener('click', () => this._setMode(b.dataset.mode));
    });
    document.getElementById('btnSettings').addEventListener('click', () => this._toggleSettings());
    document.getElementById('btnSettingsClose').addEventListener('click', () => this._toggleSettings(false));
    document.getElementById('btnReset').addEventListener('click', () => {
      this.cube.reset();
      this.sound.tap();
    });
    document.getElementById('btnScramble').addEventListener('click', () => this._scramble());

    // Move keys
    document.querySelectorAll('.move-key').forEach(k => {
      k.addEventListener('click', () => {
        const m = k.dataset.move;
        this.cube.apply(m);
        this.sound.tap();
        this._pulseMoveKey(m);
      });
    });

    // Settings toggles
    document.querySelectorAll('.toggle[data-setting]').forEach(t => {
      t.addEventListener('click', () => {
        const key = t.dataset.setting;
        this.settings[key] = !this.settings[key];
        this._applySettings();
        this._renderSettings();
      });
    });
    document.querySelectorAll('[data-set-notation]').forEach(el => {
      el.addEventListener('click', () => {
        this.settings.notation = el.dataset.setNotation;
        this._applySettings();
        this._renderSettings();
        this._renderMode();
      });
    });

    // Solve mode
    const btnSolveOptimal = document.getElementById('btnSolveOptimal');
    if (btnSolveOptimal) btnSolveOptimal.addEventListener('click', () => this._runOptimal());
    const btnSolveBeginner = document.getElementById('btnSolveBeginner');
    if (btnSolveBeginner) btnSolveBeginner.addEventListener('click', () => this._runBeginner());

    // Timer mode
    const timerArea = document.getElementById('timerArea');
    if (timerArea) {
      timerArea.addEventListener('mousedown', () => this.timer.pressDown());
      timerArea.addEventListener('mouseup', () => this.timer.pressUp());
      timerArea.addEventListener('touchstart', e => { e.preventDefault(); this.timer.pressDown(); }, { passive: false });
      timerArea.addEventListener('touchend', e => { e.preventDefault(); this.timer.pressUp(); }, { passive: false });
    }

    // Tutorial step dots
    const stepsEl = document.getElementById('learnSteps');
    if (stepsEl) {
      stepsEl.addEventListener('click', e => {
        const dot = e.target.closest('.learn-step-dot');
        if (dot) {
          this.tutorialIdx = parseInt(dot.dataset.idx);
          this._renderMode();
        }
      });
    }
  }

  _wireKeyboard() {
    let spaceDown = false;
    document.addEventListener('keydown', (e) => {
      // Timer space-bar
      if (e.code === 'Space' && this.mode === 'time') {
        e.preventDefault();
        if (!spaceDown) {
          spaceDown = true;
          this.timer.pressDown();
        }
        return;
      }
      // Move shortcuts
      const moveMap = {
        'KeyR': 'R', 'KeyL': 'L', 'KeyU': 'U', 'KeyD': 'D', 'KeyF': 'F', 'KeyB': 'B',
      };
      const baseFace = moveMap[e.code];
      if (baseFace) {
        let m = baseFace;
        if (e.shiftKey) m += "'";
        else if (e.altKey) m += '2';
        this.cube.apply(m);
        this.sound.tap();
        this._pulseMoveKey(m);
        e.preventDefault();
      }
      if (e.code === 'KeyS' && !e.shiftKey && !e.metaKey && !e.ctrlKey && this.mode !== 'time') {
        // quick scramble
        this._scramble();
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && this.mode === 'time') {
        e.preventDefault();
        spaceDown = false;
        this.timer.pressUp();
      }
    });
  }

  _setMode(m) {
    const prev = this.mode;
    this.mode = m;
    document.querySelectorAll('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    document.querySelectorAll('.mode-pane').forEach(p => p.classList.toggle('active', p.dataset.mode === m));
    this._renderMode();
    this.sound.tap();
    this._animateModeSwitch();
    // clear any active learn highlight when leaving Learn
    if (prev === 'learn' && m !== 'learn') {
      try { this.renderer.clearHighlights(); } catch {}
    }
    if (m === 'time' || m === 'solve') this._maybeScrambleForMode();
  }

  _animateModeSwitch() {
    const motion = window.motion;
    const activePane = document.querySelector('.mode-pane.active');
    if (!activePane) return;
    if (!motion || !motion.animate) return;
    // Subtle slide only — DO NOT animate opacity. If motion fails to complete,
    // the content remains visible (we'd rather lose the animation than the UI).
    try {
      motion.animate(activePane, { y: [12, 0] }, { duration: 0.32 });
      const children = activePane.querySelectorAll(':scope > *');
      children.forEach((c, i) => {
        try { motion.animate(c, { y: [10, 0] }, { duration: 0.36, delay: 0.08 + i * 0.06 }); } catch {}
      });
    } catch {}
  }

  _pulseMoveKey(face) {
    if (!face) return;
    const el = document.querySelector(`.move-key[data-move="${face}"]`);
    if (!el) return;
    const motion = window.motion;
    el.classList.add('ripple');
    setTimeout(() => el.classList.remove('ripple'), 320);
    if (motion && motion.animate) {
      motion.animate(el, { scale: [1, 1.18, 1] }, { duration: 0.32, easing: motion.easeOut || 'ease-out' });
    }
  }

  _applySettings() {
    this.sound.enabled = this.settings.sound;
    this.renderer.opts.haptics = this.settings.haptics;
    this.timer.opts.inspectionSeconds = this.settings.inspection;
    this._saveSettings();
  }

  _toggleSettings(state) {
    const d = document.getElementById('settingsDrawer');
    if (typeof state === 'boolean') d.classList.toggle('open', state);
    else d.classList.toggle('open');
  }

  _renderSettings() {
    const map = {
      sound: 'tgSound',
      particles: 'tgParticles',
      haptics: 'tgHaptics',
    };
    Object.entries(map).forEach(([k, id]) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('on', !!this.settings[k]);
    });
    document.querySelectorAll('[data-set-notation]').forEach(el => {
      el.classList.toggle('active', el.dataset.setNotation === this.settings.notation);
    });
    const insp = document.getElementById('tgInspection');
    if (insp) insp.classList.toggle('on', this.settings.inspection > 0);
  }

  /* ----- Mode rendering ----- */

  _renderMode() {
    if (this.mode === 'learn') this._renderLearn();
    else if (this.mode === 'solve') this._renderSolve();
    else if (this.mode === 'time') this._renderTime();
  }

  _renderLearn() {
    const stage = TUTORIAL_STAGES[this.tutorialIdx];
    if (!stage) return;
    const stepsEl = document.getElementById('learnSteps');
    stepsEl.innerHTML = TUTORIAL_STAGES.map((st, i) => {
      const cls = i === this.tutorialIdx ? 'active' : (i < this.tutorialIdx ? 'done' : '');
      return `<div class="learn-step-dot ${cls}" data-idx="${i}" title="${st.name}">${st.id}</div>`;
    }).join('');

    const card = document.getElementById('learnContent');
    card.className = `panel-card ${stage.color}`;
    card.innerHTML = `
      <div class="panel-head">
        <span class="panel-step">stage ${stage.badge}</span>
        <div>
          <div class="panel-title">${stage.name}</div>
        </div>
      </div>
      <div class="panel-subtitle">${stage.intro}</div>
      ${stage.blocks.map(b => this._renderLearnBlock(b)).join('')}
      <div class="brow" style="display:flex; gap:8px; margin-top:18px; flex-wrap:wrap;">
        <button class="btn small ghost" id="btnPrevStage" ${this.tutorialIdx === 0 ? 'disabled' : ''}>← Previous</button>
        <button class="btn small primary" id="btnNextStage" ${this.tutorialIdx === TUTORIAL_STAGES.length - 1 ? 'disabled' : ''}>Next →</button>
      </div>
    `;
    const prev = document.getElementById('btnPrevStage');
    const next = document.getElementById('btnNextStage');
    if (prev) prev.addEventListener('click', () => { this.tutorialIdx = Math.max(0, this.tutorialIdx - 1); this._renderLearn(); this.sound.tap(); });
    if (next) next.addEventListener('click', () => {
      const completed = this.tutorialIdx;
      this._celebrateStage(completed);
      this.tutorialIdx = Math.min(TUTORIAL_STAGES.length - 1, this.tutorialIdx + 1);
      this._renderLearn();
    });

    // Highlight relevant cube pieces for this stage
    try {
      if (stage.highlight && stage.highlight.pieces) {
        this.renderer.clearHighlights();
        this.renderer.highlightPieces(stage.highlight.pieces, { color: 0xFFC83D, duration: 1400, stagger: 100 });
      } else {
        this.renderer.clearHighlights();
      }
    } catch {}

    // Stagger reveal the blocks (subtle slide only — never animate opacity, so
    // if motion silently fails the content remains visible)
    const motion = window.motion;
    if (motion && motion.animate) {
      const blocks = card.querySelectorAll(':scope > *');
      blocks.forEach((b, i) => {
        try { motion.animate(b, { y: [10, 0] }, { duration: 0.32, delay: 0.04 + i * 0.05 }); } catch {}
      });
    }

    // wire algorithm tokens
    document.querySelectorAll('.alg-token[data-alg]').forEach(el => {
      el.addEventListener('click', () => {
        const moves = el.dataset.alg;
        el.classList.add('playing');
        setTimeout(() => el.classList.remove('playing'), 600);
        this.cube.apply(moves);
      });
    });
    // wire trigger terms (tooltip + click to demo)
    document.querySelectorAll('.term[data-trigger]').forEach(el => {
      el.addEventListener('click', () => {
        const def = TRIGGER_DEFS[el.dataset.trigger];
        if (def) {
          this.cube.apply(def.standard);
        }
      });
    });
  }

  _renderLearnBlock(b) {
    const useStandard = this.settings.notation === 'standard';
    if (b.kind === 'step') {
      return `<div style="margin-bottom:14px;"><div style="font-family:var(--display); font-weight:700; font-size:14px; margin-bottom:4px;">${b.title || ''}</div><div style="font-size:13px; color:var(--ink-soft); line-height:1.65;">${b.body}</div></div>`;
    }
    if (b.kind === 'note') {
      return `<div class="note ${b.variant || ''}">${b.body}</div>`;
    }
    if (b.kind === 'tip') {
      return `<div class="note tip">${b.body}</div>`;
    }
    if (b.kind === 'algo') {
      const tokens = b.display.split(/\s+/).map(t => `<span class="alg-token" data-alg="${t}">${t}</span>`).join('');
      return `<div style="margin:14px 0;">${b.title ? `<div style="font-family:var(--display); font-weight:700; font-size:14px; margin-bottom:6px;">${b.title}</div>` : ''}<div class="algorithm">${tokens}</div>${b.body ? `<div style="font-size:12px; color:var(--ink-soft); margin-top:6px;">${b.body}</div>` : ''}</div>`;
    }
    if (b.kind === 'case') {
      const cases = (b.cases || []).map(c => {
        const label = useStandard ? `${c.label} — <code class="kbd">${c.display}</code>` : c.label;
        const algo = (TRIGGER_DEFS[c.algo] && TRIGGER_DEFS[c.algo].standard) || c.display;
        const tokens = (algo === '—') ? '—' : algo.split(/\s+/).map(t => /^[A-Za-z0-9'×()2]+$/.test(t) ? `<span class="alg-token" data-alg="${t}">${t}</span>` : t).join(' ');
        return `<div style="padding:10px 0; border-bottom:1px solid var(--paper-deep);">
          <div style="font-size:13px; margin-bottom:5px;">${label}</div>
          <div class="algorithm" style="margin:6px 0 0;">${tokens}</div>
        </div>`;
      }).join('');
      return `<div style="margin:14px 0;">${b.title ? `<div style="font-family:var(--display); font-weight:700; font-size:14px; margin-bottom:4px;">${b.title}</div>` : ''}${b.body ? `<div style="font-size:12px; color:var(--ink-soft); margin-bottom:8px;">${b.body}</div>` : ''}${cases}</div>`;
    }
    if (b.kind === 'check') {
      return `<div class="note tip"><b>Check:</b> ${b.body}</div>`;
    }
    return '';
  }

  _renderSolve() {
    const card = document.getElementById('solveContent');
    if (!card) return;
    card.className = 'panel-card coral';
    card.innerHTML = `
      <div class="panel-head">
        <span class="panel-step">solve mode</span>
        <div class="panel-title">Solve any scramble</div>
      </div>
      <div class="panel-subtitle">Scramble your cube (or paste a scramble), then choose how to solve it — fast & near-optimal, or the layer-by-layer beginner method that mirrors the chart.</div>

      <div style="display:flex; flex-direction:column; gap:8px;">
        <div style="display:flex; gap:6px; flex-wrap:wrap;">
          <button class="btn small primary" id="btnScramble2">New scramble</button>
          <button class="btn small ghost" id="btnSolveOptimal">⚡ Optimal solve</button>
          <button class="btn small mint" id="btnSolveBeginner">📐 Beginner method</button>
        </div>
        <div class="scramble-display" id="scrambleDisplay"></div>
        <div id="solutionPanel"></div>
      </div>
    `;
    const sd = document.getElementById('scrambleDisplay');
    if (sd) sd.textContent = this._lastScramble || '— no scramble yet —';

    document.getElementById('btnScramble2').addEventListener('click', () => this._scramble());
    document.getElementById('btnSolveOptimal').addEventListener('click', () => this._runOptimal());
    document.getElementById('btnSolveBeginner').addEventListener('click', () => this._runBeginner());
  }

  _renderTime() {
    const card = document.getElementById('timeContent');
    if (!card) return;
    card.className = 'panel-card sunshine';
    const stats = this.timer.stats();
    card.innerHTML = `
      <div class="panel-head">
        <span class="panel-step">time mode</span>
        <div class="panel-title">Speedcubing timer</div>
      </div>
      <div class="panel-subtitle">Hold <span class="kbd">Space</span> until the timer turns green, then release to start. Tap to stop.</div>

      <div id="timerArea" style="background: var(--paper-deep); border: 1.5px dashed var(--ink); border-radius: 6px; padding: 4px; cursor: pointer; user-select:none;">
        <div class="timer-display" id="timerDisplay">${SpeedTimer.formatMs(0)}</div>
        <div class="timer-hint" id="timerHint">Hold to ready</div>
      </div>

      <div class="scramble-display" id="scrambleDisplay" style="margin-top:14px;">${this._lastScramble || '— scramble —'}</div>

      <div class="brow" style="display:flex; gap:6px; margin-top:12px; flex-wrap:wrap;">
        <button class="btn small primary" id="btnScramble3">New scramble</button>
        <button class="btn small ghost" id="btnClearTimes">Clear history</button>
      </div>

      <div class="pb-display" style="margin-top:14px;">
        <div class="pb-cell"><div class="label">Best</div><div class="value">${SpeedTimer.formatMs(stats.best)}</div></div>
        <div class="pb-cell"><div class="label">Avg of 5</div><div class="value">${SpeedTimer.formatMs(stats.avg5)}</div></div>
        <div class="pb-cell"><div class="label">Avg of 12</div><div class="value">${SpeedTimer.formatMs(stats.avg12)}</div></div>
      </div>

      <div class="history-list" id="historyList">
        ${this._renderHistory()}
      </div>
    `;

    document.getElementById('btnScramble3').addEventListener('click', () => this._scramble());
    document.getElementById('btnClearTimes').addEventListener('click', () => {
      this.timer.clearHistory();
      this._renderTime();
    });
    // re-wire timer area handlers since DOM was replaced
    const timerArea = document.getElementById('timerArea');
    timerArea.addEventListener('mousedown', () => this.timer.pressDown());
    timerArea.addEventListener('mouseup', () => this.timer.pressUp());
    timerArea.addEventListener('touchstart', e => { e.preventDefault(); this.timer.pressDown(); }, { passive: false });
    timerArea.addEventListener('touchend', e => { e.preventDefault(); this.timer.pressUp(); }, { passive: false });
  }

  _renderHistory() {
    const arr = this.timer.history;
    if (!arr.length) return '<div class="history-item"><span class="idx">no solves yet</span><span class="t">—</span></div>';
    const best = Math.min(...arr.map(e => e.ms));
    return arr.slice().reverse().slice(0, 20).map((e, i) => {
      const isBest = e.ms === best;
      return `<div class="history-item ${isBest ? 'best' : ''}"><span class="idx">#${arr.length - i}</span><span class="t">${SpeedTimer.formatMs(e.ms)}</span></div>`;
    }).join('');
  }

  /* ----- Scramble & solve ----- */
  _initialScramble() { this._scramble({ instant: true }); }
  _maybeScrambleForMode() {
    if (!this._lastScramble || this.cube.isSolved()) this._scramble();
  }
  _scramble(opts = {}) {
    this.cube.reset();
    if (opts.instant) {
      // first load: skip the cinematic for instant readiness
      const str = this.cube.scramble(22);
      this._lastScramble = str;
      this.timer.setScramble(str);
      const sd = document.getElementById('scrambleDisplay');
      if (sd) sd.textContent = str;
      return;
    }
    const moves = this.cube.scrambleMoves(22);
    const str = moves.join(' ');
    this._lastScramble = str;
    this.timer.setScramble(str);
    const sd = document.getElementById('scrambleDisplay');
    if (sd) sd.textContent = str;
    this.sound.tap();
    // cinematic: renderer drives the animation; for each visualised move we call
    // the model so cubejs stays in sync, but we suppress the renderer's own queue
    // via the _cinematic flag.
    this.renderer.scrambleCinematic(moves, {
      totalMs: 2800,
      onMove: (m) => {
        // sync model silently — renderer is owning the animation
        this.cube.cube.move(m);
        this.cube.history.push({ move: m, t: Date.now() });
      },
    }).then(() => {
      this._updateIndicators();
    });
  }

  async _runOptimal() {
    const sp = document.getElementById('solutionPanel');
    if (sp) sp.innerHTML = '<div style="font-family:var(--mono); font-size:12px; padding:14px; text-align:center; color:var(--ink-mute);">Computing optimal solution…</div>';
    try {
      const solution = await this.cube.solveOptimal();
      const moves = solution.trim().split(/\s+/).filter(Boolean);
      if (sp) sp.innerHTML = this._renderSolution([{
        name: 'Optimal (Kociemba 2-phase)',
        moves: solution,
        color: 'electric',
      }], moves.length);
      this._wireSolutionPlay(solution);
    } catch (e) {
      if (sp) sp.innerHTML = `<div style="color:var(--danger); font-size:12px;">${e.message}</div>`;
    }
  }

  _runBeginner() {
    const sp = document.getElementById('solutionPanel');
    if (sp) sp.innerHTML = '<div style="font-family:var(--mono); font-size:12px; padding:14px; text-align:center; color:var(--ink-mute);">Computing layer-by-layer solution…</div>';
    try {
      const stages = this.cube.solveBeginner();
      const all = stages.map(s => s.moves).join(' ').trim();
      const totalMoves = all.split(/\s+/).filter(Boolean).length;
      if (sp) sp.innerHTML = this._renderSolution(stages, totalMoves);
      this._wireSolutionPlay(all);
    } catch (e) {
      if (sp) sp.innerHTML = `<div style="color:var(--danger); font-size:12px;">${e.message}</div>`;
    }
  }

  _renderSolution(stages, totalMoves) {
    return `
      <div class="solution-stats">
        <span><b>${totalMoves}</b> moves</span>
        <span><b>${stages.length}</b> stage${stages.length > 1 ? 's' : ''}</span>
      </div>
      ${stages.map((s, i) => `
        <div style="margin-top:10px;">
          <div style="font-family:var(--mono); font-size:11px; font-weight:700; color:var(--ink-soft); margin-bottom:4px;">${i + 1}. ${s.name} ${s.moves ? `· ${s.moves.split(/\s+/).filter(Boolean).length} moves` : ''}</div>
          ${s.moves ? `<div class="algorithm" style="margin:4px 0 0;">${s.moves.split(/\s+/).filter(Boolean).map(m => `<span class="alg-token" data-alg="${m}">${m}</span>`).join('')}</div>` : '<div style="font-size:12px; color:var(--ink-mute);">(already solved)</div>'}
        </div>
      `).join('')}
      <div style="margin-top:14px; display:flex; gap:6px; flex-wrap:wrap;">
        <button class="btn small primary" id="btnPlaySolution">▶ Play solution</button>
        <button class="btn small ghost" id="btnApplyAll">Apply instantly</button>
      </div>
    `;
  }

  _wireSolutionPlay(solution) {
    const play = document.getElementById('btnPlaySolution');
    const apply = document.getElementById('btnApplyAll');
    if (play) play.addEventListener('click', () => {
      const moves = solution.trim().split(/\s+/).filter(Boolean);
      if (!moves.length) return;
      this.renderer.playSolveCinematic(moves, {
        totalMs: Math.min(8000, Math.max(2500, moves.length * 220)),
        onMove: (m) => {
          this.cube.cube.move(m);
          this.cube.history.push({ move: m, t: Date.now() });
        },
      }).then(() => {
        this._updateIndicators();
        if (this.cube.isSolved()) this._celebrateSolve();
      });
    });
    if (apply) apply.addEventListener('click', () => {
      this.cube.applySilent(solution);
    });
    // Make each token clickable to play just that move
    document.querySelectorAll('#solutionPanel .alg-token').forEach(el => {
      el.addEventListener('click', () => {
        const m = el.dataset.alg;
        el.classList.add('playing');
        setTimeout(() => el.classList.remove('playing'), 600);
        this.cube.apply(m);
      });
    });
  }

  /* ----- Timer event handlers ----- */
  _onTimerStateChange(s) {
    const display = document.getElementById('timerDisplay');
    const hint = document.getElementById('timerHint');
    if (!display) return;
    display.classList.remove('ready', 'running', 'inspection');
    if (s === TIMER_STATES.HOLDING) {
      display.textContent = SpeedTimer.formatMs(0);
      hint.textContent = 'Keep holding…';
    } else if (s === TIMER_STATES.READY) {
      display.classList.add('ready');
      hint.textContent = 'Release to GO!';
      this.sound.go();
    } else if (s === TIMER_STATES.RUNNING) {
      display.classList.add('running');
      hint.textContent = 'Tap to stop';
    } else if (s === TIMER_STATES.STOPPED) {
      hint.textContent = 'Solved! Hold to retry';
    } else {
      hint.textContent = 'Hold to ready';
    }
  }

  _onTimerTick(ms) {
    const display = document.getElementById('timerDisplay');
    if (display) display.textContent = SpeedTimer.formatMs(ms);
  }

  _onTimerResult(entry, stats) {
    this.sound.success();
    // detect a new PB: stats.best comes from the FULL history including this entry,
    // so check if this entry tied the best AND it's the only one matching or is the new minimum
    const prevBest = this._prevBest;
    const newPB = (prevBest === undefined || entry.ms < prevBest);
    this._prevBest = stats.best;
    if (newPB) {
      const delta = (prevBest !== undefined) ? (prevBest - entry.ms) : 0;
      this._celebratePB(delta);
    } else {
      this._maybeCelebrate(true);
    }
    setTimeout(() => this._renderTime(), 300);
  }

  _updateIndicators() {
    const mc = document.getElementById('moveCount');
    if (mc) mc.textContent = `${this.cube.history.length} moves`;
    const si = document.getElementById('solvedIndicator');
    if (si) si.style.display = this.cube.isSolved() ? '' : 'none';
  }

  /* ----- Lottie celebration init ----- */
  _initLottie() {
    if (typeof lottie === 'undefined') return;
    // Inline a tiny CC0-style confetti burst as a fallback (basic animated SVG via Lottie JSON)
    // We don't fetch external Lottie to keep the app self-contained.
    // The lottie host is decorative — confetti library + CSS handle the main celebration.
    this._lottieAnim = null;
  }

  /* ----- Celebration moments ----- */
  _maybeCelebrate(force = false) {
    if (!force && !this.cube.isSolved()) return;
    if (this._isCelebrating) return;
    this._celebrateSolve();
  }

  _celebrateSolve() {
    this._isCelebrating = true;
    if (this.settings.sound) this.sound.success();
    if (this.settings.haptics && 'vibrate' in navigator) navigator.vibrate([100, 60, 100, 60, 200]);
    if (this.settings.particles) {
      fireBurst({ origin: { x: 0.5, y: 0.55 }, particleCount: 160, spread: 90 });
      setTimeout(() => fireBurst({ origin: { x: 0.2, y: 0.5 }, particleCount: 80, spread: 60, startVelocity: 32 }), 220);
      setTimeout(() => fireBurst({ origin: { x: 0.8, y: 0.5 }, particleCount: 80, spread: 60, startVelocity: 32 }), 380);
    }

    const cel = document.getElementById('celebration');
    if (cel) {
      cel.classList.add('show');
      // animate the SOLVED letters with motion stagger
      const motion = window.motion;
      const chars = cel.querySelectorAll('.ch');
      if (motion && motion.animate) {
        // Show the card first
        motion.animate(
          cel.querySelector('.celebration-card'),
          { scale: [0, 1.05, 1], rotate: [-12, 4, -3], opacity: [0, 1, 1] },
          { duration: 0.55, easing: motion.easeOut || 'ease-out' }
        );
        chars.forEach((ch, i) => {
          motion.animate(
            ch,
            { y: [40, -8, 0], opacity: [0, 1, 1] },
            { duration: 0.55, delay: 0.18 + i * 0.06, easing: motion.easeOut || 'ease-out' }
          );
        });
      } else {
        cel.querySelector('.celebration-card').style.transform = 'scale(1) rotate(-3deg)';
        cel.querySelector('.celebration-card').style.opacity = '1';
        chars.forEach(c => { c.style.transform = 'translateY(0)'; c.style.opacity = '1'; });
      }
      setTimeout(() => {
        cel.classList.remove('show');
        const card = cel.querySelector('.celebration-card');
        if (card) { card.style.transform = ''; card.style.opacity = ''; }
        chars.forEach(c => { c.style.transform = ''; c.style.opacity = ''; });
        this._isCelebrating = false;
      }, 2600);
    } else {
      this._isCelebrating = false;
    }
  }

  _celebratePB(deltaMs) {
    if (this.settings.particles) fireStars({ x: 0.5, y: 0.3 });
    if (this.settings.sound) this.sound.go();
    const el = document.getElementById('pbBurst');
    if (!el) return;
    const deltaEl = el.querySelector('.delta');
    if (deltaEl) deltaEl.textContent = deltaMs > 0 ? `−${SpeedTimer.formatMs(deltaMs)}` : '';
    const motion = window.motion;
    if (motion && motion.animate) {
      motion.animate(
        el,
        { opacity: [0, 1, 1, 0], y: [-30, 0, 0, -10], scale: [0.7, 1.05, 1, 0.95] },
        { duration: 2.2, easing: motion.easeOut || 'ease-out' }
      );
    } else {
      el.style.opacity = '1';
      el.style.transform = 'translateX(-50%) translateY(0) scale(1)';
      setTimeout(() => { el.style.opacity = '0'; }, 1800);
    }
  }

  _celebrateStage(idx) {
    if (this.settings.sound) this.sound.tap();
    const dot = document.querySelector(`.learn-step-dot[data-idx="${idx}"]`);
    if (!dot) return;
    dot.classList.add('celebrate');
    dot.classList.add('flash');
    setTimeout(() => dot.classList.remove('celebrate'), 800);
    setTimeout(() => dot.classList.remove('flash'), 800);
    if (this.settings.particles) {
      const r = dot.getBoundingClientRect();
      fireBurst({
        origin: { x: (r.left + r.width / 2) / window.innerWidth,
                  y: (r.top + r.height / 2) / window.innerHeight },
        particleCount: 50,
        spread: 60,
        startVelocity: 28,
        scalar: 0.8,
      });
    }
  }
}

// Boot — waits for motion to be ready (or the shim) so animations work from t=0.
// Wraps construction in try/catch and logs every step so failures are diagnosable
// from the browser console.
window.addEventListener('DOMContentLoaded', () => {
  console.log('[cubelab] DOMContentLoaded — THREE:', typeof THREE,
              'Cube:', typeof Cube, 'confetti:', typeof confetti,
              'lottie:', typeof lottie, 'motion:', typeof window.motion);

  const start = (trigger) => {
    if (window.app) return;
    console.log('[cubelab] booting (' + trigger + ')');
    try {
      if (typeof Cube !== 'undefined' && Cube.initSolver) {
        const init = () => Cube.initSolver();
        window.requestIdleCallback ? requestIdleCallback(init) : setTimeout(init, 1500);
      }
      window.app = new App();
      console.log('[cubelab] app booted OK');
    } catch (err) {
      console.error('[cubelab] BOOT FAILED:', err);
      // Surface to user
      const stage = document.querySelector('.cube-stage');
      if (stage) {
        const note = document.createElement('div');
        note.style.cssText = 'position:absolute;inset:auto 16px 16px 16px;background:#FF5043;color:#181612;font-family:monospace;font-size:11px;padding:10px 14px;border:2px solid #181612;border-radius:4px;box-shadow:3px 3px 0 #181612;z-index:5;';
        note.textContent = 'Boot error: ' + (err && err.message ? err.message : err);
        stage.appendChild(note);
      }
    }
  };

  if (window.motion) start('motion-already-present');
  else window.addEventListener('motion:ready', () => start('motion:ready'), { once: true });
  // belt-and-braces: start anyway after 1.2s if motion never loaded
  setTimeout(() => { if (!window.app) start('timeout-fallback'); }, 1200);
});
