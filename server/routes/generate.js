// server/routes/generate.js
import express from "express";
import path from "path";
import fs from "fs";
import { pathToFileURL, fileURLToPath } from "url";
import { Buffer } from "buffer";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = process.cwd();
const GENERATORS_DIR = path.resolve(PROJECT_ROOT, "generators");

const GENERATOR_MAP = {
  character: "characterGen.js",
  world: "worldGen.js",
  weapon: "weaponGen.js",
  quest: "questGen.js",
  story: "storyGen.js",
  logo: "logoGen.js",
  name: "nameGen.js",
};

function findGeneratorFile(filename) {
  const candidates = [
    path.resolve(GENERATORS_DIR, filename),
    path.resolve(PROJECT_ROOT, "server", "generators", filename),
    path.resolve(PROJECT_ROOT, "generators", filename),
  ];
  for (const p of candidates) if (fs.existsSync(p)) return p;
  throw new Error(`Generator file not found: ${filename}\nTried:\n${candidates.join("\n")}`);
}

async function loadGenerator(type) {
  const filename = GENERATOR_MAP[type];
  if (!filename) throw new Error(`Unsupported generator type: ${type}`);
  const file = findGeneratorFile(filename);
  const mod = await import(pathToFileURL(file).href);
  const fn = mod.default || mod[`${type}Gen`] || Object.values(mod).find(v => typeof v === 'function');
  if (!fn) throw new Error(`Generator module ${filename} exports no callable function`);
  return fn;
}

function inferTheme(req) {
  const bodyTheme = req.body?.theme;
  const queryTheme = req.query?.theme;
  if (bodyTheme) return String(bodyTheme).toLowerCase();
  if (queryTheme) return String(queryTheme).toLowerCase();
  const r = (req.headers.referer || "").toLowerCase();
  if (r.includes("cyberpunk")) return "cyberpunk";
  if (r.includes("scifi") || r.includes("sci-fi")) return "scifi";
  return "fantasy";
}

function inferType(req) {
  const bodyType = req.body?.type;
  const queryType = req.query?.type;
  if (bodyType) return String(bodyType).toLowerCase();
  if (queryType) return String(queryType).toLowerCase();
  const r = (req.headers.referer || "").toLowerCase();
  for (const t of Object.keys(GENERATOR_MAP)) if (r.includes(t)) return t;
  return "character";
}

// Only provide SVG fallback for logo
function makeLogoSVG(title = "Logo", theme = "generic", w = 1200, h = 600) {
  const bg = theme === "cyberpunk" ? "#050816" : theme === "scifi" ? "#081026" : "#102020";
  const fg = theme === "cyberpunk" ? "#00f0ff" : theme === "scifi" ? "#7fe0ff" : "#c0a0ff";
  const safe = String(title).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <rect width="100%" height="100%" fill="${bg}"/>
    <text x="50%" y="50%" fill="${fg}" font-family="Arial, Helvetica, sans-serif" font-size="${Math.floor(w/12)}" text-anchor="middle" dominant-baseline="middle">${safe}</text>
  </svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

function normalizeRawResult(type, theme, raw) {
  // Return object: { ok, type, title, text, image, raw, meta }
  const out = {
    ok: true,
    type,
    title: (raw && (raw.title || raw.name)) || type,
    text: "",
    image: null,
    raw,
    meta: { theme, normalizedAt: new Date().toISOString() }
  };

  if (!raw) {
    out.text = `${type} generator returned no result`;
    return out;
  }

  if (typeof raw === "string") {
    out.text = raw;
    return out;
  }

  // if generator returned normalized shape already
  if (raw.ok && (raw.text || raw.title || raw.image)) {
    out.title = raw.title || out.title;
    out.text = raw.text || raw.description || "";
    out.image = raw.image || null;
    out.raw = raw.raw || raw;
    out.meta = { ...(raw.meta || {}), theme, normalizedAt: out.meta.normalizedAt };
    return out;
  }

  // generic mapping
  out.title = raw.title || raw.name || out.title;
  out.text = raw.text || raw.description || raw.story || JSON.stringify(raw, null, 2);
  out.image = raw.image || raw.imageData || raw.dataUri || raw.svg || null;
  out.raw = raw;
  return out;
}

router.post("/", express.json({ limit: "512kb" }), async (req, res) => {
  try {
    console.log("[/api/generate] HEADERS:", { referer: req.headers.referer, "content-type": req.headers["content-type"] });
    console.log("[/api/generate] QUERY:", req.query);
    console.log("[/api/generate] BODY:", req.body);

    const theme = inferTheme(req);
    const type = inferType(req);
    console.log(`[generate-debug] theme=${theme}, type=${type}`);

    const genFn = await loadGenerator(type);
    const rawResult = await genFn(theme, req.body?.useAI || false, req.body?.params || {});

    const normalized = normalizeRawResult(type, theme, rawResult);

    // Logo fallback only
    if (type === "logo" && !normalized.image) {
      normalized.image = makeLogoSVG(normalized.title || `${theme} logo`, theme);
      normalized.meta.fallbackImage = true;
    }

    if (!normalized.text || !String(normalized.text).trim()) {
      normalized.text = `(No textual description returned by ${type} generator)\n\n` + JSON.stringify(normalized.raw || {}, null, 2);
    }

    console.log("[/api/generate] normalized keys:", Object.keys(normalized));
    // Respond with both 'data' and top-level convenience fields
    res.json({
      ok: true,
      theme,
      type,
      data: normalized,
      text: normalized.text,
      title: normalized.title,
      image: normalized.image,
      meta: normalized.meta
    });
  } catch (err) {
    console.error("[/api/generate] error:", err);
    res.status(500).json({ ok: false, error: String(err.message || err) });
  }
});

export default router;
