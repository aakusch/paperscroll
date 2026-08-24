#!/usr/bin/env node
/**
 * Pull the morning pool for a board date.
 *
 *   npm run pool -- 2026-08-20
 *
 * Writes src/pools/YYYY-MM-DD.json (HF Daily + selected arXiv watches).
 * Each nomination persists the field assigned by its intake so the shared,
 * deterministic cut cannot change fields after sources are merged.
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
const ARXIV_PER_CAT = 20;

const boardDate = (process.argv[2] || todayInNewYork()).slice(
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
  "Run npm run publish -- YYYY-MM-DD to cut and publish the shared top ten.",
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
    const prevHasArxiv = prev.intakes.some((intake) => intake.kind === "arxiv-new");
    const itemHasArxiv = item.intakes.some((intake) => intake.kind === "arxiv-new");
    const preferItemField = itemHasArxiv && !prevHasArxiv;
    byId.set(id, {
      ...prev,
      github: prev.github || item.github,
      abstract: prev.abstract || item.abstract,
      field: preferItemField ? item.field : prev.field || item.field,
      categories: preferItemField
        ? item.categories
        : prev.categories.length
          ? prev.categories
          : item.categories,
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
      field: "AI",
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
  if (date === todayInNewYork()) return pullArxivRss(date);

  const from = new Date(`${date}T12:00:00Z`);
  from.setUTCDate(from.getUTCDate() - 2);
  const submitted = `${compactDate(from)}0000 TO ${date.replaceAll("-", "")}2359`;
  const categories = ARXIV_NEW_CATS.map((cat) => `cat:${cat}`).join(" OR ");
  const url =
    "https://export.arxiv.org/api/query?" +
    new URLSearchParams({
      search_query: `(${categories}) AND submittedDate:[${submitted}]`,
      start: "0",
      max_results: "500",
      sortBy: "submittedDate",
      sortOrder: "descending",
    });
  const candidates = parseArxiv(await getText(url), date);
  const counts = new Map();
  const out = [];
  for (const item of candidates) {
    const bucket = ARXIV_NEW_CATS.find((cat) => item.categories.includes(cat));
    if (!bucket) continue;
    const count = counts.get(bucket) || 0;
    if (count >= ARXIV_PER_CAT) continue;
    counts.set(bucket, count + 1);
    out.push({ ...item, field: fieldForWatch(bucket) });
  }
  return out;
}

async function pullArxivRss(date) {
  const out = [];
  for (const cat of ARXIV_NEW_CATS) {
    const xml = await getText(`https://rss.arxiv.org/rss/${cat}`);
    out.push(
      ...parseArxivRss(xml, date)
        .slice(0, ARXIV_PER_CAT)
        .map((item) => ({ ...item, field: fieldForWatch(cat) })),
    );
  }
  return out;
}

function fieldForWatch(category) {
  if (category === "cs.CR") return "Security";
  if (category === "quant-ph") return "Physics";
  if (category === "eess.SP") return "Engineering";
  if (category === "q-bio.QM") return "Health";
  if (category.startsWith("econ.")) return "Econ";
  if (category.startsWith("math.")) return "Math";
  if (category.startsWith("stat.")) return "Stats";
  return "AI";
}

function parseArxivRss(xml, boardDate) {
  const rows = [];
  for (const item of xml.split(/<item>/).slice(1)) {
    if (unwrap(item, "arxiv:announce_type") !== "new") continue;
    const link = unwrap(item, "link");
    const arxivId = link
      .replace(/^https?:\/\/arxiv\.org\/abs\//, "")
      .replace(/v\d+$/, "");
    const published = new Date(unwrap(item, "pubDate"));
    if (Number.isNaN(published.valueOf())) continue;
    const publishedOn = published.toISOString().slice(0, 10);
    if (!arxivId || publishedOn !== boardDate) continue;
    const categories = [...item.matchAll(/<category>([^<]+)<\/category>/g)].map(
      (match) => cleanXml(match[1]),
    );
    const description = cleanXml(unwrap(item, "description"));
    rows.push({
      arxivId,
      title: cleanXml(unwrap(item, "title")),
      authors: cleanXml(unwrap(item, "dc:creator")) || "Unknown",
      abstract: description.replace(/^.*?Abstract:\s*/s, "").trim(),
      publishedOn,
      categories,
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

function todayInNewYork() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function compactDate(date) {
  return date.toISOString().slice(0, 10).replaceAll("-", "");
}

function parseArxiv(xml, boardDate) {
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
      categories: cats,
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

function cleanXml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function unwrapAttr(source, tag) {
  return unwrap(source, tag);
}

async function getJson(url) {
  const res = await get(url);
  return res.json();
}

async function getText(url) {
  const res = await get(url);
  return res.text();
}

async function get(url) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "paperscroll-pool/0.1" },
        signal: AbortSignal.timeout(20_000),
      });
      if (!res.ok) {
        const err = new Error(`${res.status} ${url}`);
        const retryAfter = Number(res.headers.get("retry-after"));
        err.retryAfterMs = Number.isFinite(retryAfter) && retryAfter > 0
          ? retryAfter * 1_000
          : res.status === 429
            ? 30_000
            : 0;
        throw err;
      }
      return res;
    } catch (err) {
      lastError = err;
      if (attempt < 3) {
        await sleep(Math.max(err.retryAfterMs || 0, attempt * 5_000));
      }
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
