import type { MorningPool } from "./pool.js";
import pool20260820 from "./pools/2026-08-20.json" with { type: "json" };

/**
 * Legacy host order for mornings published before automatic ranking v1.
 *
 * New mornings are generated under src/boards/ by scripts/publish.mjs. Keep
 * these historical rows frozen; an ID remains visible only when it resolves to
 * an eligible, complete packet.
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
