/* lattice-render.js — Pixel-level lattice slice and heightmap rendering for KMC portal */

var lastSliceData = null;
var lastSliceH = 0;
var lastSliceStart = 0;
var lastLattx = 500;
var lastHtRaw = null;
var lastFullHt = null;
var viewMode = 'cross';
var pitOverlayEnabled = true;

function renderLattice(sliceBuffer, sliceH, lattx, targetCanvas, sliceStart) {
  lastSliceData = new Uint8Array(sliceBuffer.slice(0));
  lastSliceH = sliceH;
  lastLattx = lattx;
  if (typeof sliceStart === 'number') lastSliceStart = sliceStart;
  var cvs;
  if (targetCanvas) {
    cvs = targetCanvas;
    cvs.width = lattx;
    cvs.height = sliceH;
  } else {
    var zoom = +document.getElementById('zoomSlider').value;
    cvs = document.getElementById('latticeCanvas');
    cvs.width = lattx;
    cvs.height = sliceH;
    cvs.style.width = (lattx * zoom) + 'px';
    cvs.style.height = (sliceH * zoom) + 'px';
  }
  var ctx = cvs.getContext('2d');
  var img = ctx.createImageData(lattx, sliceH);
  var slice = new Uint8Array(sliceBuffer);
  for (var x = 0; x < lattx; x++) {
    for (var z = 0; z < sliceH; z++) {
      var sp = slice[x * sliceH + z];
      var idx = (z * lattx + x) * 4;
      if (sp === 1) { img.data[idx]=38; img.data[idx+1]=166; img.data[idx+2]=154; img.data[idx+3]=255; }      // Si: teal #26A69A
      else if (sp === 2) { img.data[idx]=255; img.data[idx+1]=112; img.data[idx+2]=67; img.data[idx+3]=255; }  // Ge: orange #FF7043
      else { img.data[idx]=10; img.data[idx+1]=15; img.data[idx+2]=10; img.data[idx+3]=255; }                  // Vacancy: near-black
    }
  }
  ctx.putImageData(img, 0, 0);
  if (!targetCanvas) drawPitOverlay(ctx, lattx, sliceH, lastSliceStart);
}

/* Outline currently-detected pits on the lattice cross-section. Pit cells are
   drawn as a thin coloured rectangle from x_start to x_start+width, spanning
   the pit's vertical depth band (rim down to lowest height). */
function drawPitOverlay(ctx, lattx, sliceH, sliceStart) {
  if (!pitOverlayEnabled) return;
  var pits = window._currentPits;
  if (!pits || !pits.length) return;
  ctx.save();
  ctx.lineWidth = 1;
  for (var i = 0; i < pits.length; i++) {
    var p = pits[i];
    var x0 = p.start;
    var x1 = p.start + p.width;
    if (x1 > lattx) x1 = lattx;
    var topZ = (typeof p.rim === 'number') ? p.rim : (p.minH + p.depth);
    var botZ = p.minH;
    // Map world-z to canvas-row. The slice is rendered with row = world_z - sliceStart.
    var topRow = Math.max(0, Math.min(sliceH - 1, topZ - sliceStart));
    var botRow = Math.max(0, Math.min(sliceH - 1, botZ - sliceStart));
    var yLo = Math.min(topRow, botRow);
    var yHi = Math.max(topRow, botRow);
    var w = x1 - x0;
    var h = Math.max(1, yHi - yLo + 1);
    ctx.strokeStyle = 'rgba(240,180,41,0.85)';
    ctx.strokeRect(x0 + 0.5, yLo + 0.5, w - 1, h - 1);
    // Optional persistent ID label (rendered when present from tracking pass)
    if (typeof p.id === 'number') {
      ctx.fillStyle = 'rgba(240,180,41,0.95)';
      ctx.font = '7px "Space Mono", monospace';
      ctx.textBaseline = 'top';
      ctx.fillText('#' + p.id, x0 + 1, yLo + 1);
    }
  }
  ctx.restore();
}

/* Re-paint the cached lattice slice and overlay current pits.
   Called after pit analysis to keep the overlay in sync without
   waiting for the next worker message. */
function redrawLatticeWithPits() {
  if (!lastSliceData || !lastSliceH || !lastLattx) return;
  var cvs = document.getElementById('latticeCanvas');
  if (!cvs) return;
  var ctx = cvs.getContext('2d');
  var img = ctx.createImageData(lastLattx, lastSliceH);
  for (var x = 0; x < lastLattx; x++) {
    for (var z = 0; z < lastSliceH; z++) {
      var sp = lastSliceData[x * lastSliceH + z];
      var idx = (z * lastLattx + x) * 4;
      if (sp === 1) { img.data[idx]=38; img.data[idx+1]=166; img.data[idx+2]=154; img.data[idx+3]=255; }
      else if (sp === 2) { img.data[idx]=255; img.data[idx+1]=112; img.data[idx+2]=67; img.data[idx+3]=255; }
      else { img.data[idx]=10; img.data[idx+1]=15; img.data[idx+2]=10; img.data[idx+3]=255; }
    }
  }
  ctx.putImageData(img, 0, 0);
  drawPitOverlay(ctx, lastLattx, lastSliceH, lastSliceStart);
}

function renderHeightMap(htBuffer, lattx) {
  var ht = new Int32Array(htBuffer);
  lastHtRaw = new Int32Array(ht);
  lastFullHt = Array.from(lastHtRaw);
  var hMin = Infinity, hMax = -Infinity;
  for (var x = 0; x < lattx; x++) { if (ht[x] < hMin) hMin = ht[x]; if (ht[x] > hMax) hMax = ht[x]; }
  var range = hMax - hMin || 1;
  var cvs = document.getElementById('hmapCanvas');
  cvs.width = lattx; cvs.height = 40;
  var ctx = cvs.getContext('2d');
  var img = ctx.createImageData(lattx, 40);
  for (var x = 0; x < lattx; x++) {
    var t = (ht[x] - hMin) / range;
    var r = Math.round(30 + t * 225);
    var g = Math.round(80 + (1 - Math.abs(t - 0.5) * 2) * 120);
    var b = Math.round(200 * (1 - t));
    for (var y = 0; y < 40; y++) {
      var idx = (y * lattx + x) * 4;
      img.data[idx] = r; img.data[idx+1] = g; img.data[idx+2] = b; img.data[idx+3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
}

function applyZoom() {
  var zoom = +document.getElementById('zoomSlider').value;
  document.getElementById('zoomVal').textContent = zoom + 'x';
  var cvs = document.getElementById('latticeCanvas');
  cvs.style.width = (lastLattx * zoom) + 'px';
  cvs.style.height = (lastSliceH * zoom) + 'px';
}

function setView(mode) {
  viewMode = mode;
  document.getElementById('viewCross').style.background = mode === 'cross' ? 'var(--accent-subtle)' : '';
  document.getElementById('viewHmap').style.background = mode === 'hmap' ? 'var(--accent-subtle)' : '';
  document.getElementById('latticeWrap').style.display = mode === 'cross' ? '' : 'none';
  document.getElementById('hmapWrap').style.display = mode === 'hmap' ? '' : 'none';
}

function addSnapshotFromCanvas(srcCanvas, d) {
  var strip = document.getElementById('snapStrip');
  if (!strip.querySelector('.snap-item') && strip.children.length === 1) strip.innerHTML = '';
  var div = document.createElement('div');
  div.className = 'snap-item';
  var snapCvs = document.createElement('canvas');
  snapCvs.width = srcCanvas.width; snapCvs.height = srcCanvas.height;
  snapCvs.getContext('2d').drawImage(srcCanvas, 0, 0);
  div.innerHTML = '<div class="snap-label">iter ' + d.iter + '</div>';
  div.appendChild(snapCvs);
  div.innerHTML += '<div class="snap-stats">rms=' + d.rmsht.toFixed(3) + ' skew=' + d.skewness.toFixed(2) + '</div>';
  strip.appendChild(div);
}

// Hover tooltip for lattice
document.addEventListener('DOMContentLoaded', function() {
  var cvs = document.getElementById('latticeCanvas');
  if (!cvs) return;
  cvs.addEventListener('mousemove', function(e) {
    if (!lastSliceData || lastSliceH === 0) return;
    var rect = cvs.getBoundingClientRect();
    var zoom = +document.getElementById('zoomSlider').value;
    var x = Math.floor((e.clientX - rect.left) / zoom);
    var z = Math.floor((e.clientY - rect.top) / zoom);
    if (x < 0 || x >= lastLattx || z < 0 || z >= lastSliceH) { document.getElementById('latticeTip').style.display = 'none'; return; }
    var sp = lastSliceData[x * lastSliceH + z];
    var names = ['Vacancy', 'Si', 'Ge'];
    var tip = document.getElementById('latticeTip');
    tip.textContent = 'x=' + x + ' z=' + z + ' \u00B7 ' + (names[sp] || '?');
    tip.style.display = 'block';
    var wrapRect = document.getElementById('latticeWrap').getBoundingClientRect();
    tip.style.left = (e.clientX - wrapRect.left + 12) + 'px';
    tip.style.top = (e.clientY - wrapRect.top - 10) + 'px';
  });
  cvs.addEventListener('mouseleave', function() {
    document.getElementById('latticeTip').style.display = 'none';
  });
});
