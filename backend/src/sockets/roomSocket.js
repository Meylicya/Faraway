import jwt from "jsonwebtoken";
import { getDb } from "../db/index.js";

// presence grace period: a refresh shouldn't read as "left the room"
const OFFLINE_GRACE_MS = 5000;

// in-memory presence + pending-disconnect timers, keyed by roomId
const roomPresence = new Map(); // roomId -> Set of userId
const disconnectTimers = new Map(); // `${roomId}:${userId}` -> Timeout

export function registerRoomSocket(io) {
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.on("room:join", async ({ roomId }) => {
      socket.join(roomKey(roomId));
      socket.data.roomId = roomId;

      // cancel any pending "went offline" timer for this user (this was just a refresh)
      const timerKey = `${roomId}:${socket.user.userId}`;
      if (disconnectTimers.has(timerKey)) {
        clearTimeout(disconnectTimers.get(timerKey));
        disconnectTimers.delete(timerKey);
      }

      if (!roomPresence.has(roomId)) roomPresence.set(roomId, new Set());
      roomPresence.get(roomId).add(socket.user.userId);

      io.to(roomKey(roomId)).emit("presence:update", {
        online: [...roomPresence.get(roomId)],
      });

      // send current doodle snapshot to the newly-joined client only
      const db = await getDb();
      const snapshot = await db.get(
        "SELECT canvas_data FROM doodle_snapshots WHERE room_id = ?",
        roomId
      );
      socket.emit("doodle:snapshot", { canvasData: snapshot?.canvas_data || null });

      const room = await db.get("SELECT countdown_target FROM rooms WHERE id = ?", roomId);
      socket.emit("countdown:update", { target: room?.countdown_target || null });
    });

    // broadcast incremental strokes only, not full canvas snapshots
    socket.on("doodle:stroke", async ({ roomId, stroke }) => {
      socket.to(roomKey(roomId)).emit("doodle:stroke", { stroke });
    });

    // periodically (or on pen-up) the client sends a compact snapshot to persist
    socket.on("doodle:save-snapshot", async ({ roomId, canvasData }) => {
      const db = await getDb();
      await db.run(
        `INSERT INTO doodle_snapshots (room_id, canvas_data, updated_at)
         VALUES (?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(room_id) DO UPDATE SET canvas_data = excluded.canvas_data, updated_at = CURRENT_TIMESTAMP`,
        roomId,
        canvasData
      );
    });

    socket.on("countdown:set", async ({ roomId, target }) => {
      const db = await getDb();
      await db.run("UPDATE rooms SET countdown_target = ? WHERE id = ?", target, roomId);
      io.to(roomKey(roomId)).emit("countdown:update", { target });
    });

    socket.on("disconnect", () => {
      const { roomId } = socket.data;
      if (!roomId) return;

      const timerKey = `${roomId}:${socket.user.userId}`;
      const timer = setTimeout(() => {
        roomPresence.get(roomId)?.delete(socket.user.userId);
        io.to(roomKey(roomId)).emit("presence:update", {
          online: [...(roomPresence.get(roomId) || [])],
        });
        disconnectTimers.delete(timerKey);
      }, OFFLINE_GRACE_MS);

      disconnectTimers.set(timerKey, timer);
    });
  });
}

function roomKey(roomId) {
  return `room:${roomId}`;
}
