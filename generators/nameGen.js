// generators/nameGen.js
import { pickRandom, formatOutput, importDataModule, callAI } from "./commonUtils.js";

export default async function nameGen(theme = "fantasy", useAI = false, params = {}) {
  // Attempt to load name pools from data
  const dataModule = await importDataModule(theme);
  const pool = (dataModule && (dataModule.names || dataModule[`${theme}Names`])) || null;

  // fallback simple pools
  const fallbackPools = {
    fantasy: ["Eldor", "Lyra", "Thalor", "Seraphine", "Mirel"],
    cyberpunk: ["ZeroX", "NeonGhost", "Kira-7", "Synthra", "Vektor"],
    scifi: ["Xelara", "Targon", "Quorix", "Veyra", "Orion"]
  };

  const candidate = pickRandom(Array.isArray(pool) && pool.length ? pool : fallbackPools[theme] || fallbackPools.fantasy);

  const autoAI = params.autoAI || false;
  const canAI = Boolean(process.env.OPENAI_API_KEY || process.env.GEMINI_API_KEY);
  const shouldAI = useAI || (autoAI && canAI);

  if (!shouldAI) {
    return formatOutput("name", { title: "Generated Name", text: candidate }, { theme, source: "local" });
  }

  const prompt = `Provide one original ${theme} name similar in style to "${candidate}". Output only the name.`;

  try {
    const ai = await callAI(prompt, { provider: params.aiProvider || "auto", model: params.aiModel, temperature: params.temperature ?? 0.8, maxTokens: 32 });
    // keep only the first line
    const name = (ai || "").split("\n")[0].trim() || candidate;
    return formatOutput("name", { title: "Generated Name", text: name }, { theme, source: "ai" });
  } catch (err) {
    console.warn("[nameGen] AI failed:", err?.message || err);
    return formatOutput("name", { title: "Generated Name", text: candidate }, { theme, source: "local" });
  }
}
