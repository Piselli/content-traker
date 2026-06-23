import type { AppData, Idea, LogEntry } from "./types";
import { normalizeLogEntry } from "./traits";
import { extractTweetId } from "./tweetUrl";

export interface RepoData extends AppData {
  syncVersion?: number;
  updatedAt?: string;
  /** Tweet URLs removed from tracker — local copies must not resurrect on merge */
  deletedUrls?: string[];
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
  const aNorm = normalizeLogEntry(a);
  const bNorm = normalizeLogEntry(b);
  const aTime = Date.parse(aNorm.updatedAt ?? aNorm.at);
  const bTime = Date.parse(bNorm.updatedAt ?? bNorm.at);
  const newer = bTime >= aTime ? bNorm : aNorm;
  const older = newer === bNorm ? aNorm : bNorm;

  return normalizeLogEntry({
    ...newer,
    fullTypes: newer.fullTypes,
    traits: newer.traits,
    snapshots: mergeSnapshots(older.snapshots, newer.snapshots),
  });
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

export function mergeAppData(local: AppData, remote: RepoData): AppData {
  const deletedIds = new Set(
    (remote.deletedUrls ?? [])
      .map((url) => extractTweetId(url))
      .filter((id): id is string => !!id),
  );

  const isDeleted = (log: LogEntry): boolean => {
    const id = log.tweetUrl ? extractTweetId(log.tweetUrl) : null;
    return !!id && deletedIds.has(id);
  };

  const byKey = new Map<string, LogEntry>();

  for (const log of remote.logs) {
    if (isDeleted(log)) continue;
    byKey.set(logKey(log), normalizeLogEntry(log));
  }
  for (const log of local.logs) {
    if (isDeleted(log)) continue;
    const key = logKey(log);
    const existing = byKey.get(key);
    byKey.set(key, existing ? mergeLogEntry(existing, log) : normalizeLogEntry(log));
  }

  const logs = [...byKey.values()].sort(
    (a, b) => Date.parse(b.at) - Date.parse(a.at),
  );

  return {
    logs,
    ideas: mergeIdeas(local.ideas, remote.ideas),
  };
}
