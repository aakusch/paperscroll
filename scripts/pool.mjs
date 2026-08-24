#!/usr/bin/env node
/**
 * Pull the morning pool for a board date.
 *
 *   npm run pool -- 2026-08-20
 *
 * Writes src/pools/YYYY-MM-DD.json (HF Daily + arXiv-new in a few
 * non-ML cats). Pooling nominates; it never publishes or ranks the board.
 * The host reviews candidates, writes packets, and explicitly orders the
 * shared slate in src/slates.ts.
 *
 *   npm run summarize -- <arxiv-id>
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ARXIV_NEW_CATS = [
  "stat.ME",
  "stat.TH",
  "econ.EM",
  "econ.GN",
  "math.ST",
  "q-bio.QM",
  "eess.SP",
  "quant-ph",
  "cs.CR",
];

const boardDate = (process.argv[2] || new Date().toISOString().slice(0, 10)).slice(
  0,
  10,
);
if (!/^\d{4}-\d{2}-\d{2}$/.test(boardDate)) {
  console.error("usage: npm run pool -- YYYY-MM-DD");
  process.exit(1);
}

const nominations = merge(
  ...(await pullHf(boardDate)),
  ...(await pullArxivNew(boardDate)),
);

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "pools");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `${boardDate}.json`);
const payload = {
  boardDate,
  pulledAt: new Date().toISOString(),
  nominations,
};
writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.error(
  `wrote ${nominations.length} nominations → ${outPath}`,
);
console.error(
  "Review the pool, draft only credible candidates, then publish <=10 IDs in src/slates.ts.",
);

function merge(...items) {
  const byId = new Map();
  for (const item of items) {
    const id = item.arxivId.trim();
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, { ...item, arxivId: id, intakes: [...item.intakes] });
      continue;
    }
    const kinds = new Set(prev.intakes.map((i) => i.kind));
    const intakes = [...prev.intakes];
    for (const intake of item.intakes) {
      if (kinds.has(intake.kind)) continue;
      kinds.add(intake.kind);
      intakes.push(intake);
    }
    byId.set(id, {
      ...prev,
      github: prev.github || item.github,
      abstract: prev.abstract || item.abstract,
      categories: prev.categories.length ? prev.categories : item.categories,
      intakes,
    });
  }
  return [...byId.values()];
}

async function pullHf(date) {
  const url = `https://huggingface.co/api/daily_papers?date=${date}&limit=50`;
  const rows = await getJson(url);
  if (!Array.isArray(rows)) {
    console.error("HF Daily returned a non-list; skipping");
    return [];
  }
  return rows.map((row) => {
    const paper = row.paper ?? {};
    const id = String(paper.id || "").replace(/v\d+$/, "");
    const authors = (paper.authors ?? [])
      .map((a) => (typeof a === "string" ? a : a.name))
      .filter(Boolean);
    const publishedOn = (paper.publishedAt || row.publishedAt || date).slice(0, 10);
    return {
      arxivId: id,
      title: paper.title || row.title || id,
      authors: authors.length ? authors.join(", ") : "Unknown",
      abstract: (paper.summary || row.summary || "").replace(/\s+/g, " ").trim(),
      publishedOn,
      categories: ["cs.LG"],
      github: paper.githubRepo || undefined,
      intakes: [
        {
          kind: "hf-daily",
          evidenceUrl: `https://huggingface.co/papers/${id}`,
          upvotes: paper.upvotes ?? undefined,
        },
      ],
    };
  }).filter((item) => item.arxivId);
}

async function pullArxivNew(date) {
  const out = [];
  for (const cat of ARXIV_NEW_CATS) {
    const url =
      "https://export.arxiv.org/api/query?" +
      new URLSearchParams({
        search_query: `cat:${cat}`,
        start: "0",
        max_results: "40",
        sortBy: "submittedDate",
        sortOrder: "descending",
      });
    const xml = await getText(url);
    out.push(...parseArxiv(xml, date, cat));
    await sleep(800);
  }
  return out;
}

function parseArxiv(xml, boardDate, cat) {
  const entries = xml.split(/<entry>/).slice(1);
  const rows = [];
  for (const entry of entries) {
    const absId = unwrapAttr(entry, "id") || "";
    const arxivId = absId.replace(/^https?:\/\/arxiv\.org\/abs\//, "").replace(/v\d+$/, "");
    const publishedOn = (unwrap(entry, "published") || "").slice(0, 10);
    if (!arxivId || !publishedOn) continue;
    const age = daysBetween(publishedOn, boardDate);
    if (age < 0 || age > 2) continue;
    const cats = [...entry.matchAll(/<category[^>]*term="([^"]+)"/g)].map((m) => m[1]);
    rows.push({
      arxivId,
      title: unwrap(entry, "title"),
      authors: [...entry.matchAll(/<name>([^<]+)<\/name>/g)].map((m) => m[1]).join(", "),
      abstract: unwrap(entry, "summary"),
      publishedOn,
      categories: cats.length ? cats : [cat],
      intakes: [
        {
          kind: "arxiv-new",
          evidenceUrl: `https://arxiv.org/abs/${arxivId}`,
        },
      ],
    });
  }
  return rows;
}

function daysBetween(fromIso, toIso) {
  const a = Date.parse(`${fromIso.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${toIso.slice(0, 10)}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

function unwrap(source, tag) {
  const m = source.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return (m?.[1] ?? "").replace(/\s+/g, " ").trim();
}

function unwrapAttr(source, tag) {
  return unwrap(source, tag);
}

async function getJson(url) {
  const res = await fetch(url, { headers: { "User-Agent": "paperscroll-pool/0.1" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function getText(url) {
  const res = await fetch(url, { headers: { "User-Agent": "paperscroll-pool/0.1" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.text();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
