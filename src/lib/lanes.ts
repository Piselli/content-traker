import type { LogEntry } from "./types";
import type { Norm } from "./types";
import { getNormStatus, type NormStatus } from "./norms";
import { startOfWeek } from "./week";

/** Soft weekly lane targets (topic mix) — complementary to CONTENT_TYPES norms. */
export const LANE_TARGETS = {
  solana: { min: 3, max: 5, label: "Solana eco" },
  stonkfun: { min: 2, max: 5, label: "StonkFun" },
  football: { min: 0, max: 2, label: "Football (until EPL)" },
  radarUseful: { min: 3, max: 6, label: "Radar/value useful" },
} as const satisfies Record<string, Norm>;

export type LaneId = keyof typeof LANE_TARGETS;

const SOLANA_RE =
  /\b(solana|\bsol\b|\$sol|jupiter|raydium|meteora|pump\.fun|jito|kamino|drift|axiom|gmgn|helius|phantom|orca|tensor|fees?\b|dex vol|tvl|llama)\b/i;
const STONK_RE = /\b(stonk|stonkfun|launchonsf|paybox|sf\b)\b/i;
const RADAR_VALUE_RE =
  /\b(useful|scorecard|teardown|map of|leaderboard|defillama|fees|revenue|pnl|receipts|data as of)\b/i;

export function detectLanes(log: Pick<LogEntry, "note" | "id" | "type" | "bucket" | "traits">): LaneId[] {
  const blob = `${log.note ?? ""} ${log.id ?? ""} ${(log.traits ?? []).join(" ")}`;
  const lanes: LaneId[] = [];
  if (STONK_RE.test(blob)) lanes.push("stonkfun");
  if (SOLANA_RE.test(blob) || lanes.includes("stonkfun")) lanes.push("solana");
  if (log.bucket === "football") lanes.push("football");
  if (
    log.type === "useful" ||
    (log.traits ?? []).includes("useful") ||
    RADAR_VALUE_RE.test(blob)
  ) {
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
