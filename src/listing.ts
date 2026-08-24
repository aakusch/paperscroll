import type { DailyTrend, Listing, ListingIntake, Paper } from "./data.js";
import { safePaperUrl } from "./links.js";

/** Community daily lists (e.g. HF Daily Papers) allow items up to 14 days after arXiv. */
export const DAILY_LIST_MAX_AGE_DAYS = 14;
/** arXiv “new” window for the morning board. */
export const ARXIV_NEW_MAX_AGE_DAYS = 2;

export function daysBetween(fromIso: string, toIso: string) {
  const a = Date.parse(`${fromIso.slice(0, 10)}T12:00:00Z`);
  const b = Date.parse(`${toIso.slice(0, 10)}T12:00:00Z`);
  return Math.round((b - a) / 86400000);
}

export function shortDate(iso: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function intakeOk(intake: ListingIntake, listing: Listing) {
  const age = daysBetween(listing.publishedOn, listing.listedOn);
  if (age < 0) return false;
  if (intake.kind === "hf-daily") return age <= DAILY_LIST_MAX_AGE_DAYS;
  if (intake.kind === "arxiv-new") return age <= ARXIV_NEW_MAX_AGE_DAYS;
  return true;
}

export function validIntakes(paper: Paper) {
  const listing = paper.listing;
  if (!listing) return [];
  return listing.intakes.filter((intake) => intakeOk(intake, listing));
}

export function belongsOnBoard(paper: Paper, boardDate: string) {
  const listing = paper.listing;
  // Legacy preview cards have no listing. Live ingest always does.
  if (!listing) return true;
  if (listing.listedOn !== boardDate) return false;
  return validIntakes(paper).length > 0;
}

export function listingLine(paper: Paper) {
  const listing = paper.listing;
  if (!listing) return paper.topic;
  return `First appeared ${shortDate(listing.publishedOn)}`;
}

/** Hugging Face Daily Papers count, when that watch actually nominated the card. */
export function dailyPapersVotes(paper: Paper) {
  const listing = paper.listing;
  if (!listing) return undefined;
  const votes = listing.intakes
    .filter((intake) => intake.kind === "hf-daily" && intakeOk(intake, listing))
    .map((intake) => intake.upvotes ?? 0);
  if (votes.length === 0) return undefined;
  const n = Math.max(0, ...votes);
  return n > 0 ? n : undefined;
}

/** Rank and velocity on that morning’s Daily Papers list. */
export function dailyTrends(
  items: {
    arxivId: string;
    publishedOn: string;
    listedOn: string;
    intakes: ListingIntake[];
  }[],
) {
  const rows = items
    .map((item) => {
      const listing = {
        publishedOn: item.publishedOn,
        listedOn: item.listedOn,
        intakes: item.intakes,
      };
      const votes = Math.max(
        0,
        ...item.intakes
          .filter((intake) => intake.kind === "hf-daily" && intakeOk(intake, listing))
          .map((intake) => intake.upvotes ?? 0),
      );
      return { id: item.arxivId, votes, publishedOn: item.publishedOn, listedOn: item.listedOn };
    })
    .filter((row) => row.votes > 0)
    .sort((a, b) => b.votes - a.votes || a.id.localeCompare(b.id));

  const map = new Map<string, DailyTrend>();
  const of = rows.length;
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const age = Math.max(1, daysBetween(row.publishedOn, row.listedOn));
    map.set(row.id, {
      votes: row.votes,
      rank: i + 1,
      of,
      perDay: Math.round(row.votes / age),
    });
  }
  return map;
}

export function listingDetail(paper: Paper) {
  const listing = paper.listing;
  if (!listing) return null;
  const ok = validIntakes(paper);
  if (ok.length === 0) return null;
  const daily = ok.find((intake) => intake.kind === "hf-daily");
  return {
    label: "Board source",
    sourceName: daily ? "Hugging Face Daily Papers" : "arXiv watch",
    text: daily
      ? "Picked up by Hugging Face Daily Papers for this morning’s pool."
      : "Picked up by this morning’s arXiv watch.",
    href: safePaperUrl(ok[0]?.evidenceUrl ?? paper.url) ?? "",
  };
}
