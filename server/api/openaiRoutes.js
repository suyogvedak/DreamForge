// server/api/openaiRoutes.js
import express from "express";
import { callOpenAI, generateImage } from "./openaiClient.js";
import { optionalVerifyFirebaseToken } from "../middleware/verifyFirebaseToken.js";
import { runGenerator } from "../lib/generatorRunner.js"; // local fallback

const router = express.Router();

// Detect themes from body or header
function resolveThemes(req) {
  const fromBody = req.body?.themes;
  if (Array.isArray(fromBody) && fromBody.length) return fromBody;
  if (req.body?.theme) return [req.body.theme];
  const header = req.headers["x-theme"] || req.headers["x_theme"];
  if (header) return header.split(",").map(s => s.trim()).filter(Boolean);
  return ["Fantasy", "Sci-Fi", "Cyberpunk"];
}

// Build prompts for each type
const templates = {
  character: (t) => `Generate a ${t} character with name, race/species, abilities, personality, and backstory.`,
  weapon: (t) => `Generate a ${t} weapon: include name, type, abilities, rarity, and lore.`,
  quest: (t) => `Generate a ${t} quest: title, objective, difficulty (1-10), NPCs, rewards, and moral choices.`,
  story: (t) => `Write a short ${t} story outline with a beginning, middle, and end.`,
  world: (t) => `Describe a ${t} world with name, terrain, climate, culture, magic/technology, conflicts, and landmarks.`,
  logo: (t) => `Generate a logo concept for a ${t} game. Include style, colors, and iconography.`,
};

async function generateForType(type, theme, params = {}, user = null) {
  const prompt = templates[type]?.(theme);
  if (!prompt) throw new Error("Unknown type: " + type);

  try {
    if (type === "logo") {
      const imageUrl = await generateImage(prompt, params.size || "512x512");
      return { ok: true, source: "openai", theme, result: { prompt, imageUrl } };
    }
    const system = `You are a generator that outputs structured content for ${type} in the ${theme} theme.`;
    const text = await callOpenAI(prompt, system);
    return { ok: true, source: "openai", theme, result: text };
  } catch (err) {
    console.warn(`[openaiRoutes] OpenAI failed for ${type}/${theme}, falling back to local:`, err.message);
    try {
      const local = await runGenerator({ kind: type, theme, params, seed: params.seed, user });
      return { ok: true, source: "local", theme, result: local };
    } catch (localErr) {
      console.error(`[openaiRoutes] Local generator failed for ${type}/${theme}:`, localErr.message);
      return { ok: false, theme, error: "Both OpenAI and local generator failed" };
    }
  }
}

// Generic route
router.post("/openai/generate/:type", optionalVerifyFirebaseToken, async (req, res) => {
  const { type } = req.params;
  const themes = resolveThemes(req);
  const params = req.body?.params || {};
  const user = req.user || null;

  const results = [];
  for (const theme of themes) {
    results.push(await generateForType(type, theme, params, user));
  }

  res.json({ ok: true, type, requestedThemes: themes, results });
});

// Convenience endpoints for each type
["character", "weapon", "quest", "story", "world", "logo"].forEach((t) => {
  router.post(`/openai/${t}`, optionalVerifyFirebaseToken, async (req, res) => {
    const themes = resolveThemes(req);
    const params = req.body?.params || {};
    const user = req.user || null;

    const results = [];
    for (const theme of themes) {
      results.push(await generateForType(t, theme, params, user));
    }

    res.json({ ok: true, type: t, requestedThemes: themes, results });
  });
});

export default router;
