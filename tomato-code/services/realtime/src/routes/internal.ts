import express from "express";
import { getIO } from "../socket.js";

const router = express.Router();

const ALLOWED_EVENTS = new Set([
  "order:update",
  "order:rider_assigned",
  "order:new",
  "order:available",
  "rider:location",
]);

const ROOM_PATTERN = /^(user|restaurant):[a-f\d]{24}$/i;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

router.post("/emit", (req, res) => {
  if (req.headers["x-internal-key"] !== process.env.INTERNAL_SERVICE_KEY) {
    return res.status(403).json({
      message: "Forbidden",
    });
  }

  const { event, room, payload } = req.body;

  if (typeof event !== "string" || typeof room !== "string") {
    return res.status(400).json({
      message: "event and room are required",
    });
  }

  if (!ALLOWED_EVENTS.has(event)) {
    return res.status(400).json({
      message: "Unsupported realtime event",
    });
  }

  if (!ROOM_PATTERN.test(room)) {
    return res.status(400).json({
      message: "Invalid realtime room",
    });
  }

  if (payload !== undefined && !isPlainObject(payload)) {
    return res.status(400).json({
      message: "Payload must be an object",
    });
  }

  const io = getIO();

  console.log(`Emitting event ${event} to room ${room}`);

  io.to(room).emit(event, payload ?? {});

  return res.json({ success: true });
});

export default router;
