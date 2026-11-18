// Qonvergence Waitlist: a small Cloudflare Worker that stores signups in D1.
//
//   POST /api/waitlist        { email, consent, source?, website? }
//   GET  /api/waitlist/health
//
// Design notes:
// - A repeat signup returns the same success as a first one, so the endpoint
//   cannot be used to find out whether an address is already on the list.
// - `website` is a honeypot field hidden from people; a filled value is
//   accepted silently and never stored.
// - Rate limiting keeps a salted hash of the caller's IP for one hour window.
//   The raw IP is never stored.

const MAX_BODY_BYTES = 2048;
const MAX_EMAIL_LENGTH = 254;
const RATE_LIMIT_PER_HOUR = 5;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
}

function corsHeaders(request, env) {
  const origin = request.headers.get('Origin');
  const headers = { Vary: 'Origin' };
  if (origin && allowedOrigins(env).includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type';
    headers['Access-Control-Max-Age'] = '86400';
  }
  return headers;
}

function json(request, env, status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...corsHeaders(request, env),
    },
  });
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Returns true when this caller is over the hourly limit. */
async function rateLimited(request, env) {
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const windowStart = Math.floor(Date.now() / 3_600_000);
  const ipHash = await sha256Hex(`${env.RATE_SALT}:${ip}`);
  const row = await env.DB.prepare(
    `INSERT INTO waitlist_rate (ip_hash, window_start, attempts) VALUES (?1, ?2, 1)
     ON CONFLICT (ip_hash, window_start) DO UPDATE SET attempts = attempts + 1
     RETURNING attempts`,
  ).bind(ipHash, windowStart).first();
  // Old windows are of no use; clear them as we go.
  await env.DB.prepare('DELETE FROM waitlist_rate WHERE window_start < ?1').bind(windowStart - 1).run();
  return row.attempts > RATE_LIMIT_PER_HOUR;
}

async function handleSignup(request, env) {
  const origin = request.headers.get('Origin');
  if (origin && !allowedOrigins(env).includes(origin)) {
    return json(request, env, 403, { ok: false, error: 'origin_not_allowed' });
  }
  if (!(request.headers.get('Content-Type') || '').toLowerCase().startsWith('application/json')) {
    return json(request, env, 415, { ok: false, error: 'json_required' });
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return json(request, env, 413, { ok: false, error: 'too_large' });
  }
  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(request, env, 400, { ok: false, error: 'invalid_json' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(request, env, 400, { ok: false, error: 'invalid_json' });
  }

  // Honeypot: pretend it worked, store nothing.
  if (typeof body.website === 'string' && body.website.trim() !== '') {
    return json(request, env, 200, { ok: true });
  }

  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_RE.test(email)) {
    return json(request, env, 400, { ok: false, error: 'invalid_email' });
  }
  if (body.consent !== true) {
    return json(request, env, 400, { ok: false, error: 'consent_required' });
  }

  if (await rateLimited(request, env)) {
    return json(request, env, 429, { ok: false, error: 'rate_limited' });
  }

  const source = typeof body.source === 'string' ? body.source.slice(0, 64) : 'site';
  await env.DB.prepare(
    `INSERT INTO waitlist (email, source, consent_text_version, created_at)
     VALUES (?1, ?2, ?3, ?4)
     ON CONFLICT (email) DO NOTHING`,
  ).bind(email, source, env.CONSENT_TEXT_VERSION || 'draft-1', new Date().toISOString()).run();

  return json(request, env, 200, { ok: true });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === '/api/waitlist/health') {
      if (request.method !== 'GET') return json(request, env, 405, { ok: false, error: 'method_not_allowed' });
      await env.DB.prepare('SELECT 1').first();
      return json(request, env, 200, { ok: true });
    }

    if (url.pathname === '/api/waitlist') {
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(request, env) });
      }
      if (request.method !== 'POST') return json(request, env, 405, { ok: false, error: 'method_not_allowed' });
      if (!env.RATE_SALT) return json(request, env, 500, { ok: false, error: 'not_configured' });
      try {
        return await handleSignup(request, env);
      } catch (err) {
        console.error('waitlist signup failed', err && err.message);
        return json(request, env, 500, { ok: false, error: 'server_error' });
      }
    }

    return json(request, env, 404, { ok: false, error: 'not_found' });
  },
};
