import { BOARD_SIZE } from "./board.js";
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
  contract?: "legacy" | "v1";
};

export async function buildDigest(query: DigestQuery) {
  const contract = query.contract === "v1" ? "v1" : "legacy";
  const completeEditions = catalog.filter(
    (edition) =>
      edition.papers.length === BOARD_SIZE && edition.papers.every(isHostedPacket),
  );
  const dates = (contract === "v1" ? completeEditions : catalog)
    .map((edition) => edition.date)
    .sort((a, b) => b.localeCompare(a));
  const date = query.date || dates[0];
  const edition = (contract === "v1" ? completeEditions : catalog).find(
    (item) => item.date === date,
  );
  if (!edition) {
    throw digestError(
      404,
      "board_not_found",
      `No complete board was published for ${date || "that date"}.`,
    );
  }

  const fields = parseFields(query.fields);
  const desk = String(query.desk || "").trim().slice(0, 200);
  const prefs: Prefs = { interests: fields, workingOn: desk };
  const { focus, rest } = composeBoard(edition.papers, prefs);
  const papers = [...focus, ...rest].filter(isHostedPacket);
  const format = query.format === "json" ? "json" : "md";
  const origin = (query.origin || "").replace(/\/$/, "");

  if (contract === "v1") {
    const sharedPackets = edition.papers.map((paper) => ({
      ...paperPacket(paper),
      trend: paper.trend || null,
    }));
    const boardVersion = `sha256-${await sha256Hex(
      JSON.stringify({
        date: edition.date,
        label: edition.label,
        selection: edition.selection || null,
        papers: sharedPackets,
      }),
    )}`;
    const deliveryKey = `paperscroll:${edition.date}:${boardVersion}`;
    const payload = {
      schema: "paperscroll.digest",
      schemaVersion: "1.0",
      schemaUrl: origin ? `${origin}/schemas/digest-v1.json` : null,
      source: "PaperScroll",
      board: {
        id: edition.date,
        version: boardVersion,
        date: edition.date,
        label: edition.label,
        publishedAt: edition.selection?.generatedAt || null,
        complete: true,
        count: papers.length,
        membership: "shared",
        selectionVersion: edition.selection?.version || "legacy-host-v1",
        packetBasis: edition.selection?.packetBasis || "host-written",
        orderedPaperIds: edition.papers.map((paper) => paper.arxivId),
      },
      composition: {
        fields,
        desk: desk || null,
        order: fields.length ? "account-fields-first" : "shared-board",
      },
      delivery: {
        key: deliveryKey,
        semantics:
          "Persist this key only after successful ingestion. Repeated 200 responses with the same key are retries, not new mornings.",
      },
      instruction:
        "This is a PaperScroll board digest, not the authors’ raw abstracts. Automated packets are based on title and abstract, not a full PDF read. Use them as morning context. If a paper maps to the current workspace, say how. If a packet is thin, say you need the PDF. Do not invent methods, numbers, or GitHub URLs.",
      papers: papers.map((paper) => ({
        ...paperPacket(paper),
        page: origin ? `${origin}/p/${paper.arxivId}` : null,
        focus: fields.length === 0 ? true : focus.includes(paper),
        trend: paper.trend || null,
        markdown: paperMarkdown(paper),
      })),
    };

    if (payload.board.count !== BOARD_SIZE) {
      throw digestError(
        503,
        "digest_unavailable",
        "The latest board is incomplete. Try again after publication finishes.",
      );
    }
    return {
      kind: "json" as const,
      body: JSON.stringify(payload, null, 2),
      boardId: payload.board.id,
      boardVersion,
      deliveryKey,
      schemaUrl: payload.schemaUrl,
    };
  }

  const payload = {
    source: "PaperScroll",
    date: edition.date,
    label: edition.label,
    origin: origin || null,
    fields: fields.length ? fields : "all",
    desk: desk || null,
    count: papers.length,
    instruction:
      "This is a PaperScroll board digest, not the authors’ raw abstracts. Automated packets are based on title and abstract, not a full PDF read. Use them as morning context. If a paper maps to the current workspace, say how. If a packet is thin, say you need the PDF. Do not invent methods, numbers, or GitHub URLs.",
    papers: papers.map((paper) => ({
      ...paperPacket(paper),
      page: origin ? `${origin}/p/${paper.arxivId}` : null,
      focus: fields.length === 0 ? true : focus.includes(paper),
      trend: paper.trend || null,
      markdown: paperMarkdown(paper),
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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function digestError(status: number, code: string, message: string) {
  const error = new Error(message) as Error & { status: number; code: string };
  error.status = status;
  error.code = code;
  return error;
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
