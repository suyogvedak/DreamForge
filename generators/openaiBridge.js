// generators/openaiBridge.js
// Backwards-compatible OpenAI bridge for your generators.
//
// Exports:
// - callOpenAI (recommended)
// - callOpenAIChat (alias for older imports)
// - callOpenAICompletion (alias)
// - generateImage (images endpoint)
// - default -> callOpenAI
//
// Throws a clear error when OPENAI_API_KEY is missing so generators can fallback.

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const txt = await res.text().catch(() => null);
    throw new Error(`${res.status} ${res.statusText}${txt ? ` - ${txt}` : ''}`);
  }
  return res.json();
}

/**
 * callOpenAI(promptOrMessages, opts)
 * - If promptOrMessages is a string, it's used as a single user message for chat API.
 * - opts: { model, temperature, max_tokens }
 * Returns the raw JSON response from the Chat Completions endpoint.
 */
export async function callOpenAI(promptOrMessages, opts = {}) {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) throw new Error("OPENAI_API_KEY not set");

  const model = opts.model || "gpt-4.0-mini";
  const temperature = ("temperature" in opts) ? opts.temperature : 0.8;
  const max_tokens = ("max_tokens" in opts) ? opts.max_tokens : 800;

  let messages;
  if (typeof promptOrMessages === "string") {
    messages = [{ role: "user", content: promptOrMessages }];
  } else if (Array.isArray(promptOrMessages)) {
    messages = promptOrMessages;
  } else if (promptOrMessages && typeof promptOrMessages === "object" && promptOrMessages.role) {
    // single message object
    messages = [promptOrMessages];
  } else {
    messages = [{ role: "user", content: String(promptOrMessages ?? "") }];
  }

  const url = "https://api.openai.com/v1/chat/completions";
  const payload = { model, messages, temperature, max_tokens };

  const json = await fetchJson(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  return json;
}

// Backwards-compatible aliases (some of your generator files may import these names)
export const callOpenAIChat = callOpenAI;
export const callOpenAICompletion = callOpenAI;

/**
 * generateImage(prompt, opts)
 * - Calls OpenAI Images generation endpoint and returns { b64, mime, dataUrl, raw }
 * - opts: { size: '256x256'|'512x512'|'1024x1024', n }
 */
export async function generateImage(prompt, opts = {}) {
  const API_KEY = process.env.OPENAI_API_KEY;
  if (!API_KEY) throw new Error("OPENAI_API_KEY not set");

  const size = opts.size || "512x512";
  const n = (typeof opts.n === "number") ? opts.n : 1;

  const url = "https://api.openai.com/v1/images/generations";
  const body = { prompt: String(prompt || ""), n, size };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const txt = await res.text().catch(()=>null);
    throw new Error(`OpenAI Images API error ${res.status}: ${txt || res.statusText}`);
  }

  const json = await res.json();
  const b64 = json?.data?.[0]?.b64_json ?? null;
  if (!b64) throw new Error("Images API returned no b64 data");

  const mime = "image/png";
  const dataUrl = `data:${mime};base64,${b64}`;
  return { b64, mime, dataUrl, raw: json };
}

// default export for modules using default import
export default callOpenAI;
