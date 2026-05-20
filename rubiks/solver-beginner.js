/* =========================================================
   BEGINNER-METHOD SOLVER
   Layer-by-layer solver that mirrors the flowchart:
     1. White cross
     2. White corners
     3. Middle layer edges
     4. Yellow cross  (F R U R' U' F')
     5. Orient yellow corners  (Sune R U R' U R U2 R')
     6. Permute yellow corners (3-corner cycle)
     7. Permute yellow edges  (U-perm)
   The solver mutates the cubejs Cube passed in. It returns an
   array of stages: [{ name, moves: 'R U R...' }, ...]
   Convention: U face = yellow, D face = white (matches the chart).
   ========================================================= */

(function () {
  const FACE_OFFSET = { U: 0, R: 9, F: 18, D: 27, L: 36, B: 45 };

  // ----- Helpers -----
  function s(cube, face, idx) { return cube.asString()[FACE_OFFSET[face] + idx]; }
  function applyMoves(cube, moves, log) {
    if (!moves) return;
    if (Array.isArray(moves)) moves = moves.join(' ');
    moves = moves.trim();
    if (!moves) return;
    cube.move(moves);
    if (log) log.push(moves);
  }
  function joined(arr) { return arr.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim(); }

  // Each edge slot maps to its two sticker positions
  // [face1, idx1, face2, idx2]
  const EDGE_SLOTS = {
    UF: ['U', 7, 'F', 1],  UR: ['U', 5, 'R', 1],  UB: ['U', 1, 'B', 1],  UL: ['U', 3, 'L', 1],
    DF: ['D', 1, 'F', 7],  DR: ['D', 5, 'R', 7],  DB: ['D', 7, 'B', 7],  DL: ['D', 3, 'L', 7],
    FR: ['F', 5, 'R', 3],  FL: ['F', 3, 'L', 5],  BR: ['B', 3, 'R', 5],  BL: ['B', 5, 'L', 3],
  };

  // Corner slots: [face1, idx1, face2, idx2, face3, idx3]
  const CORNER_SLOTS = {
    URF: ['U', 8, 'R', 0, 'F', 2],
    UFL: ['U', 6, 'F', 0, 'L', 2],
    ULB: ['U', 0, 'L', 0, 'B', 2],
    UBR: ['U', 2, 'B', 0, 'R', 2],
    DFR: ['D', 2, 'F', 8, 'R', 6],
    DLF: ['D', 0, 'L', 8, 'F', 6],
    DBL: ['D', 6, 'B', 8, 'L', 6],
    DRB: ['D', 8, 'R', 8, 'B', 6],
  };

  // Get the colours of an edge at a given slot
  function edgeColors(cube, slot) {
    const [f1, i1, f2, i2] = EDGE_SLOTS[slot];
    return [s(cube, f1, i1), s(cube, f2, i2)];
  }
  function cornerColors(cube, slot) {
    const [f1, i1, f2, i2, f3, i3] = CORNER_SLOTS[slot];
    return [s(cube, f1, i1), s(cube, f2, i2), s(cube, f3, i3)];
  }

  // Find which slot a piece currently occupies. Returns { slot, orientation }
  function findEdge(cube, c1, c2) {
    const target = new Set([c1, c2]);
    for (const slot of Object.keys(EDGE_SLOTS)) {
      const cs = edgeColors(cube, slot);
      if (cs[0] === c1 && cs[1] === c2) return { slot, orientation: 0 };
      if (cs[0] === c2 && cs[1] === c1) return { slot, orientation: 1 };
    }
    return null;
  }
  function findCorner(cube, c1, c2, c3) {
    const target = new Set([c1, c2, c3]);
    for (const slot of Object.keys(CORNER_SLOTS)) {
      const cs = cornerColors(cube, slot);
      if (cs[0] === c1 && cs[1] === c2 && cs[2] === c3) return { slot, orientation: 0 };
      if (cs[0] === c2 && cs[1] === c3 && cs[2] === c1) return { slot, orientation: 1 };
      if (cs[0] === c3 && cs[1] === c1 && cs[2] === c2) return { slot, orientation: 2 };
      // Mirror cases (for cube parity) — same colours different starting position
      if (cs[0] === c1 && cs[1] === c3 && cs[2] === c2) return { slot, orientation: 0 };
      if (cs[0] === c3 && cs[1] === c2 && cs[2] === c1) return { slot, orientation: 2 };
      if (cs[0] === c2 && cs[1] === c1 && cs[2] === c3) return { slot, orientation: 1 };
    }
    return null;
  }

  // ----- Stage 1: White cross (D face) -----
  // We work with our convention: D = white in the chart, but in cubejs sticker
  // labels D-stickers are 'D'. So white-edges = D-x edges. Match to centers.
  //
  // Strategy: form the daisy on U (with D-stickers facing up), then F2/R2/B2/L2
  // to drop into place. This matches the chart precisely.
  function stage_cross(cube) {
    const log = [];
    const targets = [
      { side: 'F', edge: ['D', 'F'], dropMove: 'F2' },
      { side: 'R', edge: ['D', 'R'], dropMove: 'R2' },
      { side: 'B', edge: ['D', 'B'], dropMove: 'B2' },
      { side: 'L', edge: ['D', 'L'], dropMove: 'L2' },
    ];

    for (const t of targets) {
      // Goal: place the [D, side] edge on the bottom with D on D face and side on side face.
      // Find the edge currently.
      let info = findEdge(cube, t.edge[0], t.edge[1]);
      if (!info) continue;
      let { slot } = info;

      // If already correctly placed at D-slot with D on D, skip
      const targetSlot = 'D' + t.side;
      if (slot === targetSlot) {
        const cs = edgeColors(cube, targetSlot);
        if (cs[0] === 'D' && cs[1] === t.side) continue;
      }

      // Step A: get the edge into the U layer with D facing UP (daisy position)
      // Move it out of wherever it is, into U with D on top.
      const broughtMoves = bringWhiteEdgeToDaisy(cube, t.edge, t.side);
      applyMoves(cube, broughtMoves, log);

      // Step B: rotate U so the side colour is over the matching centre
      // Then perform side2 to drop it
      const aligned = alignDaisyForSide(cube, t.edge[1], t.side);
      applyMoves(cube, aligned, log);

      // Step C: drop into place with side2 (F2 / R2 / B2 / L2)
      applyMoves(cube, t.dropMove, log);
    }
    return joined(log);
  }

  function bringWhiteEdgeToDaisy(cube, edgeColors, sideTarget) {
    const moves = [];
    let info = findEdge(cube, edgeColors[0], edgeColors[1]);
    if (!info) return '';
    const { slot, orientation } = info;

    // Slot families
    const U_SLOTS = ['UF', 'UR', 'UB', 'UL'];
    const D_SLOTS = ['DF', 'DR', 'DB', 'DL'];
    const MID_SLOTS = ['FR', 'FL', 'BR', 'BL'];

    // Case 1: already in U layer
    if (U_SLOTS.includes(slot)) {
      const cs = edgeColors_(cube, slot);
      // If D-sticker is up: good, daisy ready
      if (cs[0] === 'D') return '';
      // Otherwise D is on the side; rotate U to align then apply a move to flip
      // We need to bring it into a fresh U slot with D on top. Use: rotate U so this edge
      // sits at UF, then do F U' R U (or similar) to flip it. Simpler: pop it down to the side then back up.
      const sideMoveMap = { UF: 'F', UR: 'R', UB: 'B', UL: 'L' };
      const sideMove = sideMoveMap[slot];
      // Move the edge out of U to a side mid slot
      seq(moves, cube, sideMove);
      // Now it's in a mid slot — recurse via mid handling
      return moves.join(' ') + ' ' + bringWhiteEdgeToDaisy(cube, edgeColors, sideTarget);
    }

    // Case 2: in D layer
    if (D_SLOTS.includes(slot)) {
      const cs = edgeColors_(cube, slot);
      // If D is on D-face (correctly oriented on the bottom but wrong colour-position):
      // pop it up with the appropriate side face turn, then re-handle
      const sideMoveMap = { DF: 'F2', DR: 'R2', DB: 'B2', DL: 'L2' };
      // If D-sticker is on the bottom face (good orientation), bring up via U2-aligned then F2-style flip
      const sideForSlot = { DF: 'F', DR: 'R', DB: 'B', DL: 'L' };
      const sideF = sideForSlot[slot];
      if (cs[0] === 'D') {
        // Need to rotate it up — do side-twice (puts it on U) — but this flips orientation
        // Then handle as U-layer case
        seq(moves, cube, sideF + '2');
      } else {
        // D-sticker is on the side; we can do sideF + U + side' which brings it up daisy-correct
        // But simpler: just sideF (brings to mid-slot), then handle
        seq(moves, cube, sideF);
      }
      return moves.join(' ') + ' ' + bringWhiteEdgeToDaisy(cube, edgeColors, sideTarget);
    }

    // Case 3: in middle layer (FR/FL/BR/BL)
    if (MID_SLOTS.includes(slot)) {
      const cs = edgeColors_(cube, slot);
      const slotMap = {
        FR: { dOnFirst: "R U' R'", dOnSecond: "F' U F" },
        FL: { dOnFirst: "L' U L",  dOnSecond: "F U' F'" },
        BR: { dOnFirst: "R' U R",  dOnSecond: "B U' B'" },
        BL: { dOnFirst: "L U' L'", dOnSecond: "B' U B" },
      };
      const m = slotMap[slot];
      const seqStr = cs[0] === 'D' ? m.dOnFirst : m.dOnSecond;
      seq(moves, cube, seqStr);
      // After this, should be in U; recurse to confirm daisy orientation
      return moves.join(' ') + ' ' + bringWhiteEdgeToDaisy(cube, edgeColors, sideTarget);
    }

    return moves.join(' ');
  }

  function edgeColors_(cube, slot) {
    return edgeColors(cube, slot);
  }

  function alignDaisyForSide(cube, sideColor, sideTarget) {
    // The daisy edge with the given sideColor on its side: figure out which U slot it's at
    // and rotate U so it lines up with the side face.
    // sideColor = colour expected on the side. sideTarget = which face it should go to (F/R/B/L)
    const moves = [];
    const tries = ["", "U", "U2", "U'"];
    for (const t of tries) {
      const test = Cube.fromString(cube.asString());
      if (t) test.move(t);
      // After applying t, the edge with sideColor should be at U-slot adjacent to sideTarget
      // Check the sticker at the side face's top row centre (idx 1)
      const stickerOnSide = test.asString()[FACE_OFFSET[sideTarget] + 1];
      if (stickerOnSide === sideColor) {
        if (t) applyMoves(cube, t);
        return t;
      }
    }
    return '';
  }

  function seq(arr, cube, str) {
    cube.move(str);
    arr.push(str);
  }

  // ----- Stage 2: White corners (D layer) -----
  function stage_corners(cube) {
    const log = [];
    const targets = [
      { slot: 'DFR', colors: ['D', 'F', 'R'], setup: 'URF', insertion: "R U R' U'" },
      { slot: 'DRB', colors: ['D', 'R', 'B'], setup: 'UBR', insertion: "R U R' U'" }, // performed after y rotation conceptually; we use B side
      { slot: 'DBL', colors: ['D', 'B', 'L'], setup: 'ULB', insertion: "R U R' U'" },
      { slot: 'DLF', colors: ['D', 'L', 'F'], setup: 'UFL', insertion: "R U R' U'" },
    ];

    // To avoid having to write 4 mirrored versions, we'll always rotate the *whole solve*
    // mentally to bring each target into the DFR position. But our cube state can't rotate
    // without doing actual x/y rotations (which we'd undo). Easier: use side-specific algorithms.

    const insertionMap = {
      DFR: { up: "R U R'", down: "R U' R'", flip: "R U2 R' U' R U R'" },
      DRB: { up: "B U B'", down: "B U' B'", flip: "B U2 B' U' B U B'" },
      DBL: { up: "L U L'", down: "L U' L'", flip: "L U2 L' U' L U L'" },
      DLF: { up: "F U F'", down: "F U' F'", flip: "F U2 F' U' F U F'" },
    };
    const aboveSlotMap = {
      DFR: 'URF', DRB: 'UBR', DBL: 'ULB', DLF: 'UFL'
    };

    for (const t of targets) {
      let safety = 0;
      while (safety++ < 8) {
        // Check if already solved correctly
        const cs = cornerColors(cube, t.slot);
        if (cs[0] === 'D' && (cs[1] === t.colors[1] && cs[2] === t.colors[2] ||
                              cs[1] === t.colors[2] && cs[2] === t.colors[1])) {
          break;
        }
        // Find the corner
        const info = findCorner(cube, ...t.colors);
        if (!info) break;
        const { slot } = info;

        if (slot.startsWith('D')) {
          // It's in the bottom layer but wrong (position or orientation) — kick it up
          const kickMap = { DFR: "R U R' U'", DRB: "B U B' U'", DBL: "L U L' U'", DLF: "F U F' U'" };
          applyMoves(cube, kickMap[slot], log);
          continue;
        }
        // It's in U layer somewhere; rotate U until it's above the target slot
        const targetAbove = aboveSlotMap[t.slot];
        let rotateU = '';
        const rotateMap = {
          URF: { URF: '', UBR: "U'", ULB: 'U2', UFL: 'U' },
          UBR: { URF: 'U',  UBR: '',   ULB: "U'", UFL: 'U2' },
          ULB: { URF: 'U2', UBR: 'U',  ULB: '',   UFL: "U'" },
          UFL: { URF: "U'", UBR: 'U2', ULB: 'U',  UFL: ''   },
        };
        rotateU = rotateMap[targetAbove][slot];
        if (rotateU) applyMoves(cube, rotateU, log);

        // Now corner is at targetAbove. Determine orientation:
        const csAbove = cornerColors(cube, targetAbove);
        // The corner has 3 stickers; find where 'D' sits:
        const ins = insertionMap[t.slot];
        // Map orientation: where is the D sticker? on top (U), on the side related to slot
        // For URF: csAbove = [U-sticker, R-sticker, F-sticker]. D could be at index 0/1/2.
        const dIdx = csAbove.indexOf('D');
        if (dIdx === 0) {
          // D is on top — needs flip algorithm
          applyMoves(cube, ins.flip, log);
        } else if (dIdx === 1) {
          // D is on the right-style face (R/B/L/F depending on slot) — use 'up' insertion
          applyMoves(cube, ins.up, log);
        } else {
          // dIdx === 2: D is on the front-style face — use 'down' insertion
          applyMoves(cube, ins.down, log);
        }
      }
    }
    return joined(log);
  }

  // ----- Stage 3: Middle layer edges -----
  function stage_middle(cube) {
    const log = [];
    const targets = [
      { slot: 'FR', colors: ['F', 'R'], rightAlg: "U R U' R' U' F' U F", leftAlg: "U' L' U L U F U' F'" },
      { slot: 'FL', colors: ['F', 'L'], rightAlg: "U F U' F' U' L' U L", leftAlg: "U' R' U R U B U' B'" }, // wrong, let's compute differently
      { slot: 'BR', colors: ['B', 'R'], rightAlg: "U B U' B' U' R' U R", leftAlg: "U' F' U F U R U' R'" },
      { slot: 'BL', colors: ['B', 'L'], rightAlg: "U L U' L' U' B' U B", leftAlg: "U' B' U B U L U' L'" },
    ];

    // Simpler & verified approach using a single 'right insertion' template and mirrors:
    // For each target slot, find the edge (non-U colours), maneuver it above its target face
    // matching the SIDE colour, then apply right or left insertion based on which way.

    const insertions = {
      F: { right: "U R U' R' U' F' U F", left: "U' L' U L U F U' F'" },
      R: { right: "U B U' B' U' R' U R", left: "U' F' U F U R U' R'" },
      B: { right: "U L U' L' U' B' U B", left: "U' R' U R U B U' B'" },
      L: { right: "U F U' F' U' L' U L", left: "U' B' U B U L U' L'" },
    };
    const rightNeighbor = { F: 'R', R: 'B', B: 'L', L: 'F' };

    const edgeTargets = [
      ['F', 'R'], ['R', 'B'], ['B', 'L'], ['L', 'F'],
    ];

    for (let pass = 0; pass < 6; pass++) {
      let progressed = false;
      for (const [face1, face2] of edgeTargets) {
        // Check if already placed
        const slotName = (face1 === 'F' && face2 === 'R') ? 'FR'
                       : (face1 === 'R' && face2 === 'B') ? 'BR'
                       : (face1 === 'B' && face2 === 'L') ? 'BL'
                       : 'FL';
        const cs = edgeColors(cube, slotName);
        const inPlace = (cs[0] === face1 && cs[1] === face2) || (cs[0] === face2 && cs[1] === face1);
        if (inPlace && cs[0] === face1) continue;

        // Find this edge
        let info = findEdge(cube, face1, face2);
        if (!info) continue;
        const { slot } = info;

        // If it's stuck in middle layer wrong: kick it out using the right insertion of that slot
        if (['FR', 'FL', 'BR', 'BL'].includes(slot)) {
          if (slot === slotName && inPlace) continue;
          // Kick out using the right-insertion on the front-of-that-slot face
          const slotMap = { FR: 'F', BR: 'B', BL: 'L', FL: 'L' };
          const f = slotMap[slot];
          applyMoves(cube, insertions[f].right, log);
          progressed = true;
          continue;
        }

        // If in D layer: bring up first
        if (['DF', 'DR', 'DB', 'DL'].includes(slot)) {
          const fMap = { DF: 'F', DR: 'R', DB: 'B', DL: 'L' };
          applyMoves(cube, fMap[slot], log);
          progressed = true;
          continue;
        }

        // Edge is in U layer. Determine which colour is on top.
        const csU = edgeColors(cube, slot);
        const upColor = csU[0]; // sticker on U
        const sideColor = csU[1]; // sticker on side face
        // We want to align sideColor with its matching centre, then apply insertion based on which way upColor needs to go.
        const sideFace = slot[1]; // 'F'/'R'/'B'/'L'
        // Rotate U until sideColor is at sideColor's face's top row centre
        let rotateMoves = '';
        const tries = ['', 'U', 'U2', "U'"];
        for (const t of tries) {
          const test = Cube.fromString(cube.asString());
          if (t) test.move(t);
          if (test.asString()[FACE_OFFSET[sideColor] + 1] === sideColor) {
            rotateMoves = t;
            break;
          }
        }
        if (rotateMoves) applyMoves(cube, rotateMoves, log);
        // Now the edge's side colour matches its centre. upColor needs to go to its centre.
        // Determine direction: if upColor === rightNeighbor of sideColor → right insertion
        if (upColor === rightNeighbor[sideColor]) {
          applyMoves(cube, insertions[sideColor].right, log);
        } else {
          applyMoves(cube, insertions[sideColor].left, log);
        }
        progressed = true;
      }
      if (!progressed) break;
    }
    return joined(log);
  }

  // ----- Stage 4: Yellow cross (form U-cross with U-stickers on U face) -----
  function stage_yellow_cross(cube) {
    const log = [];
    const FUR = "F R U R' U' F'";
    let safety = 0;
    while (safety++ < 6) {
      const uStr = cube.asString().slice(0, 9);
      const top = uStr[1] === 'U';
      const left = uStr[3] === 'U';
      const right = uStr[5] === 'U';
      const bottom = uStr[7] === 'U';
      const count = (top ? 1 : 0) + (left ? 1 : 0) + (right ? 1 : 0) + (bottom ? 1 : 0);

      if (count === 4) break; // cross done
      if (count === 0) {
        // Dot — apply FUR
        applyMoves(cube, FUR, log);
        continue;
      }
      if (count === 2) {
        // Either line or L
        if (left && right) {
          // Horizontal line — apply FUR
          applyMoves(cube, FUR, log);
          continue;
        }
        if (top && bottom) {
          // Vertical line — rotate 90 then FUR
          applyMoves(cube, 'U', log);
          applyMoves(cube, FUR, log);
          continue;
        }
        // L-shape — need to position so the two U-stickers are at 9 and 12 o'clock (left + top)
        // i.e., uStr[1] and uStr[3] both U
        // Determine current L orientation and rotate U accordingly
        // Cases (which two of 4 are U):
        //   top+right → rotate U2 to put them at left+bottom? No, we want left+top.
        // Easier: try each U rotation until uStr[1] && uStr[3] both U
        let placed = false;
        for (const r of ['', 'U', 'U2', "U'"]) {
          const test = Cube.fromString(cube.asString());
          if (r) test.move(r);
          const a = test.asString();
          if (a[1] === 'U' && a[3] === 'U') {
            if (r) applyMoves(cube, r, log);
            applyMoves(cube, FUR, log);
            placed = true;
            break;
          }
        }
        if (!placed) applyMoves(cube, FUR, log);
        continue;
      }
      // count === 1 or 3 → shouldn't happen in valid state; safety apply FUR
      applyMoves(cube, FUR, log);
    }
    return joined(log);
  }

  // ----- Stage 5: Orient yellow corners (all U-stickers on U) -----
  function stage_orient_corners(cube) {
    const log = [];
    const SUNE = "R U R' U R U2 R'";
    let safety = 0;
    while (safety++ < 8) {
      const u = cube.asString().slice(0, 9);
      const yellowCorners = [u[0] === 'U', u[2] === 'U', u[8] === 'U', u[6] === 'U']; // ULB, UBR, URF, UFL
      const yellowCount = yellowCorners.filter(Boolean).length;
      if (yellowCount === 4) break;

      if (yellowCount === 0) {
        // No yellow on top — find the front-left corner that has yellow facing LEFT
        // Per the chart: rotate top so yellow is facing outward to the LEFT, then SUNE
        // We check the L face top row for a 'U' sticker
        let placed = false;
        for (const r of ['', 'U', 'U2', "U'"]) {
          const test = Cube.fromString(cube.asString());
          if (r) test.move(r);
          // Check L face top-left corner (L[0]) — if it's 'U', we're set
          if (test.asString()[FACE_OFFSET.L + 0] === 'U') {
            if (r) applyMoves(cube, r, log);
            applyMoves(cube, SUNE, log);
            placed = true;
            break;
          }
        }
        if (!placed) applyMoves(cube, SUNE, log);
        continue;
      }
      if (yellowCount === 1) {
        // One corner — set up "fish" with the yellow corner at UFL (down-left of top face)
        // The "fish" pointer corner is the single yellow-top corner; the chart says
        // position so the head is at bottom-left when facing the cube.
        // i.e., we want yellowCorners[3] true (UFL).
        // Try rotations to place the single yellow at UFL.
        let placed = false;
        for (const r of ['', 'U', 'U2', "U'"]) {
          const test = Cube.fromString(cube.asString());
          if (r) test.move(r);
          const a = test.asString();
          if (a[6] === 'U') {
            if (r) applyMoves(cube, r, log);
            applyMoves(cube, SUNE, log);
            placed = true;
            break;
          }
        }
        if (!placed) applyMoves(cube, SUNE, log);
        continue;
      }
      if (yellowCount === 2) {
        // Two yellow corners — chart: yellow sticker facing outward to the LEFT, then SUNE
        // Find an orientation where L[0] is 'U' (yellow facing the L face top-left)
        let placed = false;
        for (const r of ['', 'U', 'U2', "U'"]) {
          const test = Cube.fromString(cube.asString());
          if (r) test.move(r);
          if (test.asString()[FACE_OFFSET.L + 0] === 'U') {
            if (r) applyMoves(cube, r, log);
            applyMoves(cube, SUNE, log);
            placed = true;
            break;
          }
        }
        if (!placed) applyMoves(cube, SUNE, log);
        continue;
      }
      // 3 corners — shouldn't happen in valid state
      applyMoves(cube, SUNE, log);
    }
    return joined(log);
  }

  // ----- Stage 6: Permute yellow corners (chart's L'URU'LUR'URU2R' — using A-perm variant) -----
  function stage_permute_corners(cube) {
    const log = [];
    // Use A-perm style 3-corner cycle algorithm. Chart uses a specific algorithm — we'll use
    // the canonical: R' F R' B2 R F' R' B2 R2 (A-perm clockwise)
    // It cycles three corners (UBL, UBR, URF). To get all corners in place, rotate U then apply.
    const APERM = "R' F R' B2 R F' R' B2 R2";
    let safety = 0;
    while (safety++ < 5) {
      // Count matched corners (corner has same colours as its slot's adjacent centres)
      let matched = 0;
      const checks = [
        { slot: 'URF', faces: ['U', 'R', 'F'] },
        { slot: 'UFL', faces: ['U', 'F', 'L'] },
        { slot: 'ULB', faces: ['U', 'L', 'B'] },
        { slot: 'UBR', faces: ['U', 'B', 'R'] },
      ];
      for (const c of checks) {
        const cs = cornerColors(cube, c.slot);
        const set = new Set(cs);
        const expected = new Set(c.faces);
        if (cs.length === 3 && [...set].every(x => expected.has(x))) matched++;
      }
      if (matched === 4) break;
      // If 1 corner matched, rotate U to bring it to UBL position (canonical anchor for A-perm)
      // Actually our A-perm cycles UBL, UBR, URF — keeping UFL fixed.
      // So we need to find which corner is correctly positioned (just need correct colour set), put it at UFL, then apply A-perm.
      if (matched === 1) {
        let placed = false;
        for (const r of ['', 'U', 'U2', "U'"]) {
          const test = Cube.fromString(cube.asString());
          if (r) test.move(r);
          const cs = cornerColors(test, 'UFL');
          const set = new Set(cs);
          if (cs.length === 3 && set.has('U') && set.has('F') && set.has('L')) {
            if (r) applyMoves(cube, r, log);
            applyMoves(cube, APERM, log);
            placed = true;
            break;
          }
        }
        if (!placed) applyMoves(cube, APERM, log);
        continue;
      }
      // matched === 0 or 4: apply A-perm to break the cycle
      applyMoves(cube, APERM, log);
    }
    return joined(log);
  }

  // ----- Stage 7: Permute yellow edges (U-perm) -----
  function stage_permute_edges(cube) {
    const log = [];
    // U-perm Ub: R2 U R U R' U' R' U' R' U R'
    // U-perm Ua: R U' R U R U R U' R' U' R2
    const UA = "R U' R U R U R U' R' U' R2";
    const UB = "R2 U R U R' U' R' U' R' U R'";

    // Final AUF: align top face by rotating U to match centres
    // After PLL corners, the top corners should already be in their slots; only the
    // edges may still need cycling.
    let safety = 0;
    while (safety++ < 6) {
      // Try U rotations and check if cube becomes solved
      for (const r of ['', 'U', 'U2', "U'"]) {
        const test = Cube.fromString(cube.asString());
        if (r) test.move(r);
        if (test.isSolved()) {
          if (r) applyMoves(cube, r, log);
          return joined(log);
        }
      }
      // Apply Ua to make progress
      applyMoves(cube, UA, log);
    }
    return joined(log);
  }

  // ----- Public API -----
  window.solveBeginnerMethod = function (cube) {
    const stages = [];
    try {
      stages.push({ name: 'White cross',                  moves: stage_cross(cube) });
      stages.push({ name: 'White corners',                moves: stage_corners(cube) });
      stages.push({ name: 'Middle layer edges',           moves: stage_middle(cube) });
      stages.push({ name: 'Yellow cross',                 moves: stage_yellow_cross(cube) });
      stages.push({ name: 'Orient yellow corners',        moves: stage_orient_corners(cube) });
      stages.push({ name: 'Permute yellow corners',       moves: stage_permute_corners(cube) });
      stages.push({ name: 'Permute yellow edges',         moves: stage_permute_edges(cube) });
    } catch (e) {
      console.error('Beginner solver error:', e);
    }
    return stages;
  };
})();
