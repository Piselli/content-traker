import { matchBucket } from "./buckets";
import { CONTENT_TYPES, type ContentType, type PostSlot } from "./types";
import { parseTraitsList } from "./traits";
import { normalizeTweetUrl } from "./tweetUrl";

export interface ParsedTweetLog {
  type?: ContentType;
  fullTypes?: ContentType[];
  traits?: ContentType[];
  secondaryType?: ContentType;
  slot?: PostSlot;
  bucket?: ReturnType<typeof matchBucket>;
  tweetUrl?: string;
  ageHours?: number;
  views?: number;
  likes?: number;
  replies?: number;
  note?: string;
}

const TYPE_ALIASES: Record<string, ContentType> = {
  qt: "strategic QT",
  "strategic qt": "strategic QT",
  "hot topic": "hot topic",
  meta: "meta reach",
  "meta reach": "meta reach",
};

function matchContentType(raw: string): ContentType | undefined {
  const lower = raw.toLowerCase().trim();
  if (TYPE_ALIASES[lower]) return TYPE_ALIASES[lower];
  return CONTENT_TYPES.find(
    (t) => lower === t.toLowerCase() || lower.includes(t.toLowerCase()),
  );
}

function parseNumber(raw: string): number | undefined {
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

function parseMetricLine(line: string, out: ParsedTweetLog): void {
  const hours = line.match(/(?:hours?|age|agehours?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*h?\b/i);
  if (hours) out.ageHours = parseNumber(hours[1]);

  const views = line.match(/(?:views?|v)\s*[:=]?\s*(\d[\d,]*)\b/i);
  if (views) out.views = parseNumber(views[1]);

  const likes = line.match(/(?:likes?|♥)\s*[:=]?\s*(\d[\d,]*)\b/i);
  if (likes) out.likes = parseNumber(likes[1]);

  const replies = line.match(/(?:repl(?:y|ies)|comments?|↩)\s*[:=]?\s*(\d[\d,]*)\b/i);
  if (replies) out.replies = parseNumber(replies[1]);

  const compact = line.match(
    /(\d+(?:\.\d+)?)\s*h\s*[|·/]\s*(\d[\d,]*)\s*v?\s*[|·/]?\s*(\d[\d,]*)\s*(?:♥|likes?)?\s*(?:[|·/]\s*(\d[\d,]*)\s*(?:↩|repl(?:y|ies)?)?)?/i,
  );
  if (compact) {
    out.ageHours ??= parseNumber(compact[1]);
    out.views ??= parseNumber(compact[2]);
    out.likes ??= parseNumber(compact[3]);
    if (compact[4]) out.replies ??= parseNumber(compact[4]);
  }
}

function parseKeyValueLine(line: string, out: ParsedTweetLog): void {
  const kv = line.match(/^([\w\s]+)\s*[:=]\s*(.+)$/i);
  if (!kv) return;

  const key = kv[1].toLowerCase().trim();
  const value = kv[2].trim();

  if (key === "type" || key === "log") {
    out.type = matchContentType(value);
    return;
  }
  if (key === "secondary" || key === "secondarytype") {
    out.secondaryType = matchContentType(value);
    return;
  }
  if (key === "traits" || key === "trait") {
    const parsed = parseTraitsList(value);
    out.traits = [...new Set([...(out.traits ?? []), ...parsed])];
    return;
  }
  if (key === "fulltypes" || key === "full" || key === "dual") {
    out.fullTypes = parseTraitsList(value);
    return;
  }
  if (key === "also") {
    const parsed = parseTraitsList(value);
    if (parsed.length > 0) {
      out.traits = [...new Set([...(out.traits ?? []), ...parsed])];
    } else {
      const single = matchContentType(value);
      if (single) out.secondaryType = single;
    }
    return;
  }
  if (key === "url" || key === "tweet" || key === "tweeturl") {
    out.tweetUrl = normalizeTweetUrl(value) ?? value;
    return;
  }
  if (key === "hours" || key === "hour" || key === "agehours" || key === "age") {
    out.ageHours = parseNumber(value.replace(/h$/i, ""));
    return;
  }
  if (key === "views" || key === "view") {
    out.views = parseNumber(value);
    return;
  }
  if (key === "likes" || key === "like") {
    out.likes = parseNumber(value);
    return;
  }
  if (key === "replies" || key === "reply" || key === "comments") {
    out.replies = parseNumber(value);
    return;
  }
  if (key === "note") {
    out.note = value;
    return;
  }
  if (key === "slot") {
    const n = parseNumber(value);
    if (n === 1 || n === 2 || n === 3) out.slot = n;
    return;
  }
  if (key === "bucket") {
    out.bucket = matchBucket(value);
  }
}

function parseFromJson(raw: string): ParsedTweetLog | null {
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const out: ParsedTweetLog = {};
    if (typeof data.type === "string") out.type = matchContentType(data.type);
    if (typeof data.secondaryType === "string") {
      out.secondaryType = matchContentType(data.secondaryType);
    }
    if (typeof data.secondary === "string") {
      out.secondaryType = matchContentType(data.secondary);
    }
    if (Array.isArray(data.traits)) {
      out.traits = data.traits
        .filter((t): t is string => typeof t === "string")
        .map((t) => matchContentType(t))
        .filter((t): t is ContentType => t != null);
    }
    if (typeof data.traits === "string") {
      out.traits = parseTraitsList(data.traits);
    }
    if (Array.isArray(data.fullTypes)) {
      out.fullTypes = data.fullTypes
        .filter((t): t is string => typeof t === "string")
        .map((t) => matchContentType(t))
        .filter((t): t is ContentType => t != null);
    }
    if (typeof data.fullTypes === "string") {
      out.fullTypes = parseTraitsList(data.fullTypes);
    }
    if (typeof data.tweetUrl === "string") {
      out.tweetUrl = normalizeTweetUrl(data.tweetUrl) ?? data.tweetUrl;
    }
    if (typeof data.url === "string") {
      out.tweetUrl = normalizeTweetUrl(data.url) ?? data.url;
    }
    for (const key of ["ageHours", "hours", "views", "likes", "replies"] as const) {
      if (typeof data[key] === "number") {
        if (key === "hours") out.ageHours = data[key];
        else out[key] = data[key];
      }
    }
    if (typeof data.note === "string") out.note = data.note;
    if (typeof data.slot === "number" && [1, 2, 3].includes(data.slot)) {
      out.slot = data.slot as PostSlot;
    }
    if (typeof data.bucket === "string") out.bucket = matchBucket(data.bucket);
    return Object.keys(out).length > 0 ? out : null;
  } catch {
    return null;
  }
}

export function parseTweetLogPaste(raw: string): ParsedTweetLog {
  const trimmed = raw.trim();
  if (!trimmed) return {};

  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1] ?? trimmed;
  if (jsonBlock.startsWith("{")) {
    const fromJson = parseFromJson(jsonBlock);
    if (fromJson) return fromJson;
  }

  const out: ParsedTweetLog = {};
  const urlMatch = trimmed.match(/https?:\/\/(?:twitter\.com|x\.com)\/\S+/i);
  if (urlMatch) {
    out.tweetUrl = normalizeTweetUrl(urlMatch[0]) ?? urlMatch[0];
  }

  for (const line of trimmed.split("\n")) {
    const clean = line.trim();
    if (!clean || clean.startsWith("#")) continue;

    if (!out.type) {
      const typeFromLine =
        clean.match(/^type\s*[:=]\s*(.+)$/i)?.[1] ??
        (clean.match(/^LOG\b/i) ? undefined : clean);
      if (typeFromLine && !typeFromLine.startsWith("http")) {
        const matched = matchContentType(typeFromLine.replace(/^LOG\s*/i, ""));
        if (matched) out.type = matched;
      }
    }

    parseKeyValueLine(clean, out);
    parseMetricLine(clean, out);
  }

  return out;
}

export function parsedLogIsEmpty(parsed: ParsedTweetLog): boolean {
  return !parsed.type && !parsed.tweetUrl && !hasMetrics(parsed);
}

export function hasMetrics(parsed: Pick<ParsedTweetLog, "ageHours" | "views" | "likes" | "replies">): boolean {
  return (
    parsed.ageHours != null ||
    parsed.views != null ||
    parsed.likes != null ||
    parsed.replies != null
  );
}

export const PASTE_EXAMPLE = `LOG
type: strategic QT
traits: provocative, bait
slot: 2
bucket: CT
url: https://x.com/piselliii/status/123
hours: 4
views: 84
likes: 9
replies: 3`;
