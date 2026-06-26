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
  /** Lead type — first badge, default Done target */
  type: ContentType;
  /** Auto-synced from X — excluded from norms until classified in chat */
  classificationPending?: boolean;
  /** Last metrics pull from sync-x script */
  syncedAt?: string;
  /** When 2 types are 100% (e.g. hot topic + meme) — both count toward norms */
  fullTypes?: ContentType[];
  /** Supplementary angles — combo only, not norm progress */
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
  fullTypes?: ContentType[];
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
