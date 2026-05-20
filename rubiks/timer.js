/* =========================================================
   TIMER — Speedcubing timer with WCA-style inspection,
   scramble generation, and PB tracking in localStorage.
   ========================================================= */

const TIMER_STATES = {
  IDLE: 'idle',          // waiting for user to press
  HOLDING: 'holding',    // user holding space (turning green)
  READY: 'ready',        // held long enough — release to start
  INSPECTION: 'inspection', // 15s inspection running
  RUNNING: 'running',    // timer running
  STOPPED: 'stopped',    // just stopped
};

class SpeedTimer {
  constructor(opts = {}) {
    this.state = TIMER_STATES.IDLE;
    this.startTime = 0;
    this.endTime = 0;
    this.holdStart = 0;
    this.inspectionStart = 0;
    this.scramble = '';
    this.opts = Object.assign({
      holdRequired: 350,     // ms to hold before "ready"
      inspectionSeconds: 0,  // 0 = no inspection, set to 15 for WCA
      onTick: () => {},
      onStateChange: () => {},
      onResult: () => {},
    }, opts);

    this._tickRaf = null;
    this.history = this._loadHistory();
  }

  _loadHistory() {
    try {
      return JSON.parse(localStorage.getItem('alexey_rubiks_times') || '[]');
    } catch { return []; }
  }
  _saveHistory() {
    try { localStorage.setItem('alexey_rubiks_times', JSON.stringify(this.history.slice(-300))); }
    catch {}
  }

  setScramble(s) { this.scramble = s; }

  /* ---- State helpers ---- */
  _setState(s) {
    this.state = s;
    this.opts.onStateChange(s);
  }
  currentMs() {
    if (this.state === TIMER_STATES.RUNNING) return performance.now() - this.startTime;
    if (this.state === TIMER_STATES.STOPPED) return this.endTime - this.startTime;
    if (this.state === TIMER_STATES.INSPECTION) {
      const elapsedInspect = (performance.now() - this.inspectionStart) / 1000;
      return Math.max(0, this.opts.inspectionSeconds - elapsedInspect) * 1000;
    }
    return 0;
  }

  /* ---- User input ---- */
  pressDown() {
    if (this.state === TIMER_STATES.RUNNING) {
      this._stop();
      return;
    }
    if (this.state === TIMER_STATES.IDLE || this.state === TIMER_STATES.STOPPED) {
      this.holdStart = performance.now();
      this._setState(TIMER_STATES.HOLDING);
      this._holdCheck();
    } else if (this.state === TIMER_STATES.INSPECTION) {
      this.holdStart = performance.now();
      this._setState(TIMER_STATES.HOLDING);
      this._holdCheck();
    }
  }
  pressUp() {
    if (this.state === TIMER_STATES.HOLDING) {
      // didn't hold long enough — back to idle/inspection
      this._setState(this._wasInInspection ? TIMER_STATES.INSPECTION : TIMER_STATES.IDLE);
    } else if (this.state === TIMER_STATES.READY) {
      // release while ready — start the timer
      this._start();
    }
  }

  _holdCheck() {
    const check = () => {
      if (this.state !== TIMER_STATES.HOLDING) return;
      const held = performance.now() - this.holdStart;
      if (held >= this.opts.holdRequired) {
        this._setState(TIMER_STATES.READY);
      } else {
        requestAnimationFrame(check);
      }
    };
    check();
  }

  _start() {
    this.startTime = performance.now();
    this._setState(TIMER_STATES.RUNNING);
    this._tick();
  }
  _tick() {
    if (this.state !== TIMER_STATES.RUNNING) return;
    this.opts.onTick(this.currentMs());
    this._tickRaf = requestAnimationFrame(() => this._tick());
  }
  _stop() {
    this.endTime = performance.now();
    cancelAnimationFrame(this._tickRaf);
    this._setState(TIMER_STATES.STOPPED);
    const ms = this.endTime - this.startTime;
    const entry = {
      ms,
      scramble: this.scramble,
      time: new Date().toISOString(),
    };
    this.history.push(entry);
    this._saveHistory();
    this.opts.onResult(entry, this.stats());
  }

  reset() {
    cancelAnimationFrame(this._tickRaf);
    this._setState(TIMER_STATES.IDLE);
  }

  /* ---- Stats ---- */
  stats() {
    const arr = this.history;
    if (!arr.length) return { best: null, avg5: null, avg12: null, count: 0 };
    const sorted = arr.map(e => e.ms).sort((a, b) => a - b);
    const best = sorted[0];
    const avg = (n) => {
      if (arr.length < n) return null;
      const last = arr.slice(-n).map(e => e.ms);
      const s = [...last].sort((a, b) => a - b);
      // WCA-style: drop best & worst, average remaining
      const trimmed = s.slice(1, -1);
      const sum = trimmed.reduce((a, b) => a + b, 0);
      return sum / trimmed.length;
    };
    return { best, avg5: avg(5), avg12: avg(12), count: arr.length };
  }

  clearHistory() {
    this.history = [];
    this._saveHistory();
  }

  static formatMs(ms) {
    if (ms === null || ms === undefined) return '—';
    const totalCs = Math.floor(ms / 10);
    const totalSec = Math.floor(totalCs / 100);
    const cs = totalCs % 100;
    const sec = totalSec % 60;
    const min = Math.floor(totalSec / 60);
    if (min > 0) return `${min}:${String(sec).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
    return `${sec}.${String(cs).padStart(2, '0')}`;
  }
}

window.SpeedTimer = SpeedTimer;
window.TIMER_STATES = TIMER_STATES;
