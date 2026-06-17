import { getNormStatus, NORMS, normLabel } from "./norms";
import type { ContentType, LogEntry } from "./types";
import { CONTENT_TYPES } from "./types";
import { isInWeek } from "./week";

export type PerformanceTier = "weak" | "ok" | "strong" | "unknown";

export interface NormGap {
  type: ContentType;
  count: number;
  normLabel: string;
  needed: number;
  status: "behind" | "done" | "over";
}

export interface PerformerRow {
  id: string;
  type: ContentType;
  traits?: ContentType[];
  tweetUrl?: string;
  ageHours?: number;
  views?: number;
  likes?: number;
  replies?: number;
  viewsPerHour?: number;
  tier: PerformanceTier;
}

export interface WeekAnalysis {
  normGaps: NormGap[];
  doneTypes: ContentType[];
  overTypes: ContentType[];
  performers: PerformerRow[];
  todayPriority: ContentType[];
  insights: string[];
}

export function getPerformanceTier(views: number, ageHours: number): PerformanceTier {
  if (ageHours <= 0) return "unknown";
  const h = ageHours;

  if (h <= 6) {
    if (views < 80) return "weak";
    if (views < 400) return "ok";
    return "strong";
  }
  if (h <= 30) {
    if (views < 150) return "weak";
    if (views < 600) return "ok";
    return "strong";
  }
  if (views < 150) return "weak";
  if (views < 500) return "ok";
  return "strong";
}

function tierLabel(tier: PerformanceTier): string {
  switch (tier) {
    case "weak":
      return "weak";
    case "ok":
      return "ok";
    case "strong":
      return "strong";
    default:
      return "—";
  }
}

function normGapNeeded(type: ContentType, count: number): number {
  const norm = NORMS[type];
  const status = getNormStatus(count, norm);
  if (status === "done" || status === "over") return 0;
  if (norm.min != null) return Math.max(0, norm.min - count);
  return 0;
}

export function buildWeekAnalysis(
  logs: LogEntry[],
  weekCounts: Record<ContentType, number>,
  now = new Date(),
): WeekAnalysis {
  const normGaps: NormGap[] = [];
  const doneTypes: ContentType[] = [];
  const overTypes: ContentType[] = [];

  for (const type of CONTENT_TYPES) {
    const count = weekCounts[type] ?? 0;
    const norm = NORMS[type];
    const status = getNormStatus(count, norm);
    const needed = normGapNeeded(type, count);

    if (status === "done") doneTypes.push(type);
    if (status === "over") overTypes.push(type);
    if (needed > 0 || (status === "progress" && norm.min != null)) {
      normGaps.push({
        type,
        count,
        normLabel: normLabel(norm),
        needed,
        status: status === "over" ? "over" : needed > 0 ? "behind" : "done",
      });
    }
  }

  normGaps.sort((a, b) => b.needed - a.needed);

  const performers: PerformerRow[] = logs
    .filter((l) => isInWeek(l.at, now) && l.views != null && l.ageHours != null && l.ageHours > 0)
    .map((l) => {
      const viewsPerHour = Math.round(l.views! / l.ageHours!);
      const tier = getPerformanceTier(l.views!, l.ageHours!);
      return {
        id: l.id,
        type: l.type,
        traits: l.traits,
        tweetUrl: l.tweetUrl,
        ageHours: l.ageHours,
        views: l.views,
        likes: l.likes,
        replies: l.replies,
        viewsPerHour,
        tier,
      };
    })
    .sort((a, b) => (b.viewsPerHour ?? 0) - (a.viewsPerHour ?? 0));

  const todayPriority = normGaps
    .filter((g) => g.needed > 0 && g.type !== "builder" && g.type !== "meta reach")
    .slice(0, 3)
    .map((g) => g.type);

  const insights: string[] = [];

  if (normGaps[0]?.needed) {
    insights.push(
      `Most behind: ${normGaps[0].type} (${normGaps[0].count}/${normGaps[0].normLabel}, need +${normGaps[0].needed}).`,
    );
  }

  if (performers[0]) {
    const p = performers[0];
    insights.push(
      `Best views/h: ${p.type} — ${p.views}v @ ${p.ageHours}h (${p.viewsPerHour}/h, ${tierLabel(p.tier)}).`,
    );
  }

  const weak = performers.filter((p) => p.tier === "weak");
  if (weak[0]) {
    insights.push(
      `Weakest check-in: ${weak[weak.length - 1].type} — ${weak[weak.length - 1].views}v @ ${weak[weak.length - 1].ageHours}h.`,
    );
  }

  if (insights.length === 0) {
    insights.push("Log tweets with hours + views to unlock performance insights.");
  }

  return {
    normGaps: normGaps.filter((g) => g.needed > 0),
    doneTypes,
    overTypes,
    performers,
    todayPriority,
    insights,
  };
}
