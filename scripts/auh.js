// server/lib/auth.js
import admin from "firebase-admin";
import fs from "fs";
import path from "path";

let firebaseApp;
try {
  if (!admin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const creds = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      firebaseApp = admin.initializeApp({
        credential: admin.credential.cert(creds),
      });
      console.log("[INFO] Firebase Admin initialized from env FIREBASE_SERVICE_ACCOUNT_JSON");
    } else {
      const servicePath = path.join(process.cwd(), "server", "firebase", "service-account.json");
      if (fs.existsSync(servicePath)) {
        const creds = JSON.parse(fs.readFileSync(servicePath, "utf-8"));
        firebaseApp = admin.initializeApp({
          credential: admin.credential.cert(creds),
        });
        console.log("[INFO] Firebase Admin initialized from server/firebase/service-account.json");
      } else {
        console.warn("[WARN] Firebase Admin not configured — ID token verification will fail");
      }
    }
  }
} catch (err) {
  console.error("[ERROR] Failed to initialize Firebase Admin:", err.message);
}

export async function verifyFirebaseToken(req, res, next) {
  try {
    const authHeader = req.headers["authorization"] || "";
    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match) {
      return res.status(401).json({ error: "Missing or invalid Authorization header" });
    }
    const idToken = match[1];
    if (!firebaseApp) {
      return res.status(500).json({ error: "Firebase Admin not configured on server" });
    }
    const decoded = await admin.auth().verifyIdToken(idToken);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("[ERROR] Token verification failed:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
}

export const verifyAuthMiddleware = verifyFirebaseToken;
