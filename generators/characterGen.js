// generators/characterGen.js
// Defensive, compatible character generator for DreamForge
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

/**
 * Try to dynamically import a theme data module.
 * Looks in likely locations for your project structure.
 */
async function importThemeModule(theme) {
  const projectRoot = process.cwd();
  const candidates = [
    path.resolve(projectRoot, "generators", "data", `${theme}Data.js`),
    path.resolve(projectRoot, "generators", `${theme}Data.js`),
    path.resolve(projectRoot, "data", `${theme}Data.js`),
    path.resolve(projectRoot, "data", `${theme}.js`),
    path.resolve(projectRoot, `${theme}Data.js`),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      try {
        const mod = await import(pathToFileURL(p).href);
        return mod;
      } catch (err) {
        console.warn(`[characterGen] import failed for ${p}:`, err?.message || err);
      }
    }
  }
  return null;
}

/**
 * Utility: pick a random element
 */
function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Try to extract an array of character entries from the imported module
 * Supports multiple common export shapes.
 */
function extractCharacterArray(mod) {
  if (!mod) return null;

  // direct exported array
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod.default)) return mod.default;

  // common named exports
  const candidates = [
    "characters",
    "character",
    "characterList",
    "charactersList",
    "data", // sometimes the file exports { data: { characters: [...] } }
  ];

  for (const key of candidates) {
    if (Array.isArray(mod[key])) return mod[key];
    if (Array.isArray(mod.default?.[key])) return mod.default[key];
  }

  // sometimes module exports an object where keys are types:
  if (mod.default && typeof mod.default === "object") {
    for (const k of Object.keys(mod.default)) {
      if (Array.isArray(mod.default[k]) && k.toLowerCase().includes("char")) {
        return mod.default[k];
      }
    }
  }

  return null;
}

/**
 * Try to find a generator function inside the module (generateCharacter, getCharacter, etc.)
 */
function findGeneratorFunction(mod) {
  if (!mod) return null;
  const fnNames = [
    "generateCharacter",
    "getCharacter",
    "characterGen",
    "createCharacter",
    "generate_character",
    "get_character",
  ];
  for (const n of fnNames) {
    if (typeof mod[n] === "function") return mod[n];
    if (typeof mod.default?.[n] === "function") return mod.default[n];
  }
  // if module default itself is a function, use it
  if (typeof mod.default === "function") return mod.default;
  if (typeof mod === "function") return mod;
  return null;
}

/**
 * Build readable text from a character entry object
 */
function formatCharacterText(entry) {
  if (!entry) return "";
  const lines = [];

  const name = entry.name || entry.title || entry.id || "Unknown";
  const role = entry.role || entry.class || entry.profession || "";
  if (role) lines.push(`${name} — ${role}`);
  else lines.push(name);

  if (entry.age) lines.push(`Age: ${entry.age}`);
  if (entry.backstory) lines.push(`\n${entry.backstory}`);
  else if (entry.description) lines.push(`\n${entry.description}`);
  if (entry.appearance) lines.push(`\nAppearance: ${entry.appearance}`);
  if (entry.traits && entry.traits.length) lines.push(`\nTraits: ${Array.isArray(entry.traits) ? entry.traits.join(", ") : entry.traits}`);
  if (entry.specialty) lines.push(`\nSpecialty: ${entry.specialty}`);
  if (entry.notes) lines.push(`\nNotes: ${entry.notes}`);

  return lines.join("\n");
}

/**
 * If a callAI helper exists in commonUtils, we'll attempt to import and use it.
 * This is optional — if it fails or returns nothing we silently fallback to local.
 */
async function tryAIExpansion(prompt, opts = {}) {
  try {
    // try importing a callAI helper
    const commonUtilsPath = path.resolve(process.cwd(), "generators", "commonUtils.js");
    if (!fs.existsSync(commonUtilsPath)) return null;
    const mod = await import(pathToFileURL(commonUtilsPath).href);
    const callAI = mod.callAI || mod.default?.callAI || mod.callOpenAI || null;
    if (!callAI || typeof callAI !== "function") return null;

    const aiText = await callAI(prompt, opts).catch(() => null);
    if (aiText && String(aiText).trim().length > 0) return String(aiText).trim();
    return null;
  } catch (err) {
    console.warn("[characterGen] AI call failed:", err?.message || err);
    return null;
  }
}

/**
 * Exported generator function used by server/routes/generate.js
 *
 * signature: async function(theme = 'fantasy', useAI = false, params = {})
 */
export default async function characterGen(theme = "fantasy", useAI = false, params = {}) {
  try {
    // 1) Import theme module (defensive)
    const mod = await importThemeModule(theme);
    // 2) Attempt to find a generator function first (preferred)
    const genFn = findGeneratorFunction(mod);

    if (genFn) {
      // generator function may accept (theme, params) or no args
      try {
        const maybe = await (genFn.length >= 1 ? genFn(theme, params) : genFn());
        // normalize if string or object
        if (!maybe) {
          // fall through to array approach
        } else if (typeof maybe === "string") {
          return { ok: true, title: "character", text: maybe, image: null, raw: maybe, meta: { theme, source: "local-fn" } };
        } else if (typeof maybe === "object") {
          const title = maybe.title || maybe.name || "character";
          const text = maybe.text || maybe.description || JSON.stringify(maybe, null, 2) || "";
          return { ok: true, title, text, image: maybe.image || null, raw: maybe, meta: { theme, source: "local-fn" } };
        }
      } catch (err) {
        console.warn("[characterGen] theme generator function threw:", err?.message || err);
        // continue to try array fallback
      }
    }

    // 3) Try array extraction
    const arr = extractCharacterArray(mod);

    if (Array.isArray(arr) && arr.length > 0) {
      const picked = pickRandom(arr);
      const text = formatCharacterText(picked);

      // If AI requested, try to expand with AI
      if (useAI) {
        // Build a prompt summarizing the picked entry
        const promptParts = [
          `Create a vivid, 2-paragraph character bio for a ${theme} setting.`,
          `Name: ${picked.name || picked.title || "Unknown"}`,
          picked.role ? `Role: ${picked.role}` : "",
          picked.traits ? `Traits: ${Array.isArray(picked.traits) ? picked.traits.join(", ") : picked.traits}` : "",
          picked.backstory ? `Backstory: ${picked.backstory}` : "",
          "Keep it flavorful and suitable as a game NPC description."
        ].filter(Boolean).join("\n");

        const aiResult = await tryAIExpansion(promptParts, { provider: params.aiProvider || "auto", model: params.aiModel, temperature: params.temperature ?? 0.8 });
        if (aiResult) {
          return { ok: true, title: picked.name || "character", text: aiResult, image: picked.image || null, raw: picked, meta: { theme, source: "ai+local" } };
        }
      }

      // Local-only response
      return { ok: true, title: picked.name || "character", text: text || "No description available.", image: picked.image || null, raw: picked, meta: { theme, source: "local" } };
    }

    // 4) No data found — return explicit fallback message
    return { ok: true, title: "character", text: "No character data available for this theme.", image: null, raw: null, meta: { theme, source: "no-data" } };
  } catch (err) {
    console.error("[characterGen] unexpected error:", err);
    return { ok: false, title: "character", text: `Error generating character: ${err?.message || err}`, image: null, raw: null, meta: { theme, source: "error" } };
  }
}
