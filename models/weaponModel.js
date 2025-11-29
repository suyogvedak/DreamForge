// server/models/weaponModel.js
// ESM Mongoose model + helpers for Weapon documents.
// Usage:
//   import { getWeaponModel, createWeapon, findWeaponById, findWeaponsByUser } from './models/weaponModel.js';

import mongoose from "mongoose";

const { Schema } = mongoose;

const WeaponSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    type: { type: String, default: "melee" }, // e.g. melee, ranged, energy
    damage: { type: String, default: "1d6" }, // simple string; app can parse or keep as label
    rarity: { type: String, default: "common" },
    description: { type: String, default: "" },
    attributes: { type: Schema.Types.Mixed, default: {} }, // e.g. special effects, stats
    model3dUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// Protect against using model before mongoose is initialized
export function getWeaponModel() {
  if (!mongoose || !mongoose.Schema) {
    throw new Error(
      "Mongoose is not available. Make sure you've imported and connected mongoose (mongoose.connect) before using models."
    );
  }
  return mongoose.models.Weapon || mongoose.model("Weapon", WeaponSchema);
}

// Create new weapon doc
export async function createWeapon(data = {}) {
  const Model = getWeaponModel();
  const doc = new Model(data);
  return await doc.save();
}

// Find weapon by id
export async function findWeaponById(id, { includeDeleted = false } = {}) {
  const Model = getWeaponModel();
  if (!id) return null;
  const q = includeDeleted ? { _id: id } : { _id: id, deleted: false };
  return await Model.findOne(q).lean().exec();
}

// Find weapons for a user with pagination
export async function findWeaponsByUser(userId, { limit = 20, skip = 0, includeDeleted = false } = {}) {
  if (!userId) return [];
  const Model = getWeaponModel();
  const query = includeDeleted ? { userId } : { userId, deleted: false };
  return await Model.find(query).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean().exec();
}

// Soft delete
export async function softDeleteWeapon(id) {
  const Model = getWeaponModel();
  return await Model.findByIdAndUpdate(id, { deleted: true }, { new: true }).exec();
}

export default getWeaponModel();
