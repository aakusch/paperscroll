import { neon } from "@neondatabase/serverless";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required for the Neon store.");

const sql = neon(connectionString);

function statement(text) {
  async function rows(params) {
    return sql.query(text, params);
  }
  return {
    async get(...params) {
      return (await rows(params))[0];
    },
    async all(...params) {
      return rows(params);
    },
    async run(...params) {
      await rows(params);
    },
  };
}

let initialized;

export function ready() {
  if (!initialized) {
    initialized = initialize().catch((err) => {
      initialized = undefined;
      throw err;
    });
  }
  return initialized;
}

async function initialize() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      newsletter BOOLEAN NOT NULL DEFAULT FALSE,
      created_at TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      x_url TEXT NOT NULL DEFAULT '',
      linkedin_url TEXT NOT NULL DEFAULT '',
      interests TEXT NOT NULL DEFAULT '[]',
      working_on TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS users_name_ci ON users(lower(name))`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      paper_id TEXT NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      body TEXT NOT NULL,
      created_at TEXT NOT NULL
    )`,
    `CREATE INDEX IF NOT EXISTS comments_paper ON comments(paper_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS saves (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      paper_id TEXT NOT NULL,
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, paper_id)
    )`,
    `CREATE TABLE IF NOT EXISTS api_tokens (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token_hash TEXT NOT NULL UNIQUE,
      prefix TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'Morning route',
      scope TEXT NOT NULL DEFAULT 'digest:read',
      created_at TEXT NOT NULL,
      last_used_at TEXT,
      last_checked_at TEXT,
      last_returned_at TEXT,
      last_returned_board_id TEXT,
      last_returned_board_version TEXT,
      expires_at TEXT NOT NULL
    )`,
    `ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS label TEXT NOT NULL DEFAULT 'Morning route'`,
    `ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS scope TEXT NOT NULL DEFAULT 'digest:read'`,
    `ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_checked_at TEXT`,
    `ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_returned_at TEXT`,
    `ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_returned_board_id TEXT`,
    `ALTER TABLE api_tokens ADD COLUMN IF NOT EXISTS last_returned_board_version TEXT`,
    `CREATE INDEX IF NOT EXISTS api_tokens_user ON api_tokens(user_id)`,
  ];
  for (const text of statements) await sql.query(text, []);
}

export const q = {
  userByEmail: statement("SELECT * FROM users WHERE email = $1"),
  userById: statement("SELECT * FROM users WHERE id = $1"),
  userByName: statement("SELECT * FROM users WHERE lower(name) = lower($1)"),
  insertUser: statement(
    "INSERT INTO users (id, name, email, password_hash, newsletter, created_at) VALUES ($1, $2, $3, $4, $5, $6)",
  ),
  setNewsletter: statement("UPDATE users SET newsletter = TRUE WHERE id = $1"),
  insertSession: statement(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3)",
  ),
  session: statement("SELECT * FROM sessions WHERE id = $1 AND expires_at > $2"),
  deleteSession: statement("DELETE FROM sessions WHERE id = $1"),
  deleteSessionsForUser: statement("DELETE FROM sessions WHERE user_id = $1"),
  deleteExpiredSessions: statement("DELETE FROM sessions WHERE expires_at <= $1"),
  comments: statement(
    `SELECT c.id, c.body, c.created_at AS "createdAt", u.id AS "userId", u.name AS author
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.paper_id = $1 ORDER BY c.created_at ASC`,
  ),
  insertComment: statement(
    "INSERT INTO comments (id, paper_id, user_id, body, created_at) VALUES ($1, $2, $3, $4, $5)",
  ),
  saves: statement('SELECT paper_id AS "paperId" FROM saves WHERE user_id = $1'),
  insertSave: statement(
    "INSERT INTO saves (user_id, paper_id, created_at) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
  ),
  deleteSave: statement("DELETE FROM saves WHERE user_id = $1 AND paper_id = $2"),
  updateProfile: statement(
    "UPDATE users SET name = $1, bio = $2, x_url = $3, linkedin_url = $4 WHERE id = $5",
  ),
  updatePrefs: statement(
    "UPDATE users SET interests = $1, working_on = $2 WHERE id = $3",
  ),
  setPassword: statement("UPDATE users SET password_hash = $1 WHERE id = $2"),
  tokensForUser: statement(
    `SELECT id, prefix, label, scope, created_at AS "createdAt",
            COALESCE(last_checked_at, last_used_at) AS "lastCheckedAt",
            last_returned_at AS "lastReturnedAt",
            last_returned_board_id AS "lastReturnedBoardId",
            last_returned_board_version AS "lastReturnedBoardVersion",
            expires_at AS "expiresAt"
     FROM api_tokens WHERE user_id = $1 ORDER BY created_at DESC`,
  ),
  tokenCount: statement("SELECT COUNT(*)::int AS n FROM api_tokens WHERE user_id = $1"),
  tokenByHash: statement(
    "SELECT * FROM api_tokens WHERE token_hash = $1 AND expires_at > $2",
  ),
  tokenById: statement("SELECT * FROM api_tokens WHERE id = $1 AND user_id = $2"),
  insertToken: statement(
    "INSERT INTO api_tokens (id, user_id, token_hash, prefix, label, scope, created_at, expires_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
  ),
  recordTokenCheck: statement(
    "UPDATE api_tokens SET last_used_at = $1, last_checked_at = $2 WHERE id = $3",
  ),
  recordTokenReturn: statement(
    `UPDATE api_tokens
     SET last_used_at = $1, last_checked_at = $2, last_returned_at = $3,
         last_returned_board_id = $4, last_returned_board_version = $5
     WHERE id = $6`,
  ),
  deleteToken: statement("DELETE FROM api_tokens WHERE id = $1 AND user_id = $2"),
  deleteExpiredTokens: statement("DELETE FROM api_tokens WHERE expires_at <= $1"),
};
