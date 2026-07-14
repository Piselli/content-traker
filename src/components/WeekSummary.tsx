"use client";

import { getNormStatus, NORMS } from "@/lib/norms";
import type { WeekAnalysis } from "@/lib/analysis";
import { CONTENT_TYPES } from "@/lib/types";

interface WeekSummaryProps {
  weekCounts: Partial<Record<(typeof CONTENT_TYPES)[number], number>>;
  analysis: WeekAnalysis;
}

export function WeekSummary({ weekCounts, analysis }: WeekSummaryProps) {
  const { disciplineScore, disciplineTotal, postsToday, streaks } = analysis;
  const pct = Math.round((disciplineScore / disciplineTotal) * 100);

  const over = CONTENT_TYPES.filter((t) => {
    const count = weekCounts[t] ?? 0;
    return getNormStatus(count, NORMS[t]) === "over";
  }).length;

  const inRange = disciplineScore - over;

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/80 to-zinc-900/90 p-5">
        <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-violet-500/10 blur-2xl" />
        <p className="text-[10px] font-medium uppercase tracking-widest text-violet-300/80">
          Дисципліна
        </p>
        <div className="mt-2 flex items-end gap-2">
          <span className="text-4xl font-bold tabular-nums text-violet-100">
            {disciplineScore}
          </span>
          <span className="mb-1 text-lg text-violet-300/60">/ {disciplineTotal}</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-violet-950">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-400 transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-2 text-xs text-violet-200/60">норми закрито цього тижня</p>
        {streaks.disciplineWeeks > 0 && (
          <p className="mt-1 text-xs text-violet-300/70">
            {streaks.disciplineWeeks} тижн. дисципліни поспіль (6+/8)
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Сьогодні
        </p>
        <p className="mt-2 text-4xl font-bold tabular-nums text-zinc-100">{postsToday}</p>
        <p className="mt-2 text-xs text-zinc-500">постів залоговано</p>
        {streaks.postingDays > 0 && (
          <p className="mt-2 text-xs text-amber-400/90">
            🔥 {streaks.postingDays} дн. поспіль
          </p>
        )}
        {analysis.nextSlot.slot <= 3 && (
          <p className="mt-3 text-xs text-zinc-400">
            Наступний слот:{" "}
            <span className="font-medium text-zinc-200">#{analysis.nextSlot.slot}</span>
          </p>
        )}
      </div>

      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-5 backdrop-blur">
        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
          Статус
        </p>
        <div className="mt-3 flex flex-col gap-2 text-sm">
          <div>
            <span className="text-emerald-400 font-semibold">{disciplineScore}</span>
            <span className="text-zinc-500"> закрито</span>
          </div>
          {over > 0 && (
            <div className="text-xs text-zinc-500">
              {inRange} в нормі ·{" "}
              <span className="text-red-400">{over} over</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
