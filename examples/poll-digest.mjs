/**
 * Minimal once-per-board PaperScroll puller.
 *
 * PAPERSCROLL_TOKEN=ps_live_... node examples/poll-digest.mjs
 * PAPERSCROLL_DIGEST_URL=http://localhost:5173/api/v1/digest/latest ...
 */
import { readFile, rename, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const token = String(process.env.PAPERSCROLL_TOKEN || "").trim();
const endpoint = String(
  process.env.PAPERSCROLL_DIGEST_URL ||
    "https://paperscroll.vercel.app/api/v1/digest/latest",
).trim();
const statePath = resolve(
  process.env.PAPERSCROLL_STATE_FILE || ".paperscroll-route-state.json",
);

if (!token) {
  console.error("Set PAPERSCROLL_TOKEN to a digest:read token from Agent routing.");
  process.exit(1);
}

const state = await readState(statePath);
const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/json",
};
if (state.etag) headers["If-None-Match"] = state.etag;

const response = await fetch(endpoint, { headers });
if (response.status === 304) {
  console.log("PaperScroll is unchanged; nothing to ingest.");
  process.exit(0);
}
if (!response.ok) {
  const message = await response.text();
  throw new Error(`PaperScroll returned ${response.status}: ${message.slice(0, 300)}`);
}

const digest = await response.json();
assertDigest(digest);
const etag = response.headers.get("etag") || "";

if (digest.delivery.key === state.lastDeliveryKey) {
  await writeState(statePath, { ...state, etag });
  console.log(`Already ingested ${digest.delivery.key}; checkpoint refreshed.`);
  process.exit(0);
}

// Replace this block with the destination write. Pass delivery.key as that
// system's idempotency key when it supports one.
console.log(`New PaperScroll board: ${digest.board.label}`);
for (const [index, paper] of digest.papers.entries()) {
  console.log(`${index + 1}. [${paper.topic}] ${paper.title} — ${paper.packet.verdict}`);
}

// Checkpoint only after every destination write above succeeds.
await writeState(statePath, {
  etag,
  lastDeliveryKey: digest.delivery.key,
  lastBoardId: digest.board.id,
});
console.log(`Ingested ${digest.delivery.key}.`);

async function readState(path) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return {};
    throw error;
  }
}

async function writeState(path, value) {
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temporary, path);
}

function assertDigest(value) {
  if (
    value?.schema !== "paperscroll.digest" ||
    value?.schemaVersion !== "1.1" ||
    value?.board?.complete !== true ||
    value?.board?.count !== 10 ||
    !Array.isArray(value?.papers) ||
    value.papers.length !== 10 ||
    typeof value?.delivery?.key !== "string"
  ) {
    throw new Error("PaperScroll response did not match the v1 complete-board contract.");
  }
  if (JSON.stringify(value).includes('"abstract"')) {
    throw new Error("PaperScroll response unexpectedly contained an abstract key.");
  }
}
