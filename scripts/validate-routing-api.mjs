import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createServer } from "vite";

const directory = mkdtempSync(join(tmpdir(), "paperscroll-routing-api-"));
const databasePath = join(directory, "routing.sqlite");

delete process.env.PAPERSCROLL_DATABASE;
delete process.env.VERCEL;
process.env.PAPERSCROLL_SQLITE_PATH = databasePath;
process.env.PAPERSCROLL_PUBLIC_ORIGIN = "https://paperscroll.example";
process.env.COOKIE_SECURE = "0";

const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
});

try {
  const [{ handleApi }, { q }] = await Promise.all([
    import("../server/app.mjs"),
    import("../server/store.mjs"),
  ]);
  const { buildDigest } = await vite.ssrLoadModule("/src/agentDigest.ts");
  const digest = (query) => buildDigest(query);

  const signup = await request(handleApi, digest, {
    method: "POST",
    url: "/api/signup",
    body: {
      name: "routingcheck",
      email: "routingcheck@example.test",
      password: "MorningQuartz42!alpha",
      passwordConfirm: "MorningQuartz42!alpha",
    },
  });
  assert.equal(signup.status, 201, signup.body);
  const account = JSON.parse(signup.body).user;
  const cookie = String(signup.headers["Set-Cookie"]).split(";", 1)[0];
  assert.match(cookie, /^ps_session=/);

  const minted = await request(handleApi, digest, {
    method: "POST",
    url: "/api/tokens",
    headers: { cookie },
    body: { label: "CI morning route" },
  });
  assert.equal(minted.status, 201);
  const token = JSON.parse(minted.body);
  assert.equal(token.label, "CI morning route");
  assert.equal(token.scope, "digest:read");
  assert.match(token.token, /^ps_live_[A-Za-z0-9_-]+$/);
  assert.ok(
    Date.parse(token.expiresAt) - Date.parse(token.createdAt) >= 89 * 86_400_000,
    "token expiry was shorter than the documented lifecycle",
  );
  const tokenHash = createHash("sha256").update(token.token).digest("hex");
  const storedToken = await q.tokenByHash.get(tokenHash, new Date().toISOString());
  assert.equal(storedToken.token_hash, tokenHash);
  assert.equal(
    JSON.stringify(storedToken).includes(token.token),
    false,
    "plaintext token reached the persisted row",
  );

  const authorization = `Bearer ${token.token}`;
  const first = await request(handleApi, digest, {
    url: "/api/v1/digest/latest",
    headers: { authorization, accept: "application/json" },
  });
  assert.equal(first.status, 200);
  assert.equal(first.headers["Cache-Control"], "private, no-cache");
  assert.equal(first.headers.Vary, "Authorization, Accept");
  assert.match(first.headers.ETag, /^"[A-Za-z0-9_-]+"$/);
  assert.match(first.headers.Link, /rel="describedby"/);

  const payload = JSON.parse(first.body);
  assert.equal(payload.schema, "paperscroll.digest");
  assert.equal(payload.schemaVersion, "1.2");
  assert.equal(payload.board.complete, true);
  assert.equal(payload.board.count, 10);
  assert.equal(payload.papers.length, 10);
  assert.equal(payload.delivery.key, first.headers["X-PaperScroll-Delivery-Key"]);
  assert.equal(payload.board.id, first.headers["X-PaperScroll-Board-Id"]);
  assert.equal(JSON.stringify(payload).includes('"abstract"'), false);

  const afterReturn = await q.tokensForUser.all(account.id);
  assert.equal(afterReturn.length, 1);
  assert.ok(afterReturn[0].lastCheckedAt);
  assert.ok(afterReturn[0].lastReturnedAt);
  assert.equal(afterReturn[0].lastReturnedBoardId, payload.board.id);
  assert.equal(afterReturn[0].lastReturnedBoardVersion, payload.board.version);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const unchanged = await request(handleApi, digest, {
    url: "/api/v1/digest/latest",
    headers: {
      authorization,
      accept: "application/json",
      "if-none-match": `W/${first.headers.ETag}`,
    },
  });
  assert.equal(unchanged.status, 304);
  assert.equal(unchanged.body, "");
  assert.equal(unchanged.headers.ETag, first.headers.ETag);

  const afterCheck = await q.tokensForUser.all(account.id);
  assert.ok(afterCheck[0].lastCheckedAt > afterReturn[0].lastCheckedAt);
  assert.equal(afterCheck[0].lastReturnedAt, afterReturn[0].lastReturnedAt);
  assert.equal(afterCheck[0].lastReturnedBoardId, afterReturn[0].lastReturnedBoardId);

  const incomplete = await request(handleApi, digest, {
    url: "/api/v1/digest/2026-08-20",
    headers: { authorization, accept: "application/json" },
  });
  assert.equal(incomplete.status, 404);
  assert.equal(JSON.parse(incomplete.body).error.code, "board_not_found");

  const invalidDate = await request(handleApi, digest, {
    url: "/api/v1/digest/2026-02-30",
    headers: { authorization, accept: "application/json" },
  });
  assert.equal(invalidDate.status, 400);
  assert.equal(JSON.parse(invalidDate.body).error.code, "invalid_date");

  const revoke = await request(handleApi, digest, {
    method: "DELETE",
    url: `/api/tokens/${token.id}`,
    headers: { cookie },
  });
  assert.equal(revoke.status, 200);

  const revoked = await request(handleApi, digest, {
    url: "/api/v1/digest/latest",
    headers: { authorization, accept: "application/json" },
  });
  assert.equal(revoked.status, 401);
  assert.equal(JSON.parse(revoked.body).error.code, "invalid_token");

  console.log(
    `Routing API valid: ${payload.board.id}, 200 → 304, telemetry recorded, token revoked.`,
  );
} finally {
  await vite.close();
}

async function request(handleApi, digest, options) {
  const method = options.method || "GET";
  const body = options.body === undefined
    ? null
    : Buffer.from(JSON.stringify(options.body));
  const headers = {
    host: "paperscroll.test",
    ...(method === "GET" ? {} : { origin: "http://paperscroll.test" }),
    ...(body ? { "content-type": "application/json", "content-length": String(body.length) } : {}),
    ...options.headers,
  };
  const req = {
    method,
    url: options.url,
    headers,
    socket: { remoteAddress: "127.0.0.1" },
    destroy() {},
    async *[Symbol.asyncIterator]() {
      if (body) yield body;
    },
  };
  const response = { status: null, headers: {}, body: "" };
  const res = {
    writeHead(status, responseHeaders) {
      response.status = status;
      response.headers = responseHeaders;
    },
    end(value = "") {
      response.body = String(value);
    },
  };
  assert.equal(await handleApi(req, res, { digest }), true);
  return response;
}
