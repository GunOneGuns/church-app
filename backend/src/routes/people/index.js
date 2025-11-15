import express from "express";
import { peopleModel } from "../../schemas/people.schema.js";
import mongoose from "mongoose";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const people = await peopleModel.find({}); // Fetch all people
    res.status(200).json(people);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Failed to fetch people" });
  }
});

(async () => {
  try {
    const people = await peopleModel.find({});
    console.log("Connected to DB:", mongoose.connection.name);
  } catch (error) {
    console.error("Error fetching people:", error);
  }
})();

export default router;
