// scripts/aihelper.js
// Client-side helper to call server-side generation endpoints and normalize responses
// Works for all themes and generator types (character, world, weapon, quest, logo, story, name, etc.)

/**
 * normalizeServerOutput
 * - Accepts many shapes returned from server/generators and normalizes to:
 *   { type, title, text, meta, source }
 */
function normalizeServerOutput(type, raw) {
  if (!raw) return { type: type || 'unknown', title: '', text: '', meta: {}, source: 'unknown' };

  // If server returned { success:true, result: {...} }
  const maybeResult = raw.result ?? raw;

  // If already normalized
  if (maybeResult && maybeResult.type && (maybeResult.title || maybeResult.text || typeof maybeResult === 'string')) {
    const t = maybeResult.type || type;
    return {
      type: t,
      title: maybeResult.title ?? (t ? `${t[0].toUpperCase() + t.slice(1)}` : ''),
      text:
        typeof maybeResult === 'string'
          ? maybeResult
          : maybeResult.text ?? (maybeResult.output ?? (maybeResult.data ?? '')),
      meta: maybeResult.meta ?? maybeResult.sourceDetails ?? {},
      source: maybeResult.source ?? 'server'
    };
  }

  // If result is a simple string
  if (typeof maybeResult === 'string') {
    return { type: type || 'text', title: '', text: maybeResult, meta: {}, source: 'server' };
  }

  // If result is an object with title/text
  if (maybeResult.title || maybeResult.text) {
    return {
      type: type || (maybeResult.type || 'item'),
      title: maybeResult.title ?? '',
      text: maybeResult.text ?? '',
      meta: maybeResult.meta ?? {},
      source: maybeResult.source ?? 'server'
    };
  }

  // Generic fallback: stringify whole object
  return {
    type: type || 'item',
    title: maybeResult.title ?? '',
    text: JSON.stringify(maybeResult, null, 2),
    meta: {},
    source: 'server'
  };
}

/**
 * Call the server /api/generate endpoint (unified) and normalize output
 * @param {Object} opts
 *   - theme: 'fantasy' | 'cyberpunk' | 'scifi' | ... (string)
 *   - type: 'character'|'world'|'weapon'|'quest'|'logo'|'story'|'name' etc.
 *   - useAI: boolean
 *   - params: object for generator-specific options (seed, tone...)
 *   - preferPerTypeEndpoint: boolean (if true, call /api/generation/:type instead)
 *
 * @returns {Promise<{type,title,text,meta,source}>}
 */
export async function generateText({
  theme = 'fantasy',
  type = 'character',
  useAI = true,
  params = {},
  preferPerTypeEndpoint = false
} = {}) {
  const payload = { theme, type, useAI, params };

  try {
    // Choose endpoint: unified or per-type
    const url = preferPerTypeEndpoint ? `/api/generation/${encodeURIComponent(type)}` : '/api/generate';

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => `HTTP ${res.status}`);
      throw new Error(txt || `Generation failed: ${res.status}`);
    }

    const body = await res.json().catch(() => null);
    const normalized = normalizeServerOutput(type, body ?? null);

    // Ensure title/text exist
    if (!normalized.title && normalized.text) {
      // Attempt to extract title from first line
      const firstLine = (normalized.text || '').split('\n')[0];
      if (firstLine && firstLine.length < 80) normalized.title = firstLine;
    }

    return normalized;
  } catch (err) {
    console.error('generateText error', err);
    // Return a failure-shaped result instead of throwing if caller prefers to render errors
    throw err;
  }
}
