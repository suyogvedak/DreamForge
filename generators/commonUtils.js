// generators/commonUtils.js
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ---------- Helpers ---------- */
export function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function uid(prefix = "id") {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

/* Normalize output for frontend */
export function formatOutput(type, content = {}, meta = {}) {
  // content may be string or object { title, text, image, raw }
  const text = typeof content === "string"
    ? content
    : content?.text || content?.description || content?.story || "";

  return {
    ok: true,
    type,
    title: (content && (content.title || content.name)) || type,
    text,
    image: content?.image || null,
    raw: content?.raw || content || {},
    meta: {
      id: content?.id || meta?.id || uid(type),
      theme: meta?.theme || "unknown",
      source: meta?.source || "local",
      generatedAt: new Date().toISOString(),
      ...meta,
    }
  };
}

/* Import theme dataset dynamically */
export async function importDataModule(theme) {
  const t = String(theme || "fantasy").toLowerCase();
  const projectRoot = process.cwd();
  const candidates = [
    path.resolve(projectRoot, "data", `${t}Data.js`),
    path.resolve(projectRoot, "data", `${t}.js`),
    path.resolve(projectRoot, "generators", "data", `${t}Data.js`),
    path.resolve(projectRoot, "generators", "data", `${t}.js`),
  ];

  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) {
        return await import(pathToFileURL(p).href);
      }
    } catch (e) {
      // ignore and continue
    }
  }

  console.warn(`[commonUtils] importDataModule: no data module found for theme "${t}". Tried: ${candidates.join(", ")}`);
  return null;
}

/* ---------- AI helper (OpenAI / Gemini) ---------- */
/* Uses global fetch if available; otherwise attempts dynamic import of node-fetch */
async function getFetch() {
  if (typeof globalThis.fetch === "function") return globalThis.fetch;
  try {
    const mod = await import("node-fetch");
    return mod.default ?? mod;
  } catch (e) {
    throw new Error("No fetch available (install node-fetch or use Node 18+).");
  }
}

/**
 * callAI(prompt, opts)
 * opts: { provider: "auto"|"openai"|"gemini", model, maxTokens, temperature, timeoutMs }
 * Throws if no provider available.
 */
export async function callAI(prompt, opts = {}) {
  const {
    provider = "auto",
    model,
    maxTokens = 512,
    temperature = 0.8,
    timeoutMs = 20000,
  } = opts;

  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  const hasGemini = Boolean(process.env.GEMINI_API_KEY);

  let chosen = provider === "auto" ? (hasOpenAI ? "openai" : hasGemini ? "gemini" : null) : provider;
  if (!chosen) throw new Error("No AI provider API key found (OPENAI_API_KEY or GEMINI_API_KEY).");

  const fetchFn = await getFetch();

  // Timeout wrapper
  function withTimeout(promise, ms) {
    const timeout = new Promise((_, rej) => setTimeout(() => rej(new Error("AI request timed out")), ms));
    return Promise.race([promise, timeout]);
  }

  if (chosen === "openai") {
    if (!hasOpenAI) throw new Error("OPENAI_API_KEY not set");
    const apiKey = process.env.OPENAI_API_KEY;
    const modelName = model || process.env.OPENAI_MODEL || "gpt-4o-mini";
    const body = {
      model: modelName,
      messages: [
        { role: "system", content: "You are a creative content generator." },
        { role: "user", content: prompt }
      ],
      max_tokens: maxTokens,
      temperature
    };

    const p = fetchFn("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(`OpenAI error ${res.status}: ${t}`); });
        return res.json();
      })
      .then(json => {
        const choice = json?.choices?.[0];
        if (!choice) throw new Error("OpenAI returned no choices");
        // message.content for chat, fallback to text
        return (choice.message?.content ?? choice.text ?? "").toString().trim();
      });

    return withTimeout(p, timeoutMs);
  }

  if (chosen === "gemini") {
    if (!hasGemini) throw new Error("GEMINI_API_KEY not set");
    // NOTE: adjust Google endpoint to match your setup if necessary
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta2/models/text-bison-001:generateText?key=${apiKey}`;
    const payload = { prompt: { text: prompt } };

    const p = fetchFn(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(res => {
        if (!res.ok) return res.text().then(t => { throw new Error(`Gemini error ${res.status}: ${t}`); });
        return res.json();
      })
      .then(json => {
        const out = json?.candidates?.[0]?.output ?? (json?.candidates?.[0]?.content ?? null);
        if (out) return out.toString().trim();
        // fallback stringify
        return JSON.stringify(json);
      });

    return withTimeout(p, timeoutMs);
  }

  throw new Error("Unsupported AI provider");
}
