// server/routes/dashboard.js
import express from "express";
import { MongoClient } from "mongodb";

const router = express.Router();

const MONGO_URI = process.env.MONGO_URI || null;
const DB_NAME = process.env.MONGO_DBNAME || process.env.MONGO_DB || "dreamforge";
if (!MONGO_URI) console.warn("[dashboard] MONGO_URI not set - route will fail until configured.");

let cachedClient = null;
let cachedDb = null;
async function getDb() {
  if (cachedDb) return cachedDb;
  if (!MONGO_URI) throw new Error("MONGO_URI not configured");
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  cachedClient = client;
  cachedDb = client.db(DB_NAME);
  return cachedDb;
}

/**
 * Pattern map: keys are logical types and regex matches collection names likely to contain those items.
 * Adjust/add patterns if your collection names are different.
 */
const COLLECTION_PATTERNS = [
  { key: "character", regex: /char/i },
  { key: "weapon",    regex: /weap|wepon|weapon/i },
  { key: "quest",     regex: /quest/i },
  { key: "story",     regex: /story/i },
  { key: "world",     regex: /world/i },
  { key: "logo",      regex: /logo/i },
  { key: "3d",        regex: /3d|3d-?|assets/i } // matches 3dAssets, 3d-assets, assets
];

function buildOwnerFilter(uid, userEmail) {
  const ownerClauses = [];
  if (uid) ownerClauses.push({ uid }, { "user.uid": uid }, { "user.id": uid }, { ownerId: uid }, { "owner.uid": uid });
  if (userEmail) ownerClauses.push({ userEmail }, { "user.email": userEmail }, { ownerEmail: userEmail }, { email: userEmail });
  // if no clauses, return {} upstream will validate
  return ownerClauses.length ? { $or: ownerClauses } : {};
}

// GET /api/dashboard/:uid?userEmail=...&q=...&limit=...&debug=true
router.get("/:uid?", async (req, res) => {
  try {
    const uidParam = req.params.uid;
    const uidQuery = req.query.uid;
    const uid = (uidParam && String(uidParam) !== "undefined") ? uidParam
              : (uidQuery && String(uidQuery) !== "undefined") ? uidQuery
              : null;

    const q = (req.query.q || "").trim();
    const userEmail = (req.query.userEmail || "").trim() || null;
    const debug = String(req.query.debug || "").toLowerCase() === "true";
    const limit = Math.min(Math.max(parseInt(req.query.limit || "200", 10), 1), 2000);

    if (!uid && !userEmail) return res.status(400).json({ ok: false, error: "uid or userEmail required" });
    if (!MONGO_URI) return res.status(500).json({ ok: false, error: "Server not configured with MongoDB (MONGO_URI missing)." });

    const db = await getDb();

    // Discover collections in DB
    const collInfos = await db.listCollections().toArray();
    const collNames = collInfos.map(c => c.name);
    if (debug) console.log("[dashboard] discovered collections:", collNames);

    // Match discovered collections against patterns
    const matchedCollections = new Map(); // colName -> logical key
    for (const name of collNames) {
      for (const pat of COLLECTION_PATTERNS) {
        if (pat.regex.test(name)) {
          // If a collection matches multiple patterns, keep first mapping only
          if (!matchedCollections.has(name)) matchedCollections.set(name, pat.key);
        }
      }
    }

    // If nothing matched but there are collections, as a last resort query any collection that looks non-system
    if (matchedCollections.size === 0) {
      for (const name of collNames) {
        if (!name.startsWith("system.") && !name.startsWith("tmp")) matchedCollections.set(name, "unknown");
      }
    }

    const ownerFilter = buildOwnerFilter(uid, userEmail);
    // Build search filter if q present
    let finalFilter = ownerFilter;
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "i");
      finalFilter = {
        $and: [
          ownerFilter,
          { $or: [{ title: re }, { text: re }, { type: re }, { theme: re }, { "meta.theme": re }] }
        ]
      };
    }

    const perCollectionCounts = {};
    let allItems = [];

    // Query each matched collection
    for (const [colName, logicalKey] of matchedCollections) {
      try {
        const col = db.collection(colName);
        const docs = await col.find(finalFilter).toArray();
        perCollectionCounts[colName] = docs.length || 0;
        const normalized = docs.map(d => {
          const copy = { ...d, collection: colName, logicalType: logicalKey };
          if (copy._id && copy._id.toString) copy._id = copy._id.toString();
          return copy;
        });
        allItems.push(...normalized);
      } catch (e) {
        console.warn("[dashboard] error querying", colName, e.message || e);
        perCollectionCounts[colName] = -1;
      }
    }

    // sort merged array by createdAt desc
    allItems.sort((a,b) => new Date(b.createdAt || b.timestamp || 0) - new Date(a.createdAt || a.timestamp || 0));
    // apply limit
    if (allItems.length > limit) allItems = allItems.slice(0, limit);

    if (debug) {
      return res.json({
        ok: true,
        items: allItems,
        debug: {
          collectionsDiscovered: collNames,
          collectionsMatched: Array.from(matchedCollections.entries()).map(([n,k])=>({ name:n, key:k })),
          perCollectionCounts,
          ownerFilter,
          totalReturned: allItems.length
        }
      });
    }

    return res.json({ ok: true, items: allItems });
  } catch (err) {
    console.error("[dashboard] error:", err && (err.stack || err.message || err));
    return res.status(500).json({ ok: false, error: "Dashboard fetch failed", details: err?.message || String(err) });
  }
});

export default router;
