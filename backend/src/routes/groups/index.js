import express from "express";
import multer from "multer";
import mongoose from "mongoose";
import cloudinary from "../../../utils/cloudinaryConfig.js";
import { groupsModel } from "../../schemas/groups.schema.js";

const router = express.Router();

const storage = multer.memoryStorage();
const upload = multer({ storage });

function normalizeMemberIds(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => (typeof id === "string" ? id.trim() : ""))
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function getActiveGroupsFilter() {
  return {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
}

router.get("/", async (_req, res) => {
  try {
    const groups = await groupsModel.find(getActiveGroupsFilter()).lean();
    const withCounts = groups.map((group) => ({
      ...group,
      MemberCount: Array.isArray(group.Members) ? group.Members.length : 0,
    }));
    res.status(200).json(withCounts);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Failed to fetch groups" });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const group = await groupsModel
      .findOne({ _id: id, ...getActiveGroupsFilter() })
      .populate("Members")
      .lean();

    if (!group) return res.status(404).json({ error: "Group not found" });

    res.status(200).json({
      ...group,
      MemberCount: Array.isArray(group.Members) ? group.Members.length : 0,
    });
  } catch (error) {
    console.error("Error fetching group:", error);
    res.status(500).json({ error: "Failed to fetch group" });
  }
});

router.post("/", async (req, res) => {
  try {
    const { Name, Description, Members } = req.body || {};
    if (!Name || typeof Name !== "string" || !Name.trim()) {
      return res.status(400).json({ error: "Name is required" });
    }

    const group = new groupsModel({
      Name: Name.trim(),
      Description: typeof Description === "string" ? Description : "",
      Members: normalizeMemberIds(Members),
      deletedAt: null,
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    console.error("Error creating group:", error);
    res.status(500).json({ error: "Failed to create group" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const next = { ...(req.body || {}) };
    if (typeof next.Name === "string") next.Name = next.Name.trim();
    if (next.Members) next.Members = normalizeMemberIds(next.Members);

    const updated = await groupsModel.findByIdAndUpdate(id, next, {
      new: true,
      runValidators: true,
      overwrite: true,
    });

    if (!updated) return res.status(404).json({ error: "Group not found" });
    res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating group:", error);
    res.status(500).json({ error: "Failed to update group" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid group id" });
    }

    const updated = await groupsModel.findOneAndUpdate(
      { _id: id, ...getActiveGroupsFilter() },
      { deletedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (!updated) {
      return res.status(404).json({ error: "Group not found" });
    }

    res.status(200).json({ message: "Group deleted successfully" });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Failed to delete group" });
  }
});

router.post(
  "/:id/upload-group-pic",
  upload.single("GroupPic"),
  async (req, res) => {
    try {
      const groupId = req.params.id;
      if (!mongoose.Types.ObjectId.isValid(groupId)) {
        return res.status(400).json({ message: "Invalid group id." });
      }

      const file = req.file;
      if (!file) {
        return res.status(400).json({ message: "No file uploaded." });
      }

      const b64 = Buffer.from(file.buffer).toString("base64");
      const dataURI = `data:${file.mimetype};base64,${b64}`;

      const result = await cloudinary.uploader.upload(dataURI, {
        folder: "Group-Picture",
        public_id: `group_pic_${groupId}`,
        overwrite: true,
        resource_type: "image",
      });

      const updatedGroup = await groupsModel.findByIdAndUpdate(
        groupId,
        { GroupPic: result.secure_url },
        { new: true, runValidators: true },
      );

      if (!updatedGroup) {
        return res
          .status(404)
          .json({ message: "Group not found after upload." });
      }

      res.status(200).json({
        message: "Group picture uploaded successfully.",
        groupPicUrl: result.secure_url,
      });
    } catch (error) {
      console.error("Error uploading group picture:", error);
      res.status(500).json({
        message: "Server error during group picture upload.",
        error: error.message,
      });
    }
  },
);

export default router;
