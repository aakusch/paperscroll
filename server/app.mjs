/**
 * Users, sessions, comments, saves, digest tokens. Used by Vite in dev and by server/index.mjs.
 */
import { createHash, randomBytes } from "node:crypto";
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
import { q, ready as storeReady } from "./store.mjs";

const MAX_BODY = 32 * 1024;
const MAX_PAPER_ID = 80;
const PAPER_ID_OK = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,79}$/;

const rateBuckets = new Map();

function proxyTrusted() {
  return process.env.TRUST_PROXY === "1" || process.env.VERCEL === "1";
}

function requestProtocol(req) {
  if (proxyTrusted()) {
    const forwarded = String(req.headers["x-forwarded-proto"] || "")
      .split(",")[0]
      .trim();
    if (forwarded === "http" || forwarded === "https") return forwarded;
  }
  return process.env.VERCEL === "1" ? "https" : "http";
}

function requestOrigin(req) {
  return `${requestProtocol(req)}://${req.headers.host || "localhost"}`;
}

function clientKey(req) {
  if (proxyTrusted()) {
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

async function userFromCookie(req) {
  const sid = parseCookies(req.headers.cookie).ps_session;
  if (!sid) return null;
  const session = await q.session.get(hashToken(sid), now());
  if (!session) return null;
  return (await q.userById.get(session.user_id)) ?? null;
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
  return requestProtocol(req) === "https";
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

async function startSession(req, userId) {
  await q.deleteExpiredSessions.run(now());
  await q.deleteSessionsForUser.run(userId);
  const sid = id();
  await q.insertSession.run(hashToken(sid), userId, later(30));
  return setSession(req, sid);
}

function sameOrigin(req) {
  const method = req.method || "GET";
  if (method === "GET" || method === "HEAD") return true;
  const origin = req.headers.origin;
  if (!origin) return false;
  try {
    const from = new URL(origin);
    const here = new URL(requestOrigin(req));
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

async function nameTaken(name, exceptId) {
  const row = await q.userByName.get(name);
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
  const url = new URL(req.url || "/", requestOrigin(req));
  if (!url.pathname.startsWith("/api")) return false;

  const key = route(req.method || "GET", url.pathname);

  try {
    await storeReady();

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
      if (await nameTaken(name)) {
        send(res, 409, { error: "That username is already taken." });
        return true;
      }
      if (await q.userByEmail.get(email)) {
        send(res, 400, { error: "Could not create account." });
        return true;
      }
      const userId = id();
      try {
        await q.insertUser.run(
          userId,
          name,
          email,
          hashPassword(password),
          Boolean(body.newsletter),
          now(),
        );
      } catch {
        if (await nameTaken(name)) {
          send(res, 409, { error: "That username is already taken." });
          return true;
        }
        send(res, 400, { error: "Could not create account." });
        return true;
      }
      send(
        res,
        201,
        { user: publicUser(await q.userById.get(userId)) },
        await startSession(req, userId),
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
      const row = await q.userByEmail.get(email);
      if (!row || !checkPassword(password, row.password_hash)) {
        send(res, 401, { error: "Email or password is wrong." });
        return true;
      }
      if (passwordNeedsRehash(row.password_hash)) {
        await q.setPassword.run(hashPassword(password), row.id);
      }
      send(res, 200, { user: publicUser(row) }, await startSession(req, row.id));
      return true;
    }

    if (key === "POST /api/logout") {
      const sid = parseCookies(req.headers.cookie).ps_session;
      if (sid) await q.deleteSession.run(hashToken(sid));
      send(res, 200, { ok: true }, clearSession(req));
      return true;
    }

    if (key === "GET /api/me") {
      const user = await userFromCookie(req);
      if (!user) {
        send(res, 200, { user: null, saves: [] });
        return true;
      }
      const saves = (await q.saves.all(user.id)).map((row) => row.paperId);
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
      send(res, 200, { available: !(await nameTaken(name)) });
      return true;
    }

    const userGet = url.pathname.match(/^\/api\/users\/([^/]+)$/);
    if (req.method === "GET" && userGet) {
      const handle = decodePath(userGet[1]);
      const row =
        (await q.userByName.get(handle)) ?? (await q.userById.get(handle));
      if (!row) {
        send(res, 404, { error: "No such profile." });
        return true;
      }
      send(res, 200, { user: publicProfile(row) });
      return true;
    }

    if (key === "PATCH /api/profile") {
      const user = await userFromCookie(req);
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
      if (await nameTaken(name, user.id)) {
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
        await q.updateProfile.run(name, bio, x, linkedin, user.id);
      } catch {
        send(res, 409, { error: "That username is already taken." });
        return true;
      }
      send(res, 200, { user: publicUser(await q.userById.get(user.id)) });
      return true;
    }

    if (key === "PATCH /api/prefs") {
      const user = await userFromCookie(req);
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
        await q.updatePrefs.run(JSON.stringify(interests), workingOn, user.id);
      } catch (err) {
        if (err instanceof HttpError) {
          send(res, err.status, { error: err.message });
          return true;
        }
        throw err;
      }
      send(res, 200, { user: publicUser(await q.userById.get(user.id)) });
      return true;
    }

    if (key === "GET /api/tokens") {
      const user = await userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to manage digest tokens." });
        return true;
      }
      await q.deleteExpiredTokens.run(now());
      send(res, 200, { tokens: await q.tokensForUser.all(user.id) });
      return true;
    }

    if (key === "POST /api/tokens") {
      const user = await userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to create a digest token." });
        return true;
      }
      if (!rateOk(`token:${user.id}`, 10, 60 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      await readBody(req);
      await q.deleteExpiredTokens.run(now());
      const count = (await q.tokenCount.get(user.id))?.n ?? 0;
      if (count >= 5) {
        send(res, 400, { error: "Revoke a token before creating another (max 5)." });
        return true;
      }
      const secret = mintTokenSecret();
      const tokenId = id();
      const createdAt = now();
      const expiresAt = later(90);
      await q.insertToken.run(
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
      const user = await userFromCookie(req);
      if (!user) {
        send(res, 401, { error: "Sign in to revoke a digest token." });
        return true;
      }
      const tokenId = decodePath(tokenDelete[1]);
      const row = await q.tokenById.get(tokenId, user.id);
      if (!row) {
        send(res, 404, { error: "Token not found." });
        return true;
      }
      await q.deleteToken.run(tokenId, user.id);
      send(res, 200, { ok: true });
      return true;
    }

    if (key === "GET /api/digest" || key === "GET /api/v1/digest") {
      const secret = bearerSecret(req);
      if (!secret) {
        send(res, 401, { error: "Send Authorization: Bearer with a digest token from your account." });
        return true;
      }
      const tokenRow = await q.tokenByHash.get(hashToken(secret), now());
      if (!tokenRow) {
        send(res, 401, { error: "Unknown digest token." });
        return true;
      }
      if (!rateOk(`digest:${tokenRow.id}`, 120, 60 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const user = await q.userById.get(tokenRow.user_id);
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
        await q.touchToken.run(now(), tokenRow.id);
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
      const user = await userFromCookie(req);
      await readBody(req);
      if (!user) {
        send(res, 401, { error: "Sign in to subscribe. We’ll send mail later." });
        return true;
      }
      await q.setNewsletter.run(user.id);
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
      send(res, 200, { comments: await q.comments.all(paperId) });
      return true;
    }
    if (req.method === "POST" && commentGet) {
      if (!rateOk(`comment:${clientKey(req)}`, 20, 10 * 60 * 1000)) {
        send(res, 429, { error: "Try again later." });
        return true;
      }
      const user = await userFromCookie(req);
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
      await q.insertComment.run(commentId, paperId, user.id, text, now());
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
      const user = await userFromCookie(req);
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
      if (on) await q.insertSave.run(user.id, paperId, now());
      else await q.deleteSave.run(user.id, paperId);
      const saves = (await q.saves.all(user.id)).map((row) => row.paperId);
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
