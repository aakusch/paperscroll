import type { Topic } from "./data";
import type { ListingIntake } from "./data";

/**
 * Morning pool — the only ingest object.
 *
 * Watches nominate. Gates drop stale IDs. The host publishes an explicit
 * ordered slate separately; nominations never become cards on their own.
 * Do not put verdict, comments, or accounts in this file.
 */
export type MorningPool = {
  boardDate: string;
  pulledAt: string;
  nominations: Nomination[];
};

export type Nomination = {
  arxivId: string;
  title: string;
  authors: string;
  abstract: string;
  publishedOn: string;
  categories: string[];
  github?: string;
  intakes: ListingIntake[];
};

/** arXiv primary → board field. Unmapped cats become AI only if cs.* else skip. */
const CAT_TOPIC: Array<{ test: (c: string) => boolean; topic: Topic }> = [
  { test: (c) => c === "cs.CR", topic: "Security" },
  {
    test: (c) =>
      c.startsWith("quant-ph") ||
      c.startsWith("physics.") ||
      c.startsWith("cond-mat") ||
      c.startsWith("hep-") ||
      c.startsWith("nucl-"),
    topic: "Physics",
  },
  { test: (c) => c === "stat.ML", topic: "AI" },
  { test: (c) => c.startsWith("cs."), topic: "AI" },
  { test: (c) => c.startsWith("stat."), topic: "Stats" },
  { test: (c) => c.startsWith("econ."), topic: "Econ" },
  {
    test: (c) =>
      c.startsWith("q-bio") || c === "eess.SP" || c === "eess.IV",
    topic: "Health",
  },
  { test: (c) => c.startsWith("math."), topic: "Math" },
];

export function topicFromCategories(categories: string[]): Topic | null {
  for (const { test, topic } of CAT_TOPIC) {
    if (categories.some(test)) return topic;
  }
  return null;
}

/** Categories we pull as arXiv-new (not the cs.LG firehose). */
export const ARXIV_NEW_CATS = [
  "stat.ME",
  "stat.TH",
  "econ.EM",
  "econ.GN",
  "math.ST",
  "q-bio.QM",
  "eess.SP",
  "quant-ph",
  "cs.CR",
] as const;

export function mergeNominations(items: Nomination[]): Nomination[] {
  const byId = new Map<string, Nomination>();
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
    byId.set(id, {
      ...prev,
      github: prev.github ?? item.github,
      abstract: prev.abstract || item.abstract,
      intakes,
    });
  }
  return [...byId.values()];
}
