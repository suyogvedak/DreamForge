// server/lib/auth.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let initialized = false;

export function initFirebaseAdmin() {
  if (initialized) return admin;

  // Option A: env vars (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    initialized = true;
    console.log("[firebase] Initialized from env variables.");
    return admin;
  }

  // Option B: JSON file path
  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT || path.join(__dirname, "..", "firebase", "serviceAccount.json");
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, "utf8"));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    initialized = true;
    console.log("[firebase] Initialized from serviceAccount file:", saPath);
    return admin;
  }

  console.warn("[firebase] No credentials found — token verification disabled.");
  return null;
}

/**
 * Returns express middleware that verifies ID token and sets req.user
 * If Firebase not configured, returns a dev-pass-through middleware (req.user = null)
 * IMPORTANT: In production you should ensure Firebase is configured and do not use the pass-through.
 */
export function verifyAuthMiddleware() {
  const adminSdk = initFirebaseAdmin();
  if (!adminSdk) {
    // dev fallback
    return (req, res, next) => {
      req.user = null;
      next();
    };
  }

  return async (req, res, next) => {
    try {
      const header = req.headers.authorization || req.headers.Authorization;
      if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ ok: false, error: "missing_token" });
      }
      const idToken = header.split(" ")[1];
      const decoded = await adminSdk.auth().verifyIdToken(idToken);
      req.user = decoded; // { uid, email, ... }
      next();
    } catch (err) {
      console.error("[auth] Token verify failed:", err && err.message);
      return res.status(401).json({ ok: false, error: "invalid_token" });
    }
  };
}
