import type { MorningPool } from "./pool.js";
import pool20260820 from "./pools/2026-08-20.json" with { type: "json" };

/**
 * The host's published order. Pooling nominates; this list publishes.
 *
 * Import a pool here only when its host packets have been reviewed. Keep each
 * shared slate at ten or fewer arXiv IDs. An ID is visible only when it resolves
 * to an eligible, complete host packet.
 */
export const HOSTED_DAYS: Array<{ pool: MorningPool; paperIds: string[] }> = [
  {
    pool: pool20260820 as MorningPool,
    paperIds: [
      "2608.16590",
      "2608.14929",
      "2608.18171",
      "2608.18565",
      "2608.18973",
      "2608.19070",
      "2608.18375",
      "2608.18451",
      "2608.18417",
    ],
  },
];
