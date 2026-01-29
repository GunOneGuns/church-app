import mongoose from "mongoose";

const groupsSchema = new mongoose.Schema(
  {
    Name: { type: String, required: true, trim: true },
    Description: { type: String, default: "" },
    GroupPic: { type: String, default: "" },
    Members: [{ type: mongoose.Schema.Types.ObjectId, ref: "People" }],
    deletedAt: { type: Date, default: null },
  },
  { strict: false, versionKey: false, timestamps: true },
);

export const groupsModel = mongoose.model("Groups", groupsSchema, "groups");
