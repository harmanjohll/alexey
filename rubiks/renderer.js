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
const STICKER_COLORS_HEX = {
  U: 0xFAFAFA,
  R: 0xDC2626,
  F: 0x009B48,
  D: 0xFFD500,
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

    // Lighting — bright, slightly warm key, cool fill, rim
    const ambient = new THREE.AmbientLight(0xffffff, 0.65);
    const key = new THREE.DirectionalLight(0xfff2dc, 0.9);
    key.position.set(6, 8, 6);
    const fill = new THREE.DirectionalLight(0xc6d8ff, 0.5);
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

          const addSticker = (color, normal, rot) => {
            const m = new THREE.MeshStandardMaterial({
              color,
              roughness: 0.45,
              metalness: 0.0,
            });
            const sticker = new THREE.Mesh(stickerGeo, m);
            sticker.position.set(normal[0] * half, normal[1] * half, normal[2] * half);
            sticker.rotation.set(rot[0], rot[1], rot[2]);
            cubie.add(sticker);
          };

          if (x === 1)  addSticker(STICKER_COLORS_HEX.R, [1, 0, 0],  [0, Math.PI/2, 0]);
          if (x === -1) addSticker(STICKER_COLORS_HEX.L, [-1, 0, 0], [0, -Math.PI/2, 0]);
          if (y === 1)  addSticker(STICKER_COLORS_HEX.U, [0, 1, 0],  [-Math.PI/2, 0, 0]);
          if (y === -1) addSticker(STICKER_COLORS_HEX.D, [0, -1, 0], [Math.PI/2, 0, 0]);
          if (z === 1)  addSticker(STICKER_COLORS_HEX.F, [0, 0, 1],  [0, 0, 0]);
          if (z === -1) addSticker(STICKER_COLORS_HEX.B, [0, 0, -1], [0, Math.PI, 0]);

          cubie.userData.logicalPos = { x, y, z };
          cubie.userData.initialPos = { x, y, z };
          this.cubeGroup.add(cubie);
          this.cubies.push(cubie);
        }
      }
    }

    // subtle entrance — drop in
    this.cubeGroup.scale.set(0, 0, 0);
    this.cubeGroup.rotation.y = Math.PI * 0.1;
    const t0 = performance.now();
    const animateIn = () => {
      const dt = (performance.now() - t0) / 700;
      const e = Math.min(1, dt);
      const ease = 1 - Math.pow(1 - e, 3);
      const s = ease;
      this.cubeGroup.scale.setScalar(s);
      if (e < 1) requestAnimationFrame(animateIn);
      else this.cubeGroup.scale.setScalar(1);
    };
    animateIn();
  }

  _initInteraction() {
    let dragging = false;
    let lx = 0, ly = 0;

    const start = (e) => {
      dragging = true;
      const p = this._pointerXY(e);
      lx = p.x; ly = p.y;
    };
    const move = (e) => {
      if (!dragging) return;
      const p = this._pointerXY(e);
      const dx = p.x - lx;
      const dy = p.y - ly;
      lx = p.x; ly = p.y;
      this._spherical.theta -= dx * 0.008;
      this._spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this._spherical.phi - dy * 0.008));
      this._updateCamera();
    };
    const end = () => { dragging = false; };

    this.canvas.addEventListener('mousedown', start);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', end);
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

  _pointerXY(e) {
    if (e.touches && e.touches[0]) return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    if (e.changedTouches && e.changedTouches[0]) return { x: e.changedTouches[0].clientX, y: e.changedTouches[0].clientY };
    return { x: e.clientX, y: e.clientY };
  }

  _handleModelEvent(payload) {
    if (payload.kind === 'reset') {
      this._resetCubies();
      return;
    }
    if (payload.kind === 'sync') {
      // explicit sync request — no-op (cubies are physical, no repaint needed)
      return;
    }
    if (payload.kind === 'move') {
      if (payload.animate === false) {
        // snap-apply each move with no animation
        payload.moves.forEach(m => this._snapMove(m));
        return;
      }
      // queue animations
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
            child.material.color.setHex(color);
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
    this.renderer.render(this.scene, this.camera);
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
