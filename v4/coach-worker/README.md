# Coach proxy — Cloudflare Worker

This is a ~60-line proxy that sits between the studio and the Anthropic API. The studio posts conversation JSON here; the worker forwards it with the API key from a secret and returns the reply. Without this proxy the browser cannot call the Anthropic API directly (CORS + would require leaking the key in page source).

## Deploy

1. Install [wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) and log in: `npx wrangler login`.
2. In this directory:
   ```
   npx wrangler deploy worker.js --name alexey-coach-proxy --compatibility-date 2024-10-01
   ```
3. Set the API key as a secret (pasted once, stored encrypted):
   ```
   npx wrangler secret put ANTHROPIC_API_KEY --name alexey-coach-proxy
   ```
4. Set the allowed origin (the URL your portfolio is served from):
   ```
   npx wrangler secret put ALLOWED_ORIGIN --name alexey-coach-proxy
   # e.g. https://alexey.github.io
   ```
5. Note the deployed URL — something like `https://alexey-coach-proxy.<account>.workers.dev`.

## Wire it into the studio

Open `v4/_common/coach.js` and set the `WORKER_URL` constant at the top:

```js
var WORKER_URL = 'https://alexey-coach-proxy.<account>.workers.dev';
```

Reload any studio page and the **Ask coach** button should now return a one-question answer instead of falling back to copy-paste mode.

## What the worker does and does not do

Does:
- Accepts POST with JSON `{ model, max_tokens, system, messages }`.
- Caps `max_tokens` at 1500 and rejects conversations longer than 30 turns.
- Forwards to `api.anthropic.com/v1/messages` with the `x-api-key` header filled from the secret.
- Emits CORS headers for the configured origin.

Does not:
- Log messages or prompts.
- Rate-limit by user (Cloudflare's default limits apply at the edge).
- Validate the system prompt's contents. The studio always sends the hardcoded Socratic coach prompts.

## Testing locally without deploying

The studio works without the worker. `_common/coach.js` falls back to a copy-paste modal: it shows the full prompt, a **Copy prompt** button, and a textarea to paste the coach's reply. That's the offline path; the worker just turns the round-trip into one click.
