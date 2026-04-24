# Portfolio evidence — committed exhibit data

This folder holds one JSON file per studio experiment. The files are the public record of Alexey's work — the exhibit page (`../exhibit.html`) reads them and renders them for reviewers. If a file is missing, the exhibit shows "not yet published" for that experiment.

## Workflow

1. Open the experiment in the studio (e.g. `v4/football/`).
2. Write the hypothesis, lock it, run the simulation, interpret, talk to the coach.
3. Click **Export to portfolio** at the bottom of the studio page.
4. Move the downloaded `<id>.json` into this folder.
5. Commit. The exhibit will now show the new evidence for that experiment.

## Schema (`alexey-portfolio/v1`)

```json
{
  "schema": "alexey-portfolio/v1",
  "id": "football",
  "title": "Where do goals come from?",
  "category": "Football Analytics",
  "description": "optional one-liner",
  "hypothesis": { "text": "…", "locked_at": "ISO-8601" },
  "results": { "xg": 1.82, "avg": 1.74, "…": "… flat object, stats only" },
  "figure": { "kind": "png", "data_url": "data:image/png;base64,…" },
  "interpretation": { "text": "…", "written_at": "ISO-8601" },
  "dialogue": [
    { "role": "user",      "content": "…" },
    { "role": "assistant", "content": "…" }
  ],
  "logbook": [
    { "type": "observation", "text": "…", "ts": "ISO-8601", "ctx": "…" }
  ],
  "extras": {},
  "meta": { "model": "claude-sonnet-4-5", "exported_at": "ISO-8601", "studio_version": "v4.0" }
}
```

The exporter in `../_common/export.js` produces files in this shape from `localStorage`.

## Expected filenames

- `football.json`
- `fractal.json`
- `random-walk.json`

Advanced explorations (KMC, MD) do not export to the exhibit — they are framed as learning work and do not carry Alexey's original hypotheses.
