// server/lib/storage_gridfs.js
// MongoDB GridFS storage helper for saving and retrieving large files (e.g. 3D models)

import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";
import { Readable } from "stream";

let bucket;

/**
 * Initialize GridFS bucket (should be called after MongoDB connection established).
 */
export function initGridFS() {
  const db = mongoose.connection.db;
  bucket = new GridFSBucket(db, { bucketName: "uploads" });
  console.log("[INFO] GridFS initialized (bucket 'uploads')");
}

/**
 * Save a file buffer into GridFS
 * @param {string} filename
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} fileId
 */
export function saveFile(filename, buffer, contentType = "application/octet-stream") {
  return new Promise((resolve, reject) => {
    if (!bucket) return reject(new Error("GridFS not initialized"));
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);

    const uploadStream = bucket.openUploadStream(filename, {
      contentType,
    });

    readable.pipe(uploadStream)
      .on("error", (err) => reject(err))
      .on("finish", () => resolve(uploadStream.id.toString()));
  });
}

/**
 * Get a file stream from GridFS
 * @param {string} fileId
 * @returns {Readable}
 */
export function getFileStream(fileId) {
  if (!bucket) throw new Error("GridFS not initialized");
  return bucket.openDownloadStream(mongoose.Types.ObjectId(fileId));
}
