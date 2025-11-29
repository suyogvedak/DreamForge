// server/utils/db.js
import { MongoClient } from 'mongodb';

const uri = process.env.MONGO_URI || '';    // put your MongoDB Atlas connection string in .env
const dbName = process.env.MONGO_DB || 'DreamForge';

if (!uri) {
  console.warn('[WARN] MONGO_URI not set — database operations will fail until configured.');
}

let cachedClient = null;
let cachedDb = null;

export async function connectToDatabase() {
  if (cachedDb && cachedClient) return { client: cachedClient, db: cachedDb };

  if (!uri) {
    throw new Error('MONGO_URI is not set');
  }

  const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  await client.connect();
  const db = client.db(dbName);

  cachedClient = client;
  cachedDb = db;
  console.log('[DB] Connected to MongoDB:', dbName);
  return { client, db };
}

// Synchronous-ish accessor that returns the cached db if available
export function getDb() {
  if (!cachedDb) {
    throw new Error('Database not connected. Call connectToDatabase() first.');
  }
  return cachedDb;
}

// Optional convenience default export for other modules
export default async function getDatabase() {
  return (await connectToDatabase()).db;
}
