/* =========================================================
   RENDERER — Three.js 3D Rubik's cube
   Renders 26 cubies (skipping invisible centre), animates face
   turns, supports mouse-drag orbit, click-to-turn via screen
   buttons (face grabbing left for v2).
   ========================================================= */

const CUBIE_SIZE = 0.94;
const CUBIE_GAP = 1.0;
const STICKER_INSET = 0.04;
const CUBE_BODY_COLOR = 0x14110D;
// Yellow on top (U), white on bottom (D) — matches the chart's
// "yellow daisy on top → white cross drops to the bottom" framing.
const STICKER_COLORS_HEX = {
  U: 0xFFD500,  // yellow (top)
  R: 0xDC2626,
  F: 0x009B48,
  D: 0xFAFAFA,  // white  (bottom)
  L: 0xFF6F1A,
  B: 0x0046AD,
};

const MOVE_TABLE = {
  // [axis, layerValue, signedDir] for clockwise (no prime)
  R:  ['x',  1, -1],
  L:  ['x', -1, +1],
  U:  ['y',  1, -1],
  D:  ['y', -1, +1],
  F:  ['z',  1, -1],
  B:  ['z', -1, +1],
};

// Live drag-to-turn tuning
const PX_PER_RAD = 140;     // screen px of drag ≈ 1 radian of layer rotation
const DRAG_DECIDE_PX = 8;   // drag this far before committing to a turn axis

class CubeRenderer {
  constructor(canvas, model, options = {}) {
    this.canvas = canvas;
    this.model = model;
    this.opts = Object.assign({ turnDuration: 240, sound: null, haptics: false }, options);

    this._initThree();
    this._buildCube();
    this._initInteraction();

    this._queue = [];
    this._isAnimating = false;

    // Subscribe to model changes
    model.onChange(payload => this._handleModelEvent(payload));

    this._raf = null;
    this._animate();
  }

  _initThree() {
    const w = this.canvas.clientWidth || 600;
    const h = this.canvas.clientHeight || 600;
    this.scene = new THREE.Scene();
    this.scene.background = null; // transparent

    this.camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 100);
    this._spherical = { radius: 8.2, theta: Math.PI * 0.32, phi: Math.PI * 0.36 };
    this._updateCamera();

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(w, h, false);

    // Lighting — neutral white from several directions. The cube's depth
    // comes from the different brightness each face gets by its angle (plus
    // the dark body between stickers), NOT from coloured light. Tinted lights
    // were turning white stickers cream/beige and yellow stickers olive
    // depending on which face pointed at the warm key vs the cool fill.
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    const key = new THREE.DirectionalLight(0xffffff, 0.85);
    key.position.set(6, 8, 6);
    const fill = new THREE.DirectionalLight(0xffffff, 0.5);
    fill.position.set(-6, 4, -4);
    const rim = new THREE.DirectionalLight(0xffffff, 0.35);
    rim.position.set(0, -6, 4);
    this.scene.add(ambient, key, fill, rim);

    // Resize handling
    this._onResize = () => {
      const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
      if (!w || !h) return;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h, false);
    };
    new ResizeObserver(this._onResize).observe(this.canvas);
    window.addEventListener('resize', this._onResize);
  }

  _updateCamera() {
    const s = this._spherical;
    const x = s.radius * Math.sin(s.phi) * Math.cos(s.theta);
    const z = s.radius * Math.sin(s.phi) * Math.sin(s.theta);
    const y = s.radius * Math.cos(s.phi);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  _buildCube() {
    this.cubeGroup = new THREE.Group();
    this.scene.add(this.cubeGroup);

    this.cubies = [];

    const bodyMat = new THREE.MeshStandardMaterial({
      color: CUBE_BODY_COLOR,
      roughness: 0.6,
      metalness: 0.05,
    });

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          const geo = new THREE.BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE);
          const mats = Array(6).fill(bodyMat);
          const cubie = new THREE.Mesh(geo, mats.map(m => m.clone()));
          cubie.position.set(x * CUBIE_GAP, y * CUBIE_GAP, z * CUBIE_GAP);

          // attach colour stickers as separate Plane meshes (gives nice inset look)
          const stickerSize = CUBIE_SIZE - STICKER_INSET * 2;
          const stickerGeo = new THREE.PlaneGeometry(stickerSize, stickerSize);
          const half = CUBIE_SIZE / 2 + 0.001;

          const addSticker = (color, normal, rot, faceKey) => {
            // Stickers are UNLIT (MeshBasicMaterial) so they render their exact
            // hex regardless of lighting — a lit material tints bright colours
            // (white → beige, yellow → olive) depending on which light hits the
            // face. The 3D form comes from the lit dark body + the inset gaps.
            const m = new THREE.MeshBasicMaterial({ color, toneMapped: false });
            m.userData.baseColor = color;
            const sticker = new THREE.Mesh(stickerGeo, m);
            sticker.position.set(normal[0] * half, normal[1] * half, normal[2] * half);
            sticker.rotation.set(rot[0], rot[1], rot[2]);
            sticker.userData.isSticker = true;
            sticker.userData.faceKey = faceKey;
            sticker.userData.localNormal = { x: normal[0], y: normal[1], z: normal[2] };
            cubie.add(sticker);
          };

          if (x === 1)  addSticker(STICKER_COLORS_HEX.R, [1, 0, 0],  [0, Math.PI/2, 0],  'R');
          if (x === -1) addSticker(STICKER_COLORS_HEX.L, [-1, 0, 0], [0, -Math.PI/2, 0], 'L');
          if (y === 1)  addSticker(STICKER_COLORS_HEX.U, [0, 1, 0],  [-Math.PI/2, 0, 0], 'U');
          if (y === -1) addSticker(STICKER_COLORS_HEX.D, [0, -1, 0], [Math.PI/2, 0, 0],  'D');
          if (z === 1)  addSticker(STICKER_COLORS_HEX.F, [0, 0, 1],  [0, 0, 0],          'F');
          if (z === -1) addSticker(STICKER_COLORS_HEX.B, [0, 0, -1], [0, Math.PI, 0],    'B');

          cubie.userData.logicalPos = { x, y, z };
          cubie.userData.initialPos = { x, y, z };
          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }

    // Note: previous versions did an entrance scale animation on cubeGroup,
    // but the singular matrix during scale=0 collapsed every cubie to (0,0,0)
    // when _snapMove ran the initial scramble. Cube appears at full size from
    // t=0 — the cinematic scramble itself provides the satisfying motion.
  }

  _initInteraction() {
    this._raycaster = new THREE.Raycaster();
    this._grab = { active: false, gesture: 'idle', sticker: null, cubie: null,
                   faceWorld: null, screenStart: null, hitPoint: null,
                   // live drag-to-turn state
                   decided: false, axis: null, layer: 0, pivot: null,
                   affected: null, angle: 0, screenDir: null };

    let lx = 0, ly = 0;
    let dragging = false;

    const ndcFromEvent = (e) => {
      const p = this._pointerXY(e);
      const r = this.canvas.getBoundingClientRect();
      return {
        x: ((p.x - r.left) / r.width) * 2 - 1,
        y: -((p.y - r.top) / r.height) * 2 + 1,
        clientX: p.x,
        clientY: p.y,
      };
    };

    const start = (e) => {
      if (this._cinematic) return;      // ignore input mid-cinematic
      if (this._grab.pivot) return;     // a live turn is still resolving
      const ndc = ndcFromEvent(e);
      this._raycaster.setFromCamera({ x: ndc.x, y: ndc.y }, this.camera);
      const hits = this._raycaster
        .intersectObjects(this.cubies, true)
        .filter(h => h.object && h.object.userData && h.object.userData.isSticker);
      const hitSticker = hits.length > 0;

      // Routing:
      //   drag a sticker             → turn that layer (live preview)
      //   drag empty space / off     → orbit the view
      //   right-drag or ⌘/Ctrl-drag  → also turn, when over a sticker
      // While a keyboard/button turn is animating, force orbit so we never grab
      // cubies that are currently parented to an animation pivot.
      const isMouse = e.button !== undefined && !(e.touches || e.changedTouches);
      const modifierTurn = isMouse && (e.button === 2 || e.metaKey || e.ctrlKey);
      const wantsFace = !this._isAnimating &&
        (isMouse ? (modifierTurn || (e.button === 0 && hitSticker)) : hitSticker);

      dragging = true;
      lx = ndc.clientX; ly = ndc.clientY;

      // reset live-turn state for this gesture
      const g = this._grab;
      g.decided = false; g.pivot = null; g.affected = null; g.angle = 0;

      if (wantsFace && hitSticker) {
        const hit = hits[0];
        const sticker = hit.object;
        const cubie = sticker.parent;
        const ln = sticker.userData.localNormal;
        // local face normal → world (cubie's rotation only), snapped to ±1 axis
        const v = new THREE.Vector3(ln.x, ln.y, ln.z);
        v.applyQuaternion(cubie.getWorldQuaternion(new THREE.Quaternion()));
        v.set(Math.round(v.x), Math.round(v.y), Math.round(v.z));

        g.active = true;
        g.gesture = 'face';
        g.sticker = sticker;
        g.cubie = cubie;
        g.faceWorld = v;
        g.faceKey = sticker.userData.faceKey;
        g.screenStart = { x: ndc.clientX, y: ndc.clientY };
        g.hitPoint = hit.point.clone();
      } else if (isMouse && e.button === 2) {
        // right-click on empty space — do nothing
        dragging = false;
        g.gesture = 'idle';
      } else {
        // left-drag on empty space, or a ⌘/Ctrl-drag that missed a sticker
        g.gesture = 'orbit';
      }
    };

    const move = (e) => {
      if (!dragging) return;
      const p = this._pointerXY(e);
      if (this._grab.gesture === 'orbit') {
        const dx = p.x - lx;
        const dy = p.y - ly;
        lx = p.x; ly = p.y;
        // Horizontal: drag right → cube spins right (camera orbits left).
        // Vertical: drag down → tilt the top toward the viewer. Matches the
        // Three.js OrbitControls desktop norm.
        this._spherical.theta += dx * 0.008;
        // Clamp vertical angle just shy of the poles so you can look almost
        // straight down/up at the top and bottom faces without a gimbal flip.
        this._spherical.phi = Math.max(0.05, Math.min(Math.PI - 0.05, this._spherical.phi - dy * 0.008));
        this._updateCamera();
        return;
      }
      if (this._grab.gesture === 'face') {
        const g = this._grab;
        const tdx = p.x - g.screenStart.x;
        const tdy = p.y - g.screenStart.y;
        if (!g.decided) {
          if (Math.hypot(tdx, tdy) < DRAG_DECIDE_PX) return;
          this._beginLivePivot(tdx, tdy);
        }
        if (g.decided && g.pivot) {
          const along = tdx * g.screenDir.x + tdy * g.screenDir.y;
          g.angle = along / g.pxPerRad;
          g.pivot.rotation[g.axis] = g.angle;
        }
      }
    };

    const end = (e) => {
      if (!dragging) return;
      dragging = false;
      const g = this._grab;
      if (g.gesture === 'face' && g.decided && g.pivot) {
        this._finishLiveTurn();   // snap, bake, reconcile with the model
        return;
      }
      // face-grab that never passed the decide threshold, or orbit/idle
      g.gesture = 'idle';
      g.decided = false;
    };

    this.canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
    // Suppress the browser context menu so right-click drag works on the cube.
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('touchstart', (e) => { start(e); e.preventDefault(); }, { passive: false });
    window.addEventListener('touchmove', (e) => { move(e); }, { passive: true });
    window.addEventListener('touchend', end);

    // wheel to zoom
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this._spherical.radius = Math.max(5, Math.min(14, this._spherical.radius + e.deltaY * 0.005));
      this._updateCamera();
    }, { passive: false });
  }

  /* =========================================================
     LIVE DRAG-TO-TURN — the grabbed layer follows the cursor
     and snaps to the nearest quarter turn on release.
     ========================================================= */

  /** True while a face drag is being previewed or resolved. */
  isFaceDragging() { return !!this._grab.pivot; }

  _projectToScreen(vec3) {
    const v = vec3.clone().project(this.camera);
    return { x: (v.x + 1) * 0.5 * this.canvas.clientWidth,
             y: (-v.y + 1) * 0.5 * this.canvas.clientHeight };
  }

  /**
   * Called once per face drag, after the pointer passes DRAG_DECIDE_PX. The
   * drag direction chooses WHICH layer turns: each candidate axis is scored by
   * how closely a turn about it would move the grabbed point along the drag, so
   * the grabbed surface tracks the cursor.
   *
   * Every cubie sits in one layer per axis, and all three can turn: outer layers
   * (coord ±1) are face moves, the middle layer (coord 0) is a slice move
   * (M/E/S). So a corner offers the 3 face turns through it, an edge 2 faces + 1
   * slice, and a centre its face turn + 2 slices — picked by drag direction.
   */
  _beginLivePivot(tdx, tdy) {
    const g = this._grab;
    const p = g.hitPoint;
    const lp = g.cubie.userData.logicalPos;
    const candidates = ['x', 'y', 'z'];

    // Score each candidate by |drag · screenVelocity|, where screenVelocity is
    // the screen projection of the point's motion (ω × p) under a +rotation.
    const a0 = this._projectToScreen(p);
    let best = null;
    for (const ax of candidates) {
      const omega = new THREE.Vector3(ax === 'x' ? 1 : 0, ax === 'y' ? 1 : 0, ax === 'z' ? 1 : 0);
      const vel = new THREE.Vector3().crossVectors(omega, p);
      const b = this._projectToScreen(p.clone().add(vel.multiplyScalar(0.5)));
      const sx = b.x - a0.x, sy = b.y - a0.y;
      const len = Math.hypot(sx, sy) || 1;
      const dir = { x: sx / len, y: sy / len };
      const score = Math.abs(tdx * dir.x + tdy * dir.y);
      if (!best || score > best.score) best = { axis: ax, dir, score };
    }

    const axis = best.axis;
    const layer = lp[axis];
    const affected = this.cubies.filter(c => Math.abs(c.userData.logicalPos[axis] - layer) < 0.5);
    const pivot = new THREE.Group();
    this.cubeGroup.add(pivot);
    affected.forEach(c => pivot.attach(c));

    g.axis = axis;
    g.layer = layer;
    g.affected = affected;
    g.pivot = pivot;
    g.screenDir = best.dir; // signed handling lives in move(): angle = (drag·dir)/pxPerRad
    g.pxPerRad = PX_PER_RAD;
    g.angle = 0;
    g.decided = true;
  }

  /**
   * On release: ease the partial rotation to the nearest quarter turn, bake the
   * cubies' new logical positions, then reconcile the model WITHOUT re-animating.
   */
  _finishLiveTurn() {
    const g = this._grab;
    const pivot = g.pivot, axis = g.axis, layer = g.layer, affected = g.affected;
    const startAngle = g.angle;
    const snapped = Math.round(startAngle / (Math.PI / 2)); // 0, ±1, ±2
    const target = snapped * (Math.PI / 2);
    const t0 = performance.now();
    const dur = 160;

    const bake = () => {
      const times = Math.abs(snapped) % 4;
      const dir = Math.sign(snapped) || 1;
      affected.forEach(c => {
        this.cubeGroup.attach(c);
        if (times !== 0) {
          c.userData.logicalPos = this._rotateLogical(c.userData.logicalPos, axis, dir, times);
        }
        c.position.set(Math.round(c.position.x), Math.round(c.position.y), Math.round(c.position.z));
      });
      this.cubeGroup.remove(pivot);
      // Clear live state BEFORE committing so isFaceDragging() reads false.
      g.pivot = null; g.affected = null; g.decided = false; g.gesture = 'idle';
      if (times !== 0) {
        this._commitMoveToModel(axis, layer, snapped);
        if (this.onIdle) this.onIdle();   // fires the solve celebration if solved
      }
    };

    const tick = () => {
      const t = Math.min(1, (performance.now() - t0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      pivot.rotation[axis] = startAngle + (target - startAngle) * eased;
      if (t < 1) requestAnimationFrame(tick);
      else { pivot.rotation[axis] = target; bake(); }
    };
    tick();
  }

  /**
   * Map a baked visual turn (axis + layer + signed quarter-turns) to notation and
   * push it to the model silently — the visual is already correct, so we only
   * update logical state + history + move count (no re-animation).
   */
  _commitMoveToModel(axis, layer, snapped) {
    const notation = this._notationFromTurn(axis, layer, snapped);
    if (!notation) return;
    if (this.opts.sound) this.opts.sound.click();
    if (this.opts.haptics && 'vibrate' in navigator) navigator.vibrate(8);
    if (this.opts.onMove) this.opts.onMove(notation);
    if (this.model && this.model.applyNoAnim) this.model.applyNoAnim(notation);
  }

  /**
   * (axis, layer, signed quarter-turns) → move notation. Outer layers (coord ±1)
   * map to face moves via MOVE_TABLE; the middle layer (coord 0) maps to a slice
   * move M/E/S. pivot.rotation[axis] = +π/2 is a +quarter turn about +axis, and
   * the slice base directions are taken from cubejs's own x = "R M' L'",
   * y = "U E' D'", z = "F S B'" definitions so the model stays in sync.
   */
  _notationFromTurn(axis, layer, snapped) {
    let letter = null, dir = 1;
    if (Math.abs(layer) < 0.5) {
      const SLICE = { x: ['M', +1], y: ['E', +1], z: ['S', -1] };
      [letter, dir] = SLICE[axis];
    } else {
      for (const [L, [ax, lay, d]] of Object.entries(MOVE_TABLE)) {
        if (ax === axis && lay === layer) { letter = L; dir = d; break; }
      }
    }
    if (!letter) return null;
    // k unprimed turns = k·dir quarters; solve k·dir ≡ snapped (mod 4).
    const k = (((snapped * dir) % 4) + 4) % 4;
    if (k === 0) return null;
    if (k === 1) return letter;
    if (k === 2) return letter + '2';
    return letter + "'"; // k === 3
  }

  _pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  _handleModelEvent(payload) {
    if (this._cinematic) {
      // cinematic owns the animation; just bake model-state moves silently
      if (payload.kind === 'reset') this._resetCubies();
      return;
    }
    if (payload.kind === 'reset') {
      this._resetCubies();
      return;
    }
    if (payload.kind === 'sync') return;
    if (payload.kind === 'move') {
      if (payload.animate === false) {
        payload.moves.forEach(m => this._snapMove(m));
        return;
      }
      payload.moves.forEach(m => this._queue.push(m));
      if (!this._isAnimating) this._processQueue();
    }
  }

  _resetCubies() {
    // cancel any in-flight animations
    this._queue.length = 0;
    this._isAnimating = false;
    this.cubies.forEach(c => {
      const ip = c.userData.initialPos;
      c.position.set(ip.x, ip.y, ip.z);
      c.quaternion.identity();
      c.rotation.set(0, 0, 0);
      c.userData.logicalPos = { ...ip };
    });
  }

  _snapMove(notation) {
    const m = this._parseMove(notation);
    if (!m) return;
    const { axis, layer, dir, times } = m;
    const affected = this.cubies.filter(c => Math.abs(c.userData.logicalPos[axis] - layer) < 0.5);
    const pivot = new THREE.Group();
    this.cubeGroup.add(pivot);
    affected.forEach(c => pivot.attach(c));
    pivot.rotation[axis] = dir * (Math.PI / 2) * times;
    pivot.updateMatrixWorld(true);
    affected.forEach(c => {
      this.cubeGroup.attach(c);
      const lp = c.userData.logicalPos;
      const rotated = this._rotateLogical(lp, axis, dir, times);
      c.userData.logicalPos = rotated;
      c.position.set(
        Math.round(c.position.x),
        Math.round(c.position.y),
        Math.round(c.position.z)
      );
    });
    this.cubeGroup.remove(pivot);
  }

  async _processQueue() {
    this._isAnimating = true;
    while (this._queue.length) {
      const m = this._queue.shift();
      await this._animateMove(m);
    }
    this._isAnimating = false;
    if (this.onIdle) this.onIdle();
  }

  /**
   * Animate a single move on the visual cube. The model has ALREADY applied
   * the move to its state; we just need to play the animation visually.
   *
   * Special care: we must move cubies based on their CURRENT logical position
   * (before this move), then update their logicalPos after.
   */
  _animateMove(notation) {
    return new Promise((resolve) => {
      const m = this._parseMove(notation);
      if (!m) { resolve(); return; }

      // before animating, sync from model BUT preserve render state
      // Actually: the model state has the post-move colors. If we sync first,
      // the visual is already at the end state. So we should NOT sync before.
      // Our cubies carry their own colors physically — we just need to rotate
      // them spatially. After rotation we update logicalPos to match the new
      // state which is what the model is also at.

      const { axis, layer, dir, times } = m;
      const affected = this.cubies.filter(c => Math.abs(c.userData.logicalPos[axis] - layer) < 0.5);

      const pivot = new THREE.Group();
      this.cubeGroup.add(pivot);
      affected.forEach(c => pivot.attach(c));

      const targetAngle = dir * (Math.PI / 2) * times;
      const t0 = performance.now();
      const dur = this.opts.turnDuration * (times === 2 ? 1.35 : 1);

      // play click sound
      if (this.opts.sound) this.opts.sound.click();
      if (this.opts.haptics && 'vibrate' in navigator) navigator.vibrate(8);

      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const eased = 1 - Math.pow(1 - t, 3.2); // ease-out cubic
        pivot.rotation[axis] = targetAngle * eased;
        if (t < 1) requestAnimationFrame(tick);
        else {
          // detach with world transform preserved
          affected.forEach(c => {
            this.cubeGroup.attach(c);
            // recompute logical position by rotating about axis
            const lp = c.userData.logicalPos;
            const rotated = this._rotateLogical(lp, axis, dir, times);
            c.userData.logicalPos = rotated;
            // snap to nice integer position (avoid float drift)
            c.position.set(
              Math.round(c.position.x),
              Math.round(c.position.y),
              Math.round(c.position.z)
            );
          });
          this.cubeGroup.remove(pivot);
          resolve();
        }
      };
      tick();
    });
  }

  _parseMove(notation) {
    if (!notation || typeof notation !== 'string') return null;
    const ch = notation[0].toUpperCase();
    if (!MOVE_TABLE[ch]) return null;
    const [axis, layer, baseDir] = MOVE_TABLE[ch];
    const rest = notation.slice(1);
    let dir = baseDir;
    let times = 1;
    if (rest === "'") dir = -baseDir;
    else if (rest === '2') times = 2;
    return { axis, layer, dir, times };
  }

  _rotateLogical(pos, axis, dir, times = 1) {
    let { x, y, z } = pos;
    for (let i = 0; i < times; i++) {
      // For each axis, rotation by dir*90° in the plane perpendicular to it.
      // Using right-hand-rule: positive rotation around X takes +Y to +Z.
      const sign = dir;
      if (axis === 'x') {
        const ny = -sign * z;
        const nz =  sign * y;
        y = ny; z = nz;
      } else if (axis === 'y') {
        const nx =  sign * z;
        const nz = -sign * x;
        x = nx; z = nz;
      } else if (axis === 'z') {
        const nx = -sign * y;
        const ny =  sign * x;
        x = nx; y = ny;
      }
    }
    return { x, y, z };
  }

  _syncFromModel() {
    // Re-paint stickers so colors match the model.
    // Approach: read model.asString(), figure out which sticker on which face
    // corresponds to each cubie's outward face, and recolor that sticker.
    const stickerStr = this.model.asString();
    // 0..8 U, 9..17 R, 18..26 F, 27..35 D, 36..44 L, 45..53 B
    const FACE_OFFSET = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

    // For each cubie, determine which faces are outward (based on logicalPos)
    // and find the corresponding sticker index on each face.
    this.cubies.forEach(cubie => {
      const lp = cubie.userData.logicalPos;
      // For each outward direction, locate the sticker index on that face
      // Sticker index per face is determined by where on the face the cubie sits.
      cubie.children.forEach(child => {
        // child is a sticker plane mesh. Its position is local within the cubie.
        // outward direction is the local position normalized
        const lx = child.position.x, ly = child.position.y, lz = child.position.z;
        let face, idx;
        const eps = 0.01;
        if (Math.abs(lx - CUBIE_SIZE / 2) < 0.1) { face = 'R'; idx = this._faceIdx('R', lp); }
        else if (Math.abs(lx + CUBIE_SIZE / 2) < 0.1) { face = 'L'; idx = this._faceIdx('L', lp); }
        else if (Math.abs(ly - CUBIE_SIZE / 2) < 0.1) { face = 'U'; idx = this._faceIdx('U', lp); }
        else if (Math.abs(ly + CUBIE_SIZE / 2) < 0.1) { face = 'D'; idx = this._faceIdx('D', lp); }
        else if (Math.abs(lz - CUBIE_SIZE / 2) < 0.1) { face = 'F'; idx = this._faceIdx('F', lp); }
        else if (Math.abs(lz + CUBIE_SIZE / 2) < 0.1) { face = 'B'; idx = this._faceIdx('B', lp); }
        if (face && idx >= 0 && idx <= 8) {
          const c = stickerStr[FACE_OFFSET[face] + idx];
          const color = STICKER_COLORS_HEX[c];
          if (color !== undefined && child.material && child.material.color) {
            // NOTE: this method is currently unused — sticker colours are
            // physical (baked per material, moved only by turns). Kept for a
            // possible state-driven repaint path; stickers are unlit
            // MeshBasicMaterial, so set .color only (no emissive).
            child.material.color.setHex(color);
            child.material.userData.baseColor = color;
          }
        }
      });
    });
  }

  /**
   * Given a face letter (U/R/F/D/L/B) and a logical cube position (x,y,z in {-1,0,1}),
   * return the sticker index on that face. Per Singmaster URFDLB convention.
   *
   *  U: rows go from B(z=-1, idx 0..2) to F(z=+1, idx 6..8); cols L(x=-1) → R(x=+1).
   *  D: rows go from F(z=+1, idx 0..2) to B(z=-1, idx 6..8); cols L(x=-1) → R(x=+1).
   *  R: rows go from U(y=+1) to D(y=-1); cols F(z=+1) on the right (idx 2) → B(z=-1) on the left (idx 0).
   *  L: rows go from U(y=+1) to D(y=-1); cols B(z=-1) on the right (idx 2) → F(z=+1) on the left (idx 0).
   *  F: rows go from U(y=+1) to D(y=-1); cols L(x=-1) on left → R(x=+1) on right.
   *  B: rows go from U(y=+1) to D(y=-1); cols R(x=+1) on left → L(x=-1) on right.
   */
  _faceIdx(face, p) {
    let row, col;
    if (face === 'U') {        row = p.z + 1;        col = p.x + 1; }
    else if (face === 'D') {   row = 1 - p.z;        col = p.x + 1; }
    else if (face === 'R') {   row = 1 - p.y;        col = 1 - p.z; }
    else if (face === 'L') {   row = 1 - p.y;        col = p.z + 1; }
    else if (face === 'F') {   row = 1 - p.y;        col = p.x + 1; }
    else if (face === 'B') {   row = 1 - p.y;        col = 1 - p.x; }
    return row * 3 + col;
  }

  _animate() {
    this._raf = requestAnimationFrame(() => this._animate());
    // gentle micro-shake while a cinematic is active
    if (this._cameraShake && this._cameraShake > 0.001) {
      const nx = (Math.random() - 0.5) * this._cameraShake;
      const ny = (Math.random() - 0.5) * this._cameraShake;
      this.camera.position.x += nx;
      this.camera.position.y += ny;
      this._cameraShake *= 0.92;
    }
    this.renderer.render(this.scene, this.camera);
  }

  /* =========================================================
     HIGHLIGHTS — statically mark specific cubies' stickers
     ========================================================= */

  /**
   * Mark the stickers of cubies whose logical position matches with a steady
   * bright outline ring — NO animation. A ring (rather than a colour change) is
   * used so it's visible on every sticker colour, including white, and keeps the
   * piece's real colours readable. The rings are children of the stickers, so
   * they ride along with turns; clearHighlights removes them.
   * @returns {() => void} disposer that clears the highlight
   */
  highlightPieces(pieces, opts = {}) {
    this.clearHighlights();

    if (!this._markerGeo) {
      // ring sized to frame a sticker (sticker side ≈ CUBIE_SIZE - 2*INSET)
      this._markerGeo = new THREE.RingGeometry(0.30, 0.40, 28);
      this._markerMat = new THREE.MeshBasicMaterial({
        color: 0xFFC83D, side: THREE.DoubleSide, transparent: true, opacity: 0.95, toneMapped: false,
      });
    }

    const keyFor = (p) => `${p.x}|${p.y}|${p.z}`;
    const wantKeys = new Set(pieces.map(keyFor));
    const markers = [];

    this.cubies.forEach(cubie => {
      if (!wantKeys.has(keyFor(cubie.userData.logicalPos))) return;
      cubie.children.forEach(ch => {
        if (!ch.userData || !ch.userData.isSticker) return;
        const ring = new THREE.Mesh(this._markerGeo, this._markerMat);
        ring.position.set(0, 0, 0.012); // lift just outside the sticker face
        ring.userData.isHighlightMarker = true;
        ch.add(ring);
        markers.push(ring);
      });
    });

    this._activeHighlight = { markers };
    return () => this.clearHighlights();
  }

  clearHighlights() {
    if (!this._activeHighlight) return;
    (this._activeHighlight.markers || []).forEach(m => { if (m.parent) m.parent.remove(m); });
    this._activeHighlight = null;
  }

  /* =========================================================
     CINEMATIC — slower, dramatic scramble / solve playback
     ========================================================= */

  async scrambleCinematic(moves, opts = {}) {
    const totalMs = opts.totalMs || 3000;
    const onMove = opts.onMove || (() => {});
    const perMoveMs = Math.max(80, totalMs / moves.length);
    this._cinematic = true;
    // gentle camera spin during scramble
    const startTheta = this._spherical.theta;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      onMove(m); // tell app to update model + sound
      await this._animateMoveWithEase(m, perMoveMs);
      // slight camera drift
      this._spherical.theta = startTheta + Math.sin((i / moves.length) * Math.PI) * 0.45;
      this._updateCamera();
      // micro-shake on each move
      this._cameraShake = 0.03;
    }
    // settle camera
    await this._easeCameraTo(startTheta, 280);
    this._cinematic = false;
  }

  async playSolveCinematic(moves, opts = {}) {
    const totalMs = opts.totalMs || 5000;
    const onMove = opts.onMove || (() => {});
    const perMoveMs = Math.max(120, totalMs / moves.length);
    this._cinematic = true;
    const startTheta = this._spherical.theta;
    for (let i = 0; i < moves.length; i++) {
      const m = moves[i];
      onMove(m);
      await this._animateMoveWithEase(m, perMoveMs);
      // very subtle camera arc
      this._spherical.theta = startTheta + (i / moves.length) * 0.55;
      this._updateCamera();
    }
    await this._easeCameraTo(startTheta, 400);
    this._cinematic = false;
  }

  _animateMoveWithEase(notation, dur) {
    return new Promise((resolve) => {
      const m = this._parseMove(notation);
      if (!m) { resolve(); return; }
      const { axis, layer, dir, times } = m;
      const affected = this.cubies.filter(c => Math.abs(c.userData.logicalPos[axis] - layer) < 0.5);
      const pivot = new THREE.Group();
      this.cubeGroup.add(pivot);
      affected.forEach(c => pivot.attach(c));
      const targetAngle = dir * (Math.PI / 2) * times;
      const t0 = performance.now();
      if (this.opts.sound) this.opts.sound.click();
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        // ease-out cubic with a tiny overshoot at the end
        const eased = t < 1 ? 1 - Math.pow(1 - t, 3) : 1;
        pivot.rotation[axis] = targetAngle * eased;
        if (t < 1) requestAnimationFrame(tick);
        else {
          affected.forEach(c => {
            this.cubeGroup.attach(c);
            const lp = c.userData.logicalPos;
            const rotated = this._rotateLogical(lp, axis, dir, times);
            c.userData.logicalPos = rotated;
            c.position.set(
              Math.round(c.position.x),
              Math.round(c.position.y),
              Math.round(c.position.z)
            );
          });
          this.cubeGroup.remove(pivot);
          resolve();
        }
      };
      tick();
    });
  }

  _easeCameraTo(targetTheta, dur) {
    return new Promise(resolve => {
      const startTheta = this._spherical.theta;
      const t0 = performance.now();
      const tick = () => {
        const t = Math.min(1, (performance.now() - t0) / dur);
        const e = 1 - Math.pow(1 - t, 3);
        this._spherical.theta = startTheta + (targetTheta - startTheta) * e;
        this._updateCamera();
        if (t < 1) requestAnimationFrame(tick);
        else resolve();
      };
      tick();
    });
  }

  setCameraShake(amount) {
    this._cameraShake = amount;
  }

  dispose() {
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._onResize);
    this.renderer.dispose();
  }

  /* ---- Public helpers ---- */
  setSpin(spin) {
    // continuous spin around Y on idle (subtle motion)
    this._idleSpin = !!spin;
  }
}

window.CubeRenderer = CubeRenderer;
