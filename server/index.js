// server/index.js
import dotenv from "dotenv";
import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath, pathToFileURL } from "url";

dotenv.config({ path: path.resolve(process.cwd(), "server", "..", "scripts", ".env") });

// --- Resolve important paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PAGES_DIR    = path.join(PROJECT_ROOT, "pages");
const SCRIPTS_DIR  = path.join(PROJECT_ROOT, "scripts");
const ROUTES_DIR   = path.join(__dirname, "routes");

const app = express();
const PORT = process.env.PORT || 3000;

console.log("[env-check] MONGO_URI present?", !!process.env.MONGO_URI);
console.log("[env-check] MONGO_DBNAME:", process.env.MONGO_DBNAME || process.env.MONGO_DB);

// --- Basic startup logs
console.log(`[server] PROJECT_ROOT = ${PROJECT_ROOT}`);
console.log(`[server] PAGES_DIR = ${PAGES_DIR} exists: ${fs.existsSync(PAGES_DIR)}`);
console.log(`[server] SCRIPTS_DIR = ${SCRIPTS_DIR} exists: ${fs.existsSync(SCRIPTS_DIR)}`);
console.log(`[server] ROUTES_DIR = ${ROUTES_DIR} exists: ${fs.existsSync(ROUTES_DIR)}`);

// --- Minimal request logger
app.use((req, res, next) => {
  if (req.path === "/favicon.ico") return res.status(204).end();
  console.log(`[HTTP] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// --- Serve static: pages/ at root, scripts/ at /scripts
if (fs.existsSync(PAGES_DIR)) {
  app.use(express.static(PAGES_DIR, { extensions: ["html"] }));
  console.log(`[server] serving pages/ -> ${PAGES_DIR}`);
}
if (fs.existsSync(SCRIPTS_DIR)) {
  app.use("/scripts", express.static(SCRIPTS_DIR));
  console.log(`[server] serving /scripts -> ${SCRIPTS_DIR}`);
}

// Serve uploads if you have them (optional)
const UPLOADS_DIR = path.join(PROJECT_ROOT, "uploads");
if (fs.existsSync(UPLOADS_DIR)) {
  app.use("/uploads", express.static(UPLOADS_DIR));
  console.log(`[server] serving /uploads -> ${UPLOADS_DIR}`);
}

// Root -> index.html from pages/
app.get("/", (req, res) => {
  const indexFile = path.join(PAGES_DIR, "index.html");
  if (fs.existsSync(indexFile)) return res.sendFile(indexFile);
  return res.status(404).send("index.html not found");
});

// Helper to dynamically import route modules, fallback if missing
async function mountRoute({ name, filename, mountPath, fallbackHandler }) {
  const full = path.join(ROUTES_DIR, filename);
  const fileUrl = pathToFileURL(full).href;

  try {
    const mod = await import(fileUrl);
    const router = mod?.default || mod;
    if (router && (typeof router === "function" || typeof router === "object")) {
      app.use(mountPath, router);
      console.log(`[server] mounted ${mountPath} -> ${full} (via import)`);
      return;
    }
    console.warn(`[server] ${name} did not export a router function/object: ${full}`);
  } catch (err) {
    console.warn(`[server] dynamic import failed for ${full} —`, err.message || err);
  }

  // fallback handler if dynamic import failed
  app.use(mountPath, (req, res) => {
    if (typeof fallbackHandler === "function") return fallbackHandler(req, res);
    return res.status(404).json({ ok: false, error: "not found" });
  });
  console.log(`[server] mounted FALLBACK for ${mountPath}`);
}

// --- Mount API routes (in order) -- adjust filenames if yours differ
await mountRoute({
  name: "generate",
  filename: "generate.js",
  mountPath: "/api/generate",
  fallbackHandler: (_req, res) => res.status(404).json({ ok: false, error: "not found" }),
});

await mountRoute({
  name: "model3d",
  filename: "model3d.js",
  mountPath: "/api/model3d",
  fallbackHandler: (_req, res) => res.status(404).json({ ok: false, error: "not found" }),
});

await mountRoute({
  name: "save",
  filename: "save.js",
  mountPath: "/api/save-content",
  fallbackHandler: (_req, res) => res.status(404).json({ ok: false, error: "not found" }),
});

// IMPORTANT: mount dashboard route (this fixes your 404)
await mountRoute({
  name: "dashboard",
  filename: "dashboard.js",
  mountPath: "/api/dashboard",
  fallbackHandler: (_req, res) => res.status(404).json({ ok: false, error: "not found" }),
});

// --- Scoped API 404 AFTER concrete API routes
app.use("/api", (_req, res) => {
  return res.status(404).json({ ok: false, error: "not found" });
});

// --- Final catch-all 404 for non-API requests
app.use((_req, res) => res.status(404).send("Not found"));

// --- Start server AFTER mounting all routes
app.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
