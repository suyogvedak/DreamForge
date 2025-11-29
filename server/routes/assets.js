// server/routes/assets.js
// Serves static/public assets if needed

import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Example: static files under /public/assets
router.use("/", express.static(path.join(__dirname, "../../public/assets")));

export default router;
