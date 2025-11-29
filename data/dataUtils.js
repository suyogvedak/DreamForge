// dataUtils.js
// Shared helpers for dataset modules / generators.
// Usage examples:
//   import DU from './data/dataUtils.js';
//   DU.setSeed(12345);            // make generation deterministic
//   const id = DU.uid('cp_char'); // unique id
//   const pick = DU.random(arr);  // pick random item
//   const chars = DU.generateIds(objects, 'char'); // mass assign ids

// --------- Seedable PRNG (Mulberry32) ----------
let _seed = null;
export function setSeed(seed) {
  // Accept number or string
  if (typeof seed === "string") {
    // simple hash string -> number
    let h = 2166136261 >>> 0;
    for (let i = 0; i < seed.length; i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
    }
    _seed = h >>> 0;
  } else if (typeof seed === "number") {
    _seed = seed >>> 0;
  } else {
    _seed = null;
  }
}

// Mulberry32 PRNG
function _mulberry32() {
  let t = _seed >>> 0;
  return function() {
    t |= 0;
    t = t + 0x6D2B79F5 | 0;
    let r = Math.imul(t ^ t >>> 15, 1 | t);
    r = r + Math.imul(r ^ r >>> 7, 61 | r) ^ r;
    return ((r ^ r >>> 14) >>> 0) / 4294967296;
  };
}

function _rawRandom() {
  if (_seed === null) return Math.random();
  if (!_mul) _mul = _mulberry32();
  return _mul();
}
let _mul = null;

// Resetting seed will recreate the PRNG next time
export function resetSeed() {
  _mul = null;
  _seed = null;
}

// A safe wrapper to get random floats 0..1
export function rand() {
  if (_seed === null) return Math.random();
  if (!_mul) _mul = _mulberry32();
  return _mul();
}

// Pick a random element from array
export function random(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return undefined;
  return arr[Math.floor(rand() * arr.length)];
}

// Shallow shuffle (Fisher-Yates)
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Generate a reasonably-unique id with optional prefix
export function uid(prefix = "id") {
  // timestamp + random part
  const t = Date.now().toString(36);
  const r = Math.floor(rand() * 0x10000).toString(36);
  return `${prefix}_${t}${r}`;
}

// Join first + last with safe normalization for handle
export function combineName(firstArr, lastArr) {
  const first = Array.isArray(firstArr) ? random(firstArr) : (firstArr || "");
  const last = Array.isArray(lastArr) ? random(lastArr) : (lastArr || "");
  return `${first} ${last}`.trim();
}

export function makeHandle(prefixes, suffixes) {
  const p = Array.isArray(prefixes) ? random(prefixes) : (prefixes || "");
  const s = Array.isArray(suffixes) ? random(suffixes) : (suffixes || "");
  // compact handle (no spaces)
  return `${p}${s}${Math.floor(rand() * 999)}`;
}

// small formatter helpers for weapons / worlds so generators can call them
export function formatWeapon(w) {
  if (!w || typeof w !== "object") return "";
  // Accept either a string token or object
  const name = w.name || `${w.baseModel || "Weapon"} ${Math.floor(rand()*1000)}`;
  const dmg = w.damageDice || w.damage || `${1 + Math.floor(rand()*3)}d8`;
  const typ = w.damageType || w.type || "kinetic";
  const special = Array.isArray(w.specialEffects) ? w.specialEffects.join(", ") : (w.specialEffects || "");
  return `${name} — ${dmg} ${typ}${special ? " (" + special + ")" : ""}`;
}

export function formatWorld(world) {
  if (!world || typeof world !== "object") return "";
  const name = world.name || "Unnamed World";
  const type = world.type || world.kind || "region";
  const brief = world.shortDescription || "";
  return `${name} — ${type}. ${brief}`;
}

// Map of schema hints for generated object types
export const schemaHints = {
  character: {
    required: ["id", "name", "role", "shortDescription"],
    optional: ["handle", "race", "class", "cyberware", "gear", "background", "appearance"]
  },
  location: {
    required: ["id", "name", "type", "description"]
  },
  item: {
    required: ["id", "name", "category", "spec"],
    optional: ["use"]
  },
  quest: {
    required: ["id", "title", "brief", "objectives"]
  },
  story: {
    required: ["id", "title", "text"]
  },
  weapon: {
    required: ["id", "name", "damageDice"],
    optional: ["baseModel", "damageType", "rangeMeters", "weightKg", "rarity", "specialEffects"]
  },
  world: {
    required: ["id", "name", "type"],
    optional: ["biome", "techLevel", "populationMillions", "conflicts"]
  }
};

// Basic schema validator (shallow): checks required keys exist
export function validateSchema(obj, typeName) {
  const hint = schemaHints[typeName];
  if (!hint) return { ok: false, reason: "unknown type" };
  if (typeof obj !== "object" || obj === null) return { ok: false, reason: "not an object" };
  const missing = [];
  for (const k of hint.required) {
    if (!(k in obj)) missing.push(k);
  }
  if (missing.length) return { ok: false, reason: `missing required: ${missing.join(", ")}`, missing };
  return { ok: true };
}

// Mass-assign ids to an array of objects (if they don't have id)
export function ensureIds(arr, prefix) {
  if (!Array.isArray(arr)) return arr;
  return arr.map((o, i) => {
    if (!o || typeof o !== "object") return o;
    if (!("id" in o)) o.id = uid(prefix || "id");
    return o;
  });
}

// Quick one-line summary for character objects
export function summarizeCharacter(char) {
  if (!char) return "";
  const name = char.name || "Unnamed";
  const role = char.role || char.class || "unknown role";
  const desc = char.shortDescription || "";
  return `${name} — ${role}: ${desc}`;
}

// Helper to deep-clone a value (safe for generator sample objects)
export function clone(v) {
  return JSON.parse(JSON.stringify(v));
}

// Expose a very small helper to create many ids / pre-generate collections
export function generateIds(prefix, n = 10) {
  const out = [];
  for (let i = 0; i < n; i++) out.push(uid(prefix));
  return out;
}

// Default export
export default {
  // PRNG
  setSeed, resetSeed, rand, randFloat: rand,
  // random helpers
  random, shuffle,
  // ids & names
  uid, combineName, makeHandle,
  // formatters
  formatWeapon, formatWorld,
  // schema & validation
  schemaHints, validateSchema, ensureIds,
  // utilities
  summarizeCharacter, clone, generateIds
};
