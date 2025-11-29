// generators/worldGen.js
import fs from "fs";
import path from "path";
import { pathToFileURL } from "url";

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
        return await import(pathToFileURL(p).href);
      } catch (err) {
        console.warn(`[worldGen] failed to import ${p}:`, err?.message || err);
      }
    }
  }
  return null;
}

function pickRandom(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  return arr[Math.floor(Math.random() * arr.length)];
}

function extractArray(mod, keys) {
  if (!mod) return null;
  if (Array.isArray(mod)) return mod;
  if (Array.isArray(mod.default)) return mod.default;
  for (const k of keys) {
    if (Array.isArray(mod[k])) return mod[k];
    if (Array.isArray(mod.default?.[k])) return mod.default[k];
  }
  if (mod.default && typeof mod.default === "object") {
    for (const k of Object.keys(mod.default)) {
      if (Array.isArray(mod.default[k]) && k.toLowerCase().includes("world")) return mod.default[k];
    }
  }
  return null;
}

function findGeneratorFunction(mod, fnNames) {
  if (!mod) return null;
  for (const n of fnNames) {
    if (typeof mod[n] === "function") return mod[n];
    if (typeof mod.default?.[n] === "function") return mod.default[n];
  }
  if (typeof mod.default === "function") return mod.default;
  if (typeof mod === "function") return mod;
  return null;
}

function formatWorldText(entry) {
  if (!entry) return "";
  const lines = [];
  const name = entry.name || entry.title || "Unnamed World";
  lines.push(name);
  if (entry.tagline) lines.push(`Tagline: ${entry.tagline}`);
  if (entry.climate) lines.push(`Climate: ${entry.climate}`);
  if (entry.terrain) lines.push(`Terrain: ${entry.terrain}`);
  if (entry.culture) lines.push(`Culture: ${entry.culture}`);
  if (entry.conflict) lines.push(`Conflict: ${entry.conflict}`);
  if (entry.landmarks) {
    const lm = Array.isArray(entry.landmarks) ? entry.landmarks.join(", ") : entry.landmarks;
    lines.push(`Landmarks: ${lm}`);
  }
  if (entry.description) lines.push(`\n${entry.description}`);
  return lines.join("\n\n");
}

async function tryAIExpansion(prompt, opts = {}) {
  try {
    const cuPath = path.resolve(process.cwd(), "generators", "commonUtils.js");
    if (!fs.existsSync(cuPath)) return null;
    const cu = await import(pathToFileURL(cuPath).href);
    const callAI = cu.callAI || cu.default?.callAI || cu.callOpenAI || null;
    if (!callAI || typeof callAI !== "function") return null;
    const ai = await callAI(prompt, opts).catch(() => null);
    return ai || null;
  } catch (err) {
    console.warn("[worldGen] AI expansion failed:", err?.message || err);
    return null;
  }
}

export default async function worldGen(theme = "fantasy", useAI = false, params = {}) {
  try {
    const mod = await importThemeModule(theme);

    // Try a generator function first
    const genFn = findGeneratorFunction(mod, ["generateWorld", "getWorld", "worldGen", "createWorld"]);
    if (genFn) {
      try {
        const maybe = await (genFn.length >= 1 ? genFn(theme, params) : genFn());
        if (maybe && typeof maybe === "object") {
          const title = maybe.title || maybe.name || "World";
          const text = maybe.text || maybe.description || JSON.stringify(maybe, null, 2);
          return { ok: true, title, text, image: maybe.image || null, raw: maybe, meta: { theme, source: "local-fn" } };
        } else if (typeof maybe === "string") {
          return { ok: true, title: "World", text: maybe, image: null, raw: maybe, meta: { theme, source: "local-fn" } };
        }
      } catch (err) {
        console.warn("[worldGen] generator function threw:", err?.message || err);
      }
    }

    // Try array extraction
    const arr = extractArray(mod, ["worlds", "locations", "maps"]);
    if (Array.isArray(arr) && arr.length > 0) {
      const picked = pickRandom(arr);
      const localText = formatWorldText(picked);

      if (useAI) {
        const prompt = `Write two descriptive paragraphs about this world for a ${theme} setting.\n\n${localText}`;
        const ai = await tryAIExpansion(prompt, { provider: params.aiProvider || "auto", model: params.aiModel, temperature: params.temperature ?? 0.7 });
        if (ai) {
          return { ok: true, title: picked.name || "World", text: ai, image: picked.image || null, raw: picked, meta: { theme, source: "ai+local" } };
        }
      }

      return { ok: true, title: picked.name || "World", text: localText || "No description available.", image: picked.image || null, raw: picked, meta: { theme, source: "local" } };
    }

    return { ok: true, title: "World", text: "No world data available for this theme.", image: null, raw: null, meta: { theme, source: "no-data" } };
  } catch (err) {
    console.error("[worldGen] unexpected error:", err);
    return { ok: false, title: "World", text: `Error generating world: ${err?.message || err}`, image: null, raw: null, meta: { theme, source: "error" } };
  }
}
