/* v4 export.js — builds the portfolio JSON snapshot for an experiment.
   Downloads <expId>.json for the student to commit into v4/work/. */

var Exporter = (function () {
  function buildJSON(opts) {
    // opts: { id, title, category, description, figureCanvasId, extras }
    var cvs = opts.figureCanvasId ? document.getElementById(opts.figureCanvasId) : null;
    var figure = null;
    if (cvs && cvs.toDataURL) {
      try {
        figure = { kind: 'png', data_url: cvs.toDataURL('image/png') };
      } catch (e) { figure = null; }
    }

    return {
      schema: 'alexey-portfolio/v1',
      id: opts.id,
      title: opts.title,
      category: opts.category || '',
      description: opts.description || '',
      hypothesis: {
        text: Store.get(opts.id, 'hypothesis') || '',
        locked_at: Store.get(opts.id, 'locked_at') || null
      },
      results: Store.get(opts.id, 'results', null),
      figure: figure,
      interpretation: {
        text: Store.get(opts.id, 'interpretation') || '',
        written_at: Store.get(opts.id, 'interpretation_at') || null
      },
      dialogue: Store.get(opts.id, 'dialogue', []),
      logbook: Store.get(opts.id, 'logbook', []),
      extras: opts.extras || {},
      meta: {
        model: Store.get(opts.id, 'coach_model') || 'claude-sonnet-4-5',
        exported_at: new Date().toISOString(),
        studio_version: 'v4.0'
      }
    };
  }

  function download(obj, filename) {
    var blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
      a.remove();
    }, 100);
  }

  function exportExperiment(opts) {
    var json = buildJSON(opts);
    download(json, opts.id + '.json');
    Store.set(opts.id, 'exported_at', new Date().toISOString());
    return json;
  }

  function mountBanner(containerId, opts) {
    var el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML =
      '<div class="export-banner">' +
        '<h4>Ready to publish?</h4>' +
        '<p>Export your hypothesis, results, interpretation, and coach dialogue as a single JSON file. Commit it to <code>v4/work/' + opts.id + '.json</code> so reviewers can read your work on the public exhibit.</p>' +
        '<button type="button" class="primary" id="exportBtn_' + opts.id + '">Export to portfolio →</button>' +
        '<span id="exportHint_' + opts.id + '" style="font-size:11px;color:var(--text-tertiary);font-family:\'JetBrains Mono\',monospace;margin-left:10px"></span>' +
      '</div>';
    document.getElementById('exportBtn_' + opts.id).onclick = function () {
      if (!Store.get(opts.id, 'hypothesis')) {
        document.getElementById('exportHint_' + opts.id).textContent = 'lock a hypothesis first';
        return;
      }
      exportExperiment(opts);
      document.getElementById('exportHint_' + opts.id).textContent = '✓ downloaded · commit to v4/work/';
    };
  }

  return { exportExperiment: exportExperiment, mountBanner: mountBanner, buildJSON: buildJSON };
})();
