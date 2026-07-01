import type { ContentType, LogEntry } from "./types";

/** Visual format cluster — Move 4 tap + PICK formula */
export const VISUAL_CLUSTERS = [
  "scorecard",
  "collage",
  "chart",
  "screenshot",
  "meme",
  "text-only",
] as const;

export type VisualCluster = (typeof VISUAL_CLUSTERS)[number];

export const VISUAL_CLUSTER_LABELS: Record<VisualCluster, string> = {
  scorecard: "Scorecard bait",
  collage: "Collage list bait",
  chart: "Chart proof",
  screenshot: "Screenshot (PM / product)",
  meme: "Meme template",
  "text-only": "Text-only",
};

/** Fallback when no logs yet — updated from live stats when available */
export const VISUAL_CLUSTER_BENCHMARKS_FALLBACK: Record<
  VisualCluster,
  { avgViews: number; rpv: number }
> = {
  scorecard: { avgViews: 499, rpv: 17 },
  collage: { avgViews: 425, rpv: 18 },
  chart: { avgViews: 285, rpv: 22 },
  screenshot: { avgViews: 383, rpv: 13 },
  meme: { avgViews: 261, rpv: 17 },
  "text-only": { avgViews: 159, rpv: 16 },
};

/** @deprecated use getVisualClusterBenchmarks(logs) */
export const VISUAL_CLUSTER_BENCHMARKS = VISUAL_CLUSTER_BENCHMARKS_FALLBACK;

export function getVisualClusterBenchmarks(
  logs: LogEntry[],
): Record<VisualCluster, { avgViews: number; rpv: number }> {
  const stats = buildVisualClusterStats(
    logs.filter((l) => !l.classificationPending && l.views != null),
  );
  const out = { ...VISUAL_CLUSTER_BENCHMARKS_FALLBACK };
  for (const row of stats) {
    out[row.cluster] = { avgViews: row.avgViews, rpv: row.rpv };
  }
  return out;
}

export function matchVisualCluster(raw: string): VisualCluster | undefined {
  const lower = raw.toLowerCase().trim().replace(/_/g, "-");
  return VISUAL_CLUSTERS.find(
    (c) => lower === c || lower.replace(/\s+/g, "-") === c,
  );
}

/** Infer cluster from agent note when not set explicitly */
export function inferVisualCluster(
  note?: string,
  type?: ContentType,
): VisualCluster {
  const n = (note ?? "").toLowerCase();

  if (/scorecard|fake.*score|5-0|black scorecard|manifesting/.test(n)) {
    return "scorecard";
  }
  if (/collage|chalkboard|list.*collage|replies collage/.test(n)) {
    return "collage";
  }
  if (/chart|heatmap|line chart|native chart|p\/l/.test(n)) {
    return "chart";
  }
  if (/screenshot|pm screenshot|squad|4-3-3|formation|fake phone|toast|fake ui/.test(n)) {
    return "screenshot";
  }
  if (
    /pawn stars|greentext|homelander|clip|punisher|decor|absurdist fake|fake polymarket|mock/.test(n)
  ) {
    return "meme";
  }
  if (type === "meme") return "meme";
  if (/qt\b|quote tweet|contrarian|theory|notification/.test(n) && !/visual|chart|collage|scorecard|screenshot/.test(n)) {
    return "text-only";
  }

  return "text-only";
}

export function resolveVisualCluster(log: Pick<LogEntry, "visualCluster" | "note" | "type">): VisualCluster {
  return log.visualCluster ?? inferVisualCluster(log.note, log.type);
}

export interface VisualClusterRow {
  cluster: VisualCluster;
  label: string;
  count: number;
  avgViews: number;
  avgReplies: number;
  rpv: number;
}

export function buildVisualClusterStats(logs: LogEntry[]): VisualClusterRow[] {
  const by = new Map<VisualCluster, { n: number; views: number; replies: number }>();

  for (const log of logs) {
    if (log.classificationPending || log.views == null) continue;
    const cluster = resolveVisualCluster(log);
    const row = by.get(cluster) ?? { n: 0, views: 0, replies: 0 };
    row.n += 1;
    row.views += log.views;
    row.replies += log.replies ?? 0;
    by.set(cluster, row);
  }

  return VISUAL_CLUSTERS.filter((c) => by.has(c))
    .map((cluster) => {
      const row = by.get(cluster)!;
      return {
        cluster,
        label: VISUAL_CLUSTER_LABELS[cluster],
        count: row.n,
        avgViews: Math.round(row.views / row.n),
        avgReplies: Math.round((row.replies / row.n) * 10) / 10,
        rpv: Math.round((row.replies / row.views) * 1000 * 10) / 10,
      };
    })
    .sort((a, b) => b.avgViews - a.avgViews);
}
