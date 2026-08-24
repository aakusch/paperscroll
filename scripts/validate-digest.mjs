import assert from "node:assert/strict";
import { createServer } from "vite";

const vite = await createServer({
  configFile: false,
  appType: "custom",
  server: { middlewareMode: true, hmr: false, ws: false, watch: null },
});

try {
  const { buildDigest } = await vite.ssrLoadModule("/src/agentDigest.ts");
  const base = {
    contract: "v1",
    origin: "https://paperscroll.example",
  };
  const first = await buildDigest(base);
  const repeat = await buildDigest(base);
  const statsFirst = await buildDigest({ ...base, fields: "Stats,AI", desk: "forecasting" });
  const payload = JSON.parse(first.body);
  const composed = JSON.parse(statsFirst.body);

  assert.equal(first.kind, "json");
  assert.equal(first.body, repeat.body, "the same route must be byte-stable");
  assert.equal(payload.schema, "paperscroll.digest");
  assert.equal(payload.schemaVersion, "1.1");
  assert.equal(payload.board.complete, true);
  assert.equal(payload.board.count, 10);
  assert.equal(payload.board.packetBasis, "full-paper");
  assert.equal(payload.papers.length, 10);
  assert.equal(new Set(payload.papers.map((paper) => paper.arxivId)).size, 10);
  assert.equal(typeof payload.papers[0].packet, "object", "structured packet was overwritten");
  assert.equal(
    payload.papers.every((paper) => paper.packet.automation?.basis === "full-paper"),
    true,
    "digest mixed packet evidence bases",
  );
  assert.match(payload.instruction, /reviewed against the full papers/);
  assert.equal(typeof payload.papers[0].markdown, "string");
  assert.equal(JSON.stringify(payload).includes('"abstract"'), false, "digest leaked an abstract key");
  assert.equal(payload.board.version, composed.board.version, "composition changed the frozen board version");
  assert.deepEqual(
    [...payload.papers.map((paper) => paper.arxivId)].sort(),
    [...composed.papers.map((paper) => paper.arxivId)].sort(),
    "fields changed shared board membership",
  );
  assert.deepEqual(composed.composition.fields, ["Stats", "AI"]);
  assert.equal(composed.composition.desk, "forecasting");
  assert.match(payload.delivery.key, /^paperscroll:\d{4}-\d{2}-\d{2}:sha256-[a-f0-9]{64}$/);

  await assert.rejects(
    () => buildDigest({ ...base, date: "2026-08-20" }),
    (error) => error?.status === 404 && error?.code === "board_not_found",
    "v1 accepted an incomplete historical board",
  );

  const legacy = JSON.parse(
    (await buildDigest({ origin: base.origin, format: "json" })).body,
  );
  assert.equal(typeof legacy.papers[0].packet, "object");
  assert.equal(typeof legacy.papers[0].markdown, "string");

  console.log(`Digest contract valid: ${payload.board.id}, ${payload.board.count} packets.`);
} finally {
  await vite.close();
}
