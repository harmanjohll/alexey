/* report-render.js — drawing helpers + per-cookbook-item renderers
   used by report.js. Lives separately so additions to either drawing
   primitives or per-item drawers stay small. */

var CARD_TITLE_H = 22;
var CARD_PAD     = 10;
var CARD_FRAME   = '#3d7a52';

function _drawCardFrame(ctx, x, y, w, h, title, accent) {
  ctx.fillStyle = '#fafbf8';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#cfd8c8';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // Title bar
  ctx.fillStyle = (accent || CARD_FRAME);
  ctx.fillRect(x, y, w, CARD_TITLE_H);
  ctx.fillStyle = '#ffffff';
  ctx.font = '600 11px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(title.toUpperCase(), x + CARD_PAD, y + 5);
}

function _drawTextCard(ctx, x, y, w, h, title, rows) {
  _drawCardFrame(ctx, x, y, w, h, title);
  var py = y + CARD_TITLE_H + CARD_PAD;
  ctx.font = '400 12px "Space Mono", monospace';
  ctx.textBaseline = 'top';
  for (var i = 0; i < rows.length; i++) {
    var r = rows[i];
    if (typeof r.v === 'string' && r.v.indexOf('__BLOCK__') === 0) {
      // Multi-line text block (used for hypothesis content)
      ctx.fillStyle = '#1c2920';
      ctx.font = '400 11px "Space Grotesk", sans-serif';
      var body = r.v.slice('__BLOCK__'.length);
      var lines = _wrapText(ctx, body, w - 2 * CARD_PAD);
      for (var li = 0; li < lines.length; li++) {
        if (py + 14 > y + h - 4) break;
        ctx.fillText(lines[li], x + CARD_PAD, py);
        py += 14;
      }
      ctx.font = '400 12px "Space Mono", monospace';
      continue;
    }
    if (py + 14 > y + h - 4) break;
    if (r.k) {
      ctx.fillStyle = '#5e7a5e';
      ctx.fillText(r.k, x + CARD_PAD, py);
    }
    ctx.fillStyle = '#1c2920';
    ctx.fillText(String(r.v), x + CARD_PAD + 110, py);
    py += 16;
  }
}

function _drawCanvasCard(ctx, x, y, w, h, title, src) {
  _drawCardFrame(ctx, x, y, w, h, title);
  if (!src) {
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 11px "Space Grotesk", sans-serif';
    ctx.fillText('(canvas not present — chart not rendered yet)', x + CARD_PAD, y + CARD_TITLE_H + CARD_PAD);
    return;
  }
  var availW = w - 2 * CARD_PAD;
  var availH = h - CARD_TITLE_H - 2 * CARD_PAD;
  var srcW = src.width || src.clientWidth, srcH = src.height || src.clientHeight;
  if (!srcW || !srcH) return;
  var ratio = Math.min(availW / srcW, availH / srcH);
  var dW = srcW * ratio, dH = srcH * ratio;
  var dX = x + CARD_PAD + (availW - dW) / 2;
  var dY = y + CARD_TITLE_H + CARD_PAD + (availH - dH) / 2;
  try {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(dX - 1, dY - 1, dW + 2, dH + 2);
    ctx.drawImage(src, dX, dY, dW, dH);
  } catch (e) {}
}

function _drawCookbookCard(ctx, x, y, w, h, item) {
  var stored = (typeof getCookbookResult === 'function') ? getCookbookResult(item.cookbookId) : null;
  if (!stored || !stored.result) {
    _drawCardFrame(ctx, x, y, w, h, item.label);
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 11px "Space Grotesk", sans-serif';
    ctx.fillText('(no result — run cookbook entry first)', x + CARD_PAD, y + CARD_TITLE_H + CARD_PAD);
    return;
  }
  var renderer = _COOKBOOK_RENDERERS[item.cookbookId];
  if (!renderer) {
    _drawCardFrame(ctx, x, y, w, h, item.label);
    ctx.fillStyle = '#8a847f';
    ctx.font = '400 11px "Space Grotesk", sans-serif';
    ctx.fillText('(no renderer registered for ' + item.cookbookId + ')', x + CARD_PAD, y + CARD_TITLE_H + CARD_PAD);
    return;
  }
  _drawCardFrame(ctx, x, y, w, h, item.label);
  // First try snapshotting the live cookbook canvas; fallback to data render
  var liveCanvasId = renderer.liveCanvasId;
  var live = liveCanvasId ? document.getElementById(liveCanvasId) : null;
  if (live && live.width && live.height) {
    var availW = w - 2 * CARD_PAD;
    var availH = h - CARD_TITLE_H - 2 * CARD_PAD;
    var ratio = Math.min(availW / live.width, availH / live.height);
    var dW = live.width * ratio, dH = live.height * ratio;
    var dX = x + CARD_PAD + (availW - dW) / 2;
    var dY = y + CARD_TITLE_H + CARD_PAD + (availH - dH) / 2;
    try {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(dX - 1, dY - 1, dW + 2, dH + 2);
      ctx.drawImage(live, dX, dY, dW, dH);
      return;
    } catch (e) { /* fall through to data render */ }
  }
  renderer.draw(ctx, x + CARD_PAD, y + CARD_TITLE_H + CARD_PAD,
    w - 2 * CARD_PAD, h - CARD_TITLE_H - 2 * CARD_PAD, stored.result);
}

function _drawReportHeader(ctx, width, headerH, padding, notes, pack) {
  ctx.fillStyle = '#0a1e0a';
  ctx.fillRect(0, 0, width, headerH);
  ctx.fillStyle = '#7dd87d';
  ctx.font = '600 22px "Instrument Serif", serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('Football Research Report', padding, 14);

  // Subtitle line: shots + leagues
  var nShots = (typeof window.shots !== 'undefined' && window.shots) ? window.shots.length : 0;
  var nTeams = 0;
  if (typeof LEAGUE_DATA !== 'undefined') {
    Object.keys(LEAGUE_DATA).forEach(function(k){ nTeams += LEAGUE_DATA[k].teams.length; });
  }
  var subtitle = nShots + ' shot' + (nShots === 1 ? '' : 's') + ' placed · ' +
    nTeams + ' real teams across ' +
    (typeof LEAGUE_DATA !== 'undefined' ? Object.keys(LEAGUE_DATA).length : '—') + ' leagues';
  ctx.font = '400 13px "Space Mono", monospace';
  ctx.fillStyle = '#a8d8a8';
  ctx.fillText(subtitle, padding, 46);

  if (notes && notes.trim()) {
    ctx.fillStyle = '#ffffff';
    ctx.font = 'italic 400 13px "Space Grotesk", sans-serif';
    var maxNoteW = width - padding * 2 - 280;
    var lines = _wrapText(ctx, notes.trim(), maxNoteW);
    ctx.fillText(lines[0] + (lines.length > 1 ? '…' : ''), padding, 70);
  }

  ctx.fillStyle = '#7a9a7a';
  ctx.font = '400 11px "Space Mono", monospace';
  ctx.textAlign = 'right';
  ctx.fillText(new Date().toLocaleString() + '  ·  Alexey Mikhail Johll', width - padding, 18);
  ctx.fillText('rows: ' + pack.rows + '  ·  fit scale: ' + Math.round(pack.scale * 100) + '%',
    width - padding, 38);
  ctx.textAlign = 'left';
}

function _wrapText(ctx, text, maxW) {
  var words = String(text).split(/\s+/);
  var lines = [], line = '';
  for (var i = 0; i < words.length; i++) {
    var test = line ? line + ' ' + words[i] : words[i];
    if (ctx.measureText(test).width > maxW && line) {
      lines.push(line); line = words[i];
    } else line = test;
  }
  if (line) lines.push(line);
  return lines;
}

/* ── Cookbook-specific renderers ──────────────────────────────
   Each takes (ctx, x, y, w, h, result) and draws inside the card body
   region (frame + title already drawn). Live canvases are snapshotted
   automatically by _drawCookbookCard if liveCanvasId is set; the draw
   function is the offline fallback that re-renders from stored data. */

var _COOKBOOK_RENDERERS = {};

/* Cross-league residual ranking — horizontal bar chart, all teams. */
_COOKBOOK_RENDERERS['residual-cross-league'] = {
  liveCanvasId: 'chart-residual-cross-league',
  draw: function(ctx, x, y, w, h, result) {
    var rows = result.rows;
    var n = rows.length;
    var deltas = rows.map(function(r){ return r.delta; });
    var minD = Math.min.apply(null, deltas), maxD = Math.max.apply(null, deltas);
    if (Math.abs(minD) < 1) minD = -10;
    if (Math.abs(maxD) < 1) maxD =  10;
    var rangeD = maxD - minD;
    var labelW = 110;
    var barX0 = x + labelW;
    var barW = w - labelW - 10;
    var rowH = Math.max(10, (h - 24) / n);
    var zeroX = barX0 + (-minD / rangeD) * barW;

    // Title under frame
    ctx.font = '600 9px "Space Mono", monospace';
    ctx.fillStyle = '#5e7a5e';
    ctx.textBaseline = 'top';
    ctx.fillText('Δ = goals − xG  ·  ' + n + ' teams sorted by Δ', x, y);

    // Zero axis
    ctx.strokeStyle = '#cfd8c8';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(zeroX, y + 14);
    ctx.lineTo(zeroX, y + 14 + n * rowH);
    ctx.stroke();

    ctx.font = '400 8px "Space Mono", monospace';
    for (var i = 0; i < n; i++) {
      var r = rows[i];
      var yy = y + 14 + i * rowH;
      // Team name
      ctx.fillStyle = r.color || '#3d7a52';
      ctx.textAlign = 'right';
      ctx.fillText(r.name + (r.beyondChance ? ' ★' : ''), x + labelW - 4, yy + rowH * 0.3);
      // Bar
      var bx = (r.delta >= 0) ? zeroX : zeroX + (r.delta / rangeD) * barW;
      var bw = Math.abs(r.delta / rangeD * barW);
      ctx.fillStyle = r.color ? r.color + (r.beyondChance ? 'ee' : '88') : '#3d7a52';
      ctx.fillRect(bx, yy + 1, bw, Math.max(1, rowH - 2));
    }
    ctx.textAlign = 'left';
  }
};
/* Single-league residual — same shape as cross-league, fewer rows. */
_COOKBOOK_RENDERERS['residual-single-league'] = {
  liveCanvasId: 'chart-residual-single-league',
  draw: function(ctx, x, y, w, h, result) {
    _COOKBOOK_RENDERERS['residual-cross-league'].draw(ctx, x, y, w, h, result);
  }
};

/* Style fingerprint — PCA scatter coloured by league + accuracy line. */
_COOKBOOK_RENDERERS['style-fingerprint'] = {
  liveCanvasId: 'chart-style-pca',
  draw: function(ctx, x, y, w, h, result) {
    var pad = 30;
    var plotX = x + pad, plotY = y + 14, plotW = w - pad * 2, plotH = h - 36;
    var pts = result.pca.rows;
    var xs = pts.map(function(p){ return p.score[0]; });
    var ys = pts.map(function(p){ return p.score[1]; });
    var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
    var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
    var rX = (maxX - minX) || 1, rY = (maxY - minY) || 1;

    ctx.font = '400 9px "Space Mono", monospace';
    ctx.fillStyle = '#5e7a5e';
    ctx.textBaseline = 'top';
    ctx.fillText('PCA scatter · classifier ' + (result.classifier.accuracy * 100).toFixed(1) + '% '
      + '(CI ' + (result.classifier.ciLow * 100).toFixed(0) + '–' + (result.classifier.ciHigh * 100).toFixed(0) + '%) '
      + 'vs ' + (result.classifier.baseline * 100).toFixed(0) + '% baseline', x, y);

    // Axes
    ctx.strokeStyle = '#cfd8c8'; ctx.lineWidth = 0.5;
    ctx.strokeRect(plotX, plotY, plotW, plotH);

    for (var i = 0; i < pts.length; i++) {
      var p = pts[i];
      var px = plotX + (p.score[0] - minX) / rX * plotW;
      var py = plotY + plotH - (p.score[1] - minY) / rY * plotH;
      ctx.fillStyle = p.color || '#3d7a52';
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Legend strip at bottom
    var leagues = {};
    pts.forEach(function(p){ leagues[p.league] = p.color; });
    ctx.font = '400 9px "Space Mono", monospace';
    ctx.textBaseline = 'top';
    var lx = x, ly = y + h - 14;
    Object.keys(leagues).forEach(function(L) {
      ctx.fillStyle = leagues[L];
      ctx.fillRect(lx, ly + 2, 8, 8);
      ctx.fillStyle = '#1c2920';
      ctx.fillText(L, lx + 12, ly + 1);
      lx += ctx.measureText(L).width + 30;
    });
  }
};
/* Tournament 30×30 heatmap — ordered by ranking. */
_COOKBOOK_RENDERERS['tournament-30x30'] = {
  liveCanvasId: 'cookbook-tournament-heatmap',
  draw: function(ctx, x, y, w, h, result) {
    var n = result.n;
    var pad = 4;
    var labelW = 80;
    var availW = w - labelW - pad;
    var availH = h - 24;
    var cell = Math.min(availW, availH) / n;
    var x0 = x + labelW;
    var y0 = y + 14;

    ctx.font = '400 9px "Space Mono", monospace';
    ctx.fillStyle = '#5e7a5e';
    ctx.textBaseline = 'top';
    ctx.fillText('Pairwise win-rate matrix · ' + n + ' teams · ranked top-left to bottom-right', x, y);

    var order = result.ranking.map(function(r) {
      for (var i = 0; i < result.teams.length; i++) if (result.teams[i].name === r.name) return i;
      return 0;
    });
    for (var i = 0; i < n; i++) {
      for (var j = 0; j < n; j++) {
        var oi = order[i], oj = order[j];
        var w_ = result.winRateA[oi][oj];
        var col;
        if (i === j) col = '#cfd8c8';
        else if (w_ < 0.5) {
          var t = w_ / 0.5;
          col = 'rgb(' + Math.round(220 - t * 100) + ',' + Math.round(80 + t * 140) + ',60)';
        } else {
          var t2 = (w_ - 0.5) / 0.5;
          col = 'rgb(' + Math.round(120 - t2 * 60) + ',' + Math.round(200 - t2 * 60) + ',60)';
        }
        ctx.fillStyle = col;
        ctx.fillRect(x0 + j * cell, y0 + i * cell, cell - 0.5, cell - 0.5);
      }
    }

    // Row labels (top 8 only — too small otherwise)
    ctx.font = '400 7px "Space Mono", monospace';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    for (var ri = 0; ri < Math.min(n, 12); ri++) {
      var t = result.teams[order[ri]];
      ctx.fillStyle = t.color || '#1c2920';
      ctx.fillText(t.name, x0 - 2, y0 + ri * cell + cell / 2);
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    // Top-3 ranking summary at bottom
    ctx.font = '400 9px "Space Mono", monospace';
    ctx.fillStyle = '#1c2920';
    var ry = y + h - 11;
    var topLine = 'Top: 1.' + result.ranking[0].name + ' · 2.' + result.ranking[1].name + ' · 3.' + result.ranking[2].name;
    ctx.fillText(topLine, x, ry);
  }
};
/* BYOL row — sorted bar of win-rate vs each opponent. */
_COOKBOOK_RENDERERS['byol-vs-everyone'] = {
  liveCanvasId: 'chart-byol-row',
  draw: function(ctx, x, y, w, h, result) {
    var rows = result.rows;
    var n = rows.length;
    var labelW = 90;
    var barX0 = x + labelW;
    var barW = w - labelW - 10;
    var rowH = Math.max(8, (h - 28) / n);

    ctx.font = '400 9px "Space Mono", monospace';
    ctx.fillStyle = '#5e7a5e';
    ctx.textBaseline = 'top';
    ctx.fillText('Win-rate vs each opponent · beat ' + result.summary.wins + '/' + n
      + ' · avg ' + (result.summary.avgWinRate * 100).toFixed(1) + '%', x, y);

    // 50% reference line
    ctx.strokeStyle = '#cfd8c8'; ctx.lineWidth = 0.5;
    var x50 = barX0 + barW * 0.5;
    ctx.beginPath(); ctx.moveTo(x50, y + 14); ctx.lineTo(x50, y + 14 + n * rowH); ctx.stroke();

    ctx.font = '400 7px "Space Mono", monospace';
    for (var i = 0; i < n; i++) {
      var r = rows[i];
      var yy = y + 14 + i * rowH;
      ctx.fillStyle = r.color || '#3d7a52';
      ctx.textAlign = 'right';
      ctx.fillText(r.opponent, x + labelW - 4, yy + rowH * 0.3);
      ctx.fillStyle = (r.winRate >= 0.5 ? (r.color || '#3d7a52') + 'ee' : (r.color || '#3d7a52') + '66');
      ctx.fillRect(barX0, yy + 1, r.winRate * barW, Math.max(1, rowH - 2));
    }
    ctx.textAlign = 'left';
  }
};
/* Renderers added below by separate edits. */

if (typeof window !== 'undefined') {
  window._drawReportHeader = _drawReportHeader;
  window._drawTextCard = _drawTextCard;
  window._drawCanvasCard = _drawCanvasCard;
  window._drawCookbookCard = _drawCookbookCard;
  window._COOKBOOK_RENDERERS = _COOKBOOK_RENDERERS;
}
