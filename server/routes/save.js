// server/routes/save.js
// MongoDB Atlas primary; local file fallback.
// Exports: default router (ESM)

import express from "express";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { MongoClient, ObjectId } from "mongodb";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// ---- Config / env ----
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_DB_URI || null;
const MONGO_DBNAME = process.env.MONGO_DBNAME || process.env.MONGO_DB || "DreamForge";
const USE_LOCAL_FALLBACK = String(process.env.USE_LOCAL_SAVES || "").toLowerCase() === "true";

// ---- Collection mapping (incoming type -> Atlas collection) ----
const TYPE_TO_COLLECTION = {
  character: "characters",
  characters: "characters",

  logo: "logos",
  logos: "logos",

  log: "logs",
  logs: "logs",

  quest: "quests",
  quests: "quests",

  user: "users",
  users: "users",

  weapon: "weapon",
  weapons: "weapon",

  world: "world",
  worlds: "world",

  item: "item",
  items: "item",

  "3d": "3D_assets",
  "3d_asset": "3D_assets",
  "3d_assets": "3D_assets",
  "3dasset": "3D_assets",
};

// ---- Local file fallback helpers ----
const LOCAL_DATA_DIR = path.resolve(process.cwd(), "data");
const LOCAL_SAVE_FILE = path.join(LOCAL_DATA_DIR, "saves.json");

async function ensureLocalDir() {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  } catch (e) {
    // ignore
  }
}

async function localSave(doc) {
  await ensureLocalDir();
  let arr = [];
  try {
    const raw = await fs.readFile(LOCAL_SAVE_FILE, "utf8");
    arr = JSON.parse(raw);
    if (!Array.isArray(arr)) arr = [];
  } catch {
    arr = [];
  }
  arr.push(doc);
  await fs.writeFile(LOCAL_SAVE_FILE, JSON.stringify(arr, null, 2), "utf8");
  return { storage: "file", file: LOCAL_SAVE_FILE, index: arr.length - 1 };
}

// ---- MongoDB client singleton ----
let mongoClient = null;
let mongoConnected = false;

async function getMongoClient() {
  if (!MONGO_URI) throw new Error("MONGO_URI not configured");
  if (mongoClient && mongoConnected) return mongoClient;
  mongoClient = new MongoClient(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    // shorter server selection in dev so fallback triggers fast
    serverSelectionTimeoutMS: 5000,
  });
  await mongoClient.connect();
  mongoConnected = true;
  console.log("[save] connected to MongoDB");
  return mongoClient;
}

// Upsert helper (returns insertedId or updated document _id)
async function mongoUpsert(collectionName, doc, incomingId = null) {
  const client = await getMongoClient();
  const db = client.db(MONGO_DBNAME);
  const coll = db.collection(collectionName);

  const now = new Date().toISOString();
  doc.updatedAt = now;
  if (!doc.createdAt) doc.createdAt = now;

  if (incomingId) {
    // try to convert to ObjectId if looks like one
    let q;
    try {
      q = { _id: typeof incomingId === "string" && /^[0-9a-fA-F]{24}$/.test(incomingId) ? new ObjectId(incomingId) : incomingId };
    } catch {
      q = { _id: incomingId };
    }
    const res = await coll.findOneAndUpdate(q, { $set: doc }, { upsert: true, returnDocument: "after" });
    const id = res?.value?._id;
    return { storage: "mongodb", id: id ? id.toString() : null, op: res.lastErrorObject?.updatedExisting ? "update" : "insert" };
  } else {
    const r = await coll.insertOne(doc);
    return { storage: "mongodb", id: r.insertedId?.toString?.() ?? null, op: "insert" };
  }
}

// Generic helper to try Mongo and fall back to local file
async function saveWithFallback(collectionName, doc, incomingId = null) {
  if (USE_LOCAL_FALLBACK || !MONGO_URI) {
    // forced local or no config
    return localSave(doc);
  }
  try {
    const res = await mongoUpsert(collectionName, doc, incomingId);
    // write an audit log in 'logs' collection if possible (non-blocking)
    try {
      const client = await getMongoClient();
      const db = client.db(MONGO_DBNAME);
      await db.collection("logs").insertOne({
        op: res.op || "save",
        collection: collectionName,
        docId: res.id || null,
        ts: new Date().toISOString(),
        user: doc.user || null,
      });
    } catch (auditErr) {
      // ignore audit error
      console.warn("[save] audit log failed:", auditErr?.message || auditErr);
    }
    return res;
  } catch (mongoErr) {
    console.error("[save] mongo save failed — falling back to local:", mongoErr?.message || mongoErr);
    // fallback to local
    const fileRes = await localSave(doc);
    return { storage: "file:fallback", file: fileRes.file, index: fileRes.index, warning: String(mongoErr?.message || mongoErr) };
  }
}

// ---- Normalization / validation ----
function normalizeIncoming(body = {}) {
  // body can be { uid, userEmail, theme, type, title, text, image, meta, raw, id }
  const uid = body.uid ?? body.userId ?? (body.user && body.user.id) ?? null;
  const userEmail = body.userEmail ?? (body.user && body.user.email) ?? null;

  const typeRaw = (body.type || (body.data && body.data.type) || "unknown").toString().trim();
  const type = typeRaw.toLowerCase();
  const collection = TYPE_TO_COLLECTION[type] || type || "misc";

  const title = typeof body.title === "string" ? body.title : (body.data && (body.data.title || body.data.name)) || "";
  const text = typeof body.text === "string" ? body.text : (body.data && (body.data.text || body.data.description)) || "";
  const image = body.image ?? (body.data && body.data.image) ?? null;
  const meta = body.meta && typeof body.meta === "object" ? body.meta : (body.data && body.data.meta) || {};

  // allow incoming explicit id for upsert
  const incomingId = body.id || body._id || (body.data && body.data.id) || null;

  const doc = {
    user: uid ? { id: uid, email: userEmail ?? null } : (userEmail ? { id: null, email: userEmail } : null),
    uid: uid ?? null,
    userEmail: userEmail ?? null,
    theme: (body.theme || (body.data && body.data.meta && body.data.meta.theme) || "unknown"),
    type,
    title: title || `${type}`,
    text: text || "",
    image: image || null,
    meta,
    raw: body.raw ?? body.data ?? null,
    createdAt: body.createdAt ?? new Date().toISOString(),
  };

  return { collection, doc, incomingId };
}

// ---- Routes ----

// POST /api/save-content
// Accepts JSON body with fields described above
router.post("/", express.json({ limit: "5mb" }), async (req, res) => {
  try {
    const body = req.body || {};

    // require at least user identifier for your app
    if (!body || (!body.uid && !body.userEmail && !(body.user && (body.user.email || body.user.id)))) {
      return res.status(400).json({ ok: false, error: "Missing user identifier (uid or userEmail) in request." });
    }

    const { collection, doc, incomingId } = normalizeIncoming(body);

    // Save (mongo primary, local fallback handled by helper)
    const saveResult = await saveWithFallback(collection, doc, incomingId);

    return res.json({ ok: true, collection, saved: saveResult });
  } catch (err) {
    console.error("[save] unexpected error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// GET /api/saved?collection=characters&user=user@x&theme=cyberpunk&type=character&limit=50
router.get("/saved", async (req, res) => {
  try {
    const qCollection = req.query.collection || null;
    const userFilter = req.query.user || req.query.userEmail || null;
    const themeFilter = req.query.theme || null;
    const typeFilter = req.query.type || null;
    const limit = Math.min(parseInt(req.query.limit || "50", 10), 500);

    // If no Mongo configured or forced local listing, read local file
    if (!MONGO_URI || USE_LOCAL_FALLBACK) {
      try {
        const raw = await fs.readFile(LOCAL_SAVE_FILE, "utf8");
        let arr = JSON.parse(raw);
        if (!Array.isArray(arr)) arr = [];
        let items = arr.slice().reverse();
        if (userFilter) items = items.filter(it => (it.userEmail || (it.user && it.user.email) || it.uid) === userFilter);
        if (themeFilter) items = items.filter(it => it.theme === themeFilter);
        if (typeFilter) items = items.filter(it => it.type === typeFilter);
        if (qCollection) items = items.filter(it => it.collection === qCollection || it.type === qCollection);
        return res.json({ ok: true, count: items.length, items: items.slice(0, limit) });
      } catch (e) {
        return res.json({ ok: true, count: 0, items: [] });
      }
    }

    // If collection specified, query that single collection
    const client = await getMongoClient();
    const db = client.db(MONGO_DBNAME);

    if (qCollection) {
      const q = {};
      if (userFilter) q["user.email"] = userFilter;
      if (themeFilter) q.theme = themeFilter;
      if (typeFilter) q.type = typeFilter;
      const docs = await db.collection(qCollection).find(q).sort({ createdAt: -1 }).limit(limit).toArray();
      return res.json({ ok: true, count: docs.length, items: docs });
    }

    // Otherwise query across mapped collections
    const collectionsToQuery = Array.from(new Set(Object.values(TYPE_TO_COLLECTION)));
    const results = [];
    for (const coll of collectionsToQuery) {
      try {
        const q = {};
        if (userFilter) q["user.email"] = userFilter;
        if (themeFilter) q.theme = themeFilter;
        if (typeFilter) q.type = typeFilter;
        const docs = await db.collection(coll).find(q).sort({ createdAt: -1 }).limit(limit).toArray();
        for (const d of docs) {
          results.push({ _collection: coll, ...d });
        }
      } catch (e) {
        // ignore missing collections
      }
    }

    // global sort, limit
    results.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
    const out = results.slice(0, limit);
    return res.json({ ok: true, count: out.length, items: out });
  } catch (err) {
    console.error("[save] list error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

// DELETE /api/saved/:id?collection=characters
router.delete("/saved/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const qCollection = req.query.collection || req.body.collection || null;
    if (!id) return res.status(400).json({ ok: false, error: "Missing id" });

    // If local-only
    if (!MONGO_URI || USE_LOCAL_FALLBACK) {
      try {
        const raw = await fs.readFile(LOCAL_SAVE_FILE, "utf8");
        let arr = JSON.parse(raw);
        if (!Array.isArray(arr)) arr = [];
        const idx = arr.findIndex(it => (it._id === id) || (it.id === id) || (it.createdAt && it.createdAt === id));
        if (idx >= 0) {
          arr.splice(idx, 1);
          await fs.writeFile(LOCAL_SAVE_FILE, JSON.stringify(arr, null, 2), "utf8");
          return res.json({ ok: true });
        } else {
          return res.status(404).json({ ok: false, error: "Not found in local saves" });
        }
      } catch (e) {
        return res.status(500).json({ ok: false, error: "Local delete failed" });
      }
    }

    // Try to delete from specified collection
    const client = await getMongoClient();
    const db = client.db(MONGO_DBNAME);

    if (qCollection) {
      try {
        const _id = /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id;
        await db.collection(qCollection).deleteOne({ _id });
        await db.collection("logs").insertOne({ op: "delete", collection: qCollection, docId: id, ts: new Date().toISOString() });
        return res.json({ ok: true });
      } catch (e) {
        // continue to fallback searching other collections
      }
    }

    // Search across our mapped collections and delete when found
    const collectionsToSearch = Array.from(new Set(Object.values(TYPE_TO_COLLECTION)));
    for (const coll of collectionsToSearch) {
      try {
        const _id = /^[0-9a-fA-F]{24}$/.test(id) ? new ObjectId(id) : id;
        const found = await db.collection(coll).findOne({ _id });
        if (found) {
          await db.collection(coll).deleteOne({ _id });
          await db.collection("logs").insertOne({ op: "delete", collection: coll, docId: id, ts: new Date().toISOString() });
          return res.json({ ok: true, collection: coll });
        }
      } catch (e) {
        // ignore
      }
    }

    return res.status(404).json({ ok: false, error: "Document not found in known collections" });
  } catch (err) {
    console.error("[save] delete error:", err);
    return res.status(500).json({ ok: false, error: String(err?.message || err) });
  }
});

export default router;
