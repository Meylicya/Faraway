import { Router } from "express";
import { getDb } from "../db/index.js";
import { requireAuth } from "./middleware.js";

const router = Router();

// Create a room and invite someone by email.
router.post("/", requireAuth, async (req, res) => {
  const { invitedEmail } = req.body;
  if (!invitedEmail) return res.status(400).json({ error: "invitedEmail is required" });

  const db = await getDb();

  // enforce: a user can only own/belong to one room for v1 (exactly-2 model, single room)
  const existing = await db.get(
    "SELECT id FROM rooms WHERE owner_id = ? OR member_id = ?",
    req.user.userId,
    req.user.userId
  );
  if (existing) return res.status(409).json({ error: "you're already in a room" });

  const result = await db.run(
    "INSERT INTO rooms (owner_id, invited_email) VALUES (?, ?)",
    req.user.userId,
    invitedEmail
  );

  res.status(201).json({ roomId: result.lastID });
});

// Accept a pending invite (called when the invited email signs up / logs in and opens the invite).
router.post("/:roomId/accept", requireAuth, async (req, res) => {
  const db = await getDb();
  const room = await db.get("SELECT * FROM rooms WHERE id = ?", req.params.roomId);
  if (!room) return res.status(404).json({ error: "room not found" });
  if (room.invited_email !== req.user.email) {
    return res.status(403).json({ error: "this invite is not for you" });
  }

  await db.run(
    "UPDATE rooms SET member_id = ?, status = 'accepted' WHERE id = ?",
    req.user.userId,
    room.id
  );

  const io = req.app.get("io");
  io.to(`room:${room.id}`).emit("room:accepted");

  res.json({ ok: true });
});

// Dev/demo convenience for guest accounts: join any single pending room instead
// of needing the invite to match your exact email. Not meant for production —
// real invites still go through the email-matched /accept route above.
router.post("/join-open", requireAuth, async (req, res) => {
  const db = await getDb();

  const alreadyIn = await db.get(
    "SELECT id FROM rooms WHERE owner_id = ? OR member_id = ?",
    req.user.userId,
    req.user.userId
  );
  if (alreadyIn) return res.json({ roomId: alreadyIn.id });

  const openRoom = await db.get(
    "SELECT * FROM rooms WHERE status = 'pending' AND owner_id != ? ORDER BY created_at ASC LIMIT 1",
    req.user.userId
  );
  if (!openRoom) return res.status(404).json({ error: "no open room to join right now" });

  await db.run(
    "UPDATE rooms SET member_id = ?, status = 'accepted' WHERE id = ?",
    req.user.userId,
    openRoom.id
  );
  res.json({ roomId: openRoom.id });
});

// Look up a pending invite addressed to the logged-in user's email, so the
// frontend can show "X invited you" with an Accept button instead of requiring
// a manual API call.
router.get("/pending-invite", requireAuth, async (req, res) => {
  const db = await getDb();
  const invite = await db.get(
    `SELECT rooms.id as roomId, users.display_name as ownerName, users.email as ownerEmail
     FROM rooms JOIN users ON users.id = rooms.owner_id
     WHERE rooms.invited_email = ? AND rooms.status = 'pending'`,
    req.user.email
  );
  res.json({ invite: invite || null });
});

router.get("/mine", requireAuth, async (req, res) => {
  const db = await getDb();
  const room = await db.get(
    "SELECT * FROM rooms WHERE owner_id = ? OR member_id = ?",
    req.user.userId,
    req.user.userId
  );
  res.json({ room: room || null });
});

// Set/update the shared countdown target for the room.
router.patch("/:roomId/countdown", requireAuth, async (req, res) => {
  const { countdownTarget } = req.body;
  const db = await getDb();
  await db.run(
    "UPDATE rooms SET countdown_target = ? WHERE id = ? AND (owner_id = ? OR member_id = ?)",
    countdownTarget,
    req.params.roomId,
    req.user.userId,
    req.user.userId
  );
  res.json({ ok: true });
});

export default router;
