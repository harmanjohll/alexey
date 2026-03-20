/* data.js — Data management, tables, linear regression, export, and localStorage for v3 MD portal */
/* All functions are plain globals (no modules). */

function fitLinear(data) {
  // data = [{x, y}], returns {slope, intercept, r2}
  var n = data.length;
  if (n < 2) return {slope: 0, intercept: 0, r2: 0};
  var sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (var i = 0; i < n; i++) { sx += data[i].x; sy += data[i].y; sxx += data[i].x * data[i].x; sxy += data[i].x * data[i].y; }
  var denom = n * sxx - sx * sx;
  if (Math.abs(denom) < 1e-20) return {slope: 0, intercept: sy / n, r2: 0};
  var slope = (n * sxy - sx * sy) / denom;
  var intercept = (sy - slope * sx) / n;
  var yMean = sy / n;
  var ssTot = 0, ssRes = 0;
  for (var i = 0; i < n; i++) {
    ssTot += (data[i].y - yMean) * (data[i].y - yMean);
    var yPred = slope * data[i].x + intercept;
    ssRes += (data[i].y - yPred) * (data[i].y - yPred);
  }
  var r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  return {slope: slope, intercept: intercept, r2: r2};
}

function computeSymmetricLayers(layerDataArray) {
  // layerDataArray: array of simulation results, each with .layers = [{si, ge}, ...] and .ncz
  // Returns array of 4 Ge fractions [layer1, layer2, layer3, layer4] averaged across all entries
  var sums = [0, 0, 0, 0];
  var counts = [0, 0, 0, 0];

  for (var e = 0; e < layerDataArray.length; e++) {
    var entry = layerDataArray[e];
    var layers = entry.layers;
    var N = 4 * entry.ncz + 1;

    for (var k = 0; k < 4; k++) {
      var topIdx = k;           // layer k from surface (0-indexed)
      var botIdx = N - 1 - k;   // symmetric partner from bottom

      if (topIdx >= layers.length || botIdx >= layers.length) continue;

      var geTop = layers[topIdx].ge;
      var geBot = layers[botIdx].ge;
      var totalTop = layers[topIdx].si + layers[topIdx].ge;
      var totalBot = layers[botIdx].si + layers[botIdx].ge;
      var totalAtoms = totalTop + totalBot;

      var geFrac = totalAtoms > 0 ? (geTop + geBot) / totalAtoms : 0;

      sums[k] += geFrac;
      counts[k] += 1;
    }
  }

  var result = [];
  for (var k = 0; k < 4; k++) {
    result.push(counts[k] > 0 ? sums[k] / counts[k] : 0);
  }
  return result;
}

function renderSummaryTable(summaryData) {
  var tbody = document.getElementById('summaryTableBody');
  if (!tbody) return;

  if (!summaryData || summaryData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:#7a9a7a;font-style:italic;">No data yet. Run a sweep to populate.</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < summaryData.length; i++) {
    var d = summaryData[i];
    var l = d.layers || [];
    html += '<tr>'
      + '<td>' + (d.mu != null ? d.mu.toFixed(2) : '') + '</td>'
      + '<td>' + (d.surfE != null ? d.surfE.toFixed(4) : '') + '</td>'
      + '<td>' + (d.r2 != null ? d.r2.toFixed(6) : '') + '</td>'
      + '<td>' + (d.geFrac != null ? d.geFrac.toFixed(4) : '') + '</td>'
      + '<td>' + (l[0] != null ? l[0].toFixed(4) : '') + '</td>'
      + '<td>' + (l[1] != null ? l[1].toFixed(4) : '') + '</td>'
      + '<td>' + (l[2] != null ? l[2].toFixed(4) : '') + '</td>'
      + '<td>' + (l[3] != null ? l[3].toFixed(4) : '') + '</td>'
      + '</tr>';
  }
  tbody.innerHTML = html;
}

function renderRawTable(layerData) {
  var tbody = document.getElementById('rawTableBody');
  if (!tbody) return;

  if (!layerData || layerData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:#7a9a7a;font-style:italic;">No layer data. Run simulation first.</td></tr>';
    return;
  }

  var html = '';
  for (var i = 0; i < layerData.length; i++) {
    var d = layerData[i];
    html += '<tr>'
      + '<td>' + d.ncz + '</td>'
      + '<td>' + d.nLayers + '</td>'
      + '<td contenteditable="true" data-idx="' + i + '" data-field="natom">' + d.natom + '</td>'
      + '<td contenteditable="true" data-idx="' + i + '" data-field="epa">' + (d.epa != null ? d.epa.toFixed(4) : '') + '</td>'
      + '<td contenteditable="true" data-idx="' + i + '" data-field="etotal">' + (d.etotal != null ? d.etotal.toFixed(4) : '') + '</td>'
      + '<td>' + (d.geFrac != null ? d.geFrac.toFixed(4) : '') + '</td>'
      + '</tr>';
  }
  tbody.innerHTML = html;

  // Attach blur listeners to contenteditable cells
  var editableCells = tbody.querySelectorAll('td[contenteditable="true"]');
  for (var c = 0; c < editableCells.length; c++) {
    editableCells[c].addEventListener('blur', function() {
      var idx = parseInt(this.getAttribute('data-idx'));
      var field = this.getAttribute('data-field');
      var val = parseFloat(this.textContent.trim());
      if (!isNaN(val) && layerData[idx]) {
        layerData[idx][field] = val;
        // Recalculate etotal from epa * natom if epa or natom changed
        if (field === 'epa' || field === 'natom') {
          layerData[idx].etotal = layerData[idx].epa * layerData[idx].natom;
        }
        // Recalculate epa from etotal / natom if etotal changed
        if (field === 'etotal' && layerData[idx].natom > 0) {
          layerData[idx].epa = layerData[idx].etotal / layerData[idx].natom;
        }
      }
    });
  }
}

function recalcFitFromTable(layerData) {
  // Re-read contenteditable cells from the raw table
  var tbody = document.getElementById('rawTableBody');
  if (tbody) {
    var rows = tbody.querySelectorAll('tr');
    for (var r = 0; r < rows.length; r++) {
      var cells = rows[r].querySelectorAll('td[contenteditable="true"]');
      for (var c = 0; c < cells.length; c++) {
        var idx = parseInt(cells[c].getAttribute('data-idx'));
        var field = cells[c].getAttribute('data-field');
        var val = parseFloat(cells[c].textContent.trim());
        if (!isNaN(val) && layerData[idx]) {
          layerData[idx][field] = val;
        }
      }
    }
  }

  // Build data for linear fit: x = nLayers, y = etotal
  var fitData = [];
  for (var i = 0; i < layerData.length; i++) {
    var d = layerData[i];
    // Recompute etotal from epa * natom
    d.etotal = d.epa * d.natom;
    if (d.nLayers != null && d.etotal != null) {
      fitData.push({x: d.nLayers, y: d.etotal});
    }
  }

  var fit = fitLinear(fitData);
  var surfE = fit.intercept / 2;

  // Update display elements
  var fitResultEl = document.getElementById('fitResult');
  var fitValueEl = document.getElementById('fitValue');
  var fitDetailEl = document.getElementById('fitDetail');

  if (fitResultEl) {
    fitResultEl.style.display = fitData.length >= 2 ? '' : 'none';
  }
  if (fitValueEl) {
    fitValueEl.textContent = surfE.toFixed(4) + ' eV';
  }
  if (fitDetailEl) {
    fitDetailEl.textContent = 'y = ' + fit.slope.toFixed(6) + ' \u00d7 N + ' + fit.intercept.toFixed(6)
      + ' | R\u00b2 = ' + fit.r2.toFixed(6)
      + ' | intercept/2 = ' + surfE.toFixed(4) + ' eV';
  }

  return fit;
}

function exportCSV(summaryData) {
  if (!summaryData || summaryData.length === 0) return;

  var lines = ['mu_Ge,Surface_Energy_eV,R2,Ge_Fraction,Ge_L1,Ge_L2,Ge_L3,Ge_L4'];
  for (var i = 0; i < summaryData.length; i++) {
    var d = summaryData[i];
    var l = d.layers || [];
    lines.push([
      d.mu != null ? d.mu.toFixed(2) : '',
      d.surfE != null ? d.surfE.toFixed(4) : '',
      d.r2 != null ? d.r2.toFixed(6) : '',
      d.geFrac != null ? d.geFrac.toFixed(4) : '',
      l[0] != null ? l[0].toFixed(4) : '',
      l[1] != null ? l[1].toFixed(4) : '',
      l[2] != null ? l[2].toFixed(4) : '',
      l[3] != null ? l[3].toFixed(4) : ''
    ].join(','));
  }

  var csv = lines.join('\n');
  var blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'sige-surface-energy.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportJSON(summaryData, rawData) {
  var payload = {
    summaryData: summaryData || [],
    rawData: rawData || {}
  };

  var json = JSON.stringify(payload, null, 2);
  var blob = new Blob([json], {type: 'application/json;charset=utf-8;'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'sige-surface-energy.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyToClipboard(summaryData) {
  if (!summaryData || summaryData.length === 0) return;

  var lines = ['mu_Ge\tSurface_Energy_eV\tR2\tGe_Fraction\tGe_L1\tGe_L2\tGe_L3\tGe_L4'];
  for (var i = 0; i < summaryData.length; i++) {
    var d = summaryData[i];
    var l = d.layers || [];
    lines.push([
      d.mu != null ? d.mu.toFixed(2) : '',
      d.surfE != null ? d.surfE.toFixed(4) : '',
      d.r2 != null ? d.r2.toFixed(6) : '',
      d.geFrac != null ? d.geFrac.toFixed(4) : '',
      l[0] != null ? l[0].toFixed(4) : '',
      l[1] != null ? l[1].toFixed(4) : '',
      l[2] != null ? l[2].toFixed(4) : '',
      l[3] != null ? l[3].toFixed(4) : ''
    ].join('\t'));
  }

  navigator.clipboard.writeText(lines.join('\n'));
}

function saveExperiment(summaryData, rawData) {
  var payload = {
    summaryData: summaryData || [],
    rawData: rawData || {},
    savedAt: new Date().toISOString()
  };
  localStorage.setItem('alexey_v3_md_experiment', JSON.stringify(payload));
}

function loadExperiment() {
  var raw = localStorage.getItem('alexey_v3_md_experiment');
  if (!raw) return null;
  try {
    var parsed = JSON.parse(raw);
    return {
      summaryData: parsed.summaryData || [],
      rawData: parsed.rawData || {}
    };
  } catch (e) {
    return null;
  }
}
