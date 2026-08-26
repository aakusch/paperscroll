import type { Paper } from "./data.js";
import { packetLead } from "./lead.js";

export type HostedPaper = Paper & { brief: string };

/**
 * Completeness gate for every product surface. A packet needs a lead line
 * (reported result, or the legacy verdict on a frozen board), a brief,
 * takeaways, and a concrete action before it can become a card.
 */
export function isHostedPacket(paper: Paper | undefined): paper is HostedPaper {
  return Boolean(
    paper &&
      packetLead(paper) &&
      paper.brief?.trim() &&
      paper.takeaways.length >= 3 &&
      paper.takeaways.every((line) => line.trim()) &&
      paper.actions.length > 0 &&
      paper.actions.every((line) => line.trim()),
  );
}
