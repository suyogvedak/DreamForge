// server/routes/contentRoutes.js
// Handles saving and retrieving generated content into MongoDB

import express from "express";
import mongoose from "mongoose";
import { verifyAuthMiddleware } from "../lib/auth.js";

const router = express.Router();

// Schema
const ContentSchema = new mongoose.Schema({
  uid: { type: String, required: true },
  category: String,
  type: String,
  output: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

const Content = mongoose.model("Content", ContentSchema);

// Save content
router.post("/save-content", verifyAuthMiddleware, async (req, res) => {
  try {
    const { uid, category, type, output } = req.body;
    if (!uid || !category || !type || !output) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const item = new Content({ uid, category, type, output });
    await item.save();
    res.json({ success: true, id: item._id });
  } catch (err) {
    console.error("[ERROR] Save content failed:", err.message);
    res.status(500).json({ error: "Save failed" });
  }
});

// Get content by user
router.get("/get-content/:uid", verifyAuthMiddleware, async (req, res) => {
  try {
    const { uid } = req.params;
    const items = await Content.find({ uid }).sort({ createdAt: -1 }).lean();
    res.json(items);
  } catch (err) {
    console.error("[ERROR] Get content failed:", err.message);
    res.status(500).json({ error: "Fetch failed" });
  }
});

export default router;
