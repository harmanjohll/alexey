/* simulation.js — Fractal Portal: DLA engine, Koch generator, fractal dimension */

/* ── DLA Core ── */
function growDLA(gridSize, maxParticles, stickProb, seedType, launchMul, killMul) {
  var grid = new Uint16Array(gridSize * gridSize);
  var cx = Math.floor(gridSize / 2), cy = Math.floor(gridSize / 2);
  var particles = [];

  // Plant seed
  if (seedType === 'point') {
    grid[cy * gridSize + cx] = 1;
    particles.push({x: cx, y: cy, order: 0});
  } else if (seedType === 'line') {
    for (var x = 0; x < gridSize; x++) {
      grid[(gridSize - 1) * gridSize + x] = 1;
      particles.push({x: x, y: gridSize - 1, order: 0});
    }
  } else if (seedType === 'circle') {
    var r = 20;
    for (var a = 0; a < 360; a += 2) {
      var px = cx + Math.round(r * Math.cos(a * Math.PI / 180));
      var py = cy + Math.round(r * Math.sin(a * Math.PI / 180));
      if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
        grid[py * gridSize + px] = 1;
        particles.push({x: px, y: py, order: 0});
      }
    }
  }

  var maxR = seedType === 'circle' ? 25 : (seedType === 'line' ? gridSize / 2 : 5);
  var count = 0;
  var DX = [-1, 0, 1, 0], DY = [0, -1, 0, 1];

  function hasNeighbor(x, y) {
    for (var d = 0; d < 4; d++) {
      var nx = x + DX[d], ny = y + DY[d];
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny * gridSize + nx] > 0) return true;
    }
    return false;
  }

  return {
    grid: grid, particles: particles, maxR: maxR, cx: cx, cy: cy, gridSize: gridSize,
    step: function() {
      if (count >= maxParticles) return false;
      var launchR = Math.max(maxR * launchMul, 30);
      var killR = launchR * killMul;
      if (launchR >= gridSize / 2 - 5) return false;

      var angle = Math.random() * 2 * Math.PI;
      var x = Math.round(cx + launchR * Math.cos(angle));
      var y = Math.round(cy + launchR * Math.sin(angle));

      for (var s = 0; s < 100000; s++) {
        var dir = Math.floor(Math.random() * 4);
        x += DX[dir]; y += DY[dir];

        var dist = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dist > killR || x < 0 || x >= gridSize || y < 0 || y >= gridSize) return true;

        if (hasNeighbor(x, y)) {
          if (Math.random() < stickProb) {
            count++;
            grid[y * gridSize + x] = count + 1;
            particles.push({x: x, y: y, order: count});
            var rr = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
            if (rr > maxR) maxR = rr;
            return true;
          }
        }
      }
      return true;
    },
    getCount: function() { return count; },
    getMaxR: function() { return maxR; }
  };
}

/* ── DLA Watch Mode: step-by-step walker visibility ── */
function growDLAWatch(gridSize, maxParticles, stickProb, seedType, launchMul, killMul) {
  var grid = new Uint16Array(gridSize * gridSize);
  var cx = Math.floor(gridSize / 2), cy = Math.floor(gridSize / 2);
  var particles = [];
  var count = 0;
  var maxR = 5;
  var DX = [-1, 0, 1, 0], DY = [0, -1, 0, 1];

  // Plant seed (same logic as growDLA)
  if (seedType === 'point') {
    grid[cy * gridSize + cx] = 1;
    particles.push({x: cx, y: cy, order: 0});
  } else if (seedType === 'line') {
    for (var lx = 0; lx < gridSize; lx++) {
      grid[(gridSize - 1) * gridSize + lx] = 1;
      particles.push({x: lx, y: gridSize - 1, order: 0});
    }
    maxR = gridSize / 2;
  } else if (seedType === 'circle') {
    var r = 20;
    for (var a = 0; a < 360; a += 2) {
      var px = cx + Math.round(r * Math.cos(a * Math.PI / 180));
      var py = cy + Math.round(r * Math.sin(a * Math.PI / 180));
      if (px >= 0 && px < gridSize && py >= 0 && py < gridSize) {
        grid[py * gridSize + px] = 1;
        particles.push({x: px, y: py, order: 0});
      }
    }
    maxR = 25;
  }

  var walker = null;
  var walkerActive = false;
  var particlesDone = false;

  function hasNeighbor(x, y) {
    for (var d = 0; d < 4; d++) {
      var nx = x + DX[d], ny = y + DY[d];
      if (nx >= 0 && nx < gridSize && ny >= 0 && ny < gridSize && grid[ny * gridSize + nx] > 0) return true;
    }
    return false;
  }

  function launchWalker() {
    if (count >= maxParticles) { particlesDone = true; return false; }
    var launchR = Math.max(maxR * launchMul, 30);
    if (launchR >= gridSize / 2 - 5) { particlesDone = true; return false; }
    var angle = Math.random() * 2 * Math.PI;
    walker = {
      x: Math.round(cx + launchR * Math.cos(angle)),
      y: Math.round(cy + launchR * Math.sin(angle)),
      killR: launchR * killMul,
      steps: 0
    };
    walkerActive = true;
    return true;
  }

  // Advance the current walker by N random steps; returns 'walking', 'stuck', 'killed', or 'done'
  function stepWalker(n) {
    if (particlesDone) return 'done';
    if (!walkerActive) {
      if (!launchWalker()) return 'done';
    }
    for (var i = 0; i < n; i++) {
      var dir = Math.floor(Math.random() * 4);
      walker.x += DX[dir]; walker.y += DY[dir];
      walker.steps++;
      var dist = Math.sqrt((walker.x - cx) * (walker.x - cx) + (walker.y - cy) * (walker.y - cy));
      if (dist > walker.killR || walker.x < 0 || walker.x >= gridSize || walker.y < 0 || walker.y >= gridSize) {
        walkerActive = false;
        walker = null;
        return 'killed';
      }
      if (hasNeighbor(walker.x, walker.y)) {
        if (Math.random() < stickProb) {
          count++;
          grid[walker.y * gridSize + walker.x] = count + 1;
          particles.push({x: walker.x, y: walker.y, order: count});
          var rr = Math.sqrt((walker.x - cx) * (walker.x - cx) + (walker.y - cy) * (walker.y - cy));
          if (rr > maxR) maxR = rr;
          walkerActive = false;
          walker = null;
          return 'stuck';
        }
      }
    }
    return 'walking';
  }

  // DLA-compatible interface so render/charts work
  var dlaInterface = {
    grid: grid, particles: particles, gridSize: gridSize, cx: cx, cy: cy, maxR: maxR,
    getCount: function() { return count; },
    getMaxR: function() { return maxR; },
    step: function() {
      // Fast mode: run one full particle walk to completion (same as original)
      if (count >= maxParticles) return false;
      var launchR = Math.max(maxR * launchMul, 30);
      var killR2 = launchR * killMul;
      if (launchR >= gridSize / 2 - 5) return false;
      var angle = Math.random() * 2 * Math.PI;
      var x = Math.round(cx + launchR * Math.cos(angle));
      var y = Math.round(cy + launchR * Math.sin(angle));
      for (var s = 0; s < 100000; s++) {
        var d = Math.floor(Math.random() * 4);
        x += DX[d]; y += DY[d];
        var dd = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
        if (dd > killR2 || x < 0 || x >= gridSize || y < 0 || y >= gridSize) return true;
        if (hasNeighbor(x, y) && Math.random() < stickProb) {
          count++;
          grid[y * gridSize + x] = count + 1;
          particles.push({x: x, y: y, order: count});
          var rr = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
          if (rr > maxR) maxR = rr;
          dlaInterface.maxR = maxR;
          return true;
        }
      }
      return true;
    }
  };

  return {
    dla: dlaInterface,
    getWalker: function() { return walker; },
    stepWalker: stepWalker,
    isDone: function() { return particlesDone; }
  };
}

/* ── Fractal Dimension (M(r) method) ── */
function computeFractalDim(particles, cx, cy) {
  if (particles.length < 10) return {D: 0, data: []};
  var distances = particles.map(function(p) {
    return Math.sqrt((p.x - cx) * (p.x - cx) + (p.y - cy) * (p.y - cy));
  }).sort(function(a, b) { return a - b; });
  var maxR = distances[distances.length - 1];
  if (maxR < 5) return {D: 0, data: []};

  var nBins = 20, data = [];
  for (var i = 1; i <= nBins; i++) {
    var r = maxR * i / nBins;
    var M = 0;
    for (var j = 0; j < distances.length; j++) {
      if (distances[j] <= r) M++; else break;
    }
    if (r > 0 && M > 0) data.push({r: r, M: M});
  }

  if (data.length < 3) return {D: 0, data: data};
  var logData = data.map(function(d) { return {x: Math.log10(d.r), y: Math.log10(d.M)}; });
  var n = logData.length;
  var sx = 0, sy = 0, sxy = 0, sxx = 0;
  for (var k = 0; k < n; k++) {
    sx += logData[k].x; sy += logData[k].y;
    sxy += logData[k].x * logData[k].y;
    sxx += logData[k].x * logData[k].x;
  }
  var D = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return {D: D, data: data};
}

/* ── Koch Snowflake Generation ── */
function kochSubdivide(pts, inward) {
  var out = [];
  for (var i = 0; i < pts.length; i++) {
    var a = pts[i], b = pts[(i + 1) % pts.length];
    var dx = b[0] - a[0], dy = b[1] - a[1];
    var p1 = [a[0] + dx / 3, a[1] + dy / 3];
    var p2 = [a[0] + 2 * dx / 3, a[1] + 2 * dy / 3];
    var dir = inward ? -1 : 1;
    var peak = [a[0] + dx / 2 + dir * dy * Math.sqrt(3) / 6, a[1] + dy / 2 - dir * dx * Math.sqrt(3) / 6];
    out.push(a, p1, peak, p2);
  }
  return out;
}

var KOCH_SIDE = 240, KOCH_W = 500, KOCH_H = 500;

function generateKoch(iteration, type) {
  var cx = KOCH_W / 2, cy = KOCH_H / 2 + 20;
  var h = KOCH_SIDE * Math.sqrt(3) / 2;
  var pts, triangles;

  if (type === 'sierpinski') {
    var top = [cx, cy - h * 2 / 3], bl = [cx - KOCH_SIDE / 2, cy + h / 3], br = [cx + KOCH_SIDE / 2, cy + h / 3];
    if (iteration === 0) return {points: [top, bl, br], triangles: [[top, bl, br]], type: 'sierpinski'};
    triangles = [[top, bl, br]];
    for (var i = 0; i < iteration; i++) {
      var next = [];
      for (var j = 0; j < triangles.length; j++) {
        var t = triangles[j];
        var ab = [(t[0][0] + t[1][0]) / 2, (t[0][1] + t[1][1]) / 2];
        var bc = [(t[1][0] + t[2][0]) / 2, (t[1][1] + t[2][1]) / 2];
        var ac = [(t[0][0] + t[2][0]) / 2, (t[0][1] + t[2][1]) / 2];
        next.push([t[0], ab, ac], [ab, t[1], bc], [ac, bc, t[2]]);
      }
      triangles = next;
    }
    var allPts = [];
    for (var k = 0; k < triangles.length; k++) allPts.push.apply(allPts, triangles[k]);
    return {points: allPts, triangles: triangles, type: 'sierpinski'};
  }

  var inward = (type === 'antisnowflake');
  pts = [[cx, cy - h * 2 / 3], [cx + KOCH_SIDE / 2, cy + h / 3], [cx - KOCH_SIDE / 2, cy + h / 3]];
  for (var ii = 0; ii < iteration; ii++) pts = kochSubdivide(pts, inward);

  var perimInfo = getKochPerimInfo(iteration, type);
  return {points: pts, perimeter: perimInfo.perim, type: type};
}

function getKochPerimInfo(iter, type) {
  if (type === 'sierpinski') {
    var segs = 3 * Math.pow(3, iter);
    var segLen = KOCH_SIDE / Math.pow(2, iter);
    return {segs: segs, segLen: segLen, perim: segs * segLen};
  }
  var segs2 = 3 * Math.pow(4, iter);
  var segLen2 = KOCH_SIDE / Math.pow(3, iter);
  return {segs: segs2, segLen: segLen2, perim: segs2 * segLen2};
}

/* ── Ruler Measurement ── */
function measureWithRuler(pts, rulerSize) {
  if (pts.length < 2) return {count: 0, length: 0, steps: []};
  var steps = [];
  var count = 0, acc = 0, cur = pts[0];
  steps.push([cur[0], cur[1]]);

  for (var i = 1; i <= pts.length; i++) {
    var next = pts[i % pts.length];
    var dx = next[0] - cur[0], dy = next[1] - cur[1];
    var segLen = Math.sqrt(dx * dx + dy * dy);
    acc += segLen;
    while (acc >= rulerSize) {
      acc -= rulerSize;
      count++;
      var backDist = acc;
      var nx = next[0] - dx / segLen * backDist;
      var ny = next[1] - dy / segLen * backDist;
      steps.push([nx, ny]);
    }
    cur = next;
  }
  if (acc > rulerSize * 0.01) { count++; steps.push([pts[0][0], pts[0][1]]); }
  return {count: count, length: count * rulerSize, steps: steps};
}

function computeKochFractalDim(rulerData) {
  if (rulerData.length < 2) return {D: 0, slope: 0};
  var xs = [], ys = [];
  for (var i = 0; i < rulerData.length; i++) {
    xs.push(Math.log(1 / rulerData[i].size));
    ys.push(Math.log(rulerData[i].length));
  }
  var n = xs.length, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (var j = 0; j < n; j++) {
    sx += xs[j]; sy += ys[j];
    sxx += xs[j] * xs[j]; sxy += xs[j] * ys[j];
  }
  var slope = (n * sxy - sx * sy) / (n * sxx - sx * sx);
  return {D: slope, xs: xs, ys: ys};
}

function getKochRulerSizes(type) {
  var basePerim = getKochPerimInfo(0, type).perim;
  var sizes = [];
  for (var i = 0; i < 10; i++) {
    sizes.push(basePerim / Math.pow(1.5, i + 1));
  }
  return sizes;
}

/* ── Monte Carlo Area ── */
function pointInPolygon(x, y, pts) {
  var inside = false;
  for (var i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    var xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

function getTheoreticalArea(type, iteration) {
  var baseArea = KOCH_SIDE * KOCH_SIDE * Math.sqrt(3) / 4;
  if (type === 'snowflake') return baseArea * (8 / 5);
  if (type === 'antisnowflake') return baseArea * (2 / 5);
  return baseArea * Math.pow(3 / 4, iteration);
}

function monteCarloArea(fractalResult, numPoints) {
  var bounds = {x: 0, y: 0, w: KOCH_W, h: KOCH_H};
  var bboxArea = bounds.w * bounds.h;
  var inside = 0;
  var convergence = [];
  var insidePts = [], outsidePts = [];

  if (fractalResult.type === 'sierpinski' && fractalResult.triangles) {
    var tris = fractalResult.triangles;
    for (var i = 0; i < numPoints; i++) {
      var px = Math.random() * KOCH_W, py = Math.random() * KOCH_H;
      var hit = false;
      for (var t = 0; t < tris.length; t++) {
        if (pointInPolygon(px, py, tris[t])) { hit = true; break; }
      }
      if (hit) { inside++; insidePts.push([px, py]); }
      else { outsidePts.push([px, py]); }
      if ((i + 1) % 50 === 0 || i === numPoints - 1) {
        convergence.push({n: i + 1, area: inside / (i + 1) * bboxArea});
      }
    }
  } else {
    var pts = fractalResult.points;
    for (var j = 0; j < numPoints; j++) {
      var qx = Math.random() * KOCH_W, qy = Math.random() * KOCH_H;
      if (pointInPolygon(qx, qy, pts)) { inside++; insidePts.push([qx, qy]); }
      else { outsidePts.push([qx, qy]); }
      if ((j + 1) % 50 === 0 || j === numPoints - 1) {
        convergence.push({n: j + 1, area: inside / (j + 1) * bboxArea});
      }
    }
  }

  return {
    inside: inside,
    total: numPoints,
    estimated: inside / numPoints * bboxArea,
    convergence: convergence,
    insidePts: insidePts,
    outsidePts: outsidePts
  };
}
