import { CONTENT_TYPES, type ContentType, type LogEntry } from "./types";

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

/** Primary + extra traits, deduped. Norms use primary only. */
export function allTraits(log: Pick<LogEntry, "type" | "traits" | "secondaryType">): ContentType[] {
  const extras = log.traits ?? [];
  const legacy =
    log.secondaryType && log.secondaryType !== log.type ? [log.secondaryType] : [];
  const combined = [log.type, ...extras, ...legacy];
  return [...new Set(combined)];
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
