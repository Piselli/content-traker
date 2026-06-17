"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { buildWeekAnalysis } from "@/lib/analysis";
import { NORMS } from "@/lib/norms";
import { getNormStatus } from "@/lib/norms";
import { exportJson, importJson, loadData, mergeRepoFromUrl, saveData } from "@/lib/storage";
import { normalizeLogTraits, countWeekBreakdown, weekCountsFromBreakdown, logHasType } from "@/lib/traits";
import type {
  AppData,
  ContentType,
  Idea,
  LogEntry,
  LogOptions,
  TrackerExport,
} from "@/lib/types";
import { CONTENT_TYPES } from "@/lib/types";
import { tweetUrlsMatch } from "@/lib/tweetUrl";
import { isInWeek, weekRangeLabel } from "@/lib/week";

function hasMetrics(entry: Pick<LogEntry, "ageHours" | "views" | "likes" | "replies">): boolean {
  return (
    entry.ageHours != null ||
    entry.views != null ||
    entry.likes != null ||
    entry.replies != null
  );
}

function resolveTraits(type: ContentType, opts?: LogOptions): ContentType[] | undefined {
  const traits = [...(opts?.traits ?? [])];
  if (
    opts?.secondaryType &&
    opts.secondaryType !== type &&
    !traits.includes(opts.secondaryType)
  ) {
    traits.push(opts.secondaryType);
  }
  return traits.length > 0 ? traits : undefined;
}

function createEntry(type: ContentType, opts?: LogOptions): LogEntry {
  const now = new Date().toISOString();
  return normalizeLogTraits({
    id: crypto.randomUUID(),
    type,
    traits: resolveTraits(type, opts),
    slot: opts?.slot,
    bucket: opts?.bucket,
    at: now,
    updatedAt: now,
    tweetUrl: opts?.tweetUrl?.trim() || undefined,
    ageHours: opts?.ageHours,
    views: opts?.views,
    likes: opts?.likes,
    replies: opts?.replies,
    note: opts?.note?.trim() || undefined,
  });
}

export function useTracker() {
  const [data, setData] = useState<AppData>({ logs: [], ideas: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const local = loadData();
    setData(local);
    mergeRepoFromUrl()
      .then((merged) => {
        if (merged) {
          setData(merged);
          saveData(merged);
        }
      })
      .finally(() => setReady(true));
  }, []);

  const persist = useCallback((next: AppData) => {
    setData(next);
    saveData(next);
  }, []);

  const logDone = useCallback((type: ContentType, opts?: LogOptions) => {
    const count = Math.max(1, Math.min(20, opts?.count ?? 1));
    const entries = Array.from({ length: count }, () => createEntry(type, opts));
    setData((prev) => {
      const next = { ...prev, logs: [...entries, ...prev.logs] };
      saveData(next);
      return next;
    });
  }, []);

  const undoLast = useCallback((type: ContentType) => {
    setData((prev) => {
      const idx = prev.logs.findIndex((l) => logHasType(l, type));
      if (idx === -1) return prev;
      const logs = [...prev.logs];
      logs.splice(idx, 1);
      const next = { ...prev, logs };
      saveData(next);
      return next;
    });
  }, []);

  const removeLog = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, logs: prev.logs.filter((l) => l.id !== id) };
      saveData(next);
      return next;
    });
  }, []);

  const updateLog = useCallback(
    (
      id: string,
      patch: Partial<
        Pick<
          LogEntry,
          "tweetUrl" | "ageHours" | "views" | "likes" | "replies" | "note" | "traits" | "slot" | "bucket"
        >
      >,
    ) => {
      setData((prev) => {
        const logs = prev.logs.map((l) => {
          if (l.id !== id) return l;

          const metricsPatch =
            patch.ageHours !== undefined ||
            patch.views !== undefined ||
            patch.likes !== undefined ||
            patch.replies !== undefined;

          const snapshots = [...(l.snapshots ?? [])];
          if (metricsPatch && hasMetrics(l)) {
            snapshots.unshift({
              ageHours: l.ageHours ?? 0,
              views: l.views,
              likes: l.likes,
              replies: l.replies,
              checkedAt: new Date().toISOString(),
            });
          }

          return {
            ...l,
            ...patch,
            updatedAt: new Date().toISOString(),
            tweetUrl: patch.tweetUrl !== undefined ? patch.tweetUrl.trim() || undefined : l.tweetUrl,
            note: patch.note !== undefined ? patch.note.trim() || undefined : l.note,
            snapshots: snapshots.length > 0 ? snapshots : undefined,
          };
        });
        const next = { ...prev, logs };
        saveData(next);
        return next;
      });
    },
    [],
  );

  const addIdea = useCallback((text: string, type?: ContentType) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const idea: Idea = {
      id: crypto.randomUUID(),
      text: trimmed,
      type,
      createdAt: new Date().toISOString(),
    };
    setData((prev) => {
      const next = { ...prev, ideas: [idea, ...prev.ideas] };
      saveData(next);
      return next;
    });
  }, []);

  const removeIdea = useCallback((id: string) => {
    setData((prev) => {
      const next = { ...prev, ideas: prev.ideas.filter((i) => i.id !== id) };
      saveData(next);
      return next;
    });
  }, []);

  const weekBreakdown = useMemo(() => countWeekBreakdown(data.logs), [data.logs]);

  const weekCounts = useMemo(
    () => weekCountsFromBreakdown(weekBreakdown),
    [weekBreakdown],
  );

  const upsertLog = useCallback(
    (type: ContentType, opts?: LogOptions): "created" | "updated" => {
      const url = opts?.tweetUrl?.trim();
      if (url) {
        const existing = data.logs.find(
          (l) => l.tweetUrl && tweetUrlsMatch(l.tweetUrl, url),
        );
        if (existing) {
          const patch: Partial<
            Pick<
              LogEntry,
              "tweetUrl" | "ageHours" | "views" | "likes" | "replies" | "note" | "traits" | "slot" | "bucket"
            >
          > = { tweetUrl: url };
          if (opts?.ageHours != null) patch.ageHours = opts.ageHours;
          if (opts?.views != null) patch.views = opts.views;
          if (opts?.likes != null) patch.likes = opts.likes;
          if (opts?.replies != null) patch.replies = opts.replies;
          if (opts?.note != null) patch.note = opts.note;
          if (opts?.slot != null) patch.slot = opts.slot;
          if (opts?.bucket != null) patch.bucket = opts.bucket;
          if (opts?.traits != null) {
            patch.traits = opts.traits.filter((t) => t !== existing.type);
          } else if (opts?.secondaryType != null) {
            patch.traits = resolveTraits(existing.type, opts);
          }
          updateLog(existing.id, patch);
          return "updated";
        }
      }

      logDone(type, opts);
      return "created";
    },
    [data.logs, logDone, updateLog],
  );

  const weekAnalysis = useMemo(
    () => buildWeekAnalysis(data.logs, weekCounts),
    [data.logs, weekCounts],
  );

  const buildJarvisExport = useCallback((): TrackerExport => {
    const now = new Date();
    const logsThisWeek = data.logs.filter((l) => isInWeek(l.at, now));
    const normsHit = CONTENT_TYPES.filter((t) => {
      const count = weekCounts[t] ?? 0;
      return getNormStatus(count, NORMS[t]) === "done";
    }).length;

    const counts = {} as Partial<Record<ContentType, number>>;
    for (const t of CONTENT_TYPES) {
      counts[t] = weekCounts[t] ?? 0;
    }

    return {
      exportedAt: now.toISOString(),
      weekRange: weekRangeLabel(now),
      weekCounts: counts,
      normsHit,
      logsThisWeek,
      ideas: data.ideas,
      analysis: buildWeekAnalysis(data.logs, weekCounts as Record<ContentType, number>, now),
    };
  }, [data, weekCounts]);

  const exportBackup = useCallback(() => exportJson(data), [data]);

  const exportForJarvis = useCallback(
    () => JSON.stringify(buildJarvisExport(), null, 2),
    [buildJarvisExport],
  );

  const restoreBackup = useCallback((raw: string) => {
    persist(importJson(raw));
  }, [persist]);

  const copyForJarvis = useCallback(async () => {
    const payload = JSON.stringify(buildJarvisExport(), null, 2);
    await navigator.clipboard.writeText(payload);
    return payload;
  }, [buildJarvisExport]);

  return {
    ready,
    data,
    weekCounts,
    weekBreakdown,
    weekAnalysis,
    logDone,
    upsertLog,
    undoLast,
    removeLog,
    updateLog,
    addIdea,
    removeIdea,
    exportBackup,
    exportForJarvis,
    copyForJarvis,
    restoreBackup,
  };
}
