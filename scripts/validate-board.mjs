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
assert(board.selection?.packetBasis === "title-and-abstract", "packet basis is missing");
assert(Array.isArray(board.papers) && board.papers.length === 10, "board must contain exactly ten papers");
assert(expected.length === 10, "pool no longer produces exactly ten papers");

for (let index = 0; index < expected.length; index += 1) {
  const selected = expected[index];
  const paper = board.papers[index];
  assert(paper.arxivId === selected.arxivId, `rank ${index + 1} does not match the deterministic cut`);
  assert(paper.topic === selected.field, `field mismatch for ${paper.arxivId}`);
  assert(paper.automation?.rank === index + 1, `board rank mismatch for ${paper.arxivId}`);
  assert(paper.automation?.version === RANKING_VERSION, `ranking metadata mismatch for ${paper.arxivId}`);
  assert(paper.automation?.packetBasis === "title-and-abstract", `packet basis mismatch for ${paper.arxivId}`);
  assert(paper.url === `https://arxiv.org/abs/${paper.arxivId}`, `unsafe paper URL for ${paper.arxivId}`);
  assert(String(paper.abstract || "").trim().length >= 80, `abstract missing for ${paper.arxivId}`);
  assert(String(paper.verdictWhy || "").trim(), `verdict line missing for ${paper.arxivId}`);
  assert(String(paper.brief || "").trim(), `brief missing for ${paper.arxivId}`);
  assert(paper.takeaways?.length === 3, `takeaways incomplete for ${paper.arxivId}`);
  assert(paper.actions?.length === 2, `actions incomplete for ${paper.arxivId}`);
  assert(paper.plain?.brief?.trim() && paper.plain.takeaways?.length === 3, `Plain packet incomplete for ${paper.arxivId}`);
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
