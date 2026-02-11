import express from "express";
import mongoose from "mongoose";
import { eventsModel } from "../../schemas/events.schema.js";

const router = express.Router();

function getActiveEventsFilter() {
  return {
    $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }],
  };
}

function isValidDateKey(key) {
  return typeof key === "string" && /^\d{4}-\d{2}-\d{2}$/.test(key);
}

function isValidTimeString(value) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map((v) => Number(v));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false;
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function parseDateKeyToLocalDate(key) {
  if (!isValidDateKey(key)) return null;
  const [y, m, d] = key.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function addDays(date, deltaDays) {
  const next = new Date(date);
  next.setDate(next.getDate() + deltaDays);
  return next;
}

function toDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function compareDateKeys(a, b) {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function buildDateKeyRange(fromKey, toKey) {
  const fromDate = parseDateKeyToLocalDate(fromKey);
  const toDate = parseDateKeyToLocalDate(toKey);
  if (!fromDate || !toDate) return [];
  if (fromDate.getTime() > toDate.getTime()) return [];
  const keys = [];
  for (
    let cursor = new Date(fromDate);
    cursor.getTime() <= toDate.getTime();
    cursor = addDays(cursor, 1)
  ) {
    keys.push(toDateKey(cursor));
  }
  return keys;
}

function normalizeMonthQuery(monthParam) {
  if (typeof monthParam !== "string") return null;
  const match = monthParam.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex)) return null;
  if (monthIndex < 0 || monthIndex > 11) return null;
  const start = new Date(year, monthIndex, 1);
  const end = new Date(year, monthIndex + 1, 0);
  return { fromKey: toDateKey(start), toKey: toDateKey(end) };
}

router.get("/", async (req, res) => {
  try {
    const monthParam = req.query.month;
    const monthRange = normalizeMonthQuery(monthParam);

    const fromKey =
      monthRange?.fromKey ||
      (typeof req.query.fromKey === "string" ? req.query.fromKey : "");
    const toKey =
      monthRange?.toKey ||
      (typeof req.query.toKey === "string" ? req.query.toKey : "");

    if (!isValidDateKey(fromKey) || !isValidDateKey(toKey)) {
      return res.status(400).json({
        error: "Missing or invalid range. Provide ?month=YYYY-MM or ?fromKey=YYYY-MM-DD&toKey=YYYY-MM-DD",
      });
    }
    if (compareDateKeys(fromKey, toKey) > 0) {
      return res.status(400).json({ error: "fromKey must be <= toKey" });
    }

    const events = await eventsModel
      .find({
        ...getActiveEventsFilter(),
        startDateKey: { $lte: toKey },
        endDateKey: { $gte: fromKey },
      })
      .sort({ startDateKey: 1, startTime: 1, createdAt: 1 })
      .lean();

    const eventsByDate = {};

    events.forEach((eventDoc) => {
      const eventStartKey = String(eventDoc.startDateKey || "");
      const eventEndKey = String(eventDoc.endDateKey || "");
      if (!isValidDateKey(eventStartKey) || !isValidDateKey(eventEndKey)) return;

      const overlapFrom = eventStartKey > fromKey ? eventStartKey : fromKey;
      const overlapTo = eventEndKey < toKey ? eventEndKey : toKey;
      const keys = buildDateKeyRange(overlapFrom, overlapTo);
      if (!keys.length) return;

      keys.forEach((key) => {
        if (!eventsByDate[key]) eventsByDate[key] = [];
        eventsByDate[key].push({
          id: String(eventDoc._id),
          title: eventDoc.title || "",
          time: eventDoc.allDay ? "All-day" : eventDoc.startTime || "",
          location: eventDoc.location || "",
          description: eventDoc.description || "",
          color: eventDoc.color || "",
          allDay: Boolean(eventDoc.allDay),
          startDateKey: eventStartKey,
          endDateKey: eventEndKey,
          startTime: eventDoc.startTime || "",
          endTime: eventDoc.endTime || "",
          repeat: eventDoc.repeat || "never",
          tagColorKey: eventDoc.tagColorKey || "info",
        });
      });
    });

    return res.status(200).json({ eventsByDate });
  } catch (error) {
    console.error("Error fetching events:", error);
    return res.status(500).json({ error: "Failed to fetch events" });
  }
});

router.post("/", async (req, res) => {
  try {
    const body = req.body || {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return res.status(400).json({ error: "title is required" });

    const startDateKey = String(body.startDateKey || "");
    const endDateKey = String(body.endDateKey || "");
    if (!isValidDateKey(startDateKey) || !isValidDateKey(endDateKey)) {
      return res.status(400).json({ error: "Invalid startDateKey/endDateKey" });
    }
    if (compareDateKeys(startDateKey, endDateKey) > 0) {
      return res.status(400).json({ error: "End date must be >= start date" });
    }

    const allDay = Boolean(body.allDay);
    const startTime = String(body.startTime || "");
    const endTime = String(body.endTime || "");

    if (!allDay) {
      if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
        return res
          .status(400)
          .json({ error: "Invalid startTime/endTime (expected HH:mm)" });
      }
    }

    const repeat = String(body.repeat || "never");
    const repeatAllowed = new Set([
      "never",
      "daily",
      "weekly",
      "biweekly",
      "monthly",
      "yearly",
    ]);
    if (!repeatAllowed.has(repeat)) {
      return res.status(400).json({ error: "Invalid repeat value" });
    }

    const eventDoc = new eventsModel({
      title,
      location: typeof body.location === "string" ? body.location : "",
      description: typeof body.description === "string" ? body.description : "",
      allDay,
      startDateKey,
      endDateKey,
      startTime: allDay ? "" : startTime,
      endTime: allDay ? "" : endTime,
      tagColorKey:
        typeof body.tagColorKey === "string" ? body.tagColorKey : "info",
      color: typeof body.color === "string" ? body.color : "",
      repeat,
      deletedAt: null,
    });

    await eventDoc.save();
    return res.status(201).json({
      id: String(eventDoc._id),
      title: eventDoc.title,
      location: eventDoc.location || "",
      description: eventDoc.description || "",
      allDay: Boolean(eventDoc.allDay),
      startDateKey: eventDoc.startDateKey,
      endDateKey: eventDoc.endDateKey,
      startTime: eventDoc.startTime || "",
      endTime: eventDoc.endTime || "",
      repeat: eventDoc.repeat || "never",
      tagColorKey: eventDoc.tagColorKey || "info",
      color: eventDoc.color || "",
    });
  } catch (error) {
    console.error("Error creating event:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to create event" });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const body = req.body || {};
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!title) return res.status(400).json({ error: "title is required" });

    const startDateKey = String(body.startDateKey || "");
    const endDateKey = String(body.endDateKey || "");
    if (!isValidDateKey(startDateKey) || !isValidDateKey(endDateKey)) {
      return res.status(400).json({ error: "Invalid startDateKey/endDateKey" });
    }
    if (compareDateKeys(startDateKey, endDateKey) > 0) {
      return res.status(400).json({ error: "End date must be >= start date" });
    }

    const allDay = Boolean(body.allDay);
    const startTime = String(body.startTime || "");
    const endTime = String(body.endTime || "");

    if (!allDay) {
      if (!isValidTimeString(startTime) || !isValidTimeString(endTime)) {
        return res
          .status(400)
          .json({ error: "Invalid startTime/endTime (expected HH:mm)" });
      }
    }

    const repeat = String(body.repeat || "never");
    const repeatAllowed = new Set([
      "never",
      "daily",
      "weekly",
      "biweekly",
      "monthly",
      "yearly",
    ]);
    if (!repeatAllowed.has(repeat)) {
      return res.status(400).json({ error: "Invalid repeat value" });
    }

    const update = {
      title,
      location: typeof body.location === "string" ? body.location : "",
      description: typeof body.description === "string" ? body.description : "",
      allDay,
      startDateKey,
      endDateKey,
      startTime: allDay ? "" : startTime,
      endTime: allDay ? "" : endTime,
      tagColorKey:
        typeof body.tagColorKey === "string" ? body.tagColorKey : "info",
      color: typeof body.color === "string" ? body.color : "",
      repeat,
    };

    const updated = await eventsModel.findOneAndUpdate(
      { _id: id, ...getActiveEventsFilter() },
      update,
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ error: "Event not found" });

    return res.status(200).json({
      id: String(updated._id),
      title: updated.title,
      location: updated.location || "",
      description: updated.description || "",
      allDay: Boolean(updated.allDay),
      startDateKey: updated.startDateKey,
      endDateKey: updated.endDateKey,
      startTime: updated.startTime || "",
      endTime: updated.endTime || "",
      repeat: updated.repeat || "never",
      tagColorKey: updated.tagColorKey || "info",
      color: updated.color || "",
    });
  } catch (error) {
    console.error("Error updating event:", error);
    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: error.message });
    }
    return res.status(500).json({ error: "Failed to update event" });
  }
});

router.post("/:id/restore", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const updated = await eventsModel.findOneAndUpdate(
      { _id: id },
      { deletedAt: null },
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ error: "Event not found" });

    return res.status(200).json({
      id: String(updated._id),
      title: updated.title,
      location: updated.location || "",
      description: updated.description || "",
      allDay: Boolean(updated.allDay),
      startDateKey: updated.startDateKey,
      endDateKey: updated.endDateKey,
      startTime: updated.startTime || "",
      endTime: updated.endTime || "",
      repeat: updated.repeat || "never",
      tagColorKey: updated.tagColorKey || "info",
      color: updated.color || "",
    });
  } catch (error) {
    console.error("Error restoring event:", error);
    return res.status(500).json({ error: "Failed to restore event" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid event id" });
    }

    const updated = await eventsModel.findOneAndUpdate(
      { _id: id, ...getActiveEventsFilter() },
      { deletedAt: new Date() },
      { new: true, runValidators: true },
    );

    if (!updated) return res.status(404).json({ error: "Event not found" });
    return res.status(200).json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ error: "Failed to delete event" });
  }
});

export default router;
