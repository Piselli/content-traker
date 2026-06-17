"use client";

import {
  getNormStatus,
  normLabel,
  NORMS,
  progressPercent,
} from "@/lib/norms";
import { TYPE_STYLES } from "@/lib/styles";
import type { ContentType, LogEntry } from "@/lib/types";
import { dayKey, last7DayKeys } from "@/lib/week";

interface HabitCardProps {
  type: ContentType;
  count: number;
  logs: LogEntry[];
  onDone: () => void;
  onUndo: () => void;
}

export function HabitCard({
  type,
  count,
  logs,
  onDone,
  onUndo,
}: HabitCardProps) {
  const norm = NORMS[type];
  const status = getNormStatus(count, norm);
  const styles = TYPE_STYLES[type];
  const now = new Date();
  const dayKeys = last7DayKeys(now);

  const dots = dayKeys.map((key) =>
    logs.some((l) => l.type === type && dayKey(l.at) === key),
  );

  const countLabel =
    norm.min != null && norm.max != null
      ? `${count}/${norm.min}–${norm.max}`
      : norm.min != null
        ? `${count}/${norm.min}`
        : `${count}/${norm.max}`;

  const barColor =
    status === "done"
      ? "bg-emerald-500"
      : status === "over"
        ? "bg-red-500"
        : styles.dot;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors ${styles.glow}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-medium ${styles.accent}`}>{norm.label}</p>
          <p className="mt-0.5 text-xs text-zinc-500">norm {normLabel(norm)}</p>
        </div>
        {status === "done" && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            ✓ norm
          </span>
        )}
        {status === "over" && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
            over
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold tabular-nums text-zinc-100">
          {countLabel}
        </span>
        <span className="text-xs text-zinc-500">this week</span>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${progressPercent(count, norm)}%` }}
        />
      </div>

      <div className="flex gap-1">
        {dots.map((active, i) => (
          <div
            key={dayKeys[i]}
            className={`h-2 w-2 rounded-sm ${active ? styles.dot : "bg-zinc-800"}`}
            title={dayKeys[i]}
          />
        ))}
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
        >
          Done
        </button>
        {count > 0 && (
          <button
            type="button"
            onClick={onUndo}
            className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
            title="Undo last"
          >
            Undo
          </button>
        )}
      </div>
    </div>
  );
}
