import type { Bucket } from "./buckets";

export const CONTENT_TYPES = [
  "hot topic",
  "meme",
  "useful",
  "bait",
  "provocative",
  "strategic QT",
  "builder",
  "meta reach",
] as const;

export type ContentType = (typeof CONTENT_TYPES)[number];

export type PostSlot = 1 | 2 | 3;

export interface Norm {
  min?: number;
  max?: number;
  label: string;
}

export interface MetricSnapshot {
  ageHours: number;
  views?: number;
  likes?: number;
  replies?: number;
  checkedAt: string;
}

export interface LogEntry {
  id: string;
  /** Primary type — one Done click, counts toward norms */
  type: ContentType;
  /** Extra traits this post also hits (hot topic + bait, QT + provocative, etc.) */
  traits?: ContentType[];
  /** @deprecated migrated to traits on load */
  secondaryType?: ContentType;
  slot?: PostSlot;
  bucket?: Bucket;
  at: string;
  updatedAt?: string;
  tweetUrl?: string;
  ageHours?: number;
  views?: number;
  likes?: number;
  replies?: number;
  note?: string;
  snapshots?: MetricSnapshot[];
}

export interface Idea {
  id: string;
  text: string;
  type?: ContentType;
  createdAt: string;
}

export interface AppData {
  logs: LogEntry[];
  ideas: Idea[];
}

export interface LogOptions {
  count?: number;
  traits?: ContentType[];
  secondaryType?: ContentType;
  slot?: PostSlot;
  bucket?: Bucket;
  tweetUrl?: string;
  ageHours?: number;
  views?: number;
  likes?: number;
  replies?: number;
  note?: string;
}

export interface TrackerExport {
  exportedAt: string;
  weekRange: string;
  weekCounts: Partial<Record<ContentType, number>>;
  normsHit: number;
  logsThisWeek: LogEntry[];
  ideas: Idea[];
  analysis?: import("./analysis").WeekAnalysis;
}
