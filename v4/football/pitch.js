/* pitch.js — Pitch rendering and xG calculation for the Football Portal */

// Pitch constants (exactly as v2)
var PITCH_W = 460, PITCH_H = 360, PITCH_SC = 6.5;
var GY = 28, GX = PITCH_W / 2, GHW = Math.round(3.66 * PITCH_SC);
var GOAL_WIDTH_M = 7.32;
var PY = GY + Math.round(11 * PITCH_SC);
var PBY2 = GY + Math.round(16.5 * PITCH_SC);
var PBHW = Math.round(20.16 * PITCH_SC);
var SYY2 = GY + Math.round(5.5 * PITCH_SC);
var SYHW = Math.round(9.16 * PITCH_SC);
var DRAD = Math.round(9.15 * PITCH_SC);

/**
 * Draw a football pitch on the given canvas context.
 * Uses dark green stripe pattern for pitch surface.
 */
function drawPitch(ctx) {
  var W = PITCH_W, H = PITCH_H;
  // Striped grass
  for (var i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#061a0a' : '#071e0c';
    ctx.fillRect(i * (W / 7), 0, Math.ceil(W / 7) + 1, H);
  }
  // Pitch outline
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(60,160,60,.35)';
  ctx.strokeRect(10, GY, W - 20, H - GY - 8);
  // Half-way line
  ctx.beginPath(); ctx.moveTo(10, H / 2); ctx.lineTo(W - 10, H / 2); ctx.stroke();
  // Penalty area
  ctx.strokeRect(GX - PBHW, GY, PBHW * 2, PBY2 - GY);
  // 6-yard box
  ctx.strokeRect(GX - SYHW, GY, SYHW * 2, SYY2 - GY);
  // Penalty spot
  ctx.fillStyle = 'rgba(60,160,60,.6)';
  ctx.beginPath(); ctx.arc(GX, PY, 3, 0, Math.PI * 2); ctx.fill();
  // D arc (clipped below penalty area)
  ctx.save();
  ctx.beginPath(); ctx.rect(0, PBY2, W, H); ctx.clip();
  ctx.beginPath(); ctx.arc(GX, PY, DRAD, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
  // Goal
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.7)';
  ctx.beginPath();
  ctx.moveTo(GX - GHW, GY);
  ctx.lineTo(GX - GHW, GY - 12);
  ctx.lineTo(GX + GHW, GY - 12);
  ctx.lineTo(GX + GHW, GY);
  ctx.stroke();
  // Goal net lines
  ctx.lineWidth = 0.4;
  ctx.strokeStyle = 'rgba(255,255,255,.08)';
  for (var x = GX - GHW + 7; x < GX + GHW; x += 7) {
    ctx.beginPath(); ctx.moveTo(x, GY); ctx.lineTo(x, GY - 12); ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(GX - GHW, GY - 6);
  ctx.lineTo(GX + GHW, GY - 6);
  ctx.stroke();
}

/**
 * Geometric xG model — uses angle subtended at goal and exponential distance decay.
 * Returns { xg, d (metres), a (degrees) }
 */
function calcGeometricXG(x, y) {
  if (y <= GY) return { xg: 0, d: 0, a: 0 };
  var dx = x - GX, dy = y - GY;
  var dp = Math.sqrt(dx * dx + dy * dy), dm = dp / PITCH_SC;
  if (dm < 0.8) return { xg: 0.96, d: dm, a: 180 };
  var lx = (GX - GHW) - x, ly = GY - y, rx = (GX + GHW) - x, ry = GY - y;
  var ll = Math.sqrt(lx * lx + ly * ly), rl = Math.sqrt(rx * rx + ry * ry);
  var dot = (lx * rx + ly * ry) / (ll * rl);
  var ar = Math.acos(Math.max(-1, Math.min(1, dot)));
  var xg = Math.min(0.96, (ar / Math.PI) * Math.exp(-dm / 14) * 3.5);
  return { xg: xg, d: dm, a: ar * 180 / Math.PI };
}

/**
 * Logistic regression xG model — uses Soccermatics angle formula + logistic coefficients.
 * Requires XG_COEFF from league-data.js.
 * Returns { xg, d (metres), a (degrees) }
 */
function calcLogisticXG(x, y) {
  if (y <= GY) return { xg: 0, d: 0, a: 0 };
  var dx = x - GX, dy = y - GY;
  var dp = Math.sqrt(dx * dx + dy * dy), dm = dp / PITCH_SC;
  if (dm < 0.8) return { xg: 0.96, d: dm, a: 180 };
  var lateralOffset = Math.abs(dx) / PITCH_SC;
  var distToGoalLine = dy / PITCH_SC;
  var halfGoal = GOAL_WIDTH_M / 2;
  var numerator = GOAL_WIDTH_M * distToGoalLine;
  var denominator = distToGoalLine * distToGoalLine + lateralOffset * lateralOffset - halfGoal * halfGoal;
  var angleRad;
  if (denominator <= 0) {
    angleRad = Math.PI / 2;
  } else {
    angleRad = Math.atan(numerator / denominator);
    if (angleRad < 0) angleRad += Math.PI;
  }
  var z = XG_COEFF.b0 + XG_COEFF.b1 * angleRad + XG_COEFF.b2 * dm + XG_COEFF.b3 * angleRad * dm + XG_COEFF.b4 * dm * dm;
  var xg = Math.min(0.96, Math.max(0.001, 1 / (1 + Math.exp(-z))));
  return { xg: xg, d: dm, a: angleRad * 180 / Math.PI };
}

/**
 * Apply shot type modifier to a base xG value.
 * Types: 'open', 'header', 'freekick', 'penalty'
 */
function shotTypeModifier(baseXG, dist, type) {
  if (type === 'penalty') return 0.76;
  if (type === 'header') return baseXG * 0.6;
  if (type === 'freekick') {
    if (dist < 16) return 0.01;
    if (dist < 20) return 0.03;
    if (dist < 25) return 0.06 + (25 - dist) * 0.004;
    if (dist < 30) return 0.05 - (dist - 25) * 0.006;
    return 0.02;
  }
  return baseXG;
}

/**
 * Apply situation modifiers to xG value.
 * situation: { pressure, assist, counter, oneVone, homeAway, oppQuality, minute }
 */
function applySituationModifiers(xg, situation) {
  if (!situation || xg <= 0) return xg;
  var m = 1.0;
  // Defensive pressure
  if (situation.pressure === 'medium') m *= 0.85;
  else if (situation.pressure === 'high') m *= 0.65;
  // Assist type
  if (situation.assist === 'throughball') m *= 1.15;
  else if (situation.assist === 'cross') m *= 0.90;
  else if (situation.assist === 'cutback') m *= 1.20;
  // Counter-attack
  if (situation.counter) m *= 1.12;
  // 1v1 with keeper
  if (situation.oneVone) m *= 1.35;
  // Home/away
  if (situation.homeAway === 'home') m *= 1.05;
  // Opposition quality
  if (situation.oppQuality === 'weak') m *= 1.10;
  else if (situation.oppQuality === 'strong') m *= 0.85;
  // Late-game fatigue (minute 75+ slightly increases xG)
  if (situation.minute && situation.minute > 75) m *= 1.0 + (situation.minute - 75) * 0.003;
  return Math.min(0.96, Math.max(0.001, xg * m));
}

/**
 * Calculate xG using the specified model, shot type, and situation.
 */
function calcXG(x, y, model, shotType, situation) {
  var result = model === 'logistic' ? calcLogisticXG(x, y) : calcGeometricXG(x, y);
  if (result.xg > 0 && shotType && shotType !== 'open') {
    result.xg = shotTypeModifier(result.xg, result.d, shotType);
  }
  if (result.xg > 0 && situation) {
    result.xg = applySituationModifiers(result.xg, situation);
  }
  return result;
}

/**
 * Calculate xG with a specific model (no shot type modifier).
 */
function calcXGWithModel(x, y, model) {
  return model === 'logistic' ? calcLogisticXG(x, y) : calcGeometricXG(x, y);
}

/**
 * Map xG value to a colour on a blue-violet → magenta → gold gradient.
 */
function xgCol(xg) {
  var t = Math.min(1, xg / 0.7);
  if (t < 0.4) {
    // Blue-violet to bright violet
    var s = t / 0.4;
    return 'rgb(' + Math.round(74 + s * 106) + ',' + Math.round(90 + s * 30) + ',' + Math.round(159 + s * 80) + ')';
  }
  if (t < 0.7) {
    // Bright violet to magenta-pink
    var s2 = (t - 0.4) / 0.3;
    return 'rgb(' + Math.round(180 + s2 * 75) + ',' + Math.round(120 - s2 * 10) + ',' + Math.round(239 - s2 * 39) + ')';
  }
  // Magenta to hot orange-gold
  var s3 = (t - 0.7) / 0.3;
  return 'rgb(255,' + Math.round(110 + s3 * 110) + ',' + Math.round(200 - s3 * 170) + ')';
}

/**
 * Draw shot markers on the pitch canvas.
 * Each shot: { x, y, xg, d, a, type, model }
 */
function drawShots(ctx, shots) {
  var typeLabels = { open: '', header: 'H', freekick: 'FK', penalty: 'PK' };
  for (var i = 0; i < shots.length; i++) {
    var s = shots[i];
    var c = xgCol(s.xg);
    // Glow
    ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, Math.PI * 2);
    ctx.fillStyle = c + '22'; ctx.fill();
    // Dot
    ctx.beginPath(); ctx.arc(s.x, s.y, 5.5, 0, Math.PI * 2);
    ctx.fillStyle = c; ctx.fill();
    // Number
    ctx.font = 'bold 7px monospace';
    ctx.fillStyle = '#000';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i + 1, s.x, s.y);
    // Type label
    if (s.type && s.type !== 'open') {
      ctx.font = '6px monospace';
      ctx.fillStyle = '#7a9a7a';
      ctx.fillText(typeLabels[s.type] || '', s.x, s.y + 11);
    }
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
  }
}

/**
 * Draw a crosshair/dashed circle at cursor position when hovering.
 */
function drawCursorRing(ctx, hx, hy, xg) {
  if (xg > 0) {
    var c = xgCol(xg);
    ctx.beginPath();
    ctx.arc(hx, hy, 9, 0, Math.PI * 2);
    ctx.strokeStyle = c;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

/**
 * Draw a full-pitch xG heatmap on the given canvas using the specified model.
 */
function drawHeatmap(canvas, model) {
  var ctx = canvas.getContext('2d');
  var W = PITCH_W, H = PITCH_H;
  var step = 4;

  // Draw pitch background
  for (var i = 0; i < 7; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#061a0a' : '#071e0c';
    ctx.fillRect(i * (W / 7), 0, Math.ceil(W / 7) + 1, H);
  }

  // Draw heatmap overlay (blue-violet → magenta → gold gradient)
  for (var y = GY + 1; y < H - 8; y += step) {
    for (var x = 10; x < W - 10; x += step) {
      var result = calcXGWithModel(x, y, model);
      if (result.xg > 0) {
        var intensity = Math.min(1, result.xg / 0.5);
        var r, g, b;
        if (intensity < 0.3) {
          // Deep blue-violet
          var s = intensity / 0.3;
          r = Math.round(20 + s * 54);
          g = Math.round(15 + s * 75);
          b = Math.round(40 + s * 119);
        } else if (intensity < 0.55) {
          // Blue-violet → bright violet
          var s2 = (intensity - 0.3) / 0.25;
          r = Math.round(74 + s2 * 106);
          g = Math.round(90 + s2 * 30);
          b = Math.round(159 + s2 * 80);
        } else if (intensity < 0.8) {
          // Bright violet → magenta-pink
          var s3 = (intensity - 0.55) / 0.25;
          r = Math.round(180 + s3 * 75);
          g = Math.round(120 - s3 * 10);
          b = Math.round(239 - s3 * 39);
        } else {
          // Magenta → hot gold
          var s4 = (intensity - 0.8) / 0.2;
          r = 255;
          g = Math.round(110 + s4 * 110);
          b = Math.round(200 - s4 * 170);
        }
        ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',0.7)';
        ctx.fillRect(x, y, step, step);
      }
    }
  }

  // Draw pitch lines on top
  ctx.lineWidth = 1.2;
  ctx.strokeStyle = 'rgba(255,255,255,.4)';
  ctx.strokeRect(10, GY, W - 20, H - GY - 8);
  ctx.beginPath(); ctx.moveTo(10, H / 2); ctx.lineTo(W - 10, H / 2); ctx.stroke();
  ctx.strokeRect(GX - PBHW, GY, PBHW * 2, PBY2 - GY);
  ctx.strokeRect(GX - SYHW, GY, SYHW * 2, SYY2 - GY);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.8)';
  ctx.beginPath();
  ctx.moveTo(GX - GHW, GY); ctx.lineTo(GX - GHW, GY - 12);
  ctx.lineTo(GX + GHW, GY - 12); ctx.lineTo(GX + GHW, GY);
  ctx.stroke();

  // Model label
  ctx.font = '10px "JetBrains Mono", monospace';
  ctx.fillStyle = '#7dd87d';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(model === 'logistic' ? 'LOGISTIC REGRESSION MODEL' : 'GEOMETRIC MODEL', 14, H - 20);
}
