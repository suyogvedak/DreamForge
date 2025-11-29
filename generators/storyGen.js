// generators/storyGen.js
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
        console.warn(`[storyGen] failed to import ${p}:`, err?.message || err);
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
      if (Array.isArray(mod.default[k]) && (k.toLowerCase().includes("story") || k.toLowerCase().includes("synopsis"))) return mod.default[k];
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

function formatStoryText(entry) {
  if (!entry) return "";
  if (entry.story) return entry.story;
  if (entry.text) return entry.text;
  const lines = [];
  if (entry.title) lines.push(entry.title);
  if (entry.summary) lines.push(entry.summary);
  if (entry.hook) lines.push(`Hook: ${entry.hook}`);
  if (entry.notes) lines.push(entry.notes);
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
    console.warn("[storyGen] AI expansion failed:", err?.message || err);
    return null;
  }
}

export default async function storyGen(theme = "fantasy", useAI = false, params = {}) {
  try {
    const mod = await importThemeModule(theme);

    const genFn = findGeneratorFunction(mod, ["generateStory", "getStory", "storyGen", "createStory"]);
    if (genFn) {
      try {
        const maybe = await (genFn.length >= 1 ? genFn(theme, params) : genFn());
        if (maybe && typeof maybe === "object") {
          const title = maybe.title || maybe.name || "Story";
          const text = maybe.text || maybe.story || maybe.summary || JSON.stringify(maybe, null, 2);
          return { ok: true, title, text, image: maybe.image || null, raw: maybe, meta: { theme, source: "local-fn" } };
        } else if (typeof maybe === "string") {
          return { ok: true, title: "Story", text: maybe, image: null, raw: maybe, meta: { theme, source: "local-fn" } };
        }
      } catch (err) {
        console.warn("[storyGen] generator function threw:", err?.message || err);
      }
    }

    const arr = extractArray(mod, ["stories", "synopses", "ideas", "seedStories"]);
    if (Array.isArray(arr) && arr.length > 0) {
      const picked = pickRandom(arr);
      const localText = formatStoryText(picked);

      if (useAI) {
        const prompt = `Write a 1-2 paragraph ${theme} story based on the following seed:\n\n${localText}`;
        const ai = await tryAIExpansion(prompt, { provider: params.aiProvider || "auto", model: params.aiModel, temperature: params.temperature ?? 0.8 });
        if (ai) {
          return { ok: true, title: picked.title || picked.name || "Story", text: ai, image: picked.image || null, raw: picked, meta: { theme, source: "ai+local" } };
        }
      }

      return { ok: true, title: picked.title || picked.name || "Story", text: localText || "No description available.", image: picked.image || null, raw: picked, meta: { theme, source: "local" } };
    }

    return { ok: true, title: "Story", text: "No story data available for this theme.", image: null, raw: null, meta: { theme, source: "no-data" } };
  } catch (err) {
    console.error("[storyGen] unexpected error:", err);
    return { ok: false, title: "Story", text: `Error generating story: ${err?.message || err}`, image: null, raw: null, meta: { theme, source: "error" } };
  }
}
