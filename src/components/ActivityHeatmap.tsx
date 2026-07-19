"use client";

import { normTypes } from "@/lib/traits";
import type { ContentType, LogEntry } from "@/lib/types";
import { dayKey } from "@/lib/week";

interface ActivityHeatmapProps {
  logs: LogEntry[];
  type?: ContentType;
}

const WEEKS = 12;

function level(count: number): number {
  if (count === 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  if (count <= 4) return 3;
  return 4;
}

const LEVEL_CLASS = [
  "bg-zinc-800/80",
  "bg-violet-900/80",
  "bg-violet-700/80",
  "bg-violet-500/80",
  "bg-fuchsia-400/90",
];

export function ActivityHeatmap({ logs, type }: ActivityHeatmapProps) {
  const now = new Date();
  const counts = new Map<string, number>();

  for (const log of logs) {
    if (type && !normTypes(log).includes(type)) continue;
    const key = dayKey(log.at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const cells: { key: string; count: number }[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - i),
    );
    const key = d.toISOString().slice(0, 10);
    cells.push({ key, count: counts.get(key) ?? 0 });
  }

  return (
    <div className="mt-3 w-full min-w-0">
      <div className="flex w-full gap-px">
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.key}: ${c.count} post(s)`}
            className={`h-2.5 min-w-0 flex-1 rounded-sm ${LEVEL_CLASS[level(c.count)]}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-600">останні {WEEKS} тижнів</p>
    </div>
  );
}
