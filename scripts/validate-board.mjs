#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { rankMorningPool, RANKING_VERSION } from "./rank.mjs";

const date = String(process.argv[2] || "").slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
  console.error("usage: npm run validate-board -- YYYY-MM-DD");
  process.exit(1);
}

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pool = JSON.parse(readFileSync(join(root, "src", "pools", `${date}.json`), "utf8"));
const board = JSON.parse(readFileSync(join(root, "src", "boards", `${date}.json`), "utf8"));
const expected = rankMorningPool(pool, 10).selected;

assert(board.date === date, "board date does not match filename");
assert(board.selection?.version === RANKING_VERSION, "ranking version is missing or stale");
assert(
  ["title-and-abstract", "full-paper"].includes(board.selection?.packetBasis),
  "packet basis is missing",
);
assert(Array.isArray(board.papers) && board.papers.length === 10, "board must contain exactly ten papers");
assert(expected.length === 10, "pool no longer produces exactly ten papers");

for (let index = 0; index < expected.length; index += 1) {
  const selected = expected[index];
  const paper = board.papers[index];
  assert(paper.arxivId === selected.arxivId, `rank ${index + 1} does not match the deterministic cut`);
  assert(paper.topic === selected.field, `field mismatch for ${paper.arxivId}`);
  assert(paper.automation?.rank === index + 1, `board rank mismatch for ${paper.arxivId}`);
  assert(paper.automation?.version === RANKING_VERSION, `ranking metadata mismatch for ${paper.arxivId}`);
  assert(
    paper.automation?.packetBasis === board.selection.packetBasis,
    `packet basis mismatch for ${paper.arxivId}`,
  );
  assert(paper.url === `https://arxiv.org/abs/${paper.arxivId}`, `unsafe paper URL for ${paper.arxivId}`);
  assert(String(paper.abstract || "").trim().length >= 80, `abstract missing for ${paper.arxivId}`);
  // Why: frozen boards published before 2026-08-26 lead with a verdict line;
  // every board cut since reports the authors' result instead.
  const lead = String(paper.reported || paper.verdictWhy || "").trim();
  assert(lead, `lead line missing for ${paper.arxivId}`);
  if (paper.reported) {
    assert(!paper.verdict, `${paper.arxivId} carries both a reported line and a verdict`);
    assert(Array.isArray(paper.metrics), `metrics list missing for ${paper.arxivId}`);
    const source = `${paper.title}\n${paper.abstract}`;
    for (const metric of paper.metrics) {
      assert(/\d/.test(String(metric)), `metric without a number stored for ${paper.arxivId}`);
      for (const number of String(metric).match(/\d+(?:[.,]\d+)*/g) || []) {
        assert(
          source.includes(number),
          `metric for ${paper.arxivId} reports ${number}, which its source text does not`,
        );
      }
    }
  }
  assert(String(paper.brief || "").trim(), `brief missing for ${paper.arxivId}`);
  assert(paper.takeaways?.length === 3, `takeaways incomplete for ${paper.arxivId}`);
  assert(paper.actions?.length === 2, `actions incomplete for ${paper.arxivId}`);
  assert(paper.plain?.brief?.trim() && paper.plain.takeaways?.length === 3, `Plain packet incomplete for ${paper.arxivId}`);
  assert(
    String(paper.plain.reported || paper.plain.verdictWhy || "").trim(),
    `Plain lead line missing for ${paper.arxivId}`,
  );
  if (board.selection.packetBasis === "full-paper") {
    assert(
      paper.brief.split(/\n\s*\n/).filter(Boolean).length === 3,
      `full-paper brief must have three paragraphs for ${paper.arxivId}`,
    );
    assert(
      paper.plain.brief.split(/\n\s*\n/).filter(Boolean).length === 3,
      `full-paper Plain brief must have three paragraphs for ${paper.arxivId}`,
    );
    assert(paper.review?.basis === "full-paper", `full-paper provenance missing for ${paper.arxivId}`);
    assert(
      paper.review?.reviewedAt === board.selection.generatedAt,
      `full-paper review timestamp mismatch for ${paper.arxivId}`,
    );
    assert(
      paper.review?.sourceUrl === `https://arxiv.org/pdf/${paper.arxivId}`,
      `full-paper source mismatch for ${paper.arxivId}`,
    );
    assert(
      paper.review?.evidence?.length >= 2 && paper.review.evidence.every((item) => item.trim()),
      `full-paper evidence trail incomplete for ${paper.arxivId}`,
    );
    assert(
      paper.automation?.model === board.selection.model &&
        paper.automation?.generatedAt === board.selection.generatedAt,
      `full-paper batch metadata mismatch for ${paper.arxivId}`,
    );
  }
  if (paper.github) {
    assert(/^https:\/\/github\.com\//i.test(paper.github), `unsafe code URL for ${paper.arxivId}`);
  }
}

const manifest = readFileSync(join(root, "src", "boards", "generated.ts"), "utf8");
assert(manifest.includes(`./${date}.json`), "generated board manifest does not import this date");
console.log(`${date}: deterministic ten and complete packet batch validated`);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
