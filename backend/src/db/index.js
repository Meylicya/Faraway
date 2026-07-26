import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv";

dotenv.config();

let dbInstance = null;

export async function getDb() {
  if (dbInstance) return dbInstance;

  dbInstance = await open({
    filename: process.env.DATABASE_FILE || "./faraway.sqlite",
    driver: sqlite3.Database,
  });

  await dbInstance.exec(`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      display_name TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- A room has exactly two members (see architecture notes: "exactly 2" constraint).
    CREATE TABLE IF NOT EXISTS rooms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      owner_id INTEGER NOT NULL REFERENCES users(id),
      invited_email TEXT NOT NULL,
      member_id INTEGER REFERENCES users(id),
      status TEXT NOT NULL DEFAULT 'pending', -- pending | accepted
      countdown_target TEXT, -- ISO timestamp of next call
      call_streak INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    -- last-known canvas snapshot for the doodle pad, sent to newly joining clients
    CREATE TABLE IF NOT EXISTS doodle_snapshots (
      room_id INTEGER PRIMARY KEY REFERENCES rooms(id),
      canvas_data TEXT,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  return dbInstance;
}
