// server/routes/clickTracker.js
import express from "express";

const router = express.Router();

// In-memory map: key = client identifier (IP or session id), value = { type, time }
const lastClicks = new Map();

/**
 * Store the last clicked generator type for this client.
 * Expects body: { type: "character" | "weapon" | "world" | ... }
 */
router.post("/", (req, res) => {
  try {
    const ip = req.ip || (req.headers && req.headers["x-forwarded-for"]) || "unknown";
    const { type } = req.body || {};

    if (type && typeof type === "string") {
      lastClicks.set(ip, { type: String(type).toLowerCase(), time: Date.now() });
      // keep map small: prune older than 30s occasionally
      if (lastClicks.size > 200) {
        const cutoff = Date.now() - 30000;
        for (const [k, v] of lastClicks.entries()) {
          if (v.time < cutoff) lastClicks.delete(k);
        }
      }
      // log for debug
      console.log(`[clickTracker] stored click for ${ip}: ${type}`);
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[clickTracker] error:", err);
    res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

/**
 * Export helper for server-side lookup.
 * Note: we export it as a named export for generate route to import.
 */
export function getLastClickType(req) {
  const ip = req.ip || (req.headers && req.headers["x-forwarded-for"]) || "unknown";
  const rec = lastClicks.get(ip);
  if (!rec) return null;
  // only valid if recent (5s)
  if (Date.now() - rec.time > 5000) {
    lastClicks.delete(ip);
    return null;
  }
  // consume the click once so subsequent generates won't reuse it accidentally
  lastClicks.delete(ip);
  return rec.type;
}

export default router;
