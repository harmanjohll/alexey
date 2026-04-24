/* v4 coach.js — routes to the Cloudflare Worker proxy. Falls back to a
   copy-prompt modal if the worker is down or unconfigured.
   Each studio passes its own systemPrompt + messages array. */

var Coach = (function () {
  // Set to the deployed worker URL once. "" = fallback-only mode (copy-prompt).
  // See v4/coach-worker/README.md for deployment.
  var WORKER_URL = '';
  var MODEL = 'claude-sonnet-4-5';

  function configure(url, model) {
    if (url) WORKER_URL = url;
    if (model) MODEL = model;
  }

  async function ask(opts) {
    // opts: { systemPrompt, messages, onThinking, onAnswer, onFallback }
    if (opts.onThinking) opts.onThinking();

    if (!WORKER_URL) {
      if (opts.onFallback) opts.onFallback(opts.systemPrompt, opts.messages);
      return null;
    }

    try {
      var r = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          max_tokens: 1000,
          system: opts.systemPrompt,
          messages: opts.messages
        })
      });
      if (!r.ok) throw new Error('worker ' + r.status);
      var d = await r.json();
      var text = (d && d.content && d.content[0] && d.content[0].text) || '';
      if (!text) throw new Error('empty response');
      if (opts.onAnswer) opts.onAnswer(text);
      return text;
    } catch (e) {
      if (opts.onFallback) opts.onFallback(opts.systemPrompt, opts.messages);
      return null;
    }
  }

  // ── Fallback modal ──
  function openFallback(systemPrompt, messages, onPaste) {
    var existing = document.getElementById('coachModalBg');
    if (existing) existing.remove();

    var prompt = '[SYSTEM]\n' + systemPrompt + '\n\n';
    messages.forEach(function (m) {
      prompt += '[' + m.role.toUpperCase() + ']\n' + m.content + '\n\n';
    });

    var bg = document.createElement('div');
    bg.className = 'coach-modal-bg show';
    bg.id = 'coachModalBg';
    bg.innerHTML =
      '<div class="coach-modal">' +
        '<h3>Coach offline — use copy-paste mode</h3>' +
        '<p>The live coach proxy isn\'t reachable. Copy the prompt below, paste it into Claude (claude.ai), and paste the reply back here.</p>' +
        '<pre id="coachModalPrompt"></pre>' +
        '<div class="coach-modal-row">' +
          '<button type="button" id="coachCopyBtn">Copy prompt</button>' +
          '<button type="button" id="coachCloseBtn">Close</button>' +
        '</div>' +
        '<div style="margin-top:14px">' +
          '<div class="sl" style="margin-bottom:6px">paste coach\'s reply</div>' +
          '<textarea id="coachPasteBox" style="min-height:90px" placeholder="Paste the coach\'s question here…"></textarea>' +
          '<div class="coach-modal-row"><button type="button" class="primary" id="coachUsePasteBtn">Use this reply</button></div>' +
        '</div>' +
      '</div>';
    document.body.appendChild(bg);
    document.getElementById('coachModalPrompt').textContent = prompt;

    document.getElementById('coachCopyBtn').onclick = function () {
      navigator.clipboard.writeText(prompt).then(function () {
        document.getElementById('coachCopyBtn').textContent = '✓ Copied';
      });
    };
    document.getElementById('coachCloseBtn').onclick = function () { bg.remove(); };
    document.getElementById('coachUsePasteBtn').onclick = function () {
      var txt = document.getElementById('coachPasteBox').value.trim();
      if (txt.length < 3) return;
      bg.remove();
      if (onPaste) onPaste(txt);
    };
  }

  return { ask: ask, configure: configure, openFallback: openFallback };
})();
