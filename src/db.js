import pg from "pg";

const HISTORY_LIMIT = Number(process.env.CHAT_HISTORY_LIMIT) || 20;

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (process.env.DATABASE_PRIVATE_URL) {
    return process.env.DATABASE_PRIVATE_URL;
  }

  const { PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT } = process.env;

  if (PGHOST && PGUSER && PGPASSWORD && PGDATABASE) {
    return `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT || 5432}/${PGDATABASE}`;
  }

  return null;
}

const connectionString = resolveDatabaseUrl();

if (!connectionString) {
  console.error(`
DATABASE_URL is not set.

On Railway:
1. Project → + New → Database → PostgreSQL
2. Open your BOT service (not Postgres) → Variables
3. + New Variable → Add Reference
4. Select PostgreSQL → pick DATABASE_PRIVATE_URL (or DATABASE_URL)
5. Redeploy the bot service
`);
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl:
    connectionString.includes("localhost") ||
    connectionString.includes("127.0.0.1") ||
    process.env.PGSSL === "false"
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
