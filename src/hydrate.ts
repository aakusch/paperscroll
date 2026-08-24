import { selectBoard } from "./board.js";
import type { Edition, Paper } from "./data.js";
import { isHostedPacket } from "./hostPacket.js";
import { dailyTrends, intakeOk } from "./listing.js";
import { topicFromCategories, type MorningPool, type Nomination } from "./pool.js";

export function editionFromPool(
  pool: MorningPool,
  briefs: Map<string, Paper>,
  slate: string[],
): Edition {
  const trends = dailyTrends(
    pool.nominations.map((item) => ({
      arxivId: item.arxivId,
      publishedOn: item.publishedOn,
      listedOn: pool.boardDate,
      intakes: item.intakes,
    })),
  );
  const papers = pool.nominations
    .map((item) =>
      nominationToPaper(item, pool.boardDate, briefs.get(item.arxivId), trends.get(item.arxivId)),
    )
    .filter((paper): paper is Paper => paper != null);
  const selected = selectBoard(papers, pool.boardDate, slate);
  const poolSize = pool.nominations.filter((item) => {
    if (!topicFromCategories(item.categories)) return false;
    const listing = {
      publishedOn: item.publishedOn,
      listedOn: pool.boardDate,
      intakes: item.intakes,
    };
    return item.intakes.some((intake) => intakeOk(intake, listing));
  }).length;
  return {
    date: pool.boardDate,
    label: poolLabel(pool.boardDate),
    minutes: Math.max(6, selected.length),
    poolSize,
    live: true,
    papers: selected,
  };
}

function poolLabel(date: string) {
  const pretty = new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  return pretty;
}

function nominationToPaper(
  item: Nomination,
  boardDate: string,
  hand?: Paper,
  trend?: Paper["trend"],
): Paper | null {
  if (!isHostedPacket(hand)) return null;
  // The reviewed host packet is authoritative. Intake metadata can be wrong or
  // overly broad (HF entries do not always expose the paper's full categories).
  const topic = hand.topic;
  const listing = {
    listedOn: boardDate,
    publishedOn: item.publishedOn,
    intakes: item.intakes,
  };
  return {
    ...hand,
    id: hand.id,
    arxivId: item.arxivId,
    url: `https://arxiv.org/abs/${item.arxivId}`,
    title: item.title || hand.title,
    authors: item.authors || hand.authors,
    abstract: item.abstract || hand.abstract,
    github: item.github ?? hand.github,
    topic,
    listing,
    trend,
  };
}
