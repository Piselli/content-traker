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
  comboCount: number;
  logs: LogEntry[];
  onDone: () => void;
  onUndo: () => void;
}

export function HabitCard({
  type,
  count,
  comboCount,
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
      className={`group flex flex-col gap-3 rounded-2xl border border-zinc-800/90 bg-zinc-900/70 p-4 transition-all hover:border-zinc-700 ${styles.glow}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className={`text-sm font-semibold ${styles.accent}`}>{norm.label}</p>
          <p className="mt-0.5 text-[11px] text-zinc-500">norm {normLabel(norm)}</p>
        </div>
        {status === "done" && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
            ✓
          </span>
        )}
        {status === "over" && (
          <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-medium text-red-400">
            over
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-2xl font-bold tabular-nums tracking-tight text-zinc-50">
            {countLabel}
          </span>
          {comboCount > 0 && (
            <p className="mt-0.5 text-[10px] text-violet-400/80">
              +{comboCount} combo
            </p>
          )}
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={count === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700/80 text-zinc-400 transition hover:bg-zinc-800 disabled:opacity-25"
            title="Скасувати останній primary"
          >
            −
          </button>
        </div>
      </div>

      <div className="h-1 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${progressPercent(count, norm)}%` }}
        />
      </div>

      <div className="flex gap-1">
        {dots.map((active, i) => (
          <div
            key={dayKeys[i]}
            className={`h-1.5 flex-1 rounded-full transition-colors ${active ? styles.dot : "bg-zinc-800"}`}
            title={dayKeys[i]}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={onDone}
        className="mt-1 w-full rounded-xl bg-zinc-100 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-white active:scale-[0.98]"
      >
        Done
      </button>
    </div>
  );
}
