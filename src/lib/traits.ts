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

type LogShape = Pick<LogEntry, "type" | "fullTypes" | "traits" | "secondaryType">;

/** Types that count toward weekly norms — 1 or 2 when post fully hits both */
export function normTypes(log: LogShape): ContentType[] {
  if (log.fullTypes && log.fullTypes.length > 0) {
    return [...new Set(log.fullTypes)];
  }
  return [log.type];
}

/** Supplementary angles — visible in UI, do not move norm bars */
export function comboTraits(log: LogShape): ContentType[] {
  const norms = new Set(normTypes(log));
  const extras = [...(log.traits ?? [])];
  if (
    log.secondaryType &&
    !norms.has(log.secondaryType) &&
    !extras.includes(log.secondaryType)
  ) {
    extras.push(log.secondaryType);
  }
  return extras.filter((t) => !norms.has(t));
}

/** All badges for journal / analytics */
export function allDisplayTypes(log: LogShape): ContentType[] {
  return [...normTypes(log), ...comboTraits(log)];
}

/** @deprecated use allDisplayTypes */
export function allTraits(log: LogShape): ContentType[] {
  return allDisplayTypes(log);
}

export function logCountsForNorm(
  log: LogShape,
  type: ContentType,
): "lead" | "dual" | "combo" | false {
  const norms = normTypes(log);
  if (!norms.includes(type)) {
    return comboTraits(log).includes(type) ? "combo" : false;
  }
  if (log.type === type) return norms.length > 1 ? "dual" : "lead";
  return "dual";
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
    if (log.classificationPending) continue;
    for (const type of normTypes(log)) {
      counts[type].primary += 1;
      counts[type].total += 1;
    }
    for (const type of comboTraits(log)) {
      counts[type].viaTraits += 1;
      counts[type].total += 1;
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

export function normalizeLogEntry(log: LogEntry): LogEntry {
  const legacyTrait =
    log.secondaryType && log.secondaryType !== log.type ? [log.secondaryType] : [];
  const mergedTraits = [...new Set([...(log.traits ?? []), ...legacyTrait])];

  let fullTypes = log.fullTypes ? [...new Set(log.fullTypes)] : undefined;
  if (fullTypes && !fullTypes.includes(log.type)) {
    fullTypes = [log.type, ...fullTypes];
  }

  const normSet = new Set(fullTypes ?? [log.type]);
  const traits = mergedTraits.filter((t) => !normSet.has(t));

  return {
    ...log,
    fullTypes: fullTypes && fullTypes.length > 1 ? fullTypes : undefined,
    traits: traits.length > 0 ? traits : undefined,
    secondaryType: undefined,
  };
}

/** @deprecated use normalizeLogEntry */
export function normalizeLogTraits(log: LogEntry): LogEntry {
  return normalizeLogEntry(log);
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
