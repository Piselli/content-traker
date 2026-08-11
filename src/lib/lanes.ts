import type { LogEntry } from "./types";
import type { Norm } from "./types";
import { getNormStatus, type NormStatus } from "./norms";
import { startOfWeek } from "./week";

/** Soft weekly lane targets (topic mix) — complementary to CONTENT_TYPES norms. */
export const LANE_TARGETS = {
  solana: { min: 3, max: 5, label: "Solana eco" },
  stonkfun: { min: 2, max: 5, label: "StonkFun (support)" },
  football: { min: 0, max: 2, label: "Football (until EPL)" },
  radarUseful: { min: 3, max: 6, label: "Real value useful" },
} as const satisfies Record<string, Norm>;

export type LaneId = keyof typeof LANE_TARGETS;

const SOLANA_RE =
  /\b(solana|\bsol\b|\$sol|jupiter|raydium|meteora|pump\.fun|jito|kamino|drift|axiom|gmgn|helius|phantom|orca|tensor|fees?\b|dex vol|tvl|llama|movematch)\b/i;
const STONK_RE = /\b(stonk|stonkfun|launchonsf|paybox)\b/i;
/** Substance markers — not enough alone if post is StonkFun support. */
const RADAR_VALUE_RE =
  /\b(scorecard|teardown|map of|leaderboard|comparison|hack|whale|receipts|data as of|90d|rank|before vs after|\$0 (raised|funding))\b/i;

export function detectLanes(
  log: Pick<LogEntry, "note" | "id" | "type" | "bucket" | "traits" | "fullTypes">,
): LaneId[] {
  const blob = `${log.note ?? ""} ${log.id ?? ""} ${(log.traits ?? []).join(" ")} ${(log.fullTypes ?? []).join(" ")}`;
  const lanes: LaneId[] = [];
  const isStonk = STONK_RE.test(blob);
  if (isStonk) lanes.push("stonkfun");
  if (SOLANA_RE.test(blob) || isStonk) lanes.push("solana");
  if (log.bucket === "football") lanes.push("football");

  // Real value useful: useful-type with substance — EXCLUDE pure StonkFun support
  const isUsefulType =
    log.type === "useful" ||
    (log.fullTypes ?? []).includes("useful") ||
    (log.traits ?? []).includes("useful");
  const hasSubstance = RADAR_VALUE_RE.test(blob) || (isUsefulType && !isStonk);
  if (hasSubstance && !isStonk) {
    lanes.push("radarUseful");
  } else if (hasSubstance && isStonk && RADAR_VALUE_RE.test(blob)) {
    // rare: Stonk mention inside a real comparison teardown still counts
    lanes.push("radarUseful");
  }

  return [...new Set(lanes)];
}

export interface LaneRow {
  lane: LaneId;
  label: string;
  count: number;
  normLabel: string;
  status: NormStatus;
  needed: number;
}

export function buildLaneMix(logs: LogEntry[], now = new Date()): LaneRow[] {
  const weekStart = startOfWeek(now);
  const weekLogs = logs.filter((l) => new Date(l.at) >= weekStart && !l.classificationPending);
  const counts: Record<LaneId, number> = {
    solana: 0,
    stonkfun: 0,
    football: 0,
    radarUseful: 0,
  };
  for (const log of weekLogs) {
    for (const lane of detectLanes(log)) counts[lane] += 1;
  }

  return (Object.keys(LANE_TARGETS) as LaneId[]).map((lane) => {
    const norm: Norm = LANE_TARGETS[lane];
    const count = counts[lane];
    const status = getNormStatus(count, norm);
    let needed = 0;
    if (norm.min != null && count < norm.min) needed = norm.min - count;
    const labelParts: string[] = [];
    if (norm.min != null && norm.max != null) labelParts.push(`${norm.min}–${norm.max}`);
    else if (norm.min != null) labelParts.push(`${norm.min}+`);
    else if (norm.max != null) labelParts.push(`≤${norm.max}`);
    return { lane, label: norm.label, count, normLabel: labelParts[0] ?? "—", status, needed };
  });
}
