"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { NORMS } from "@/lib/norms";
import { getNormStatus } from "@/lib/norms";
import { exportJson, importJson, loadData, saveData } from "@/lib/storage";
import type {
  AppData,
  ContentType,
  Idea,
  LogEntry,
  LogOptions,
  TrackerExport,
} from "@/lib/types";
import { CONTENT_TYPES } from "@/lib/types";
import { isInWeek, weekRangeLabel } from "@/lib/week";

function createEntry(type: ContentType, opts?: LogOptions): LogEntry {
  return {
    id: crypto.randomUUID(),
    type,
    at: new Date().toISOString(),
    tweetUrl: opts?.tweetUrl?.trim() || undefined,
    views: opts?.views,
    likes: opts?.likes,
    note: opts?.note?.trim() || undefined,
  };
}

export function useTracker() {
  const [data, setData] = useState<AppData>({ logs: [], ideas: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setData(loadData());
    setReady(true);
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
      const idx = prev.logs.findIndex((l) => l.type === type);
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
    (id: string, patch: Partial<Pick<LogEntry, "tweetUrl" | "views" | "likes" | "note">>) => {
      setData((prev) => {
        const logs = prev.logs.map((l) =>
          l.id === id
            ? {
                ...l,
                ...patch,
                tweetUrl: patch.tweetUrl?.trim() || l.tweetUrl,
                note: patch.note?.trim() || l.note,
              }
            : l,
        );
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

  const weekCounts = useMemo(() => {
    const now = new Date();
    const counts = {} as Record<ContentType, number>;
    for (const log of data.logs) {
      if (isInWeek(log.at, now)) {
        counts[log.type] = (counts[log.type] ?? 0) + 1;
      }
    }
    return counts;
  }, [data.logs]);

  const buildJarvisExport = useCallback((): TrackerExport => {
    const now = new Date();
    const logsThisWeek = data.logs.filter((l) => isInWeek(l.at, now));
    const normsHit = CONTENT_TYPES.filter((t) => {
      const count = logsThisWeek.filter((l) => l.type === t).length;
      return getNormStatus(count, NORMS[t]) === "done";
    }).length;

    const counts = {} as Partial<Record<ContentType, number>>;
    for (const t of CONTENT_TYPES) {
      counts[t] = logsThisWeek.filter((l) => l.type === t).length;
    }

    return {
      exportedAt: now.toISOString(),
      weekRange: weekRangeLabel(now),
      weekCounts: counts,
      normsHit,
      logsThisWeek,
      ideas: data.ideas,
    };
  }, [data]);

  const exportBackup = useCallback(() => exportJson(data), [data]);

  const exportForJarvis = useCallback(
    () => JSON.stringify(buildJarvisExport(), null, 2),
    [buildJarvisExport],
  );

  const restoreBackup = useCallback((raw: string) => {
    persist(importJson(raw));
  }, [persist]);

  return {
    ready,
    data,
    weekCounts,
    logDone,
    undoLast,
    removeLog,
    updateLog,
    addIdea,
    removeIdea,
    exportBackup,
    exportForJarvis,
    restoreBackup,
  };
}
