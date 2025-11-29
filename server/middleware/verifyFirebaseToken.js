// server/middleware/verifyFirebaseToken.js
import admin from "firebase-admin";

if (!admin.apps.length) {
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    // Fix private key formatting (replace escaped \n with real newlines)
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n");

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey,
      }),
    });
    console.log("[firebase] Initialized from environment variables");
  } else {
    console.warn("[firebase] Missing Firebase env vars. Token verification disabled.");
  }
}

export const verifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error("[firebase] Invalid token:", err?.message || err);
    res.status(403).json({ message: "Invalid or expired token" });
  }
};

// Optional middleware: doesn’t block if no token or Firebase not set
export const optionalVerifyFirebaseToken = async (req, res, next) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  if (!token || !admin.apps.length) {
    req.user = null;
    return next();
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.user = decodedToken;
  } catch (err) {
    req.user = null;
  }
  next();
};

export default verifyFirebaseToken;
