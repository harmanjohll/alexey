/**
 * Cloudflare Worker — coach proxy for the v4 studio.
 *
 * Accepts POST JSON: { model, max_tokens, system, messages }
 * Forwards to api.anthropic.com/v1/messages with the secret API key.
 * Allows CORS from the configured origin.
 *
 * Deploy: see README.md in this directory.
 * Secret: ANTHROPIC_API_KEY
 * Env:    ALLOWED_ORIGIN (e.g. "https://alexey.example.com")
 */

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';

    const cors = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: 'invalid json' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Minimal shape check — reject anything that looks malformed.
    if (!body || !body.model || !Array.isArray(body.messages)) {
      return new Response(JSON.stringify({ error: 'missing model or messages' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Enforce sensible caps so the key can't be abused.
    body.max_tokens = Math.min(body.max_tokens || 1000, 1500);
    if (body.messages.length > 30) {
      return new Response(JSON.stringify({ error: 'conversation too long' }), {
        status: 413,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: {
        ...cors,
        'Content-Type': 'application/json',
      },
    });
  },
};
