import { BUCKET_TARGETS, type Bucket } from "./buckets";
import { likeRatePercent, replyRatePercent } from "./engagement";
import { getNormStatus, NORMS, normLabel } from "./norms";
import { allDisplayTypes, comboTraits, normTypes, SLOT_COMBOS } from "./traits";
import type { ContentType, LogEntry, PostSlot } from "./types";
import { CONTENT_TYPES } from "./types";
import { formatLogDay, isInWeek } from "./week";

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
  tweetUrl?: string;
  ageHours?: number;
  views?: number;
  likes?: number;
  replies?: number;
  viewsPerHour?: number;
  replyRate?: number;
  likeRate?: number;
  tier: PerformanceTier;
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

export interface WeekAnalysis {
  normGaps: NormGap[];
  comboHits: NormGap[];
  doneTypes: ContentType[];
  overTypes: ContentType[];
  performers: PerformerRow[];
  bucketMix: BucketRow[];
  todayPriority: ContentType[];
  nextSlot: NextSlotHint;
  insights: string[];
  disciplineScore: number;
  disciplineTotal: number;
  postsToday: number;
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

function buildBucketMix(logs: LogEntry[], now: Date): BucketRow[] {
  const weekLogs = logs.filter((l) => isInWeek(l.at, now));
  const total = weekLogs.length || 1;

  function logBucket(log: LogEntry): Bucket | undefined {
    if (log.bucket) return log.bucket;
    if (normTypes(log).includes("meme") || comboTraits(log).includes("meme")) return "humor";
    return undefined;
  }

  return (Object.keys(BUCKET_TARGETS) as Bucket[]).map((bucket) => {
    const count = weekLogs.filter((l) => {
      const b = logBucket(l);
      if (bucket === "humor") {
        return b === "humor" || normTypes(l).includes("meme") || comboTraits(l).includes("meme");
      }
      if (bucket === "builder") {
        return b === "builder" || normTypes(l).includes("builder") || comboTraits(l).includes("builder");
      }
      return b === bucket;
    }).length;
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
  let disciplineScore = 0;

  for (const type of CONTENT_TYPES) {
    const count = weekCounts[type] ?? 0;
    const norm = NORMS[type];
    const status = getNormStatus(count, norm);
    const needed = normGapNeeded(type, count);

    if (status === "done") {
      doneTypes.push(type);
      disciplineScore += 1;
    }
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
    .filter((l) => isInWeek(l.at, now) && l.views != null && l.ageHours != null && l.ageHours > 0)
    .map((l) => {
      const viewsPerHour = Math.round(l.views! / l.ageHours!);
      return {
        id: l.id,
        type: l.type,
        allTypes: allDisplayTypes(l),
        traits: l.traits,
        slot: l.slot,
        bucket: l.bucket,
        tweetUrl: l.tweetUrl,
        ageHours: l.ageHours,
        views: l.views,
        likes: l.likes,
        replies: l.replies,
        viewsPerHour,
        replyRate: replyRatePercent(l.views, l.replies),
        likeRate: likeRatePercent(l.views, l.likes),
        tier: getPerformanceTier(l.views!, l.ageHours!),
      };
    })
    .sort((a, b) => (b.viewsPerHour ?? 0) - (a.viewsPerHour ?? 0));

  const todayLogs = logsToday(logs, now);
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
    insights.push(
      `Кращий перегляд/год: ${label} — ${p.views} переглядів за ${p.ageHours} год (${p.viewsPerHour}/год, ${tierLabel(p.tier)}).`,
    );
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
    bucketMix,
    todayPriority,
    nextSlot,
    insights,
    disciplineScore,
    disciplineTotal: CONTENT_TYPES.length,
    postsToday: todayLogs.length,
  };
}
