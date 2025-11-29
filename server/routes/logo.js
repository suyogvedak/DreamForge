// server/routes/logo.js
import express from "express";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

async function loadModule(fileRelPath) {
  const fullPath = path.resolve(__dirname, "..", "..", "generators", fileRelPath);
  const url = pathToFileURL(fullPath).href;
  return import(url);
}

function findLogoFn(mod) {
  if (mod?.default && typeof mod.default === "function") return mod.default;
  if (typeof mod.generate === "function") return mod.generate;
  if (typeof mod.logoGen === "function") return mod.logoGen;
  // any function fallback
  for (const k of Object.keys(mod)) {
    if (typeof mod[k] === "function") return mod[k];
  }
  return null;
}

async function tryFormatOutput(result, meta = {}) {
  try {
    const mod = await loadModule("commonUtils.js");
    const formatOutput = mod?.formatOutput ?? mod?.default ?? null;
    if (typeof formatOutput === "function") return formatOutput(result, meta);
  } catch (err) {}
  return result;
}

router.post("/", async (req, res) => {
  try {
    const mod = await loadModule("logoGen.js");
    const fn = findLogoFn(mod);
    if (!fn) {
      return res.status(503).json({ ok: false, error: "Logo generator is not available on this server." });
    }

    const params = req.body || {};
    // call - either (params) or (theme, params)
    let out;
    if (fn.length >= 2) {
      const theme = String(params.theme ?? "generic");
      out = await fn(theme, params);
    } else {
      out = await fn(params);
    }

    const formatted = await tryFormatOutput(out, { type: "logo", input: params });
    return res.json({ ok: true, result: formatted });
  } catch (err) {
    console.error("[logo] error:", err);
    return res.status(500).json({ ok: false, error: `Logo generation failed: ${err?.message || err}` });
  }
});

export default router;
