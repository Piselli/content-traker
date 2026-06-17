import { CONTENT_TYPES, type ContentType, type LogEntry } from "./types";
import { isInWeek } from "./week";

export function parseTraitsList(raw: string): ContentType[] {
  const parts = raw.split(/[,+·|/]/).map((s) => s.trim()).filter(Boolean);
  const out: ContentType[] = [];
  for (const part of parts) {
    const matched = matchContentTypeToken(part);
    if (matched && !out.includes(matched)) out.push(matched);
  }
  return out;
}

function matchContentTypeToken(raw: string): ContentType | undefined {
  const lower = raw.toLowerCase().trim();
  const aliases: Record<string, ContentType> = {
    qt: "strategic QT",
    "strategic qt": "strategic QT",
    meta: "meta reach",
    "meta reach": "meta reach",
  };
  if (aliases[lower]) return aliases[lower];
  return CONTENT_TYPES.find(
    (t) => lower === t.toLowerCase() || lower.includes(t.toLowerCase()),
  );
}

/** All types this post hits — primary + traits, deduped. Used for badges & combo analytics. */
export function allTraits(log: Pick<LogEntry, "type" | "traits" | "secondaryType">): ContentType[] {
  const extras = log.traits ?? [];
  const legacy =
    log.secondaryType && log.secondaryType !== log.type ? [log.secondaryType] : [];
  const combined = [log.type, ...extras, ...legacy];
  return [...new Set(combined)];
}

export function logHasType(
  log: Pick<LogEntry, "type" | "traits" | "secondaryType">,
  type: ContentType,
): boolean {
  return allTraits(log).includes(type);
}

export interface TypeWeekBreakdown {
  total: number;
  primary: number;
  viaTraits: number;
}

export function countWeekBreakdown(
  logs: LogEntry[],
  now = new Date(),
): Record<ContentType, TypeWeekBreakdown> {
  const counts = {} as Record<ContentType, TypeWeekBreakdown>;
  for (const type of CONTENT_TYPES) {
    counts[type] = { total: 0, primary: 0, viaTraits: 0 };
  }
  for (const log of logs) {
    if (!isInWeek(log.at, now)) continue;
    for (const type of allTraits(log)) {
      counts[type].total += 1;
      if (log.type === type) counts[type].primary += 1;
      else counts[type].viaTraits += 1;
    }
  }
  return counts;
}

export function weekCountsFromBreakdown(
  breakdown: Record<ContentType, TypeWeekBreakdown>,
): Record<ContentType, number> {
  const counts = {} as Record<ContentType, number>;
  for (const type of CONTENT_TYPES) {
    counts[type] = breakdown[type].primary;
  }
  return counts;
}

export function weekComboFromBreakdown(
  breakdown: Record<ContentType, TypeWeekBreakdown>,
): Record<ContentType, number> {
  const counts = {} as Record<ContentType, number>;
  for (const type of CONTENT_TYPES) {
    counts[type] = breakdown[type].viaTraits;
  }
  return counts;
}

export function normalizeLogTraits(log: LogEntry): LogEntry {
  const merged = allTraits(log);
  const traits = merged.filter((t) => t !== log.type);
  return {
    ...log,
    traits: traits.length > 0 ? traits : undefined,
    secondaryType: undefined,
  };
}

export function mergeTraitLists(a: ContentType[] | undefined, b: ContentType[] | undefined): ContentType[] | undefined {
  const merged = [...new Set([...(a ?? []), ...(b ?? [])])];
  return merged.length > 0 ? merged : undefined;
}

/** Common slot combos — topic + format pairings for reach */
export const SLOT_COMBOS: ContentType[][] = [
  ["hot topic", "bait"],
  ["hot topic", "meme"],
  ["bait", "provocative"],
  ["hot topic", "provocative"],
  ["strategic QT", "provocative"],
  ["hot topic", "strategic QT"],
  ["meme", "hot topic"],
  ["useful", "hot topic"],
];
