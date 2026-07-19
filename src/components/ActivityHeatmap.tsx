"use client";

import { normTypes } from "@/lib/traits";
import type { ContentType, LogEntry } from "@/lib/types";
import { dayKey } from "@/lib/week";

interface ActivityHeatmapProps {
  logs: LogEntry[];
  type?: ContentType;
}

const WEEKS = 12;
const MS_DAY = 86_400_000;

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

function utcDayStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function ActivityHeatmap({ logs, type }: ActivityHeatmapProps) {
  const now = utcDayStart(new Date());
  const counts = new Map<string, number>();
  let earliest: Date | null = null;

  for (const log of logs) {
    if (type && !normTypes(log).includes(type)) continue;
    const key = dayKey(log.at);
    counts.set(key, (counts.get(key) ?? 0) + 1);
    const d = utcDayStart(new Date(`${key}T00:00:00.000Z`));
    if (!earliest || d < earliest) earliest = d;
  }

  // Left edge = first day with posts (or today), never older than 12 weeks.
  const windowStart = new Date(now.getTime() - (WEEKS * 7 - 1) * MS_DAY);
  const start = earliest && earliest > windowStart ? earliest : windowStart;

  // Left → right: first day … today (new day appends on the right).
  const cells: { key: string; count: number }[] = [];
  for (let t = start.getTime(); t <= now.getTime(); t += MS_DAY) {
    const key = new Date(t).toISOString().slice(0, 10);
    cells.push({ key, count: counts.get(key) ?? 0 });
  }

  return (
    <div className="mt-3 w-full min-w-0">
      <div className="flex w-full flex-wrap justify-start gap-[3px]">
        {cells.map((c) => (
          <div
            key={c.key}
            title={`${c.key}: ${c.count} post(s)`}
            className={`h-2.5 w-2.5 shrink-0 rounded-sm ${LEVEL_CLASS[level(c.count)]}`}
          />
        ))}
      </div>
      <p className="mt-1.5 text-[10px] text-zinc-600">
        перший день → сьогодні · до {WEEKS} тижнів
      </p>
    </div>
  );
}
