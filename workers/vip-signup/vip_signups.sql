-- D1 Migration: Create vip_signups table
-- Run via: npx wrangler d1 execute joyfully-dull-vip --remote --file=./vip_signups.sql
-- (from the workers/vip-signup/ directory)

CREATE TABLE IF NOT EXISTS vip_signups (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL UNIQUE,
  joy_answer TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);
