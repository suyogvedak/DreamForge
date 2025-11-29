// generators/logoGen.js
import { pickRandom, formatOutput, importDataModule, callAI } from "./commonUtils.js";
import { Buffer } from "buffer";

export default async function logoGen(theme = "fantasy", useAI = false, params = {}) {
  // Try to get a logo dataset entry if available
  const dataModule = await importDataModule(theme);
  const list = (dataModule && (dataModule.logos || dataModule[`${theme}Logos`])) || [];

  const base = pickRandom(list) || { name: `${theme} logo`, prompt: `${theme} emblem` };

  const basePrompt = base.prompt || base.description || `Design a ${theme} themed logo concept named "${base.name}"`;

  const autoAI = params.autoAI || false;
  const canAI = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  const shouldAI = useAI || (autoAI && canAI);

  let text = base.description || basePrompt;

  if (shouldAI) {
    try {
      text = await callAI(`Create a short creative design brief for a logo: ${basePrompt}`, { provider: params.aiProvider || "auto", model: params.aiModel, temperature: params.temperature ?? 0.7 });
    } catch (err) {
      console.warn("[logoGen] AI failed:", err?.message || err);
      text = base.description || basePrompt;
    }
  }

  // Generate a simple SVG placeholder image (inline data URI)
  const bg = theme === "cyberpunk" ? "#0b0f1a" : theme === "scifi" ? "#081b2a" : "#102022";
  const fg = theme === "cyberpunk" ? "#00f0ff" : theme === "scifi" ? "#7fe0ff" : "#c0a0ff";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="300">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" fill="${fg}" font-family="Verdana, Arial" font-size="48" text-anchor="middle" dominant-baseline="middle">${(base.name || theme).toUpperCase()}</text>
  </svg>`;
  const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;

  return formatOutput("logo", { title: base.name || `${theme} Logo`, text, image, raw: base }, { theme, source: shouldAI ? "ai" : "local" });
}
