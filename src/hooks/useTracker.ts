"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { exportJson, importJson, loadData, saveData } from "@/lib/storage";
import type { AppData, ContentType, Idea, LogEntry } from "@/lib/types";
import { isInWeek } from "@/lib/week";

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

  const logDone = useCallback((type: ContentType) => {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      type,
      at: new Date().toISOString(),
    };
    setData((prev) => {
      const next = { ...prev, logs: [entry, ...prev.logs] };
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

  const exportBackup = useCallback(() => exportJson(data), [data]);

  const restoreBackup = useCallback((raw: string) => {
    persist(importJson(raw));
  }, [persist]);

  return {
    ready,
    data,
    weekCounts,
    logDone,
    undoLast,
    addIdea,
    removeIdea,
    exportBackup,
    restoreBackup,
  };
}
