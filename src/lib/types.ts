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
  type: ContentType;
  at: string;
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
}
