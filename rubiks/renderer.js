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

          const addSticker = (color, normal, rot, faceKey) => {
            // Self-emissive baseline at the sticker's own colour locks colour
            // identity against the warm key / cool fill lights — otherwise
            // white reads as cream and yellow reads as olive depending on
            // which light is hitting the face.
            const m = new THREE.MeshStandardMaterial({
              color,
              roughness: 0.45,
              metalness: 0.0,
              emissive: color,
              emissiveIntensity: 0.22,
            });
            m.userData.baseColor = color;
            m.userData.baseEmissiveIntensity = 0.22;
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
                   faceLocal: null, faceWorld: null, axisCandidates: null,
                   screenStart: null, hitPoint: null };
    this._buildFaceLookup();

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
      if (this._cinematic) return; // ignore input mid-cinematic
      const ndc = ndcFromEvent(e);
      this._raycaster.setFromCamera({ x: ndc.x, y: ndc.y }, this.camera);
      const hits = this._raycaster
        .intersectObjects(this.cubies, true)
        .filter(h => h.object && h.object.userData && h.object.userData.isSticker);

      // Route by input: left-mouse = orbit camera, right-mouse = rotate face.
      // Touch has no buttons, so it falls back to the old heuristic
      // (sticker → face turn, empty space → orbit).
      const isMouse = e.button !== undefined && !(e.touches || e.changedTouches);
      const wantsFace = isMouse ? (e.button === 2) : (hits.length > 0);

      dragging = true;
      lx = ndc.clientX; ly = ndc.clientY;

      if (wantsFace && hits.length > 0) {
        // start face-grab
        const hit = hits[0];
        const sticker = hit.object;
        const cubie = sticker.parent;
        const ln = sticker.userData.localNormal;
        // transform local normal to world (cubie's rotation only)
        const v = new THREE.Vector3(ln.x, ln.y, ln.z);
        v.applyQuaternion(cubie.getWorldQuaternion(new THREE.Quaternion()));
        v.set(Math.round(v.x), Math.round(v.y), Math.round(v.z));  // snap to ±1 axis
        const axisCandidates = [];
        if (Math.abs(v.x) < 0.5) axisCandidates.push(new THREE.Vector3(1, 0, 0));
        if (Math.abs(v.y) < 0.5) axisCandidates.push(new THREE.Vector3(0, 1, 0));
        if (Math.abs(v.z) < 0.5) axisCandidates.push(new THREE.Vector3(0, 0, 1));

        this._grab.active = true;
        this._grab.gesture = 'face';
        this._grab.sticker = sticker;
        this._grab.cubie = cubie;
        this._grab.faceWorld = v;
        this._grab.faceLocal = sticker.userData.localNormal;
        this._grab.faceKey = sticker.userData.faceKey;
        this._grab.axisCandidates = axisCandidates;
        this._grab.screenStart = { x: ndc.clientX, y: ndc.clientY };
        this._grab.hitPoint = hit.point.clone();
      } else if (wantsFace) {
        // Right-click off the cube — do nothing.
        dragging = false;
        this._grab.gesture = 'idle';
      } else {
        this._grab.gesture = 'orbit';
      }
    };

    const move = (e) => {
      if (!dragging) return;
      const p = this._pointerXY(e);
      const dx = p.x - lx;
      const dy = p.y - ly;
      lx = p.x; ly = p.y;
      if (this._grab.gesture === 'orbit') {
        // Horizontal: drag right → cube spins right (camera orbits left).
        // Vertical: drag down → tilt cube toward viewer (top face comes into
        // view). Matches Three.js OrbitControls — the desktop 3D-viewer norm.
        this._spherical.theta += dx * 0.008;
        this._spherical.phi = Math.max(0.15, Math.min(Math.PI - 0.15, this._spherical.phi - dy * 0.008));
        this._updateCamera();
      }
      // face-grab: we don't preview the rotation in v1; decide on release
    };

    const end = (e) => {
      if (!dragging) { return; }
      dragging = false;
      if (this._grab.gesture !== 'face') {
        this._grab.gesture = 'idle';
        return;
      }
      const p = this._pointerXY(e);
      const dx = p.x - this._grab.screenStart.x;
      const dy = p.y - this._grab.screenStart.y;
      const mag = Math.hypot(dx, dy);
      if (mag < 18) {
        this._grab.gesture = 'idle';
        return;
      }
      // pick best axis by projecting drag into screen
      const pivot = this._grab.hitPoint;
      const projectVec = (p) => {
        const v = p.clone().project(this.camera);
        return { x: (v.x + 1) * 0.5 * this.canvas.clientWidth,
                 y: (-v.y + 1) * 0.5 * this.canvas.clientHeight };
      };
      const base = projectVec(pivot);
      let best = null;
      for (const axis of this._grab.axisCandidates) {
        const tip = pivot.clone().add(axis.clone().multiplyScalar(0.5));
        const tipS = projectVec(tip);
        const sx = tipS.x - base.x;
        const sy = tipS.y - base.y;
        const len = Math.hypot(sx, sy) || 1;
        const score = (dx * sx + dy * sy) / len;
        if (!best || Math.abs(score) > Math.abs(best.score)) best = { axis, score };
      }
      if (best) {
        const sign = best.score > 0 ? 1 : -1;
        const notation = this._lookupMove(this._grab.faceWorld, best.axis, sign);
        if (notation) {
          if (this.opts.onMove) this.opts.onMove(notation);
          if (this.model) this.model.apply(notation);
        }
      }
      this._grab.gesture = 'idle';
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

  /**
   * Build the (faceWorld, rotationAxis, dragSign) → move-notation lookup table.
   * For each of 6 face normals, and 2 perpendicular axes × 2 signs, decide which
   * face turn (and direction) makes the drag feel natural.
   *
   * Heuristic: dragging along axis +A on face +F should rotate the +F-layer
   * such that the face's local +A direction moves in the drag direction.
   * The face turn axis is the face normal itself, and the direction depends
   * on the cross-product sign.
   */
  _buildFaceLookup() {
    const FN = {
      '+x': { axis: 'x', layer: +1, faceLetter: 'R' },
      '-x': { axis: 'x', layer: -1, faceLetter: 'L' },
      '+y': { axis: 'y', layer: +1, faceLetter: 'U' },
      '-y': { axis: 'y', layer: -1, faceLetter: 'D' },
      '+z': { axis: 'z', layer: +1, faceLetter: 'F' },
      '-z': { axis: 'z', layer: -1, faceLetter: 'B' },
    };
    // Sign convention for primed moves (matches MOVE_TABLE base direction)
    const baseDir = { R: -1, L: +1, U: -1, D: +1, F: -1, B: +1 };
    this._faceLookup = (faceWorld, dragAxisWorld, dragSign) => {
      const key = (faceWorld.x === 1 ? '+x' : faceWorld.x === -1 ? '-x'
                 : faceWorld.y === 1 ? '+y' : faceWorld.y === -1 ? '-y'
                 : faceWorld.z === 1 ? '+z' : '-z');
      const info = FN[key];
      if (!info) return null;
      const turnAxis = info.axis;
      // drag axis component perpendicular to the face normal — already orthogonal by construction
      // The rotation direction: if drag direction = +A (one of {+x,+y,+z}\faceNormal),
      // then we rotate around faceNormal such that the face's surface drags in that direction.
      // Compute via cross product: face × dragAxis = rotation axis direction at drag point.
      const f = new THREE.Vector3(faceWorld.x, faceWorld.y, faceWorld.z);
      const d = dragAxisWorld.clone().multiplyScalar(dragSign);
      const r = new THREE.Vector3().crossVectors(f, d);
      // r should be ±axis of rotation; we want a face turn (R/L/U/D/F/B) whose
      // axis matches |r.dominantAxis|, and direction matches sign(r.dominantAxis component).
      const components = [['x', r.x], ['y', r.y], ['z', r.z]];
      components.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
      const [axisLetter, val] = components[0];
      // The face we want to turn is `info.faceLetter` (always the clicked face).
      // Its base direction in MOVE_TABLE is `baseDir[faceLetter]`. If sign(val) matches base
      // direction along that axis, the move is unprimed; otherwise primed.
      const desiredDir = Math.sign(val);
      // Actually we already know info.faceLetter is the face being turned, and its axis is info.axis.
      // So the rotation is around info.axis. The direction (+1 or -1) we want:
      //   for face +X (R), base direction -1 around X (=clockwise from outside).
      // If r is along +info.axis with positive sign, we want a rotation in that direction.
      // baseDir[faceLetter] tells us what sign the UNPRIMED move uses on its axis.
      // So if desiredDir === baseDir → unprimed, else primed.
      // But we need to project `r` onto info.axis.
      const rOnFaceAxis = info.axis === 'x' ? r.x : info.axis === 'y' ? r.y : r.z;
      const wantedSign = Math.sign(rOnFaceAxis);
      if (wantedSign === 0) return null;
      const notation = (wantedSign === baseDir[info.faceLetter]) ? info.faceLetter : info.faceLetter + "'";
      return notation;
    };
  }

  _lookupMove(faceWorld, axisVec, sign) {
    return this._faceLookup(faceWorld, axisVec, sign);
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
            child.material.color.setHex(color);
            // Keep the self-emissive baseline in sync with the new colour so
            // white / yellow stickers don't desaturate after a move. If a
            // highlight is currently overriding emissive, leave it alone —
            // clearHighlights restores from baseColor when it ends.
            if (!this._activeHighlight) {
              child.material.emissive.setHex(color);
            }
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
     HIGHLIGHTS — pulse specific cubies' stickers
     ========================================================= */

  /**
   * Pulse emissive on the stickers of cubies whose logical position matches.
   * @returns {() => void} disposer that clears the highlight
   */
  highlightPieces(pieces, opts = {}) {
    this.clearHighlights();
    const defaults = { color: 0xFFC83D, duration: 1300, stagger: 80, intensity: 0.9 };
    const o = { ...defaults, ...opts };
    const matches = [];

    const keyFor = (p) => `${p.x}|${p.y}|${p.z}`;
    const wantKeys = new Set(pieces.map(keyFor));

    this.cubies.forEach(cubie => {
      const lp = cubie.userData.logicalPos;
      if (!wantKeys.has(keyFor(lp))) return;
      cubie.children.forEach(ch => {
        if (!ch.userData || !ch.userData.isSticker) return;
        matches.push({
          material: ch.material,
          baseEmissive: (ch.material.userData && ch.material.userData.baseColor) ?? ch.material.emissive.getHex(),
          baseIntensity: (ch.material.userData && ch.material.userData.baseEmissiveIntensity) ?? 0,
        });
        ch.material.emissive.setHex(o.color);
      });
    });

    const motion = window.motion;
    const animations = [];

    matches.forEach((m, i) => {
      // Pulse for a couple of cycles to draw the eye, then hold at a steady
      // soft glow so the piece stays marked without blinking forever.
      const start = performance.now() + i * o.stagger;
      const period = o.duration;
      const intensityMax = o.intensity;
      const pulseCycles = 2;
      const holdIntensity = intensityMax * 0.3;
      let alive = true;
      const tick = () => {
        if (!alive) return;
        const now = performance.now();
        if (now < start) { requestAnimationFrame(tick); return; }
        const elapsed = now - start;
        if (elapsed >= period * pulseCycles) {
          m.material.emissiveIntensity = holdIntensity;
          return; // settled — stop the RAF loop
        }
        const phase = (elapsed % period) / period; // 0..1
        // sine-shaped pulse 0 → max → 0
        m.material.emissiveIntensity = Math.sin(phase * Math.PI) * intensityMax;
        requestAnimationFrame(tick);
      };
      tick();
      animations.push({ stop: () => { alive = false; } });
    });

    this._activeHighlight = { matches, animations };
    return () => this.clearHighlights();
  }

  clearHighlights() {
    if (!this._activeHighlight) return;
    const { matches, animations } = this._activeHighlight;
    animations.forEach(a => { try { a.stop && a.stop(); a.cancel && a.cancel(); } catch {} });
    matches.forEach(m => {
      // Restore the per-sticker self-emissive baseline (its own colour at low
      // intensity), not zero — otherwise white/yellow desaturate after the
      // highlight ends.
      m.material.emissive.setHex(m.baseEmissive);
      m.material.emissiveIntensity = m.baseIntensity;
    });
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
