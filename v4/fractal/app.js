/* app.js — Fractal Portal: orchestration, modes, investigation cards, logbook, coach */

/* ── State ── */
var currentMode = 'grow';
var running = false, cancelled = false;
var currentDLA = null;
var kochResult = null, kochRulerData = [];
var massChartInst = null, sweepChartInst = null, seedChartInst = null;
var perimChartInst = null, rulerChartInst = null, convChartInst = null;
var logEntries = [];
var convHist = [];

/* ── Theme: delegated to ../_common/theme.js ── */

var EXP_ID = 'fractal';
var COACH_PROMPT_INITIAL = 'You are COACH — a Socratic science mentor for Alexey. He has been exploring fractal growth via Diffusion-Limited Aggregation (DLA) and Koch snowflake geometry. He can control sticking probability, seed type, iteration depth, and ruler size, and measures fractal dimension via M(r) regression and log-log ruler analysis. Your rules: Ask EXACTLY ONE question per response. Never give Alexey the answer. Never explain the science to him — make him work it out. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.';
var COACH_PROMPT_FOLLOWUP = 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his fractal experiments. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.';

/* ── Panel Toggle ── */
function togglePanel(id) {
  var p = document.getElementById(id);
  p.classList.toggle('collapsed');
  var t = p.querySelector('.toggle');
  if (t) t.innerHTML = p.classList.contains('collapsed') ? '&#9654; expand' : '&darr; collapse';
}

/* ── Mode Tabs ── */
function setMode(mode) {
  currentMode = mode;
  var tabs = document.querySelectorAll('.mode-tab');
  for (var i = 0; i < tabs.length; i++) {
    tabs[i].classList.toggle('active', tabs[i].getAttribute('data-mode') === mode);
  }
  var sections = document.querySelectorAll('.mode-section');
  for (var j = 0; j < sections.length; j++) {
    sections[j].classList.toggle('active', sections[j].id === 'mode-' + mode);
  }
}

/* ── Read Parameters ── */
function readParams() {
  return {
    gridSize: +document.getElementById('pGrid').value,
    maxParticles: +document.getElementById('pMaxP').value,
    stickProb: +document.getElementById('pStick').value,
    seedType: document.getElementById('pSeed').value,
    launchMul: +document.getElementById('pLaunch').value,
    killMul: +document.getElementById('pKill').value
  };
}

/* ══════════════════════════════════════════════
   MODE 1: GROW AGGREGATE
   ══════════════════════════════════════════════ */
var watchMode = false;
var watchEngine = null;
var watchAnimId = null;

function toggleWatchMode() {
  watchMode = !watchMode;
  var btn = document.getElementById('btnWatch');
  if (btn) {
    btn.classList.toggle('active', watchMode);
    btn.textContent = watchMode ? 'Watch mode: ON' : 'Watch mode: OFF';
  }
  var note = document.getElementById('watchNote');
  if (note) note.style.display = watchMode ? '' : 'none';
  // Auto-set small particle count for watch mode
  if (watchMode) {
    var mp = document.getElementById('pMaxP');
    if (mp && +mp.value > 500) mp.value = 200;
  }
}

async function runGrow() {
  if (running) return;
  running = true; cancelled = false;
  var p = readParams();

  document.getElementById('btnGrow').disabled = true;
  document.getElementById('btnStop').disabled = false;
  if (document.getElementById('btnWatch')) document.getElementById('btnWatch').disabled = true;
  document.getElementById('growProgText').textContent = '0 / ' + p.maxParticles + ' particles';
  document.getElementById('growProgFill').style.width = '0%';

  var canvas = document.getElementById('dlaCanvas');
  canvas.width = 500; canvas.height = 500;

  if (!massChartInst) massChartInst = initMassChart('massChart');

  if (watchMode) {
    // Watch mode: show individual particle walks
    watchEngine = growDLAWatch(p.gridSize, p.maxParticles, p.stickProb, p.seedType, p.launchMul, p.killMul);
    currentDLA = watchEngine.dla;
    var stepsPerFrame = 20; // walker steps per animation frame
    var particlesStuck = 0;
    var particlesKilled = 0;

    function watchFrame() {
      if (cancelled || watchEngine.isDone()) {
        finishGrow(p, canvas);
        return;
      }
      // Advance walker by several steps per frame
      var result = watchEngine.stepWalker(stepsPerFrame);

      if (result === 'stuck') {
        particlesStuck++;
        particlesKilled = 0;
        var count = currentDLA.getCount();
        document.getElementById('growProgText').textContent = count + ' / ' + p.maxParticles + ' particles — watching';
        document.getElementById('growProgFill').style.width = (count / p.maxParticles * 100) + '%';
        document.getElementById('stCount').textContent = count;
        document.getElementById('stRadius').textContent = currentDLA.getMaxR().toFixed(1);
        document.getElementById('stStick').textContent = p.stickProb.toFixed(2);
        if (count % 50 === 0) {
          var dim = computeFractalDim(currentDLA.particles, currentDLA.cx, currentDLA.cy);
          document.getElementById('stFracD').textContent = dim.D.toFixed(3);
          updateMassChart(massChartInst, dim.data, dim.D);
        }
      } else if (result === 'killed') {
        particlesKilled++;
      } else if (result === 'done') {
        finishGrow(p, canvas);
        return;
      }

      // Redraw with walker visible
      drawDLAAggregate(canvas, currentDLA, watchEngine.getWalker());
      watchAnimId = requestAnimationFrame(watchFrame);
    }
    watchAnimId = requestAnimationFrame(watchFrame);
  } else {
    // Fast mode: original batch processing
    currentDLA = growDLA(p.gridSize, p.maxParticles, p.stickProb, p.seedType, p.launchMul, p.killMul);

    var batchSize = 50;
    var done = false;
    while (!done && !cancelled) {
      for (var i = 0; i < batchSize; i++) {
        if (!currentDLA.step()) { done = true; break; }
      }
      var count = currentDLA.getCount();
      document.getElementById('growProgText').textContent = count + ' / ' + p.maxParticles + ' particles';
      document.getElementById('growProgFill').style.width = (count / p.maxParticles * 100) + '%';
      document.getElementById('stCount').textContent = count;
      document.getElementById('stRadius').textContent = currentDLA.getMaxR().toFixed(1);
      document.getElementById('stStick').textContent = p.stickProb.toFixed(2);

      if (count % 200 === 0 || done) {
        drawDLAAggregate(canvas, currentDLA);
        var dim = computeFractalDim(currentDLA.particles, currentDLA.cx, currentDLA.cy);
        document.getElementById('stFracD').textContent = dim.D.toFixed(3);
        updateMassChart(massChartInst, dim.data, dim.D);
      }
      await new Promise(function(r) { setTimeout(r, 1); });
    }

    finishGrow(p, canvas);
  }
}

function finishGrow(p, canvas) {
  drawDLAAggregate(canvas, currentDLA);
  var finalDim = computeFractalDim(currentDLA.particles, currentDLA.cx, currentDLA.cy);
  document.getElementById('stFracD').textContent = finalDim.D.toFixed(3);
  updateMassChart(massChartInst, finalDim.data, finalDim.D);

  document.getElementById('growProgText').textContent = cancelled ? 'Stopped' : 'Complete';
  document.getElementById('growProgFill').style.width = '100%';
  document.getElementById('btnGrow').disabled = false;
  document.getElementById('btnStop').disabled = true;
  if (document.getElementById('btnWatch')) document.getElementById('btnWatch').disabled = false;
  running = false;
  watchEngine = null;
}

function stopGrow() {
  cancelled = true;
  if (watchAnimId) { cancelAnimationFrame(watchAnimId); watchAnimId = null; }
}

/* ══════════════════════════════════════════════
   MODE 2: STICKING SWEEP
   ══════════════════════════════════════════════ */
async function runSweep() {
  if (running) return;
  running = true; cancelled = false;

  var minS = +document.getElementById('swMin').value;
  var maxS = +document.getElementById('swMax').value;
  var steps = +document.getElementById('swSteps').value;
  var particles = +document.getElementById('swParticles').value;
  var p = readParams();

  document.getElementById('btnSweep').disabled = true;
  document.getElementById('btnSweepStop').disabled = false;

  if (!sweepChartInst) sweepChartInst = initSweepChart('swDimChart');

  var results = [];
  var tableBody = document.getElementById('swTableBody');
  tableBody.innerHTML = '';

  for (var s = 0; s < steps && !cancelled; s++) {
    var stick = steps === 1 ? minS : minS + (maxS - minS) * s / (steps - 1);
    document.getElementById('swProgText').textContent = 'Run ' + (s + 1) + ' / ' + steps + ' (p=' + stick.toFixed(2) + ')';
    document.getElementById('swProgFill').style.width = ((s + 1) / steps * 100) + '%';

    var dla = growDLA(p.gridSize, particles, stick, p.seedType, p.launchMul, p.killMul);
    var done = false;
    while (!done && !cancelled) {
      for (var i = 0; i < 100; i++) {
        if (!dla.step()) { done = true; break; }
      }
      await new Promise(function(r) { setTimeout(r, 0); });
    }

    if (!cancelled) {
      var dim = computeFractalDim(dla.particles, dla.cx, dla.cy);
      results.push({stick: stick, D: dim.D, count: dla.getCount()});
      updateSweepChart(sweepChartInst, results);
      tableBody.innerHTML += '<tr><td>' + stick.toFixed(3) + '</td><td>' + dim.D.toFixed(3) + '</td><td>' + dla.getCount() + '</td></tr>';
    }
  }

  document.getElementById('swProgText').textContent = cancelled ? 'Stopped' : 'Complete';
  document.getElementById('swProgFill').style.width = '100%';
  document.getElementById('btnSweep').disabled = false;
  document.getElementById('btnSweepStop').disabled = true;
  running = false;
}

function stopSweep() { cancelled = true; }

/* ══════════════════════════════════════════════
   MODE 3: SEED COMPARISON
   ══════════════════════════════════════════════ */
async function runSeedComp() {
  if (running) return;
  running = true; cancelled = false;

  var p = readParams();
  var seeds = ['point', 'line', 'circle'];

  document.getElementById('btnSeedComp').disabled = true;
  document.getElementById('btnSeedStop').disabled = false;

  if (!seedChartInst) seedChartInst = initSeedCompChart('scDimChart');

  var results = [];
  var canvas = document.getElementById('scAggCanvas');
  canvas.width = 500; canvas.height = 500;

  for (var s = 0; s < seeds.length && !cancelled; s++) {
    document.getElementById('scProgText').textContent = 'Growing ' + seeds[s] + ' seed (' + (s + 1) + '/3)';
    document.getElementById('scProgFill').style.width = ((s + 1) / 3 * 100) + '%';

    var dla = growDLA(p.gridSize, p.maxParticles, p.stickProb, seeds[s], p.launchMul, p.killMul);
    var done = false;
    while (!done && !cancelled) {
      for (var i = 0; i < 100; i++) {
        if (!dla.step()) { done = true; break; }
      }
      if (dla.getCount() % 500 === 0 || done) {
        drawDLAAggregate(canvas, dla);
      }
      await new Promise(function(r) { setTimeout(r, 0); });
    }

    if (!cancelled) {
      var dim = computeFractalDim(dla.particles, dla.cx, dla.cy);
      results.push({seed: seeds[s], D: dim.D, count: dla.getCount()});
      drawDLAAggregate(canvas, dla);
      updateSeedCompChart(seedChartInst, results);

      document.getElementById('scStat' + (s + 1)).textContent = dim.D.toFixed(3);
    }
  }

  document.getElementById('scProgText').textContent = cancelled ? 'Stopped' : 'Complete';
  document.getElementById('scProgFill').style.width = '100%';
  document.getElementById('btnSeedComp').disabled = false;
  document.getElementById('btnSeedStop').disabled = true;
  running = false;
}

function stopSeedComp() { cancelled = true; }

/* ══════════════════════════════════════════════
   MODE 4: KOCH SNOWFLAKE
   ══════════════════════════════════════════════ */
function updateKoch() {
  var iter = +document.getElementById('kochIter').value;
  var type = document.getElementById('kochType').value;
  document.getElementById('kochIterVal').textContent = iter;

  kochResult = generateKoch(iter, type);
  var canvas = document.getElementById('kochCanvas');
  canvas.width = 500; canvas.height = 500;
  drawKoch(canvas, kochResult);

  // Reset ruler data
  kochRulerData = [];
  document.getElementById('kochRulerVal').textContent = '--';
  document.getElementById('kochRulerCount').textContent = '--';
  document.getElementById('kochRulerLen').textContent = '--';
  document.getElementById('kochFracDim').textContent = '--';

  // Update perimeter table
  updateKochPerimTable(iter, type);
  if (!perimChartInst) perimChartInst = initPerimeterChart('perimChart');
  updatePerimeterChart(perimChartInst, iter, type);
}

function updateKochPerimTable(iter, type) {
  var body = document.getElementById('kochPerimBody');
  var html = '';
  for (var i = 0; i <= iter; i++) {
    var info = getKochPerimInfo(i, type);
    var isCur = i === iter;
    html += '<tr><td' + (isCur ? ' class="hi"' : '') + '>n=' + i + '</td>';
    html += '<td' + (isCur ? ' class="hi"' : '') + '>' + info.segs + '</td>';
    html += '<td>' + info.segLen.toFixed(2) + '</td>';
    html += '<td' + (isCur ? ' class="hi"' : '') + '>' + info.perim.toFixed(1) + '</td></tr>';
  }
  body.innerHTML = html;
}

function measureKochRuler(idx) {
  if (!kochResult || !kochResult.points) return;
  var type = document.getElementById('kochType').value;
  var sizes = getKochRulerSizes(type);
  var rs = sizes[idx];
  document.getElementById('kochRulerVal').textContent = rs.toFixed(1);

  var pts;
  if (kochResult.type === 'sierpinski' && kochResult.triangles) {
    pts = [];
    for (var t = 0; t < kochResult.triangles.length; t++) {
      var tri = kochResult.triangles[t];
      pts.push(tri[0], tri[1], tri[2], tri[0]);
    }
  } else {
    pts = kochResult.points;
  }

  var res = measureWithRuler(pts, rs);
  document.getElementById('kochRulerCount').textContent = res.count;
  document.getElementById('kochRulerLen').textContent = res.length.toFixed(1);

  // Redraw Koch + ruler overlay
  var canvas = document.getElementById('kochCanvas');
  drawKoch(canvas, kochResult);
  drawRulerOverlay(canvas, res.steps);

  // Update ruler data
  var existing = null;
  for (var i = 0; i < kochRulerData.length; i++) {
    if (kochRulerData[i].idx === idx) { existing = kochRulerData[i]; break; }
  }
  if (!existing) kochRulerData.push({idx: idx, size: rs, count: res.count, length: res.length});
  else { existing.size = rs; existing.count = res.count; existing.length = res.length; }
  kochRulerData.sort(function(a, b) { return b.size - a.size; });

  // Compute fractal dimension
  if (kochRulerData.length >= 2) {
    var dimResult = computeKochFractalDim(kochRulerData);
    document.getElementById('kochFracDim').textContent = dimResult.D.toFixed(4);
    if (!rulerChartInst) rulerChartInst = initRulerChart('rulerChart');
    updateRulerChart(rulerChartInst, kochRulerData);
  } else {
    document.getElementById('kochFracDim').textContent = 'need 2+ ruler sizes';
  }
}

function runKochMC() {
  if (!kochResult) return;
  var numPts = +document.getElementById('kochMCPoints').value;
  var type = document.getElementById('kochType').value;
  var iter = +document.getElementById('kochIter').value;

  var result = monteCarloArea(kochResult, numPts);
  var theoArea = getTheoreticalArea(type, iter);

  document.getElementById('kochMCInside').textContent = result.inside + ' / ' + result.total;
  document.getElementById('kochMCArea').textContent = result.estimated.toFixed(1) + ' px\u00B2';
  document.getElementById('kochMCTheo').textContent = theoArea.toFixed(1) + ' px\u00B2';

  // Draw MC points on Koch canvas
  var canvas = document.getElementById('kochCanvas');
  drawKoch(canvas, kochResult);
  drawMonteCarloPoints(canvas, result.insidePts, result.outsidePts);

  if (!convChartInst) convChartInst = initConvergenceChart('mcAreaChart');
  updateConvergenceChart(convChartInst, result.convergence, theoArea);
}

/* ══════════════════════════════════════════════
   INVESTIGATION CARDS
   ══════════════════════════════════════════════ */
function runInvestigation(num) {
  switch (num) {
    case 1: // What is the fractal dimension of DLA?
      document.getElementById('pMaxP').value = 10000;
      document.getElementById('pStick').value = 1.0;
      document.getElementById('pSeed').value = 'point';
      setMode('grow');
      runGrow();
      break;
    case 2: // Does stickiness change the fractal?
      document.getElementById('swMin').value = 0.05;
      document.getElementById('swMax').value = 1.0;
      document.getElementById('swSteps').value = 8;
      document.getElementById('swParticles').value = 3000;
      setMode('sweep');
      runSweep();
      break;
    case 3: // How does the seed shape matter?
      setMode('seedcmp');
      runSeedComp();
      break;
    case 4: // Koch vs DLA
      setMode('koch');
      document.getElementById('kochIter').value = 4;
      document.getElementById('kochType').value = 'snowflake';
      updateKoch();
      // Auto-measure with several ruler sizes
      for (var i = 0; i < 6; i++) {
        measureKochRuler(i);
      }
      break;
    case 5: // Does particle count change D?
      document.getElementById('pStick').value = 1.0;
      document.getElementById('pSeed').value = 'point';
      document.getElementById('pMaxP').value = 1000;
      setMode('grow');
      runGrow();
      break;
    case 6: // Why is Koch dimension exactly log4/log3?
      setMode('koch');
      document.getElementById('kochIter').value = 5;
      document.getElementById('kochType').value = 'snowflake';
      updateKoch();
      for (var j = 0; j < 6; j++) {
        measureKochRuler(j);
      }
      break;
  }
}

/* ══════════════════════════════════════════════
   LOGBOOK
   ══════════════════════════════════════════════ */
function renderLogbook() {
  var el = document.getElementById('logbookEntries');
  if (logEntries.length === 0) {
    el.innerHTML = '<div class="logbook-empty">No entries yet. Record your observations and conclusions.</div>';
    return;
  }
  var html = '';
  for (var i = logEntries.length - 1; i >= 0; i--) {
    var e = logEntries[i];
    var tagClass = e.type === 'obs' ? 'obs' : (e.type === 'quest' ? 'quest' : 'conc');
    var tagLabel = e.type === 'obs' ? 'observation' : (e.type === 'quest' ? 'question' : 'conclusion');
    html += '<div class="log-entry">';
    html += '<div class="log-entry-hdr">';
    html += '<span class="log-type-tag ' + tagClass + '">' + tagLabel + '</span>';
    html += '<span class="log-entry-ts">' + (function(t){try{return new Date(t).toLocaleString()}catch(x){return t}})(e.ts) + '</span>';
    html += '<div class="log-entry-actions"><button onclick="deleteLog(' + i + ')" title="Delete">&times;</button></div>';
    html += '</div>';
    html += '<div class="log-entry-text">' + e.text + '</div>';
    if (e.ctx) html += '<div class="log-entry-ctx">' + e.ctx + '</div>';
    html += '</div>';
  }
  el.innerHTML = html;
}

function addLogEntry() {
  var type = document.getElementById('logType').value;
  var text = document.getElementById('logText').value.trim();
  if (!text) return;

  var ctx = '';
  if (currentMode === 'grow' && currentDLA) {
    ctx = 'Mode: Grow | Particles: ' + currentDLA.getCount() + ' | D: ' + document.getElementById('stFracD').textContent;
  } else if (currentMode === 'koch' && kochResult) {
    ctx = 'Mode: Koch | Type: ' + document.getElementById('kochType').value + ' | Iter: ' + document.getElementById('kochIter').value;
  } else {
    ctx = 'Mode: ' + currentMode;
  }

  logEntries.push({type: type, text: text, ts: new Date().toISOString(), ctx: ctx});
  document.getElementById('logText').value = '';
  renderLogbook();
  Store.set(EXP_ID, 'logbook', logEntries);
}

function deleteLog(idx) {
  logEntries.splice(idx, 1);
  renderLogbook();
  Store.set(EXP_ID, 'logbook', logEntries);
}

function exportLogbook() {
  if (logEntries.length === 0) return;
  var md = '# Fractal Growth Portal — Logbook\n\n';
  for (var i = 0; i < logEntries.length; i++) {
    var e = logEntries[i];
    md += '## ' + e.type.toUpperCase() + ' — ' + e.ts + '\n\n';
    md += e.text + '\n\n';
    if (e.ctx) md += '_Context: ' + e.ctx + '_\n\n';
    md += '---\n\n';
  }
  var blob = new Blob([md], {type: 'text/markdown'});
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'fractal-logbook.md';
  a.click();
}

/* ══════════════════════════════════════════════
   AI COACH
   ══════════════════════════════════════════════ */
function renderCoachThinking() {
  document.getElementById('coachQ').innerHTML =
    '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px;font-style:italic">Coach is thinking\u2026</span>';
}

function renderCoachAnswer(q) {
  var aiEl = document.getElementById('coachQ');
  aiEl.innerHTML = '<span style="font-style:italic"></span>';
  aiEl.firstChild.textContent = q;
  convHist.push({role: 'assistant', content: q});
  Store.set(EXP_ID, 'dialogue', convHist);
  var rs = document.getElementById('coachReplySec');
  if (rs) rs.style.display = 'block';
}

function appendCoachBubble(role, text) {
  var thr = document.getElementById('coachThread');
  if (!thr) return;
  var wrap = document.createElement('div');
  var lbl = document.createElement('div');
  wrap.className = role === 'coach' ? 'tcoach' : 'talex';
  lbl.className = role === 'coach' ? 'tcoach-lbl' : 'talex-lbl';
  lbl.textContent = role === 'coach' ? "coach's question" : 'alexey';
  wrap.appendChild(lbl);
  wrap.appendChild(document.createTextNode(text));
  thr.appendChild(wrap);
}

async function askCoach() {
  var interp = document.getElementById('coachInterp').value.trim();
  if (interp.length < 20) { document.getElementById('coachInterp').style.borderColor = 'var(--danger)'; return; }
  document.getElementById('coachInterp').style.borderColor = '';
  Store.set(EXP_ID, 'interpretation', interp);
  Store.set(EXP_ID, 'interpretation_at', new Date().toISOString());

  var context = 'Mode: ' + currentMode + '. ';
  if (currentMode === 'grow' && currentDLA) {
    context += 'Grew DLA with ' + currentDLA.getCount() + ' particles, sticking=' + readParams().stickProb + ', seed=' + readParams().seedType + '. Fractal dimension D=' + document.getElementById('stFracD').textContent + '.';
  } else if (currentMode === 'koch') {
    context += 'Koch type=' + document.getElementById('kochType').value + ', iteration=' + document.getElementById('kochIter').value + '. Fractal dimension=' + document.getElementById('kochFracDim').textContent + '.';
  }
  var userMsg = 'Experiment context: ' + context + '\n\nAlexey\'s interpretation: "' + interp + '"';

  document.getElementById('btnCoach').disabled = true;
  convHist = [{role: 'user', content: userMsg}];
  await Coach.ask({
    systemPrompt: COACH_PROMPT_INITIAL,
    messages: convHist,
    onThinking: renderCoachThinking,
    onAnswer: renderCoachAnswer,
    onFallback: function (sp, msgs) {
      Coach.openFallback(sp, msgs, function (pasted) { renderCoachAnswer(pasted); });
    }
  });
  document.getElementById('btnCoach').disabled = false;
}

async function sendCoachReply() {
  var reply = document.getElementById('coachReply').value.trim();
  if (reply.length < 3) return;
  var prevQ = document.getElementById('coachQ').innerText;
  appendCoachBubble('coach', prevQ);
  appendCoachBubble('alexey', reply);
  document.getElementById('coachReply').value = '';
  convHist.push({role: 'user', content: reply});
  renderCoachThinking();
  await Coach.ask({
    systemPrompt: COACH_PROMPT_FOLLOWUP,
    messages: convHist,
    onAnswer: renderCoachAnswer,
    onFallback: function (sp, msgs) {
      Coach.openFallback(sp, msgs, function (pasted) { renderCoachAnswer(pasted); });
    }
  });
}

/* ══════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
  setMode('grow');

  logEntries = Store.get(EXP_ID, 'logbook', []) || [];
  renderLogbook();

  convHist = Store.get(EXP_ID, 'dialogue', []) || [];
  if (convHist.length > 0) {
    for (var i = 0; i < convHist.length; i++) {
      var m = convHist[i];
      if (i === convHist.length - 1 && m.role === 'assistant') {
        var aiEl = document.getElementById('coachQ');
        if (aiEl) {
          aiEl.innerHTML = '<span style="font-style:italic"></span>';
          aiEl.firstChild.textContent = m.content;
        }
      } else if (i > 0) {
        appendCoachBubble(m.role === 'assistant' ? 'coach' : 'alexey', m.content);
      }
    }
    var rs = document.getElementById('coachReplySec');
    if (rs) rs.style.display = 'block';
  }

  var savedInterp = Store.get(EXP_ID, 'interpretation');
  var interpEl = document.getElementById('coachInterp');
  if (interpEl) {
    if (savedInterp) interpEl.value = savedInterp;
    interpEl.addEventListener('input', function () {
      Store.set(EXP_ID, 'interpretation', interpEl.value);
      Store.set(EXP_ID, 'interpretation_at', new Date().toISOString());
    });
  }

  if (window.Exporter) {
    Exporter.mountBanner('exportMount', {
      id: EXP_ID,
      title: 'How do fractals grow?',
      category: 'Fractal Mathematics',
      description: 'DLA with M(r) fractal-dimension regression, sticking-probability sweeps, seed-shape comparison, and Koch snowflakes with ruler measurement.',
      figureCanvasId: 'dlaCanvas'
    });
  }
});
