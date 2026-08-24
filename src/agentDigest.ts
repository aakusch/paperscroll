import { catalog, FIELDS, type Topic } from "./data.js";
import { isHostedPacket } from "./hostPacket.js";
import { paperMarkdown, paperPacket } from "./brief.js";
import { composeBoard, type Prefs } from "./rank.js";

const FIELD_IDS = new Set(FIELDS.map((field) => field.id));

export type DigestQuery = {
  date?: string;
  fields?: string;
  desk?: string;
  format?: string;
  origin?: string;
};

export function buildDigest(query: DigestQuery) {
  const dates = catalog.map((edition) => edition.date).sort((a, b) => b.localeCompare(a));
  const date = query.date || dates[0];
  const edition = catalog.find((item) => item.date === date);
  if (!edition) {
    const err = new Error("No board for that date.");
    (err as Error & { status: number }).status = 404;
    throw err;
  }

  const fields = parseFields(query.fields);
  const desk = String(query.desk || "").trim().slice(0, 200);
  const prefs: Prefs = { interests: fields, workingOn: desk };
  const { focus, rest } = composeBoard(edition.papers, prefs);
  const papers = [...focus, ...rest].filter(isHostedPacket);
  const format = query.format === "json" ? "json" : "md";
  const origin = (query.origin || "").replace(/\/$/, "");

  const payload = {
    source: "PaperScroll",
    date: edition.date,
    label: edition.label,
    origin: origin || null,
    fields: fields.length ? fields : "all",
    desk: desk || null,
    count: papers.length,
    instruction:
      "This is a PaperScroll host digest, not the authors’ abstracts. Use it as morning context. If a paper maps to the current workspace, say how. If the packet is thin, say you need the PDF. Do not invent methods, numbers, or GitHub URLs.",
    papers: papers.map((paper) => ({
      ...paperPacket(paper),
      page: origin ? `${origin}/p/${paper.arxivId}` : null,
      focus: fields.length === 0 ? true : focus.includes(paper),
      trend: paper.trend || null,
      packet: paperMarkdown(paper),
    })),
  };

  if (format === "json") {
    return { kind: "json" as const, body: JSON.stringify(payload, null, 2) };
  }

  const lines = [
    `# PaperScroll · ${edition.label}`,
    "",
    payload.instruction,
    "",
    `Date: ${edition.date}`,
    `Fields: ${fields.length ? fields.join(", ") : "all (shared board order)"}`,
  ];
  if (desk) lines.push(`Desk: ${desk}`);
  if (origin) lines.push(`Site: ${origin}`);
  lines.push(`Papers: ${papers.length}`, "");

  if (focus.length && fields.length) {
    lines.push("## On your desk", "");
    for (const paper of focus) {
      lines.push(paperMarkdown(paper).trim(), "");
    }
    if (rest.length) {
      lines.push("## Also today", "");
      for (const paper of rest) {
        lines.push(paperMarkdown(paper).trim(), "");
      }
    }
  } else {
    for (const paper of papers) {
      lines.push(paperMarkdown(paper).trim(), "");
    }
  }

  return { kind: "md" as const, body: lines.join("\n").trim() + "\n" };
}

function parseFields(raw?: string): Topic[] {
  if (!raw?.trim()) return [];
  const out: Topic[] = [];
  for (const part of raw.split(",")) {
    const id = part.trim();
    if (!id) continue;
    if (!FIELD_IDS.has(id as Topic)) {
      const err = new Error(`Unknown field: ${id}`);
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    if (!out.includes(id as Topic)) out.push(id as Topic);
  }
  return out;
}
