import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";

const DB_PATH = process.env.DB_PATH || "./data/chat.db";
const HISTORY_LIMIT = Number(process.env.CHAT_HISTORY_LIMIT) || 20;

mkdirSync(dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id, id);
`);

const selectHistory = db.prepare(`
  SELECT role, content
  FROM messages
  WHERE user_id = ?
  ORDER BY id DESC
  LIMIT ?
`);

const insertMessage = db.prepare(`
  INSERT INTO messages (user_id, role, content, created_at)
  VALUES (?, ?, ?, ?)
`);

const trimHistory = db.prepare(`
  DELETE FROM messages
  WHERE user_id = ?
    AND id NOT IN (
      SELECT id FROM messages
      WHERE user_id = ?
      ORDER BY id DESC
      LIMIT ?
    )
`);

const deleteHistory = db.prepare(`
  DELETE FROM messages WHERE user_id = ?
`);

export function getHistory(userId) {
  return selectHistory.all(String(userId), HISTORY_LIMIT).reverse();
}

export function saveMessage(userId, role, content) {
  const id = String(userId);
  insertMessage.run(id, role, content, Date.now());
  trimHistory.run(id, id, HISTORY_LIMIT);
}

export function clearHistory(userId) {
  deleteHistory.run(String(userId));
}

console.log(`Database ready: ${DB_PATH}`);
