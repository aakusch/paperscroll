import type { Paper, Verdict } from "./data.js";

/**
 * The decision line at the top of a card and a board packet.
 *
 * PaperScroll used to print a Try / Watch / Skip verdict here. It no longer
 * generates one: the board is one shared cut with no knowledge of the reader's
 * desk, and its automatic packets are built from a title and an abstract rather
 * than a full read, so a recommendation was never something it could support.
 * New boards report what the authors claim and let the reader judge.
 *
 * Published days are frozen, so the older shape is not rewritten — it is read.
 */
export type PacketLead =
  | { kind: "reported"; text: string; metrics: string[] }
  | { kind: "verdict"; verdict: Verdict; text: string };

export function packetLead(paper: Paper, plain?: boolean): PacketLead | null {
  const reported = (plain ? paper.plain?.reported : undefined) || paper.reported;
  if (reported?.trim()) {
    return {
      kind: "reported",
      text: reported.trim(),
      metrics: (paper.metrics || []).map((line) => line.trim()).filter(Boolean),
    };
  }
  const why = (plain ? paper.plain?.verdictWhy : undefined) || paper.verdictWhy;
  if (paper.verdict && why?.trim()) {
    return { kind: "verdict", verdict: paper.verdict, text: why.trim() };
  }
  return null;
}

/** One-line form for a card, a copy action, or a voice surface. */
export function leadText(lead: PacketLead | null): string {
  if (!lead) return "";
  return lead.kind === "verdict" ? `${lead.verdict}. ${lead.text}` : lead.text;
}
