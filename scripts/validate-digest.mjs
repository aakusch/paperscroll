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
  assert.equal(payload.schemaVersion, "1.2");
  assert.equal(payload.board.complete, true);
  assert.equal(payload.board.count, 10);
  // Why: exactly one lead shape per packet. A board either reports the authors'
  // result or carries a frozen verdict, never both and never neither.
  for (const paper of payload.papers) {
    const { verdict, verdictWhy, reported, metrics } = paper.packet;
    assert.equal(
      Boolean(reported) !== Boolean(verdict && verdictWhy),
      true,
      `packet for ${paper.arxivId} must carry either a reported line or a verdict`,
    );
    assert.ok(Array.isArray(metrics), `metrics missing for ${paper.arxivId}`);
  }
  // Why: the latest board is whichever morning published last, so the basis is
  // read from it rather than pinned. What the contract requires is that one
  // basis is carried consistently into every packet and into the instruction.
  const basis = payload.board.packetBasis;
  assert.ok(
    ["title-and-abstract", "full-paper"].includes(basis),
    `unknown packet basis ${basis}`,
  );
  assert.equal(payload.papers.length, 10);
  assert.equal(new Set(payload.papers.map((paper) => paper.arxivId)).size, 10);
  assert.equal(typeof payload.papers[0].packet, "object", "structured packet was overwritten");
  assert.equal(
    payload.papers.every((paper) => paper.packet.automation?.basis === basis),
    true,
    "digest mixed packet evidence bases",
  );
  assert.match(
    payload.instruction,
    basis === "full-paper" ? /reviewed against the full papers/ : /title and abstract, not a full PDF read/,
  );
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
