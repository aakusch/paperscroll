import type { Paper } from "./data.js";

export type HostedPaper = Paper & { brief: string };

/**
 * Completeness gate for every product surface. Manual legacy packets and
 * automatically generated packets must both include a decision, brief,
 * takeaways, and a concrete action before they can become a card.
 */
export function isHostedPacket(paper: Paper | undefined): paper is HostedPaper {
  return Boolean(
    paper &&
      paper.verdictWhy.trim() &&
      paper.brief?.trim() &&
      paper.takeaways.length >= 3 &&
      paper.takeaways.every((line) => line.trim()) &&
      paper.actions.length > 0 &&
      paper.actions.every((line) => line.trim()),
  );
}
