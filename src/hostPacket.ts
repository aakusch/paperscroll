import type { Paper } from "./data.js";

export type HostedPaper = Paper & { brief: string };

/**
 * Publication gate for every product surface.
 *
 * A title, abstract, score, or generated draft can never become a card. The
 * host must make a verdict, write the brief, cover object / limit / artifact,
 * and leave at least one concrete action.
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
