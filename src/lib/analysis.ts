import { BUCKET_TARGETS, type Bucket } from "./buckets";
import { likeRatePercent, repliesPer1k, replyRatePercent } from "./engagement";
import { getNormStatus, isNormClosed, NORMS, normLabel } from "./norms";
import { allDisplayTypes, comboTraits, normTypes, SLOT_COMBOS } from "./traits";
import type { ContentType, LogEntry, PostSlot } from "./types";
import { CONTENT_TYPES } from "./types";
import { buildVisualClusterStats } from "./visualClusters";
import type { VisualCluster } from "./visualClusters";
import { resolveVisualCluster } from "./visualClusters";
import { formatLogDay, isInWeek, hoursSince, startOfWeek, MS_DAY } from "./week";

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
  allTypes: ContentType[];
  traits?: ContentType[];
  slot?: PostSlot;
  bucket?: Bucket;
  visualCluster?: VisualCluster;
  tweetUrl?: string;
  ageHours?: number;
  views?: number;
  likes?: number;
  replies?: number;
  viewsPerHour?: number;
  replyRate?: number;
  likeRate?: number;
  repliesPer1k?: number;
  tier: PerformanceTier;
  replyTier: PerformanceTier;
}

export interface BucketRow {
  bucket: Bucket;
  count: number;
  targetPct: number;
  actualPct: number;
}

export interface NextSlotHint {
  slot: PostSlot;
  postsToday: number;
  suggestedTypes: ContentType[];
  suggestedCombos: ContentType[][];
  avoid: ContentType[];
}

export interface WeekComparison {
  posts: number;
  prevPosts: number;
  avgViews: number;
  prevAvgViews: number;
  avgRepliesPer1k: number;
  prevAvgRepliesPer1k: number;
  disciplineScore: number;
  prevDisciplineScore: number;
}

export interface StreakInfo {
  disciplineWeeks: number;
  postingDays: number;
}

export interface WeekAnalysis {
  normGaps: NormGap[];
  comboHits: NormGap[];
  doneTypes: ContentType[];
  overTypes: ContentType[];
  performers: PerformerRow[];
  visualClusters: import("./visualClusters").VisualClusterRow[];
  bucketMix: BucketRow[];
  todayPriority: ContentType[];
  nextSlot: NextSlotHint;
  insights: string[];
  disciplineScore: number;
  disciplineTotal: number;
  postsToday: number;
  weekComparison: WeekComparison;
  streaks: StreakInfo;
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

/** Playbook signal: conversation > applause (12 replies/1k ≈ beats 1000 silent likes). */
export function getReplyEngagementTier(
  views: number,
  replies?: number,
): PerformanceTier {
  if (replies == null) return "unknown";
  const per1k = (replies / views) * 1000;
  if (per1k >= 12 || replies >= 10) return "strong";
  if (per1k >= 4 || replies >= 4) return "ok";
  if (replies >= 1) return "weak";
  return "weak";
}

function tierLabel(tier: PerformanceTier): string {
  switch (tier) {
    case "weak":
      return "слабо";
    case "ok":
      return "норм";
    case "strong":
      return "сильно";
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

function isInPrevWeek(iso: string, ref: Date): boolean {
  const prev = new Date(startOfWeek(ref).getTime() - MS_DAY);
  return isInWeek(iso, prev);
}

function weekDisciplineScore(weekCounts: Record<ContentType, number>): number {
  let score = 0;
  for (const type of CONTENT_TYPES) {
    const count = weekCounts[type] ?? 0;
    if (isNormClosed(getNormStatus(count, NORMS[type]))) score += 1;
  }
  return score;
}

function weekMetrics(logs: LogEntry[], ref: Date, prev = false): {
  posts: number;
  avgViews: number;
  avgRepliesPer1k: number;
  disciplineScore: number;
} {
  const filtered = logs.filter((l) => {
    if (l.classificationPending) return false;
    return prev ? isInPrevWeek(l.at, ref) : isInWeek(l.at, ref);
  });
  const counts = {} as Record<ContentType, number>;
  for (const type of CONTENT_TYPES) counts[type] = 0;
  for (const log of filtered) {
    for (const t of normTypes(log)) counts[t] += 1;
  }
  const withViews = filtered.filter((l) => l.views != null && l.views > 0);
  const totalViews = withViews.reduce((a, l) => a + l.views!, 0);
  const totalReplies = withViews.reduce((a, l) => a + (l.replies ?? 0), 0);
  return {
    posts: filtered.length,
    avgViews: withViews.length ? Math.round(totalViews / withViews.length) : 0,
    avgRepliesPer1k:
      totalViews > 0 ? Math.round((totalReplies / totalViews) * 10000) / 10 : 0,
    disciplineScore: weekDisciplineScore(counts),
  };
}

export function computeStreaks(logs: LogEntry[], now = new Date()): StreakInfo {
  let disciplineWeeks = 0;
  for (let w = 0; w < 52; w++) {
    const ref = new Date(startOfWeek(now).getTime() - w * 7 * MS_DAY);
    const counts = {} as Record<ContentType, number>;
    for (const type of CONTENT_TYPES) counts[type] = 0;
    for (const log of logs) {
      if (log.classificationPending || !isInWeek(log.at, ref)) continue;
      for (const t of normTypes(log)) counts[t] += 1;
    }
    const score = weekDisciplineScore(counts);
    if (score >= 6) disciplineWeeks += 1;
    else break;
  }

  let postingDays = 0;
  const todayKey = formatLogDay(now.toISOString());
  for (let d = 0; d < 365; d++) {
    const day = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - d),
    );
    const key = day.toISOString().slice(0, 10);
    const hasPost = logs.some((l) => l.at.slice(0, 10) === key);
    if (hasPost) postingDays += 1;
    else if (key !== todayKey) break;
  }

  return { disciplineWeeks, postingDays };
}

function logsToday(logs: LogEntry[], now: Date): LogEntry[] {
  const key = formatLogDay(now.toISOString());
  return logs.filter((l) => formatLogDay(l.at) === key);
}

function buildNextSlot(
  gaps: NormGap[],
  postsTodayCount: number,
): NextSlotHint {
  const slot = Math.min(3, postsTodayCount + 1) as PostSlot;
  const priority = gaps
    .filter((g) => g.needed > 0 && g.type !== "builder" && g.type !== "meta reach")
    .map((g) => g.type);

  const suggestedTypes = priority.slice(0, 2);
  if (suggestedTypes.length === 0) {
    suggestedTypes.push("hot topic", "meme");
  }

  const neededSet = new Set(gaps.filter((g) => g.needed > 0).map((g) => g.type));
  const suggestedCombos = SLOT_COMBOS.filter(
    (combo) => combo.every((t) => neededSet.has(t)),
  ).slice(0, 3);
  if (suggestedCombos.length === 0 && suggestedTypes.length >= 2) {
    suggestedCombos.push([suggestedTypes[0], suggestedTypes[1]]);
  }

  const avoid: ContentType[] = slot === 1 ? ["meta reach"] : [];

  return { slot, postsToday: postsTodayCount, suggestedTypes, suggestedCombos, avoid };
}

/** One canonical bucket per post — topic + format, no double-counting. */
export function resolvePostBucket(log: LogEntry): Bucket {
  if (log.bucket === "football") return "football";
  if (
    log.bucket === "builder" ||
    normTypes(log).includes("builder") ||
    comboTraits(log).includes("builder")
  ) {
    return "builder";
  }
  if (
    normTypes(log).includes("meme") ||
    comboTraits(log).includes("meme") ||
    log.bucket === "humor"
  ) {
    return "humor";
  }
  if (log.bucket === "CT") return "CT";
  return "CT";
}

function buildBucketMix(logs: LogEntry[], now: Date): BucketRow[] {
  const weekLogs = logs.filter(
    (l) => isInWeek(l.at, now) && !l.classificationPending,
  );
  const total = weekLogs.length || 1;

  return (Object.keys(BUCKET_TARGETS) as Bucket[]).map((bucket) => {
    const count = weekLogs.filter((l) => resolvePostBucket(l) === bucket).length;
    return {
      bucket,
      count,
      targetPct: BUCKET_TARGETS[bucket],
      actualPct: Math.round((count / total) * 100),
    };
  });
}

export function buildWeekAnalysis(
  logs: LogEntry[],
  weekCounts: Record<ContentType, number>,
  weekComboCounts: Record<ContentType, number>,
  now = new Date(),
): WeekAnalysis {
  const normGaps: NormGap[] = [];
  const doneTypes: ContentType[] = [];
  const overTypes: ContentType[] = [];
  const disciplineScore = weekDisciplineScore(weekCounts);

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

  const comboHits: NormGap[] = CONTENT_TYPES.filter(
    (type) => (weekComboCounts[type] ?? 0) > 0,
  ).map((type) => ({
    type,
    count: weekComboCounts[type] ?? 0,
    normLabel: "combo",
    needed: 0,
    status: "done" as const,
  }));

  const performers: PerformerRow[] = logs
    .filter((l) => {
      if (!isInWeek(l.at, now) || l.views == null) return false;
      return hoursSince(l.at, now) > 0;
    })
    .map((l) => {
      const ageHours = hoursSince(l.at, now);
      const viewsPerHour = Math.round(l.views! / ageHours);
      return {
        id: l.id,
        type: l.type,
        allTypes: allDisplayTypes(l),
        traits: l.traits,
        slot: l.slot,
        bucket: l.bucket,
        visualCluster: resolveVisualCluster(l),
        tweetUrl: l.tweetUrl,
        ageHours,
        views: l.views,
        likes: l.likes,
        replies: l.replies,
        viewsPerHour,
        replyRate: replyRatePercent(l.views, l.replies),
        likeRate: likeRatePercent(l.views, l.likes),
        repliesPer1k: repliesPer1k(l.views, l.replies),
        tier: getPerformanceTier(l.views!, ageHours),
        replyTier: getReplyEngagementTier(l.views!, l.replies),
      };
    })
    .sort((a, b) => {
      const replyDiff = (b.repliesPer1k ?? 0) - (a.repliesPer1k ?? 0);
      if (replyDiff !== 0) return replyDiff;
      return (b.viewsPerHour ?? 0) - (a.viewsPerHour ?? 0);
    });

  const weekLogs = logs.filter((l) => isInWeek(l.at, now) && !l.classificationPending);
  const visualClusters = buildVisualClusterStats(weekLogs);

  const todayLogs = logsToday(logs, now);
  const currentMetrics = weekMetrics(logs, now, false);
  const prevMetrics = weekMetrics(logs, now, true);
  const weekComparison: WeekComparison = {
    posts: currentMetrics.posts,
    prevPosts: prevMetrics.posts,
    avgViews: currentMetrics.avgViews,
    prevAvgViews: prevMetrics.avgViews,
    avgRepliesPer1k: currentMetrics.avgRepliesPer1k,
    prevAvgRepliesPer1k: prevMetrics.avgRepliesPer1k,
    disciplineScore: currentMetrics.disciplineScore,
    prevDisciplineScore: prevMetrics.disciplineScore,
  };
  const streaks = computeStreaks(logs, now);

  const todayPriority = normGaps
    .filter((g) => g.needed > 0 && g.type !== "builder" && g.type !== "meta reach")
    .slice(0, 3)
    .map((g) => g.type);

  const nextSlot = buildNextSlot(normGaps, todayLogs.length);
  const bucketMix = buildBucketMix(logs, now);

  const insights: string[] = [];

  if (normGaps[0]?.needed) {
    const g = normGaps[0];
    insights.push(
      `Найбільше відставання: ${g.type} (${g.count}/${g.normLabel}, потрібно ще +${g.needed}).`,
    );
  }

  if (performers[0]) {
    const p = performers[0];
    const label = p.allTypes.length > 1 ? p.allTypes.join(" + ") : p.type;
    const replyNote =
      p.repliesPer1k != null
        ? `${p.replies ?? 0} replies · ${p.repliesPer1k}/1k (${tierLabel(p.replyTier)})`
        : `${p.replies ?? 0} replies`;
    insights.push(
      `Playbook signal (Move 2): ${label} — ${replyNote} при ${p.views} переглядах. Відповідай у перші 60 хв.`,
    );
  }

  const viewsStandout = [...performers].sort(
    (a, b) => (b.viewsPerHour ?? 0) - (a.viewsPerHour ?? 0),
  )[0];
  if (
    viewsStandout &&
    viewsStandout.id !== performers[0]?.id &&
    (viewsStandout.viewsPerHour ?? 0) > (performers[0]?.viewsPerHour ?? 0) * 1.5
  ) {
    const label =
      viewsStandout.allTypes.length > 1
        ? viewsStandout.allTypes.join(" + ")
        : viewsStandout.type;
    insights.push(
      `Більше переглядів, але слабша розмова: ${label} — ${viewsStandout.viewsPerHour}/год vs replies ${viewsStandout.repliesPer1k ?? "—"}/1k. Перевір Move 2–3.`,
    );
  }

  if (visualClusters.length >= 2) {
    const best = visualClusters[0];
    const textOnly = visualClusters.find((v) => v.cluster === "text-only");
    if (textOnly && best.cluster !== "text-only" && textOnly.count > 0) {
      insights.push(
        `Visual (Move 4): ${best.label} ~${best.avgViews}v цього тижня vs text-only ~${textOnly.avgViews}v — tap-worthy visual першим.`,
      );
    }
  }

  if (todayLogs.length > 0) {
    insights.push(`Сьогодні опубліковано: ${todayLogs.length} пост(ів).`);
  }

  if (insights.length === 0) {
    insights.push("Скинь скрін + URL після поста — дані зʼявляться тут.");
  }

  return {
    normGaps: normGaps.filter((g) => g.needed > 0),
    comboHits,
    doneTypes,
    overTypes,
    performers,
    visualClusters,
    bucketMix,
    todayPriority,
    nextSlot,
    insights,
    disciplineScore,
    disciplineTotal: CONTENT_TYPES.length,
    postsToday: todayLogs.length,
    weekComparison,
    streaks,
  };
}
