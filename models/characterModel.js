// server/models/characterModel.js
// ESM Mongoose model + helpers for Character documents.
// Usage:
//   import { getCharacterModel, createCharacter, findCharacterById, findCharactersByUser } from './models/characterModel.js';

import mongoose from "mongoose";

const { Schema } = mongoose;

// Flexible attributes container (JSON) and basic typed fields
const CharacterSchema = new Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    prompt: { type: String, default: "" }, // original generation prompt
    description: { type: String, default: "" }, // generated description / lore
    // Arbitrary attributes (e.g. stats, skills, equipment) — stored as mixed JSON
    attributes: { type: Schema.Types.Mixed, default: {} },
    // optional links to generated 3D model or thumbnails
    model3dUrl: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    // metadata such as generator engine, version, tags ...
    metadata: { type: Schema.Types.Mixed, default: {} },
    // soft-delete flag
    deleted: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    minimize: false,
  }
);

// Avoid OverwriteModelError during development / hot reload
export function getCharacterModel() {
  if (!mongoose || !mongoose.Schema) {
    throw new Error(
      "Mongoose is not available. Make sure you've imported and connected mongoose (mongoose.connect) before using models."
    );
  }
  return mongoose.models.Character || mongoose.model("Character", CharacterSchema);
}

// Helper: create a new character
export async function createCharacter(data = {}) {
  const Model = getCharacterModel();
  const doc = new Model(data);
  return await doc.save();
}

// Helper: find by id (only non-deleted by default)
export async function findCharacterById(id, { includeDeleted = false } = {}) {
  const Model = getCharacterModel();
  if (!id) return null;
  const q = includeDeleted ? { _id: id } : { _id: id, deleted: false };
  return await Model.findOne(q).lean().exec();
}

// Helper: find by userId with pagination
export async function findCharactersByUser(userId, { limit = 20, skip = 0, includeDeleted = false } = {}) {
  if (!userId) return [];
  const Model = getCharacterModel();
  const query = includeDeleted ? { userId } : { userId, deleted: false };
  return await Model.find(query).sort({ createdAt: -1 }).skip(Number(skip)).limit(Number(limit)).lean().exec();
}

// Helper: soft delete
export async function softDeleteCharacter(id) {
  const Model = getCharacterModel();
  return await Model.findByIdAndUpdate(id, { deleted: true }, { new: true }).exec();
}

// Default export for convenience
export default getCharacterModel();
