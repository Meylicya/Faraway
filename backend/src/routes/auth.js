import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { getDb } from "../db/index.js";

const router = Router();

router.post("/signup", async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const db = await getDb();
  const existing = await db.get("SELECT id FROM users WHERE email = ?", email);
  if (existing) {
    return res.status(409).json({ error: "an account with that email already exists" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const result = await db.run(
    "INSERT INTO users (email, password_hash, display_name) VALUES (?, ?, ?)",
    email,
    passwordHash,
    displayName || email.split("@")[0]
  );

  const token = signToken(result.lastID, email);
  res.status(201).json({ token, user: { id: result.lastID, email, displayName } });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const db = await getDb();
  const user = await db.get("SELECT * FROM users WHERE email = ?", email);
  if (!user) return res.status(401).json({ error: "invalid credentials" });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: "invalid credentials" });

  const token = signToken(user.id, user.email);
  res.json({ token, user: { id: user.id, email: user.email, displayName: user.display_name } });
});

function signToken(userId, email) {
  return jwt.sign({ userId, email }, process.env.JWT_SECRET, { expiresIn: "30d" });
}

export default router;
