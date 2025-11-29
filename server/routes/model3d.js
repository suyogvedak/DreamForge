// server/routes/model3d.js
import express from "express";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Attempt to load a generic 3D pipeline (model3d.js) or type-specific (model3d_<type>.js)
async function tryLoad3DPipeline(type) {
  const candidates = [`model3d.js`, `model3d_${type}.js`];
  for (const c of candidates) {
    try {
      const full = path.resolve(__dirname, "..", "..", "generators", c);
      const url = pathToFileURL(full).href;
      const mod = await import(url);
      // find default or named export
      const fn = mod?.default ?? mod?.generate ?? mod?.pipeline ?? null;
      if (typeof fn === "function") return { fn, source: c };
    } catch (err) {
      // ignore and try next
    }
  }
  return null;
}

router.post("/:type", async (req, res) => {
  const type = String(req.params.type || "unknown");
  try {
    const pipeline = await tryLoad3DPipeline(type);
    if (!pipeline) {
      const tried = ["model3d.js", `model3d_${type}.js`].join(", ");
      return res.status(503).json({
        ok: false,
        error: `3D model pipeline for type '${type}' is not available. Tried: ${tried}`,
      });
    }

    // call pipeline with body params; pipeline may return { url } or a result object
    const params = req.body || {};
    let result;
    if (pipeline.fn.length >= 2) {
      result = await pipeline.fn(type, params);
    } else {
      result = await pipeline.fn({ type, ...params });
    }

    // Accept either { url } or general object
    return res.json({ ok: true, result });
  } catch (err) {
    console.error(`[model3d] ${type} pipeline error:`, err);
    return res.status(500).json({
      ok: false,
      error: `.glb generation failed: ${err?.message || String(err)}`,
    });
  }
});

export default router;
