import mongoose from "mongoose";

const eventsSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    description: { type: String, default: "" },
    allDay: { type: Boolean, default: false },
    startDateKey: { type: String, required: true }, // YYYY-MM-DD
    endDateKey: { type: String, required: true }, // YYYY-MM-DD
    startTime: { type: String, default: "" }, // HH:mm
    endTime: { type: String, default: "" }, // HH:mm
    tagColorKey: { type: String, default: "info" },
    color: { type: String, default: "" }, // precomputed hex for UI
    repeat: {
      type: String,
      default: "never",
      enum: ["never", "daily", "weekly", "biweekly", "monthly", "yearly"],
    },
    deletedAt: { type: Date, default: null },
  },
  { strict: false, versionKey: false, timestamps: true },
);

export const eventsModel = mongoose.model("Events", eventsSchema, "events");

