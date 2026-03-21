/* render.js — Fractal Portal: Canvas rendering for DLA and Koch */

/* ── DLA Rendering ── */
function drawDLAAggregate(canvas, dla) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  var img = ctx.createImageData(w, h);
  var gs = dla.gridSize;
  var scale = w / gs;
  var maxOrder = dla.getCount();

  // Dark background
  for (var i = 0; i < w * h * 4; i += 4) {
    img.data[i] = 8; img.data[i + 1] = 10; img.data[i + 2] = 8; img.data[i + 3] = 255;
  }

  for (var p = 0; p < dla.particles.length; p++) {
    var pt = dla.particles[p];
    var t = maxOrder > 0 ? pt.order / maxOrder : 0;
    // Color by arrival: dark teal -> bright cyan -> white
    var r = Math.round(15 + t * 200);
    var g = Math.round(60 + t * 170);
    var b = Math.round(80 + t * 176);
    var x0 = Math.floor(pt.x * scale), y0 = Math.floor(pt.y * scale);
    var x1 = Math.max(x0 + 1, Math.floor((pt.x + 1) * scale));
    var y1 = Math.max(y0 + 1, Math.floor((pt.y + 1) * scale));
    for (var y = y0; y < y1 && y < h; y++) {
      for (var x = x0; x < x1 && x < w; x++) {
        var idx = (y * w + x) * 4;
        img.data[idx] = r; img.data[idx + 1] = g; img.data[idx + 2] = b;
      }
    }
  }

  ctx.putImageData(img, 0, 0);
}

/* ── Koch Rendering ── */
function drawKoch(canvas, fractalResult) {
  var ctx = canvas.getContext('2d');
  var w = canvas.width, h = canvas.height;
  ctx.fillStyle = '#080a08';
  ctx.fillRect(0, 0, w, h);

  if (fractalResult.type === 'sierpinski' && fractalResult.triangles) {
    ctx.strokeStyle = 'rgba(61, 207, 192, 0.8)';
    ctx.fillStyle = 'rgba(61, 207, 192, 0.06)';
    ctx.lineWidth = 0.8;
    for (var t = 0; t < fractalResult.triangles.length; t++) {
      var tri = fractalResult.triangles[t];
      ctx.beginPath();
      ctx.moveTo(tri[0][0], tri[0][1]);
      ctx.lineTo(tri[1][0], tri[1][1]);
      ctx.lineTo(tri[2][0], tri[2][1]);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  } else if (fractalResult.points && fractalResult.points.length > 1) {
    var pts = fractalResult.points;
    ctx.strokeStyle = 'rgba(61, 207, 192, 0.9)';
    ctx.fillStyle = 'rgba(61, 207, 192, 0.05)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (var i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i][0], pts[i][1]);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

function drawRulerOverlay(canvas, steps) {
  if (steps.length < 2) return;
  var ctx = canvas.getContext('2d');
  ctx.strokeStyle = 'rgba(240, 180, 41, 0.7)';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 2]);
  ctx.beginPath();
  ctx.moveTo(steps[0][0], steps[0][1]);
  for (var i = 1; i < steps.length; i++) {
    ctx.lineTo(steps[i][0], steps[i][1]);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // Dots at ruler endpoints
  ctx.fillStyle = '#f0b429';
  for (var j = 0; j < steps.length; j++) {
    ctx.beginPath();
    ctx.arc(steps[j][0], steps[j][1], 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMonteCarloPoints(canvas, insidePts, outsidePts) {
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(61, 207, 192, 0.4)';
  for (var i = 0; i < insidePts.length; i++) {
    ctx.fillRect(insidePts[i][0], insidePts[i][1], 1.5, 1.5);
  }
  ctx.fillStyle = 'rgba(226, 75, 74, 0.25)';
  for (var j = 0; j < outsidePts.length; j++) {
    ctx.fillRect(outsidePts[j][0], outsidePts[j][1], 1.5, 1.5);
  }
}
