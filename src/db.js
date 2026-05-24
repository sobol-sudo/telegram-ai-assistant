import pg from "pg";

const HISTORY_LIMIT = Number(process.env.CHAT_HISTORY_LIMIT) || 20;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add PostgreSQL on Railway and link it to the service.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost")
    ? false
    : { rejectUnauthorized: false },
});

let initialized = false;

async function initDb() {
  if (initialized) {
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      user_id TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content TEXT NOT NULL,
      created_at BIGINT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_messages_user_id ON messages (user_id, id);
  `);

  initialized = true;
  console.log("Database ready (PostgreSQL)");
}

export async function getHistory(userId) {
  await initDb();

  const { rows } = await pool.query(
    `SELECT role, content
     FROM messages
     WHERE user_id = $1
     ORDER BY id DESC
     LIMIT $2`,
    [String(userId), HISTORY_LIMIT]
  );

  return rows.reverse();
}

export async function saveMessage(userId, role, content) {
  await initDb();

  const id = String(userId);

  await pool.query(
    `INSERT INTO messages (user_id, role, content, created_at)
     VALUES ($1, $2, $3, $4)`,
    [id, role, content, Date.now()]
  );

  await pool.query(
    `DELETE FROM messages
     WHERE user_id = $1
       AND id NOT IN (
         SELECT id FROM messages
         WHERE user_id = $1
         ORDER BY id DESC
         LIMIT $2
       )`,
    [id, HISTORY_LIMIT]
  );
}

export async function clearHistory(userId) {
  await initDb();
  await pool.query(`DELETE FROM messages WHERE user_id = $1`, [String(userId)]);
}
