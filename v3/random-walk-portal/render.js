/* render.js — Random Walk: p5.js canvas rendering for 1D and 2D */

function distCol(d, mx) {
  var t = Math.min(1, d / Math.max(mx, 1));
  var r = Math.round(74 + t * 181);
  var g = Math.round(90 + t * 48);
  var b = Math.round(159 + t * 80);
  return [r, g, b];
}

function createWalkSketch(containerId, walkersFn, dimFn, stepFn, totalFn, highlightFn) {
  return new p5(function(p) {
    var dim = dimFn();
    var cw = dim === 2 ? 500 : Math.min(880, (document.getElementById(containerId).clientWidth || 880));
    var ch = dim === 2 ? 500 : 250;
    var cx = cw / 2, cy = ch / 2;
    var scale2D = 0.7;

    p.setup = function() {
      var c = p.createCanvas(cw, ch);
      c.parent(containerId);
      c.mouseClicked(function() {
        if (dimFn() === 2) {
          var ws = walkersFn();
          if (ws.length === 0) return;
          var mx = (p.mouseX - cx) / scale2D, my = (p.mouseY - cy) / scale2D;
          var best = -1, bd = Infinity;
          for (var i = 0; i < ws.length; i++) {
            var dd = (ws[i].x - mx) * (ws[i].x - mx) + (ws[i].y - my) * (ws[i].y - my);
            if (dd < bd) { bd = dd; best = i; }
          }
          if (highlightFn) highlightFn(best);
        }
      });
    };

    p.draw = function() {
      var ws = walkersFn();
      var curDim = dimFn();
      var isDark = document.documentElement.getAttribute('data-theme') === 'dark';
      var bgCol = isDark ? 17 : 237;
      p.background(bgCol);

      if (curDim === 2) {
        draw2D(p, ws, cx, cy, scale2D, stepFn(), totalFn(), isDark);
      } else {
        draw1D(p, ws, cx, cy, cw, ch, stepFn(), totalFn(), isDark);
      }
    };
  });
}

function draw2D(p, walkers, cx, cy, scale, curStep, totalSteps, isDark) {
  var highlightIdx = typeof window._highlightIdx !== 'undefined' ? window._highlightIdx : -1;
  var mx = 1;
  for (var i = 0; i < walkers.length; i++) {
    var d = dist2D(walkers[i]);
    if (d > mx) mx = d;
  }

  // Theoretical circle
  if (curStep > 0) {
    var theoR = Math.sqrt(curStep) * STEP_SIZE * scale;
    p.noFill();
    p.stroke(isDark ? 100 : 150);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([4, 4]);
    p.ellipse(cx, cy, theoR * 2, theoR * 2);
    p.drawingContext.setLineDash([]);
  }

  // Crosshair
  p.stroke(isDark ? 50 : 200);
  p.strokeWeight(0.5);
  p.line(cx, 0, cx, p.height);
  p.line(0, cy, p.width, cy);

  // Origin
  p.fill(isDark ? 200 : 80);
  p.noStroke();
  p.ellipse(cx, cy, 4, 4);

  // Paths
  for (var j = 0; j < walkers.length; j++) {
    var w = walkers[j];
    var isHi = j === highlightIdx;
    var alpha = isHi ? 180 : 8;
    var col = distCol(dist2D(w), mx);
    p.stroke(col[0], col[1], col[2], alpha);
    p.strokeWeight(isHi ? 1.5 : 0.5);
    p.noFill();
    p.beginShape();
    for (var k = 0; k < w.path.length; k++) {
      p.vertex(cx + w.path[k][0] * scale, cy + w.path[k][1] * scale);
    }
    p.endShape();
  }

  // Endpoints
  for (var m = 0; m < walkers.length; m++) {
    var ww = walkers[m];
    var col2 = distCol(dist2D(ww), mx);
    p.fill(col2[0], col2[1], col2[2]);
    p.noStroke();
    p.ellipse(cx + ww.x * scale, cy + ww.y * scale, m === highlightIdx ? 8 : 4, m === highlightIdx ? 8 : 4);
  }
}

function draw1D(p, walkers, cx, cy, cw, ch, curStep, totalSteps, isDark) {
  var baseline = ch / 2;

  // Baseline
  p.stroke(isDark ? 60 : 190);
  p.strokeWeight(1);
  p.line(20, baseline, cw - 20, baseline);

  // Origin
  p.fill(isDark ? 200 : 80);
  p.noStroke();
  p.ellipse(cx, baseline, 5, 5);

  // Theoretical envelope
  if (curStep > 0) {
    var theoX = Math.sqrt(curStep) * STEP_SIZE;
    var pixScale = (cw - 80) / 2;
    var mx = 1;
    for (var i = 0; i < walkers.length; i++) {
      if (Math.abs(walkers[i].pos) > mx) mx = Math.abs(walkers[i].pos);
    }
    var sc = mx > 0 ? pixScale / mx : 1;
    var envPx = theoX * sc;

    p.stroke(isDark ? 100 : 150);
    p.strokeWeight(1);
    p.drawingContext.setLineDash([4, 4]);
    p.line(cx - envPx, 10, cx - envPx, ch - 10);
    p.line(cx + envPx, 10, cx + envPx, ch - 10);
    p.drawingContext.setLineDash([]);

    // Stack walkers
    var bins = {};
    var binW = Math.max(3, Math.floor(cw / 100));
    for (var j = 0; j < walkers.length; j++) {
      var xPos = Math.round(walkers[j].pos * sc / binW) * binW;
      if (!bins[xPos]) bins[xPos] = [];
      bins[xPos].push(j);
    }

    for (var key in bins) {
      var arr = bins[key];
      var px = cx + parseInt(key);
      for (var k = 0; k < arr.length; k++) {
        var yy = baseline - (k + 1) * 4;
        var d = dist1D(walkers[arr[k]]);
        var col = distCol(d, mx);
        p.fill(col[0], col[1], col[2]);
        p.noStroke();
        p.ellipse(px, yy, 3, 3);
      }
    }
  }
}
