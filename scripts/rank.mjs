export const RANKING_VERSION = "balanced-source-v1";

const FIELDS = [
  "AI",
  "Stats",
  "Math",
  "Econ",
  "Health",
  "Engineering",
  "Physics",
  "Security",
];
const FIELD_SET = new Set(FIELDS);
const DAILY_LIST_MAX_AGE_DAYS = 14;
const ARXIV_NEW_MAX_AGE_DAYS = 2;

export function rankMorningPool(pool, limit = 10) {
  const eligible = pool.nominations
    .map((item) => normalizeNomination(item, pool.boardDate))
    .filter(Boolean)
    .sort(compareSignal);

  const winners = new Map();
  for (const item of eligible) {
    if (!winners.has(item.field)) winners.set(item.field, item);
  }

  const selectedIds = new Set();
  const selected = [];
  for (const item of [...winners.values()].sort(compareSignal)) {
    if (selected.length >= limit) break;
    selected.push(item);
    selectedIds.add(item.arxivId);
  }
  for (const item of eligible) {
    if (selected.length >= limit) break;
    if (selectedIds.has(item.arxivId)) continue;
    selected.push(item);
    selectedIds.add(item.arxivId);
  }

  selected.sort(compareSignal);
  const winnerIds = new Set([...winners.values()].map((item) => item.arxivId));
  return {
    eligible,
    selected: selected.map((item, index) => ({
      ...item,
      selection: {
        rank: index + 1,
        version: RANKING_VERSION,
        reason: winnerIds.has(item.arxivId)
          ? `Strongest ${item.field} signal in the eligible pool`
          : "Next strongest source signal after field coverage",
        signals: signalFor(item),
      },
    })),
  };
}

function normalizeNomination(item, boardDate) {
  const arxivId = String(item.arxivId || "").trim();
  const title = String(item.title || "").trim();
  const authors = String(item.authors || "").trim();
  const abstract = String(item.abstract || "").replace(/\s+/g, " ").trim();
  const field = FIELD_SET.has(item.field) ? item.field : fieldFromCategories(item.categories);
  if (!arxivId || !title || !authors || abstract.length < 80 || !field) return null;

  const intakes = (item.intakes || []).filter((intake) =>
    intakeIsCurrent(intake, item.publishedOn, boardDate),
  );
  if (intakes.length === 0) return null;

  return {
    ...item,
    arxivId,
    title,
    authors,
    abstract,
    field,
    intakes,
  };
}

function compareSignal(a, b) {
  const left = signalFor(a);
  const right = signalFor(b);
  return (
    Number(right.hfListed) - Number(left.hfListed) ||
    right.hfVotes - left.hfVotes ||
    right.sourceCount - left.sourceCount ||
    String(b.publishedOn).localeCompare(String(a.publishedOn)) ||
    a.arxivId.localeCompare(b.arxivId)
  );
}

function signalFor(item) {
  const daily = item.intakes.filter((intake) => intake.kind === "hf-daily");
  return {
    hfListed: daily.length > 0,
    hfVotes: Math.max(0, ...daily.map((intake) => Number(intake.upvotes) || 0)),
    sourceCount: new Set(item.intakes.map((intake) => intake.kind)).size,
    publishedOn: item.publishedOn,
  };
}

function intakeIsCurrent(intake, publishedOn, boardDate) {
  const age = daysBetween(publishedOn, boardDate);
  if (age < 0) return false;
  if (intake.kind === "hf-daily") return age <= DAILY_LIST_MAX_AGE_DAYS;
  if (intake.kind === "arxiv-new") return age <= ARXIV_NEW_MAX_AGE_DAYS;
  return false;
}

function daysBetween(fromIso, toIso) {
  const from = Date.parse(`${String(fromIso).slice(0, 10)}T12:00:00Z`);
  const to = Date.parse(`${String(toIso).slice(0, 10)}T12:00:00Z`);
  if (!Number.isFinite(from) || !Number.isFinite(to)) return Number.POSITIVE_INFINITY;
  return Math.round((to - from) / 86_400_000);
}

function fieldFromCategories(categories = []) {
  const primary = String(categories[0] || "");
  if (primary === "cs.CR") return "Security";
  if (
    primary.startsWith("quant-ph") ||
    primary.startsWith("physics.") ||
    primary.startsWith("cond-mat") ||
    primary.startsWith("hep-") ||
    primary.startsWith("nucl-")
  ) return "Physics";
  if (primary === "stat.ML" || primary.startsWith("cs.")) return "AI";
  if (primary.startsWith("stat.")) return "Stats";
  if (primary.startsWith("econ.")) return "Econ";
  if (primary === "eess.SP") return "Engineering";
  if (primary.startsWith("q-bio") || primary === "eess.IV") {
    return "Health";
  }
  if (primary.startsWith("math.")) return "Math";
  return null;
}
