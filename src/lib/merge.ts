import type { AppData, Idea, LogEntry } from "./types";
import { extractTweetId } from "./tweetUrl";

export interface RepoData extends AppData {
  syncVersion?: number;
  updatedAt?: string;
}

function logKey(log: LogEntry): string {
  const id = log.tweetUrl ? extractTweetId(log.tweetUrl) : null;
  if (id) return `url:${id}`;
  return `id:${log.id}`;
}

function mergeSnapshots(a?: LogEntry["snapshots"], b?: LogEntry["snapshots"]) {
  const combined = [...(a ?? []), ...(b ?? [])];
  if (combined.length === 0) return undefined;
  const seen = new Set<string>();
  return combined.filter((s) => {
    const key = `${s.ageHours}-${s.views}-${s.checkedAt}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeLogEntry(a: LogEntry, b: LogEntry): LogEntry {
  const aTime = Date.parse(a.updatedAt ?? a.at);
  const bTime = Date.parse(b.updatedAt ?? b.at);
  const newer = bTime >= aTime ? b : a;
  const older = newer === b ? a : b;

  return {
    ...newer,
    secondaryType: newer.secondaryType ?? older.secondaryType,
    snapshots: mergeSnapshots(older.snapshots, newer.snapshots),
  };
}

function mergeIdeas(local: Idea[], remote: Idea[]): Idea[] {
  const byId = new Map<string, Idea>();
  for (const idea of remote) byId.set(idea.id, idea);
  for (const idea of local) {
    if (!byId.has(idea.id)) byId.set(idea.id, idea);
  }
  return [...byId.values()].sort(
    (x, y) => Date.parse(y.createdAt) - Date.parse(x.createdAt),
  );
}

export function mergeAppData(local: AppData, remote: AppData): AppData {
  const byKey = new Map<string, LogEntry>();

  for (const log of remote.logs) {
    byKey.set(logKey(log), log);
  }
  for (const log of local.logs) {
    const key = logKey(log);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeLogEntry(existing, log) : log);
  }

  const logs = [...byKey.values()].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );

  return {
    logs,
    ideas: mergeIdeas(local.ideas, remote.ideas),
  };
}
