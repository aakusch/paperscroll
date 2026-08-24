import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";

const ROOT = dirname(fileURLToPath(import.meta.url));
mkdirSync(join(ROOT, "..", "data"), { recursive: true });
const db = new DatabaseSync(join(ROOT, "..", "data", "paperscroll.sqlite"));
db.exec("PRAGMA foreign_keys = ON;");
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    newsletter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    paper_id TEXT NOT NULL,
    user_id TEXT NOT NULL REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS comments_paper ON comments(paper_id, created_at);
  CREATE TABLE IF NOT EXISTS saves (
    user_id TEXT NOT NULL REFERENCES users(id),
    paper_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    PRIMARY KEY (user_id, paper_id)
  );
  CREATE TABLE IF NOT EXISTS api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT,
    expires_at TEXT
  );
  CREATE INDEX IF NOT EXISTS api_tokens_user ON api_tokens(user_id);
`);

const userCols = db.prepare("PRAGMA table_info(users)").all().map((row) => row.name);
for (const [column, sql] of [
  ["bio", "ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''"],
  ["x_url", "ALTER TABLE users ADD COLUMN x_url TEXT NOT NULL DEFAULT ''"],
  ["linkedin_url", "ALTER TABLE users ADD COLUMN linkedin_url TEXT NOT NULL DEFAULT ''"],
  ["interests", "ALTER TABLE users ADD COLUMN interests TEXT NOT NULL DEFAULT '[]'"],
  ["working_on", "ALTER TABLE users ADD COLUMN working_on TEXT NOT NULL DEFAULT ''"],
]) {
  if (!userCols.includes(column)) db.exec(sql);
}

const tokenCols = db.prepare("PRAGMA table_info(api_tokens)").all().map((row) => row.name);
if (!tokenCols.includes("expires_at")) {
  db.exec("ALTER TABLE api_tokens ADD COLUMN expires_at TEXT");
}
db.exec(`
  UPDATE api_tokens
  SET expires_at = strftime('%Y-%m-%dT%H:%M:%fZ', created_at, '+90 days')
  WHERE expires_at IS NULL
`);

try {
  db.exec("CREATE UNIQUE INDEX IF NOT EXISTS users_name_ci ON users(lower(name));");
} catch {
  console.warn("users_name_ci skipped: duplicate names already exist");
}

const insertUser = db.prepare(
  "INSERT INTO users (id, name, email, password_hash, newsletter, created_at) VALUES (?, ?, ?, ?, ?, ?)",
);

export const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT * FROM users WHERE id = ?"),
  userByName: db.prepare("SELECT * FROM users WHERE lower(name) = lower(?)"),
  insertUser: {
    run(id, name, email, passwordHash, newsletter, createdAt) {
      return insertUser.run(
        id,
        name,
        email,
        passwordHash,
        newsletter ? 1 : 0,
        createdAt,
      );
    },
  },
  setNewsletter: db.prepare("UPDATE users SET newsletter = 1 WHERE id = ?"),
  insertSession: db.prepare(
    "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
  ),
  session: db.prepare("SELECT * FROM sessions WHERE id = ? AND expires_at > ?"),
  deleteSession: db.prepare("DELETE FROM sessions WHERE id = ?"),
  deleteSessionsForUser: db.prepare("DELETE FROM sessions WHERE user_id = ?"),
  deleteExpiredSessions: db.prepare("DELETE FROM sessions WHERE expires_at <= ?"),
  comments: db.prepare(
    `SELECT c.id, c.body, c.created_at AS createdAt, u.id AS userId, u.name AS author
     FROM comments c JOIN users u ON u.id = c.user_id
     WHERE c.paper_id = ? ORDER BY c.created_at ASC`,
  ),
  insertComment: db.prepare(
    "INSERT INTO comments (id, paper_id, user_id, body, created_at) VALUES (?, ?, ?, ?, ?)",
  ),
  saves: db.prepare("SELECT paper_id AS paperId FROM saves WHERE user_id = ?"),
  insertSave: db.prepare(
    "INSERT OR IGNORE INTO saves (user_id, paper_id, created_at) VALUES (?, ?, ?)",
  ),
  deleteSave: db.prepare("DELETE FROM saves WHERE user_id = ? AND paper_id = ?"),
  updateProfile: db.prepare(
    "UPDATE users SET name = ?, bio = ?, x_url = ?, linkedin_url = ? WHERE id = ?",
  ),
  updatePrefs: db.prepare(
    "UPDATE users SET interests = ?, working_on = ? WHERE id = ?",
  ),
  setPassword: db.prepare("UPDATE users SET password_hash = ? WHERE id = ?"),
  tokensForUser: db.prepare(
    `SELECT id, prefix, created_at AS createdAt, last_used_at AS lastUsedAt,
            expires_at AS expiresAt
     FROM api_tokens WHERE user_id = ? ORDER BY created_at DESC`,
  ),
  tokenCount: db.prepare("SELECT COUNT(*) AS n FROM api_tokens WHERE user_id = ?"),
  tokenByHash: db.prepare(
    "SELECT * FROM api_tokens WHERE token_hash = ? AND expires_at > ?",
  ),
  tokenById: db.prepare("SELECT * FROM api_tokens WHERE id = ? AND user_id = ?"),
  insertToken: db.prepare(
    "INSERT INTO api_tokens (id, user_id, token_hash, prefix, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?)",
  ),
  touchToken: db.prepare("UPDATE api_tokens SET last_used_at = ? WHERE id = ?"),
  deleteToken: db.prepare("DELETE FROM api_tokens WHERE id = ? AND user_id = ?"),
  deleteExpiredTokens: db.prepare("DELETE FROM api_tokens WHERE expires_at <= ?"),
};

export async function ready() {}
