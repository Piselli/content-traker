"use client";

import { getNormStatus, NORMS } from "@/lib/norms";
import { CONTENT_TYPES } from "@/lib/types";
import type { ContentType } from "@/lib/types";

interface WeekSummaryProps {
  weekCounts: Partial<Record<ContentType, number>>;
}

export function WeekSummary({ weekCounts }: WeekSummaryProps) {
  const done = CONTENT_TYPES.filter((t) => {
    const count = weekCounts[t] ?? 0;
    return getNormStatus(count, NORMS[t]) === "done";
  }).length;

  const over = CONTENT_TYPES.filter((t) => {
    const count = weekCounts[t] ?? 0;
    return getNormStatus(count, NORMS[t]) === "over";
  }).length;

  return (
    <div className="flex flex-wrap gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm">
      <div>
        <span className="text-zinc-500">norms hit </span>
        <span className="font-semibold text-emerald-400">{done}</span>
        <span className="text-zinc-500"> / {CONTENT_TYPES.length}</span>
      </div>
      {over > 0 && (
        <div>
          <span className="text-zinc-500">over limit </span>
          <span className="font-semibold text-red-400">{over}</span>
        </div>
      )}
    </div>
  );
}
