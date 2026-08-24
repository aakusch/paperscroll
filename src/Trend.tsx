import type { DailyTrend } from "./data";

export function TrendMark({ trend }: { trend: DailyTrend }) {
  return (
    <span className="trend">
      <span className="trend-rank">Daily Papers #{trend.rank}</span>
      <span className="trend-votes">
        of {trend.of} · {trend.votes.toLocaleString("en-US")} votes
      </span>
    </span>
  );
}
