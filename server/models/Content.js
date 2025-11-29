import mongoose from "mongoose";

const contentSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: false,
    },
    theme: {
      type: String,
      required: true,
    },
    kind: {
      type: String,
      required: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    assets: {
      type: [String],
      default: [],
    },
    source: {
      type: String,
      required: true,
    },
    versionOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Content',
      default: null,
    },
    versionNumber: {
      type: Number,
      default: 1,
    },
    metadata: {
      type: Object,
      default: {},
    },
  },
  { timestamps: true }
);

const Content = mongoose.model("Content", contentSchema);
export default Content;
