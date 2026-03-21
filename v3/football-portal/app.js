/* app.js — Football Portal orchestration, state, event handlers, AI coach, logbook */

// ── State ──
var currentMode = 'shots';
var currentModel = 'geometric';
var currentShotType = 'open';
var shots = [];
var teamAShots = [];
var teamBShots = [];
var hx = null, hy = null;
var locked = false;
var convHist = [];
var selectedLeagues = new Set();
var mcChartInst = null;
var timelineInst = null;
var overPerfInst = null;
var shotZoneInst = null;
var leagueMatchInst = null;

// ── Theme ──
function toggleTheme() {
  var html = document.documentElement;
  var current = html.getAttribute('data-theme');
  var next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  localStorage.setItem('football_theme', next);
}

// ── Mode switching ──
function setMode(mode) {
  currentMode = mode;
  var sections = document.querySelectorAll('.mode-section');
  for (var i = 0; i < sections.length; i++) {
    sections[i].classList.toggle('active', sections[i].id === 'mode-' + mode);
  }
  var tabs = document.querySelectorAll('.mode-tabs button');
  for (var j = 0; j < tabs.length; j++) {
    tabs[j].classList.toggle('active', tabs[j].getAttribute('data-mode') === mode);
  }
  // Draw heatmaps on first visit
  if (mode === 'heatmap') drawHeatmaps();
  // Init league UI on first visit
  if (mode === 'league' && selectedLeagues.size === 0) {
    toggleLeague('Premier League');
  }
}

// ── Model & shot type ──
function setModel(m) {
  currentModel = m;
  var btns = document.querySelectorAll('.model-toggle button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].getAttribute('data-model') === m);
  }
  redrawMain();
}

function setShotType(t) {
  currentShotType = t;
  var btns = document.querySelectorAll('.shot-type-sel button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].getAttribute('data-type') === t);
  }
}

// ── Hypothesis lock ──
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
  document.getElementById('labHint').textContent = 'Click on the pitch to place shots';
  localStorage.setItem('football_hypothesis', t);
  localStorage.setItem('football_timestamp', new Date().toISOString());
  redrawMain();
}

// ── Main pitch interaction ──
function redrawMain() {
  var cvs = document.getElementById('pitch');
  if (!cvs) return;
  var ctx = cvs.getContext('2d');
  drawPitch(ctx);
  drawShots(ctx, shots);
  if (hx !== null && locked) {
    var r = calcXG(hx, hy, currentModel, currentShotType);
    drawCursorRing(ctx, hx, hy, r.xg);
  }
}

function initMainPitch() {
  var cvs = document.getElementById('pitch');
  if (!cvs) return;

  cvs.addEventListener('mousemove', function(e) {
    if (!locked) return;
    var rect = cvs.getBoundingClientRect();
    var scX = cvs.width / rect.width, scY = cvs.height / rect.height;
    hx = (e.clientX - rect.left) * scX;
    hy = (e.clientY - rect.top) * scY;
    var r = calcXG(hx, hy, currentModel, currentShotType);
    document.getElementById('hXG').textContent = r.xg > 0 ? r.xg.toFixed(3) : '—';
    document.getElementById('hXG').style.color = r.xg > 0 ? xgCol(r.xg) : 'var(--accent-light)';
    document.getElementById('hAng').textContent = r.xg > 0 ? r.a.toFixed(1) + '°' : '—';
    document.getElementById('hDist').textContent = r.xg > 0 ? r.d.toFixed(1) + 'm' : '—';
    redrawMain();
  });

  cvs.addEventListener('mouseleave', function() {
    hx = null; hy = null;
    document.getElementById('hXG').textContent = '—';
    document.getElementById('hXG').style.color = 'var(--accent-light)';
    document.getElementById('hAng').textContent = '—';
    document.getElementById('hDist').textContent = '—';
    redrawMain();
  });

  cvs.addEventListener('click', function(e) {
    if (!locked) return;
    var rect = cvs.getBoundingClientRect();
    var scX = cvs.width / rect.width, scY = cvs.height / rect.height;
    var x = (e.clientX - rect.left) * scX, y = (e.clientY - rect.top) * scY;
    var r = calcXG(x, y, currentModel, currentShotType);
    if (r.xg === 0) return;
    shots.push({ x: x, y: y, xg: r.xg, d: r.d, a: r.a, type: currentShotType, model: currentModel });
    updateShotLog();
    redrawMain();
    document.getElementById('simBtn').disabled = false;
    localStorage.setItem('football_shots', JSON.stringify(shots));
  });
}

function updateShotLog() {
  var tot = 0;
  for (var i = 0; i < shots.length; i++) tot += shots[i].xg;
  document.getElementById('totXG').textContent = shots.length + ' shot' + (shots.length !== 1 ? 's' : '') + ' · ' + tot.toFixed(3);
  var log = document.getElementById('shotLog');
  if (shots.length === 0) {
    log.innerHTML = '<div class="sli" style="color:var(--text-tertiary)">no shots placed yet</div>';
    return;
  }
  var html = '';
  for (var j = 0; j < shots.length; j++) {
    var s = shots[j];
    var typeTag = s.type !== 'open' ? ' [' + s.type.toUpperCase() + ']' : '';
    html += '<div class="sli"><span>#' + (j + 1) + ' · ' + s.d.toFixed(1) + 'm · ' + s.a.toFixed(0) + '°' + typeTag + '</span><span style="color:' + xgCol(s.xg) + ';font-weight:500">' + s.xg.toFixed(3) + '</span></div>';
  }
  log.innerHTML = html;
}

function clearShots() {
  shots = [];
  updateShotLog();
  redrawMain();
  document.getElementById('simBtn').disabled = true;
  document.getElementById('stepRes').style.display = 'none';
  localStorage.removeItem('football_shots');
}

// ── Monte Carlo simulation ──
function runMC() {
  if (shots.length === 0) return;
  var result = runMonteCarlo(shots, 500);

  // Poisson overlay
  var poissonData = [];
  for (var k = 0; k < result.counts.length; k++) {
    poissonData.push(Math.round(poissonPMF(k, result.totalXG) * 500));
  }

  // Init or reuse chart
  if (!mcChartInst) mcChartInst = initMCChart('mcChart');
  updateMCChart(mcChartInst, result.counts, poissonData, 500);

  // Timeline
  var timeline = buildShotTimeline(shots);
  if (!timelineInst) timelineInst = initTimelineChart('timelineChart');
  updateTimelineChart(timelineInst, timeline);

  // Summary stats
  document.getElementById('rXG').textContent = result.totalXG.toFixed(3);
  document.getElementById('rAvg').textContent = result.avg.toFixed(2);
  document.getElementById('rMax').textContent = result.max;
  document.getElementById('rP0').textContent = (result.p0 * 100).toFixed(1) + '%';
  document.getElementById('rP2').textContent = (result.p2plus * 100).toFixed(1) + '%';

  // League context
  buildLeagueContext(result.totalXG, result.avg, shots.length);

  // Show results
  document.getElementById('stepRes').style.display = '';
  document.getElementById('stepRes').scrollIntoView({ behavior: 'smooth', block: 'start' });

  localStorage.setItem('football_results', JSON.stringify({
    xg: result.totalXG, avg: result.avg, max: result.max,
    p0: result.p0, p2: result.p2plus
  }));
}

function buildLeagueContext(totalXG, avgGoals, numShots) {
  var xgPerShot = numShots > 0 ? totalXG / numShots : 0;
  var ctx = document.getElementById('leagueContext');
  if (!ctx) return;
  var html = '<div class="sl" style="margin-bottom:8px">YOUR SHOTS vs LEAGUE AVERAGES</div>';
  var leagues = Object.keys(LEAGUE_DATA);
  html += '<table class="compare-table"><thead><tr><th>League</th><th>Avg xG/shot</th><th>Your xG/shot</th><th>Diff</th></tr></thead><tbody>';
  for (var i = 0; i < leagues.length; i++) {
    var lg = LEAGUE_DATA[leagues[i]];
    var diff = xgPerShot - lg.avgXGPerShot;
    var diffClass = diff >= 0 ? 'overperf' : 'underperf';
    html += '<tr><td style="color:' + lg.color + '">' + leagues[i] + '</td><td>' + lg.avgXGPerShot.toFixed(3) + '</td><td>' + xgPerShot.toFixed(3) + '</td><td class="' + diffClass + '">' + (diff >= 0 ? '+' : '') + diff.toFixed(3) + '</td></tr>';
  }
  html += '</tbody></table>';
  ctx.innerHTML = html;
}

// ── League data mode ──
function toggleLeague(name) {
  if (selectedLeagues.has(name)) selectedLeagues.delete(name);
  else selectedLeagues.add(name);
  // Update button states
  var btns = document.querySelectorAll('.league-toggles button');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('sel', selectedLeagues.has(btns[i].getAttribute('data-league')));
  }
  updateLeagueViews();
}

function updateLeagueViews() {
  buildCompareTable();
  buildOverPerfScatter();
  buildShotZones();
  buildTeamsTable();
}

function buildCompareTable() {
  var el = document.getElementById('leagueCompare');
  if (!el) return;
  if (selectedLeagues.size === 0) { el.innerHTML = '<div class="logbook-empty">Select a league above</div>'; return; }
  var html = '<table class="compare-table"><thead><tr><th>League</th><th>Goals/Match</th><th>xG/Match</th><th>Shots/Match</th><th>Conv %</th><th>xG/Shot</th></tr></thead><tbody>';
  selectedLeagues.forEach(function(name) {
    var lg = LEAGUE_DATA[name];
    if (!lg) return;
    html += '<tr><td style="color:' + lg.color + '">' + name + '</td><td>' + lg.avgGoalsPerMatch.toFixed(2) + '</td><td>' + lg.avgXGPerMatch.toFixed(2) + '</td><td>' + lg.avgShotsPerMatch.toFixed(1) + '</td><td>' + lg.conversionRate.toFixed(1) + '%</td><td>' + lg.avgXGPerShot.toFixed(3) + '</td></tr>';
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function buildOverPerfScatter() {
  if (!overPerfInst) overPerfInst = initOverPerfChart('overPerfChart');
  if (!overPerfInst) return;
  var datasets = [];
  // Diagonal line
  datasets.push({
    label: 'xG = Goals', data: [{ x: 20, y: 20 }, { x: 95, y: 95 }],
    type: 'line', borderColor: 'rgba(128,128,128,0.3)', borderWidth: 1,
    borderDash: [4, 4], pointRadius: 0, fill: false
  });
  selectedLeagues.forEach(function(name) {
    var lg = LEAGUE_DATA[name];
    if (!lg) return;
    var pts = [];
    for (var i = 0; i < lg.teams.length; i++) {
      var t = lg.teams[i];
      pts.push({ x: t.xGFor, y: t.goalsFor, label: t.name });
    }
    datasets.push({
      label: name, data: pts,
      backgroundColor: lg.color + 'cc', borderColor: lg.color,
      borderWidth: 1, pointRadius: 5, pointHoverRadius: 7
    });
  });
  updateOverPerfChart(overPerfInst, datasets);
}

function buildShotZones() {
  if (!shotZoneInst) shotZoneInst = initShotZoneChart('shotZoneChart');
  if (!shotZoneInst) return;
  var zones = ['Inside 6-yard box', '6yd to penalty spot', 'Penalty area (wide)', 'Edge of box (18-24m)', 'Long range (24m+)'];
  var datasets = [];
  var colors = [];
  selectedLeagues.forEach(function(name) {
    var lg = LEAGUE_DATA[name];
    if (!lg) return;
    colors.push(lg.color);
    var data = [];
    for (var i = 0; i < zones.length; i++) {
      var found = false;
      for (var j = 0; j < lg.shotDistribution.length; j++) {
        if (lg.shotDistribution[j].zone === zones[i]) { data.push(lg.shotDistribution[j].pct); found = true; break; }
      }
      if (!found) data.push(0);
    }
    datasets.push({
      label: name, data: data,
      backgroundColor: lg.color + '99', borderColor: lg.color,
      borderWidth: 1, borderRadius: 2
    });
  });
  shotZoneInst.data.labels = zones.map(function(z) { return z.length > 18 ? z.substring(0, 16) + '…' : z; });
  shotZoneInst.data.datasets = datasets;
  shotZoneInst.update();
}

function buildTeamsTable() {
  var el = document.getElementById('teamsTable');
  if (!el) return;
  if (selectedLeagues.size === 0) { el.innerHTML = ''; return; }
  var html = '<table class="compare-table"><thead><tr><th>Team</th><th>League</th><th>xG For</th><th>Goals</th><th>Diff</th><th>xG Against</th><th>GA</th></tr></thead><tbody>';
  selectedLeagues.forEach(function(name) {
    var lg = LEAGUE_DATA[name];
    if (!lg) return;
    for (var i = 0; i < lg.teams.length; i++) {
      var t = lg.teams[i];
      var diff = t.goalsFor - t.xGFor;
      var cls = diff >= 0 ? 'overperf' : 'underperf';
      html += '<tr class="team-row" onclick="showTeamDetail(\'' + name.replace(/'/g, "\\'") + '\',' + i + ')"><td>' + t.name + '</td><td style="color:' + lg.color + '">' + name + '</td><td>' + t.xGFor.toFixed(1) + '</td><td>' + t.goalsFor + '</td><td class="' + cls + '">' + (diff >= 0 ? '+' : '') + diff.toFixed(1) + '</td><td>' + t.xGAgainst.toFixed(1) + '</td><td>' + t.goalsAgainst + '</td></tr>';
    }
  });
  html += '</tbody></table>';
  el.innerHTML = html;
}

function showTeamDetail(leagueName, idx) {
  var lg = LEAGUE_DATA[leagueName];
  if (!lg) return;
  var t = lg.teams[idx];
  var el = document.getElementById('teamDetail');
  if (!el) return;
  var offDiff = t.goalsFor - t.xGFor;
  var defDiff = t.goalsAgainst - t.xGAgainst;
  var convRate = t.shotsOnTarget > 0 ? (t.goalsFor / t.shots * 100).toFixed(1) : '—';
  var sotPct = t.shots > 0 ? (t.shotsOnTarget / t.shots * 100).toFixed(1) : '—';
  el.style.display = 'block';
  el.innerHTML = '<h4>' + t.name + ' <span style="color:' + lg.color + ';font-size:10px">' + leagueName + '</span></h4>' +
    '<div class="team-stats-grid">' +
    '<div class="team-stat"><div class="sl">xG For</div><div class="sv">' + t.xGFor.toFixed(1) + '</div></div>' +
    '<div class="team-stat"><div class="sl">Goals</div><div class="sv">' + t.goalsFor + '</div></div>' +
    '<div class="team-stat"><div class="sl">Over/Under</div><div class="sv ' + (offDiff >= 0 ? 'overperf' : 'underperf') + '">' + (offDiff >= 0 ? '+' : '') + offDiff.toFixed(1) + '</div></div>' +
    '<div class="team-stat"><div class="sl">Shots</div><div class="sv">' + t.shots + '</div></div>' +
    '<div class="team-stat"><div class="sl">SOT %</div><div class="sv">' + sotPct + '%</div></div>' +
    '<div class="team-stat"><div class="sl">Conv %</div><div class="sv">' + convRate + '%</div></div>' +
    '</div>' +
    '<div class="model-note" style="margin-top:12px">Defensive xG: ' + t.xGAgainst.toFixed(1) + ' vs ' + t.goalsAgainst + ' conceded (' + (defDiff >= 0 ? '+' : '') + defDiff.toFixed(1) + '). ' + (defDiff < 0 ? 'This team concedes fewer goals than expected — strong defensive overperformance.' : 'Conceding more than expected — defensive underperformance.') + '</div>';
}

// ── Heatmaps ──
function drawHeatmaps() {
  var geo = document.getElementById('heatmapGeo');
  var log = document.getElementById('heatmapLog');
  if (geo) drawHeatmap(geo, 'geometric');
  if (log) drawHeatmap(log, 'logistic');
}

// ── Build Your Own League ──
var buildLeagueActive = null; // 'A' or 'B'

function initBuildLeague() {
  var pitchA = document.getElementById('pitchA');
  var pitchB = document.getElementById('pitchB');
  if (!pitchA || !pitchB) return;

  function setupTeamPitch(cvs, team) {
    var ctx = cvs.getContext('2d');
    drawPitch(ctx);

    cvs.addEventListener('mousemove', function(e) {
      if (!locked) return;
      var rect = cvs.getBoundingClientRect();
      var scX = cvs.width / rect.width, scY = cvs.height / rect.height;
      var mx = (e.clientX - rect.left) * scX, my = (e.clientY - rect.top) * scY;
      var r = calcXG(mx, my, currentModel, 'open');
      var idPre = team === 'A' ? 'ta' : 'tb';
      document.getElementById(idPre + 'XG').textContent = r.xg > 0 ? r.xg.toFixed(3) : '—';
      drawPitch(ctx);
      drawShots(ctx, team === 'A' ? teamAShots : teamBShots);
      if (r.xg > 0) drawCursorRing(ctx, mx, my, r.xg);
    });

    cvs.addEventListener('mouseleave', function() {
      var idPre = team === 'A' ? 'ta' : 'tb';
      document.getElementById(idPre + 'XG').textContent = '—';
      var ctx2 = cvs.getContext('2d');
      drawPitch(ctx2);
      drawShots(ctx2, team === 'A' ? teamAShots : teamBShots);
    });

    cvs.addEventListener('click', function(e) {
      if (!locked) return;
      var rect = cvs.getBoundingClientRect();
      var scX = cvs.width / rect.width, scY = cvs.height / rect.height;
      var x = (e.clientX - rect.left) * scX, y = (e.clientY - rect.top) * scY;
      var r = calcXG(x, y, currentModel, 'open');
      if (r.xg === 0) return;
      var arr = team === 'A' ? teamAShots : teamBShots;
      arr.push({ x: x, y: y, xg: r.xg, d: r.d, a: r.a, type: 'open', model: currentModel });
      updateTeamLog(team);
      var ctx2 = cvs.getContext('2d');
      drawPitch(ctx2);
      drawShots(ctx2, arr);
      document.getElementById('leagueSimBtn').disabled = (teamAShots.length === 0 || teamBShots.length === 0);
    });
  }

  setupTeamPitch(pitchA, 'A');
  setupTeamPitch(pitchB, 'B');
}

function updateTeamLog(team) {
  var arr = team === 'A' ? teamAShots : teamBShots;
  var idPre = team === 'A' ? 'ta' : 'tb';
  var tot = 0;
  for (var i = 0; i < arr.length; i++) tot += arr[i].xg;
  document.getElementById(idPre + 'Tot').textContent = arr.length + ' shots · ' + tot.toFixed(3) + ' xG';
  var log = document.getElementById(idPre + 'Log');
  if (arr.length === 0) {
    log.innerHTML = '<div class="sli" style="color:var(--text-tertiary)">no shots yet</div>';
    return;
  }
  var html = '';
  for (var j = 0; j < arr.length; j++) {
    html += '<div class="sli"><span>#' + (j + 1) + ' · ' + arr[j].d.toFixed(1) + 'm</span><span style="color:' + xgCol(arr[j].xg) + ';font-weight:500">' + arr[j].xg.toFixed(3) + '</span></div>';
  }
  log.innerHTML = html;
}

function clearTeamShots(team) {
  if (team === 'A') teamAShots = [];
  else teamBShots = [];
  updateTeamLog(team);
  var cvs = document.getElementById(team === 'A' ? 'pitchA' : 'pitchB');
  if (cvs) { var ctx = cvs.getContext('2d'); drawPitch(ctx); }
  document.getElementById('leagueSimBtn').disabled = (teamAShots.length === 0 || teamBShots.length === 0);
}

function runLeagueSim() {
  if (teamAShots.length === 0 || teamBShots.length === 0) return;
  var result = simulateLeague(teamAShots, teamBShots, 1000);

  // Results bar
  var total = result.totalMatches;
  var aPct = (result.teamAWins / total * 100).toFixed(1);
  var dPct = (result.draws / total * 100).toFixed(1);
  var bPct = (result.teamBWins / total * 100).toFixed(1);

  document.getElementById('lrAWins').textContent = aPct + '%';
  document.getElementById('lrDraws').textContent = dPct + '%';
  document.getElementById('lrBWins').textContent = bPct + '%';
  document.getElementById('lrAAvg').textContent = result.teamAAvg.toFixed(2);
  document.getElementById('lrBAvg').textContent = result.teamBAvg.toFixed(2);

  var bar = document.getElementById('leagueBar');
  if (bar) {
    bar.innerHTML = '<div class="seg-a" style="width:' + aPct + '%">' + aPct + '%</div>' +
      '<div class="seg-d" style="width:' + dPct + '%">' + dPct + '%</div>' +
      '<div class="seg-b" style="width:' + bPct + '%">' + bPct + '%</div>';
  }

  // Chart
  if (!leagueMatchInst) leagueMatchInst = initLeagueMatchChart('leagueMatchChart');
  updateLeagueMatchChart(leagueMatchInst, result.teamAGoalDist, result.teamBGoalDist);

  document.getElementById('leagueResults').style.display = 'block';
  document.getElementById('leagueResults').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── AI Coach ──
async function askCoach() {
  var interp = document.getElementById('interpText').value.trim();
  if (interp.length < 20) { document.getElementById('interpText').style.borderColor = 'var(--danger)'; return; }
  var hyp = document.getElementById('hypText').value;
  var tot = 0;
  for (var i = 0; i < shots.length; i++) tot += shots[i].xg;
  var sd = '';
  if (shots.length > 0) {
    for (var j = 0; j < shots.length; j++) {
      sd += 'Shot ' + (j + 1) + ': ' + shots[j].d.toFixed(1) + 'm, angle ' + shots[j].a.toFixed(0) + '°, xG=' + shots[j].xg.toFixed(3) + ' (' + shots[j].type + ', ' + shots[j].model + ')\n';
    }
  } else { sd = 'No shots placed.\n'; }
  var userMsg = 'Alexey\'s hypothesis: "' + hyp + '"\n\nShot data:\n' + sd + 'Total xG: ' + tot.toFixed(3) + '\nModel used: ' + currentModel + '\n\nAlexey\'s interpretation: "' + interp + '"';

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
        system: 'You are COACH — a Socratic science mentor for Alexey Mikhail Johll, a 14-year-old in Singapore who is building a computational science portfolio. Alexey has just run a computational xG (Expected Goals) model for football. He placed shots on a pitch, calculated geometric and logistic regression probabilities, compared models, explored real league data, and ran Monte Carlo simulations to see the distribution of possible match outcomes. He also has access to a Build Your Own League mode where he can pit two custom shot profiles against each other. Your rules: Ask EXACTLY ONE question per response. Never give Alexey the answer. Never explain the science to him — make him work it out. Reference his specific data and his own words back to him. Accessible language for a bright, curious 14-year-old. No effusive praise. No filler. Just one sharp question. End every response with a question mark.',
        messages: convHist
      })
    });
    var d = await r.json();
    var q = d.content[0].text;
    aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
    convHist.push({ role: 'assistant', content: q });
    localStorage.setItem('football_dialogue', JSON.stringify(convHist));
    document.getElementById('replySec').style.display = 'block';
  } catch (e) {
    aiEl.innerHTML = '<span style="color:var(--danger);font-size:12px">Coach unavailable. Write your own follow-up question to push your thinking further.</span>';
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
        system: 'You are COACH in a continuing Socratic dialogue with Alexey, 14, about his football xG experiment. Ask exactly one follow-up question. No preamble. No praise. Reference his answer. End with a question mark.',
        messages: convHist
      })
    });
    var d = await r.json();
    var q = d.content[0].text;
    aiEl.innerHTML = '<span style="font-style:italic">' + q + '</span>';
    convHist.push({ role: 'assistant', content: q });
    localStorage.setItem('football_dialogue', JSON.stringify(convHist));
  } catch (e) {
    aiEl.innerHTML = '<span style="color:var(--danger);font-size:12px">Connection issue — try again.</span>';
  }
}

// ── Logbook ──
function getLogEntries() {
  try { return JSON.parse(localStorage.getItem('football_logbook') || '[]'); }
  catch (e) { return []; }
}

function saveLogEntries(entries) {
  localStorage.setItem('football_logbook', JSON.stringify(entries));
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
  var ctx = currentMode + ' mode';
  if (shots.length > 0) {
    var tot = 0;
    for (var i = 0; i < shots.length; i++) tot += shots[i].xg;
    ctx += ' · ' + shots.length + ' shots · ' + tot.toFixed(3) + ' xG · model: ' + currentModel;
  }
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
  var md = '# Football Portal — Logbook\n\nExported: ' + new Date().toLocaleString() + '\n\n';
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
  a.download = 'football-logbook-' + new Date().toISOString().slice(0, 10) + '.md';
  a.click();
}

// ── Init ──
document.addEventListener('DOMContentLoaded', function() {
  // Theme
  var saved = localStorage.getItem('football_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
  else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Restore hypothesis
  var savedHyp = localStorage.getItem('football_hypothesis');
  if (savedHyp) {
    document.getElementById('hypText').value = savedHyp;
    lockHyp();
  }

  // Init
  initMainPitch();
  initBuildLeague();
  redrawMain();
  renderLogbook();
  setMode('shots');
});
