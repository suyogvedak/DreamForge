// server/controllers/contentController.js

import Content from '../models/Content.js';

// Save content to MongoDB
export const saveContent = async (req, res) => {
  const { uid, category, type, output } = req.body;

  if (!uid || !category || !type || !output) {
    return res.status(400).json({ message: "All fields are required." });
  }

  try {
    const content = new Content({
      userId: uid,
      theme: category,
      kind: type,
      data: output,
      source: 'manual',
      versionOf: null,
      versionNumber: 1,
      metadata: {}
    });
    await content.save();
    res.status(201).json({ message: "Content saved successfully." });
  } catch (error) {
    console.error("Error saving content:", error);
    res.status(500).json({ message: "Server error saving content." });
  }
};

// Get content by user
export const getUserContent = async (req, res) => {
  const uid = req.params.uid;

  try {
    const contents = await Content.find({ userId: uid }).sort({ createdAt: -1 });
    res.status(200).json(contents);
  } catch (error) {
    console.error("Error fetching content:", error);
    res.status(500).json({ message: "Server error fetching content." });
  }
};
