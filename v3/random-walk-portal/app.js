/* app.js — Random Walk Portal: orchestration, state, playback, coach, logbook */

// ── State ──
var dim = 2;
var stepType = 'uniform';
var walkers = [];
var curStep = 0;
var totalSteps = 500;
var rmsHist = [];
var batches = [];
var playing = false;
var done = false;
var locked = false;
var convHist = [];
var p5inst = null;
var rmsChartInst = null;
var histChartInst = null;
window._highlightIdx = -1;

// ── Theme ──
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('rw_theme', next);
}

// ── Hypothesis ──
function lockHyp() {
  var ta = document.getElementById('hypText');
  var t = ta.value.trim();
  if (t.length < 20) { ta.style.borderColor = 'var(--danger)'; return; }
  locked = true;
  ta.disabled = true;
  ta.style.borderColor = 'var(--accent)';
  ta.style.boxShadow = '0 0 0 2px var(--accent-subtle)';
  var ts = document.getElementById('hypTS');
  ts.style.display = 'block';
  ts.textContent = 'locked · ' + new Date().toLocaleString();
  var lb = document.getElementById('lockBtn');
  lb.textContent = '✓ Hypothesis locked';
  lb.disabled = true;
  document.getElementById('labHint').textContent = 'Set parameters and press Play';
  document.getElementById('btnPlay').disabled = false;
  document.getElementById('btnStep').disabled = false;
  localStorage.setItem('rw_hypothesis', t);
  localStorage.setItem('rw_timestamp', new Date().toISOString());
}

// ── Dimension & step type ──
function setDim(d) {
  dim = d;
  document.getElementById('btn1D').classList.toggle('active', d === 1);
  document.getElementById('btn2D').classList.toggle('active', d === 2);
  resetSim();
}

function setStepType(t) {
  stepType = t;
  document.getElementById('btnUni').classList.toggle('active', t === 'uniform');
  document.getElementById('btnGau').classList.toggle('active', t === 'gaussian');
  resetSim();
}

// ── Simulation control ──
function initSim() {
  var n = parseInt(document.getElementById('slW').value);
  totalSteps = parseInt(document.getElementById('slS').value);
  walkers = createWalkers(n, dim);
  curStep = 0;
  rmsHist = [];
  done = false;
  window._highlightIdx = -1;
  updateStats();
}

function doPlay() {
  if (!locked || done) return;
  playing = true;
  document.getElementById('btnPlay').textContent = 'Playing...';
  document.getElementById('btnPlay').disabled = true;
  document.getElementById('btnPause').disabled = false;
  document.getElementById('btnStep').disabled = true;
}

function doPause() {
  playing = false;
  document.getElementById('btnPlay').textContent = 'Play';
  document.getElementById('btnPlay').disabled = false;
  document.getElementById('btnPause').disabled = true;
  document.getElementById('btnStep').disabled = false;
}

function doStep() {
  if (!locked || done) return;
  advanceSim(1);
  refreshCharts();
}

function advanceSim(count) {
  for (var c = 0; c < count && curStep < totalSteps; c++) {
    curStep++;
    stepWalkersOnce(walkers, dim, stepType, curStep, totalSteps);
    rmsHist.push(calcRMS(walkers, dim));
  }
  updateStats();
  if (curStep >= totalSteps) {
    done = true;
    playing = false;
    document.getElementById('btnPlay').textContent = 'Play';
    document.getElementById('btnPlay').disabled = true;
    document.getElementById('btnPause').disabled = true;
    document.getElementById('btnStep').disabled = true;
    document.getElementById('btnBatch').disabled = false;
    onComplete();
  }
}

function resetSim() {
  playing = false;
  done = false;
  if (p5inst) { p5inst.remove(); p5inst = null; }
  if (rmsChartInst) { rmsChartInst.destroy(); rmsChartInst = null; }
  if (histChartInst) { histChartInst.destroy(); histChartInst = null; }
  initSim();
  createMainSketch();
  document.getElementById('btnPlay').disabled = !locked;
  document.getElementById('btnPlay').textContent = 'Play';
  document.getElementById('btnPause').disabled = true;
  document.getElementById('btnStep').disabled = !locked;
  document.getElementById('btnBatch').disabled = true;
  document.getElementById('stepRes').style.display = 'none';
}

function createMainSketch() {
  p5inst = createWalkSketch('simCanvas',
    function() { return walkers; },
    function() { return dim; },
    function() { return curStep; },
    function() { return totalSteps; },
    function(idx) { window._highlightIdx = window._highlightIdx === idx ? -1 : idx; }
  );
}

function updateStats() {
  document.getElementById('stStep').textContent = curStep + ' / ' + totalSteps;
  var rms = curStep > 0 ? calcRMS(walkers, dim) : 0;
  var theo = Math.sqrt(curStep) * STEP_SIZE;
  document.getElementById('stRMS').textContent = rms.toFixed(2);
  document.getElementById('stTheo').textContent = theo.toFixed(2);
  document.getElementById('stMax').textContent = (curStep > 0 ? calcMax(walkers, dim) : 0).toFixed(2);
  document.getElementById('stMean').textContent = (curStep > 0 ? calcMean(walkers, dim) : 0).toFixed(2);
  document.getElementById('stCount').textContent = walkers.length;
}

function refreshCharts() {
  if (!rmsChartInst) rmsChartInst = initRMSChart('rmsChart');
  updateRMSChart(rmsChartInst, rmsHist, batches);
  if (curStep > 0) {
    if (!histChartInst) histChartInst = initHistChart('histChart');
    updateHistChart(histChartInst, buildHistogram(walkers, dim));
  }
}

function onComplete() {
  refreshCharts();
  var rms = calcRMS(walkers, dim);
  var theo = Math.sqrt(totalSteps) * STEP_SIZE;
  var mx = calcMax(walkers, dim);
  var beyond = countBeyond(walkers, dim, 2 * rms);

  document.getElementById('rRMS').textContent = rms.toFixed(2);
  document.getElementById('rTheo').textContent = theo.toFixed(2);
  document.getElementById('rRatio').textContent = (rms / theo).toFixed(3);
  document.getElementById('rMaxD').textContent = mx.toFixed(2);
  document.getElementById('rOut').textContent = beyond + ' / ' + walkers.length;

  var q = Math.floor(totalSteps / 4);
  if (q > 0 && rmsHist.length >= totalSteps) {
    var rmsQ = rmsHist[q - 1], rmsF = rmsHist[totalSteps - 1];
    document.getElementById('rSqrt').textContent = (rmsF / rmsQ).toFixed(2) + 'x';
  }

  document.getElementById('stepRes').style.display = '';
  localStorage.setItem('rw_results', JSON.stringify({ rms: rms, theo: theo, ratio: rms / theo, max: mx, beyond: beyond, walkers: walkers.length, steps: totalSteps, dim: dim }));
  document.getElementById('stepRes').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Batch ──
function saveBatch() {
  if (batches.length >= 4) return;
  batches.push({ label: dim + 'D ' + walkers.length + 'w ' + totalSteps + 's', data: rmsHist.slice() });
  refreshCharts();
}

function clearBatches() {
  batches = [];
  refreshCharts();
}

// ── AI Coach ──
async function askCoach() {
  var interp = document.getElementById('interpText').value.trim();
  if (interp.length < 20) { document.getElementById('interpText').style.borderColor = 'var(--danger)'; return; }
  var hyp = document.getElementById('hypText').value;

  var dataStr = 'Dimension: ' + dim + 'D\n';
  dataStr += 'Walkers: ' + walkers.length + '\n';
  dataStr += 'Steps: ' + totalSteps + '\n';
  dataStr += 'Step type: ' + stepType + '\n';
  if (rmsHist.length > 0) {
    var rms = rmsHist[rmsHist.length - 1];
    var theo = Math.sqrt(totalSteps) * STEP_SIZE;
    dataStr += 'Final RMS: ' + rms.toFixed(2) + '\n';
    dataStr += 'Theoretical √N: ' + theo.toFixed(2) + '\n';
    dataStr += 'Ratio: ' + (rms / theo).toFixed(3) + '\n';
  }
  if (batches.length > 0) {
    dataStr += 'Saved batches: ' + batches.map(function(b) { return b.label; }).join(', ') + '\n';
  }

  var userMsg = 'Alexey\'s hypothesis: "' + hyp + '"\n\nSimulation data:\n' + dataStr + '\nAlexey\'s interpretation: "' + interp + '"';

  var aiEl = document.getElementById('aiQ');
  aiEl.innerHTML = '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px;font-style:italic">Coach is thinking...</span>';
  document.getElementById('askBtn').disabled = true;
  convHist = [{ role: 'user', content: userMsg }];

  try {
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        system: 'You are COACH — a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore who is building a computational science portfolio. Alexey has been simulating random walks in 1D and 2D, measuring how distance from origin scales with step count, comparing uniform and Gaussian step distributions, and testing whether the √N law holds across different conditions. Your rules: Ask EXACTLY ONE question per response. Never give Alexey the answer. Never explain the science to him — make him work it out. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.',
        messages: convHist
      })
    });
    var d = await r.json();
    var q = d.content[0].text;
    aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
    convHist.push({ role: 'assistant', content: q });
    localStorage.setItem('rw_dialogue', JSON.stringify(convHist));
    document.getElementById('replySec').style.display = 'block';
  } catch (e) {
    aiEl.innerHTML = '<span style="color:var(--danger);font-size:12px">Coach unavailable. Write your own follow-up question.</span>';
  }
  document.getElementById('askBtn').disabled = false;
}

async function sendReply() {
  var reply = document.getElementById('replyText').value.trim();
  if (reply.length < 3) return;
  var prevQ = document.getElementById('aiQ').innerText;
  var thr = document.getElementById('thread');
  thr.innerHTML += '<div class="tcoach"><div class="tcoach-lbl">coach\'s question</div>' + prevQ + '</div><div class="talex"><div class="talex-lbl">alexey</div>' + reply + '</div>';
  document.getElementById('replyText').value = '';
  convHist.push({ role: 'user', content: reply });
  var aiEl = document.getElementById('aiQ');
  aiEl.innerHTML = '<span class="pulse"></span><span style="color:var(--text-tertiary);font-size:12px;font-style:italic">Coach is thinking...</span>';
  try {
    var r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514', max_tokens: 1000,
        system: 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his random walk experiment. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',
        messages: convHist
      })
    });
    var d = await r.json();
    var q = d.content[0].text;
    aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
    convHist.push({ role: 'assistant', content: q });
    localStorage.setItem('rw_dialogue', JSON.stringify(convHist));
  } catch (e) {
    aiEl.innerHTML = '<span style="color:var(--danger);font-size:12px">Connection issue — try again.</span>';
  }
}

// ── Logbook ──
function getLogEntries() {
  try { return JSON.parse(localStorage.getItem('rw_logbook') || '[]'); }
  catch (e) { return []; }
}

function saveLogEntries(entries) {
  localStorage.setItem('rw_logbook', JSON.stringify(entries));
}

function renderLogbook() {
  var entries = getLogEntries();
  var el = document.getElementById('logEntries');
  if (!el) return;
  if (entries.length === 0) { el.innerHTML = '<div class="logbook-empty">No entries yet. Record your observations, questions, and conclusions as you explore.</div>'; return; }
  var html = '';
  for (var i = entries.length - 1; i >= 0; i--) {
    var e = entries[i];
    var typeClass = e.type === 'observation' ? 'obs' : e.type === 'question' ? 'quest' : 'conc';
    html += '<div class="log-entry"><div class="log-entry-hdr"><span class="log-type-tag ' + typeClass + '">' + e.type + '</span><span class="log-entry-ts">' + new Date(e.ts).toLocaleString() + '</span><span class="log-entry-actions"><button onclick="deleteLogEntry(' + i + ')">×</button></span></div><div class="log-entry-text">' + e.text + '</div>' + (e.ctx ? '<div class="log-entry-ctx">' + e.ctx + '</div>' : '') + '</div>';
  }
  el.innerHTML = html;
}

function addLogEntry() {
  var type = document.getElementById('logType').value;
  var text = document.getElementById('logText').value.trim();
  if (!text) return;
  var entries = getLogEntries();
  var ctx = dim + 'D · ' + walkers.length + ' walkers · ' + totalSteps + ' steps · ' + stepType;
  if (rmsHist.length > 0) ctx += ' · RMS=' + rmsHist[rmsHist.length - 1].toFixed(2);
  entries.push({ type: type, text: text, ts: new Date().toISOString(), ctx: ctx });
  saveLogEntries(entries);
  document.getElementById('logText').value = '';
  renderLogbook();
}

function deleteLogEntry(idx) {
  var entries = getLogEntries();
  entries.splice(idx, 1);
  saveLogEntries(entries);
  renderLogbook();
}

function exportLogbook() {
  var entries = getLogEntries();
  if (entries.length === 0) return;
  var md = '# Random Walk Portal — Logbook\n\nExported: ' + new Date().toLocaleString() + '\n\n';
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    md += '## ' + e.type.toUpperCase() + ' — ' + new Date(e.ts).toLocaleString() + '\n\n';
    md += e.text + '\n\n';
    if (e.ctx) md += '*Context: ' + e.ctx + '*\n\n';
    md += '---\n\n';
  }
  var blob = new Blob([md], { type: 'text/markdown' });
  var a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'random-walk-logbook-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click();
}

// ── p5 draw loop integration ──
function setupDrawLoop() {
  // Override the p5 draw to advance simulation when playing
  var origDraw = null;
  setInterval(function() {
    if (playing && !done) {
      var spd = parseInt(document.getElementById('slSp').value);
      advanceSim(spd);
      if (curStep % 10 === 0 || done) refreshCharts();
    }
  }, 1000 / 30); // 30fps
}

// ── Init ──
document.addEventListener('DOMContentLoaded', function() {
  var saved = localStorage.getItem('rw_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  var savedHyp = localStorage.getItem('rw_hypothesis');
  if (savedHyp) {
    document.getElementById('hypText').value = savedHyp;
    lockHyp();
  }

  initSim();
  createMainSketch();
  renderLogbook();
  setupDrawLoop();
});
