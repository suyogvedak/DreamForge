// server/routes/convertSvg.js
import express from "express";
import { Buffer } from "buffer";

let sharp;
try {
  // attempt to load sharp if installed
  sharp = await import("sharp").then(m => m.default || m);
} catch (e) {
  // sharp not available — we'll fallback to returning the raw SVG as an attachment
  sharp = null;
}

const router = express.Router();

/*
POST /api/convert-svg
Body JSON: { svg: "<svg ...>...</svg>" }   OR { svgBase64: "PHN2ZyB..." }
Response: streams PNG bytes with content-type image/png
*/
router.post("/", async (req, res) => {
  try {
    const { svg, svgBase64, width = 1200, height = 600, pngQuality = 90 } = req.body || {};

    if (!svg && !svgBase64) {
      return res.status(400).json({ ok: false, error: "Missing 'svg' or 'svgBase64' in request body" });
    }

    // decode base64 if provided
    let svgBuffer;
    if (svgBase64) {
      svgBuffer = Buffer.from(svgBase64, "base64");
    } else {
      svgBuffer = Buffer.from(String(svg), "utf8");
    }

    // If we have sharp, convert to PNG with requested size
    if (sharp) {
      try {
        // sharp auto-detects SVG input; we set the output PNG size
        const pngBuffer = await sharp(svgBuffer)
          .resize({ width: Number(width) || 1200, height: Number(height) || 600, fit: "contain" })
          .png({ quality: Number(pngQuality) || 90 })
          .toBuffer();

        res.setHeader("Content-Type", "image/png");
        res.setHeader("Content-Disposition", `attachment; filename="dreamforge-logo.png"`);
        // optional cache header
        res.setHeader("Cache-Control", "no-store");
        return res.send(pngBuffer);
      } catch (sharpErr) {
        console.error("[convertSvg] sharp conversion error:", sharpErr && sharpErr.message);
        // fall through to sending raw SVG as fallback
      }
    }

    // Fallback: return the SVG file as attachment (no rasterization)
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Content-Disposition", `attachment; filename="dreamforge-logo.svg"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(svgBuffer);
  } catch (err) {
    console.error("[convertSvg] unexpected error:", err && err.message);
    return res.status(500).json({ ok: false, error: "Server error during conversion" });
  }
});

export default router;
