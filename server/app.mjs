/**
 * Users, sessions, comments, saves, digest tokens. Used by Vite in dev and by server/index.mjs.
 */
import { createHash, randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { DatabaseSync } from "node:sqlite";
import {
  checkPassword,
  emailIssue,
  hashPassword,
  normalizeEmail,
  normalizeUsername,
  passwordIssue,
  passwordNeedsRehash,
  usernameIssue,
} from "./identity.mjs";

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
for (const [name, sql] of [
  ["bio", "ALTER TABLE users ADD COLUMN bio TEXT NOT NULL DEFAULT ''"],
  ["x_url", "ALTER TABLE users ADD COLUMN x_url TEXT NOT NULL DEFAULT ''"],
  ["linkedin_url", "ALTER TABLE users ADD COLUMN linkedin_url TEXT NOT NULL DEFAULT ''"],
  ["interests", "ALTER TABLE users ADD COLUMN interests TEXT NOT NULL DEFAULT '[]'"],
  ["working_on", "ALTER TABLE users ADD COLUMN working_on TEXT NOT NULL DEFAULT ''"],
]) {
  if (!userCols.includes(name)) db.exec(sql);
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

const q = {
  userByEmail: db.prepare("SELECT * FROM users WHERE email = ?"),
  userById: db.prepare("SELECT * FROM users WHERE id = ?"),
  userByName: db.prepare("SELECT * FROM users WHERE lower(name) = lower(?)"),
  insertUser: db.prepare(
    "INSERT INTO users (id, name, email, password_hash, newsletter, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ),
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

const MAX_BODY = 32 * 1024;
const MAX_PAPER_ID = 80;
const PAPER_ID_OK = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

const rateBuckets = new Map();

function clientKey(req) {
  if (process.env.TRUST_PROXY === "1") {
    const xf = String(req.headers["x-forwarded-for"] || "")
      .split(",")[0]
      .trim();
    if (xf) return xf;
  }
  return req.socket?.remoteAddress || "unknown";
}

function rateOk(key, max, windowMs) {
  const now = Date.now();
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.reset <= now) {
    bucket = { n: 0, reset: now + windowMs };
    rateBuckets.set(key, bucket);
  }
  if (bucket.n >= max) return false;
  bucket.n += 1;
  if (rateBuckets.size > 4000) {
    for (const [k, v] of rateBuckets) {
      if (v.reset <= now) rateBuckets.delete(k);
    }
  }
  return true;
}

function id() {
  return randomBytes(16).toString("hex");
}

function now() {
  return new Date().toISOString();
}

function later(days) {
  return new Date(Date.now() + days * 86400000).toISOString();
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || "").split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    const key = part.slice(0, i).trim();
    let value = part.slice(i + 1).trim();
    try {
      value = decodeURIComponent(value);
    } catch {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function userFromCookie(req) {
  const sid = parseCookies(req.headers.cookie).ps_session;
  if (!sid) return null;
  const session = q.session.get(hashToken(sid), now());
  if (!session) return null;
  return q.userById.get(session.user_id) ?? null;
}

function publicProfile(row) {
  return {
    id: row.id,
    name: row.name,
    bio: row.bio || "",
    joinedAt: row.created_at,
    x: row.x_url || "",
    linkedin: row.linkedin_url || "",
  };
}

const TOPICS = ["AI", "Stats", "Math", "Econ", "Health", "Physics", "Security"];

function parseInterests(raw, fallback) {
  if (raw == null) return fallback;
  if (!Array.isArray(raw)) {
    throw new HttpError(400, "Pick fields from the list.");
  }
  const seen = new Set();
  const out = [];
  for (const item of raw) {
    if (!TOPICS.includes(item) || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

function parseWorkingOn(raw, fallback) {
  if (raw == null) return fallback;
  return String(raw).trim().slice(0, 200);
}

function readInterests(row) {
  try {
    return parseInterests(JSON.parse(row.interests || "[]"), []);
  } catch {
    return [];
  }
}

function publicUser(row) {
  return {
    ...publicProfile(row),
    email: row.email,
    newsletter: Boolean(row.newsletter),
    interests: readInterests(row),
    workingOn: row.working_on || "",
  };
}

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  try {
    const url = new URL(s.includes("://") ? s : `https://${s}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      throw new HttpError(400, "That link isn’t a URL.");
    }
    url.protocol = "https:";
    url.username = "";
    url.password = "";
    return url;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    throw new HttpError(400, "That link isn’t a URL.");
  }
}

function normalizeX(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  const handle = s.replace(/^@/, "");
  if (/^[A-Za-z0-9_]{1,15}$/.test(handle)) return `https://x.com/${handle}`;
  const url = asUrl(s);
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "x.com" && host !== "twitter.com") {
    throw new HttpError(400, "X should be a handle or an x.com / twitter.com link.");
  }
  const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/?$/);
  if (!match) throw new HttpError(400, "X should be a profile handle.");
  return `https://x.com/${match[1]}`;
}

function normalizeLinkedIn(raw) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/^[A-Za-z0-9_-]+$/.test(s)) {
    return `https://www.linkedin.com/in/${s}`;
  }
  const url = asUrl(s);
  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  if (host !== "linkedin.com") {
    throw new HttpError(400, "LinkedIn should be a linkedin.com/in/… link.");
  }
  const match = url.pathname.match(/^\/in\/([A-Za-z0-9_-]+)\/?$/);
  if (!match) throw new HttpError(400, "LinkedIn should be a /in/ profile URL.");
  return `https://www.linkedin.com/in/${match[1]}`;
}

function cookieSecure(req) {
  if (process.env.COOKIE_SECURE === "0") return false;
  if (process.env.COOKIE_SECURE === "1") return true;
  if (process.env.TRUST_PROXY !== "1") return false;
  const proto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  return proto === "https";
}

function cookieFlags(req, maxAge) {
  const secure = cookieSecure(req);
  return `Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

function send(res, status, body, extra = {}) {
  const json = body === undefined ? "" : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
    ...extra,
  });
  res.end(json);
}

function sendText(res, status, body, type) {
  res.writeHead(status, {
    "Content-Type": type,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "no-store",
  });
  res.end(body);
}

function hashToken(secret) {
  return createHash("sha256").update(secret).digest("hex");
}

function mintTokenSecret() {
  return `ps_live_${randomBytes(24).toString("base64url")}`;
}

function bearerSecret(req) {
  const header = String(req.headers.authorization || "");
  const match = header.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : "";
}

function setSession(req, sessionId) {
  return {
    "Set-Cookie": `ps_session=${sessionId}; ${cookieFlags(req, 60 * 60 * 24 * 30)}`,
  };
}

function clearSession(req) {
  return {
    "Set-Cookie": `ps_session=; ${cookieFlags(req, 0)}`,
  };
}

function startSession(req, userId) {
  q.deleteExpiredSessions.run(now());
  q.deleteSessionsForUser.run(userId);
  const sid = id();
  q.insertSession.run(hashToken(sid), userId, later(30));
  return setSession(req, sid);
}

function sameOrigin(req) {
  const method = req.method || "GET";
  if (method === "GET" || method === "HEAD") return true;
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const from = new URL(origin);
    const here = new URL(`http://${req.headers.host || "localhost"}`);
    if (from.host === here.host) return true;
    const loop = (h) =>
      h === "localhost" || h === "127.0.0.1" || h === "::1" || h === "[::1]";
    return loop(from.hostname) && loop(here.hostname) && from.port === here.port;
  } catch {
    return false;
  }
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      req.destroy();
      return null;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    return null;
  }
}

function paperIdOk(value) {
  return PAPER_ID_OK.test(value) && value.length <= MAX_PAPER_ID;
}

function nameTaken(name, exceptId) {
  const row = q.userByName.get(name);
  return Boolean(row && row.id !== exceptId);
}

function decodePath(part) {
  try {
    return decodeURIComponent(part);
  } catch {
    return "";
  }
}

function route(method, path) {
  return `${method} ${path}`;
}

/**
 * @param {{ digest?: (query: Record<string, string | undefined>) => Promise<{ kind: string, body: string }> }} [hooks]
 * @returns {Promise<boolean>} true if this was an /api request
 */
export async function handleApi(req, res, hooks = {}) {
  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (!url.pathname.startsWith("/api")) return false;

  const key = route(req.method || "GET", url.pathname);

  try {
    if (!sameOrigin(req)) {
      send(res, 403, { error: "Bad origin." });
      return true;
    }

    if (key === "POST /api/signup") {
      if (!rateOk(`signup:${clientKey(req)}`, 5, 60 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const body = await readBody(req);
      if (!body) return send(res, 400, { error: "Bad JSON" }), true;
      const name = normalizeUsername(body.name);
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      const confirm = String(body.passwordConfirm ?? "");
      const badName = usernameIssue(name);
      const badEmail = emailIssue(email);
      const badPassword = passwordIssue(password, { username: name, email });
      if (badName || badEmail || badPassword) {
        send(res, 400, { error: badName || badEmail || badPassword });
        return true;
      }
      if (confirm !== password) {
        send(res, 400, { error: "Passwords don’t match." });
        return true;
      }
      if (nameTaken(name)) {
        send(res, 409, { error: "That username is already taken." });
        return true;
      }
      if (q.userByEmail.get(email)) {
        send(res, 400, { error: "Could not create account." });
        return true;
      }
      const userId = id();
      try {
        q.insertUser.run(
          userId,
          name,
          email,
          hashPassword(password),
          body.newsletter ? 1 : 0,
          now(),
        );
      } catch {
        if (nameTaken(name)) {
          send(res, 409, { error: "That username is already taken." });
          return true;
        }
        send(res, 400, { error: "Could not create account." });
        return true;
      }
      send(
        res,
        201,
        { user: publicUser(q.userById.get(userId)) },
        startSession(req, userId),
      );
      return true;
    }

    if (key === "POST /api/login") {
      const ip = clientKey(req);
      if (!rateOk(`login:${ip}`, 10, 15 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const body = await readBody(req);
      if (!body) return send(res, 400, { error: "Bad JSON" }), true;
      const email = normalizeEmail(body.email);
      const password = String(body.password || "");
      if (!rateOk(`login-mail:${email || ip}`, 8, 15 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const row = q.userByEmail.get(email);
      if (!row || !checkPassword(password, row.password_hash)) {
        send(res, 401, { error: "Email or password is wrong." });
        return true;
      }
      if (passwordNeedsRehash(row.password_hash)) {
        q.setPassword.run(hashPassword(password), row.id);
      }
      send(res, 200, { user: publicUser(row) }, startSession(req, row.id));
      return true;
    }

    if (key === "POST /api/logout") {
      const sid = parseCookies(req.headers.cookie).ps_session;
      if (sid) q.deleteSession.run(hashToken(sid));
      send(res, 200, { ok: true }, clearSession(req));
      return true;
    }

    if (key === "GET /api/me") {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 200, { user: null, saves: [] });
        return true;
      }
      const saves = q.saves.all(user.id).map((row) => row.paperId);
      send(res, 200, { user: publicUser(user), saves });
      return true;
    }

    const unameGet = url.pathname.match(/^\/api\/usernames\/([^/]+)$/);
    if (req.method === "GET" && unameGet) {
      if (!rateOk(`uname:${clientKey(req)}`, 40, 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const name = normalizeUsername(decodePath(unameGet[1]));
      if (usernameIssue(name)) {
        send(res, 200, { available: false });
        return true;
      }
      send(res, 200, { available: !nameTaken(name) });
      return true;
    }

    const userGet = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (req.method === "GET" && userGet) {
      const handle = decodePath(userGet[1]);
      const row = q.userByName.get(handle) ?? q.userById.get(handle);
      if (!row) {
        send(res, 404, { error: "No such profile." });
        return true;
      }
      send(res, 200, { user: publicProfile(row) });
      return true;
    }

    if (key === "PATCH /api/profile") {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to edit your profile." });
        return true;
      }
      const body = await readBody(req);
      if (!body) {
        send(res, 400, { error: "Bad JSON" });
        return true;
      }
      const name = normalizeUsername(body.name ?? user.name);
      const bio = String(body.bio ?? user.bio ?? "").trim();
      const badName = usernameIssue(name);
      if (badName) {
        send(res, 400, { error: badName });
        return true;
      }
      if (nameTaken(name, user.id)) {
        send(res, 409, { error: "That username is already taken." });
        return true;
      }
      if (bio.length > 500) {
        send(res, 400, { error: "Bio should be under 500 characters." });
        return true;
      }
      const x = normalizeX(body.x ?? user.x_url);
      const linkedin = normalizeLinkedIn(body.linkedin ?? user.linkedin_url);
      try {
        q.updateProfile.run(name, bio, x, linkedin, user.id);
      } catch {
        send(res, 409, { error: "That username is already taken." });
        return true;
      }
      send(res, 200, { user: publicUser(q.userById.get(user.id)) });
      return true;
    }

    if (key === "PATCH /api/prefs") {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to save fields." });
        return true;
      }
      const body = await readBody(req);
      if (!body) {
        send(res, 400, { error: "Bad JSON" });
        return true;
      }
      try {
        const interests = parseInterests(body.interests, readInterests(user));
        const workingOn = parseWorkingOn(body.workingOn, user.working_on || "");
        q.updatePrefs.run(JSON.stringify(interests), workingOn, user.id);
      } catch (err) {
        if (err instanceof HttpError) {
          send(res, err.status, { error: err.message });
          return true;
        }
        throw err;
      }
      send(res, 200, { user: publicUser(q.userById.get(user.id)) });
      return true;
    }

    if (key === "GET /api/tokens") {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to manage digest tokens." });
        return true;
      }
      q.deleteExpiredTokens.run(now());
      send(res, 200, { tokens: q.tokensForUser.all(user.id) });
      return true;
    }

    if (key === "POST /api/tokens") {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to create a digest token." });
        return true;
      }
      if (!rateOk(`token:${user.id}`, 10, 60 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      await readBody(req);
      q.deleteExpiredTokens.run(now());
      const count = q.tokenCount.get(user.id)?.n ?? 0;
      if (count >= 5) {
        send(res, 400, { error: "Revoke a token before creating another (max 5)." });
        return true;
      }
      const secret = mintTokenSecret();
      const tokenId = id();
      const createdAt = now();
      const expiresAt = later(90);
      q.insertToken.run(
        tokenId,
        user.id,
        hashToken(secret),
        secret.slice(0, 16),
        createdAt,
        expiresAt,
      );
      send(res, 201, {
        token: secret,
        id: tokenId,
        prefix: secret.slice(0, 16),
        createdAt,
        expiresAt,
      });
      return true;
    }

    const tokenDelete = url.pathname.match(/^\/api\/tokens\/([^/]+)$/);
    if (req.method === "DELETE" && tokenDelete) {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to revoke a digest token." });
        return true;
      }
      const tokenId = decodePath(tokenDelete[1]);
      const row = q.tokenById.get(tokenId, user.id);
      if (!row) {
        send(res, 404, { error: "Token not found." });
        return true;
      }
      q.deleteToken.run(tokenId, user.id);
      send(res, 200, { ok: true });
      return true;
    }

    if (key === "GET /api/digest" || key === "GET /api/v1/digest") {
      const secret = bearerSecret(req);
      if (!secret) {
        send(res, 401, { error: "Send Authorization: Bearer with a digest token from your account." });
        return true;
      }
      const tokenRow = q.tokenByHash.get(hashToken(secret), now());
      if (!tokenRow) {
        send(res, 401, { error: "Unknown digest token." });
        return true;
      }
      if (!rateOk(`digest:${tokenRow.id}`, 120, 60 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const user = q.userById.get(tokenRow.user_id);
      if (!user) {
        send(res, 401, { error: "Unknown digest token." });
        return true;
      }
      if (!hooks.digest) {
        send(res, 503, { error: "Digest is only available when the site is running (Vite)." });
        return true;
      }
      const fields = readInterests(user).join(",");
      const desk = user.working_on || "";
      try {
        const result = await hooks.digest({
          date: url.searchParams.get("date") || undefined,
          fields,
          desk,
          format: url.searchParams.get("format") || undefined,
          origin: `${url.protocol}//${url.host}`,
        });
        q.touchToken.run(now(), tokenRow.id);
        if (result.kind === "json") {
          sendText(res, 200, result.body, "application/json; charset=utf-8");
        } else {
          sendText(res, 200, result.body, "text/markdown; charset=utf-8");
        }
      } catch (err) {
        const status = Number(err?.status) || 500;
        send(res, status, { error: err?.message || "Could not build digest." });
      }
      return true;
    }

    if (key === "POST /api/newsletter") {
      const user = userFromCookie(req);
      await readBody(req);
      if (!user) {
        send(res, 401, { error: "Sign in to subscribe. We’ll send mail later." });
        return true;
      }
      q.setNewsletter.run(user.id);
      send(res, 200, { user: { ...publicUser(user), newsletter: true } });
      return true;
    }

    const commentGet = url.pathname.match(/^\/api\/papers\/([^/]+)\/comments$/);
    if (req.method === "GET" && commentGet) {
      const paperId = decodePath(commentGet[1]);
      if (!paperIdOk(paperId)) {
        send(res, 200, { comments: [] });
        return true;
      }
      send(res, 200, { comments: q.comments.all(paperId) });
      return true;
    }
    if (req.method === "POST" && commentGet) {
      if (!rateOk(`comment:${clientKey(req)}`, 20, 10 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to comment." });
        return true;
      }
      const body = await readBody(req);
      const text = String(body?.body || "").trim();
      if (!text || text.length > 2000) {
        send(res, 400, { error: "Write something short." });
        return true;
      }
      const paperId = decodePath(commentGet[1]);
      if (!paperIdOk(paperId)) {
        send(res, 400, { error: "Missing paper." });
        return true;
      }
      const commentId = id();
      q.insertComment.run(commentId, paperId, user.id, text, now());
      send(res, 201, {
        comment: {
          id: commentId,
          userId: user.id,
          author: user.name,
          body: text,
          createdAt: now(),
        },
      });
      return true;
    }

    if (key === "PUT /api/saves") {
      const user = userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to save papers." });
        return true;
      }
      const body = await readBody(req);
      const paperId = String(body?.paperId || "").trim();
      const on = Boolean(body?.on);
      if (!paperIdOk(paperId)) {
        send(res, 400, { error: "Missing paper." });
        return true;
      }
      if (on) q.insertSave.run(user.id, paperId, now());
      else q.deleteSave.run(user.id, paperId);
      const saves = q.saves.all(user.id).map((row) => row.paperId);
      send(res, 200, { saves });
      return true;
    }

    send(res, 404, { error: "Not found" });
    return true;
  } catch (err) {
    if (err instanceof HttpError) {
      send(res, err.status, { error: err.message });
      return true;
    }
    console.error(err);
    if (!res.headersSent) send(res, 500, { error: "Server error" });
    return true;
  }
}
