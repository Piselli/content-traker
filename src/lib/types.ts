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

export interface LogEntry {
  id: string;
  type: ContentType;
  at: string;
  tweetUrl?: string;
  views?: number;
  likes?: number;
  note?: string;
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
  views?: number;
  likes?: number;
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
