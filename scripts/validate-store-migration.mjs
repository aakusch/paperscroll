import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const directory = mkdtempSync(join(tmpdir(), "paperscroll-store-"));
const path = join(directory, "legacy.sqlite");
const legacy = new DatabaseSync(path);
legacy.exec(`
  CREATE TABLE users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    newsletter INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL
  );
  CREATE TABLE api_tokens (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id),
    token_hash TEXT NOT NULL UNIQUE,
    prefix TEXT NOT NULL,
    created_at TEXT NOT NULL,
    last_used_at TEXT
  );
  INSERT INTO users (id, name, email, password_hash, created_at)
  VALUES ('user-1', 'routecheck', 'routecheck@example.test', 'test-only', '2026-08-24T12:00:00.000Z');
  INSERT INTO api_tokens (id, user_id, token_hash, prefix, created_at)
  VALUES ('token-1', 'user-1', 'hash', 'ps_live_test', '2026-08-24T12:00:00.000Z');
`);
legacy.close();

process.env.PAPERSCROLL_SQLITE_PATH = path;
await import("../server/sqlite-store.mjs");

const migrated = new DatabaseSync(path);
const columns = migrated.prepare("PRAGMA table_info(api_tokens)").all().map((row) => row.name);
for (const name of [
  "label",
  "scope",
  "last_checked_at",
  "last_returned_at",
  "last_returned_board_id",
  "last_returned_board_version",
  "expires_at",
]) {
  assert.ok(columns.includes(name), `missing migrated token column ${name}`);
}
const row = migrated.prepare("SELECT label, scope, expires_at FROM api_tokens WHERE id = 'token-1'").get();
assert.equal(row.label, "Morning route");
assert.equal(row.scope, "digest:read");
assert.ok(row.expires_at > "2026-08-24T12:00:00.000Z");
migrated.close();

console.log("SQLite token migration valid.");
