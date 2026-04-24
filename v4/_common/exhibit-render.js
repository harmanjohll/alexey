/* v4 exhibit-render.js — renders a committed work/*.json into an exhibit view. */

var Exhibit = (function () {
  function esc(s) {
    if (s === null || s === undefined) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function fmtTime(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleString(); } catch (e) { return iso; }
  }

  function renderDialogue(dialogue) {
    if (!dialogue || !dialogue.length) return '';
    var html = '<div class="exhibit-thread">';
    dialogue.forEach(function (m) {
      var cls = m.role === 'assistant' ? 'tcoach' : 'talex';
      var lbl = m.role === 'assistant' ? 'coach' : 'alexey';
      var lblCls = m.role === 'assistant' ? 'tcoach-lbl' : 'talex-lbl';
      html += '<div class="' + cls + '">' +
        '<div class="' + lblCls + '">' + lbl + '</div>' +
        esc(m.content).replace(/\n/g, '<br>') +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderLogbook(logbook) {
    if (!logbook || !logbook.length) return '';
    var html = '<div class="exhibit-logbook">';
    logbook.slice().reverse().forEach(function (e) {
      html +=
        '<div class="exhibit-log-entry">' +
          '<span class="exhibit-log-tag ' + (e.type || '') + '">' + esc(e.type || '') + '</span>' +
          '<span class="exhibit-log-ts">' + fmtTime(e.ts) + '</span>' +
          '<div class="exhibit-log-text">' + esc(e.text).replace(/\n/g, '<br>') + '</div>' +
          (e.ctx ? '<div class="exhibit-log-ctx">' + esc(e.ctx) + '</div>' : '') +
        '</div>';
    });
    html += '</div>';
    return html;
  }

  function renderResults(results) {
    if (!results || typeof results !== 'object') return '';
    var rows = '';
    Object.keys(results).forEach(function (k) {
      var v = results[k];
      if (v === null || v === undefined) return;
      if (typeof v === 'object') return; // skip nested
      rows += '<div class="exhibit-stat"><span class="exhibit-stat-k">' + esc(k) + '</span><span class="exhibit-stat-v">' + esc(v) + '</span></div>';
    });
    if (!rows) return '';
    return '<div class="exhibit-results">' + rows + '</div>';
  }

  function renderOne(json, targetEl) {
    if (!json) {
      targetEl.innerHTML = '<div class="exhibit-empty">No portfolio data yet. Run the experiment in the studio and export.</div>';
      return;
    }
    var h = json.hypothesis || {};
    var interp = json.interpretation || {};

    targetEl.innerHTML =
      '<article class="exhibit-article">' +
        '<header class="exhibit-header">' +
          '<div class="exhibit-cat">' + esc(json.category || '') + '</div>' +
          '<h1 class="exhibit-title">' + esc(json.title || json.id) + '</h1>' +
          (json.description ? '<p class="exhibit-desc">' + esc(json.description) + '</p>' : '') +
        '</header>' +

        '<section class="exhibit-block">' +
          '<div class="exhibit-kicker">Hypothesis</div>' +
          '<div class="exhibit-hypothesis">' + esc(h.text || '(not yet written)').replace(/\n/g, '<br>') + '</div>' +
          (h.locked_at ? '<div class="exhibit-meta">locked · ' + fmtTime(h.locked_at) + '</div>' : '') +
        '</section>' +

        (json.figure && json.figure.data_url ?
          '<section class="exhibit-block">' +
            '<div class="exhibit-kicker">Figure</div>' +
            '<img class="exhibit-figure" src="' + json.figure.data_url + '" alt="Experiment figure">' +
          '</section>' : '') +

        (Object.keys(json.results || {}).length ?
          '<section class="exhibit-block">' +
            '<div class="exhibit-kicker">Key results</div>' +
            renderResults(json.results) +
          '</section>' : '') +

        '<section class="exhibit-block">' +
          '<div class="exhibit-kicker">Interpretation</div>' +
          '<div class="exhibit-prose">' + esc(interp.text || '(not yet written)').replace(/\n/g, '<br>') + '</div>' +
          (interp.written_at ? '<div class="exhibit-meta">written · ' + fmtTime(interp.written_at) + '</div>' : '') +
        '</section>' +

        (json.dialogue && json.dialogue.length ?
          '<section class="exhibit-block">' +
            '<div class="exhibit-kicker">Talking to coach</div>' +
            renderDialogue(json.dialogue) +
          '</section>' : '') +

        (json.logbook && json.logbook.length ?
          '<section class="exhibit-block">' +
            '<div class="exhibit-kicker">Logbook</div>' +
            renderLogbook(json.logbook) +
          '</section>' : '') +

        '<footer class="exhibit-footer">' +
          '<div class="exhibit-meta">' +
            'model: ' + esc((json.meta && json.meta.model) || '—') + ' · ' +
            'exported · ' + fmtTime(json.meta && json.meta.exported_at) +
          '</div>' +
          '<a class="hero-link" href="../' + esc(json.id) + '/">Play the model yourself →</a>' +
        '</footer>' +
      '</article>';
  }

  async function fetchJSON(path) {
    try {
      var r = await fetch(path, { cache: 'no-cache' });
      if (!r.ok) return null;
      return await r.json();
    } catch (e) { return null; }
  }

  return {
    renderOne: renderOne,
    fetchJSON: fetchJSON
  };
})();
