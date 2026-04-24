/* v4 store.js — unified localStorage schema: exp.<id>.<field>.
   Fields: hypothesis (text), locked_at (ISO), dialogue (array), logbook (array),
           results (object), interpretation (text), interpretation_at (ISO).
   One-time migration from v3 ad-hoc keys preserves Alexey's existing work. */

var Store = (function () {
  var K = function (id, field) { return 'exp.' + id + '.' + field; };

  function get(id, field, fallback) {
    var raw = localStorage.getItem(K(id, field));
    if (raw === null || raw === undefined) return fallback;
    if (field === 'dialogue' || field === 'logbook' || field === 'results' || field === 'shots') {
      try { return JSON.parse(raw); } catch (e) { return fallback; }
    }
    return raw;
  }

  function set(id, field, value) {
    if (typeof value === 'object') localStorage.setItem(K(id, field), JSON.stringify(value));
    else localStorage.setItem(K(id, field), value);
  }

  function remove(id, field) { localStorage.removeItem(K(id, field)); }

  function status(id) {
    if (get(id, 'exported_at')) return 'exported';
    if (get(id, 'hypothesis')) return 'locked';
    return 'not';
  }

  // ── Migration from v3 keys ──
  // Reads old keys once, rewrites under new schema, removes old keys.
  function migrate() {
    if (localStorage.getItem('v4_migrated')) return;

    var map = {
      football: {
        hypothesis:   'football_hypothesis',
        locked_at:    'football_timestamp',
        dialogue:     'football_dialogue',
        logbook:      'football_logbook',
        results:      'football_results',
        shots:        'football_shots'
      },
      'random-walk': {
        hypothesis:   'rw_hypothesis',
        locked_at:    'rw_timestamp',
        dialogue:     'rw_dialogue',
        logbook:      'rw_logbook',
        results:      'rw_results'
      },
      fractal: {
        logbook:      'alexey_fractal_logbook'
      }
    };

    Object.keys(map).forEach(function (expId) {
      var fields = map[expId];
      Object.keys(fields).forEach(function (f) {
        var old = localStorage.getItem(fields[f]);
        if (old !== null && localStorage.getItem(K(expId, f)) === null) {
          localStorage.setItem(K(expId, f), old);
        }
      });
    });

    localStorage.setItem('v4_migrated', new Date().toISOString());
  }

  migrate();

  return { K: K, get: get, set: set, remove: remove, status: status, migrate: migrate };
})();
