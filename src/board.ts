import type { Paper } from "./data.js";
import { isHostedPacket, type HostedPaper } from "./hostPacket.js";
import { belongsOnBoard } from "./listing.js";

/** Shared morning board length. The feed ends. */
export const BOARD_SIZE = 10;
/**
 * Resolve the host's explicit slate. Order is editorial, never personalized or
 * inferred from popularity. Missing, stale, duplicate, and incomplete packets
 * fail closed.
 */
export function selectBoard(
  papers: Paper[],
  boardDate: string,
  slate: string[],
): HostedPaper[] {
  const byArxiv = new Map(
    papers
      .filter(
        (paper): paper is HostedPaper =>
          belongsOnBoard(paper, boardDate) && isHostedPacket(paper),
      )
      .map((paper) => [paper.arxivId, paper] as const),
  );
  const seen = new Set<string>();
  const selected: HostedPaper[] = [];

  for (const arxivId of slate) {
    if (selected.length >= BOARD_SIZE || seen.has(arxivId)) continue;
    seen.add(arxivId);
    const paper = byArxiv.get(arxivId);
    if (paper) selected.push(paper);
  }

  return selected;
}
