// server/utils/db.js
import { MongoClient } from 'mongodb';

let _client = null;
let _db = null;

export async function initDbFromEnv() {
  if (_db) return _db;
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.warn('[db] MONGO_URI not set — DB operations will fail until configured.');
    return null;
  }
  if (!_client) {
    _client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });
    await _client.connect();
  }
  const dbName = process.env.MONGO_DB || 'dreamforge';
  _db = _client.db(dbName);
  return _db;
}

export function getDb() {
  if (!_db) {
    throw new Error('Database not initialized. Call initDbFromEnv() first (and await it).');
  }
  return _db;
}
