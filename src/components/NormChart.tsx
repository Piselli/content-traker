"use client";

import type { WeekAnalysis } from "@/lib/analysis";
import { NORMS } from "@/lib/norms";
import { TYPE_STYLES } from "@/lib/styles";
import { CONTENT_TYPES } from "@/lib/types";

interface NormChartProps {
  weekCounts: Partial<Record<(typeof CONTENT_TYPES)[number], number>>;
  analysis: WeekAnalysis;
}

function Trend({ current, prev, suffix = "" }: { current: number; prev: number; suffix?: string }) {
  if (prev === 0 && current === 0) return null;
  const diff = current - prev;
  if (diff === 0) return <span className="text-zinc-600"> →</span>;
  const up = diff > 0;
  return (
    <span className={up ? "text-emerald-400" : "text-red-400"}>
      {" "}
      {up ? "↑" : "↓"}
      {Math.abs(diff)}
      {suffix}
    </span>
  );
}

export function NormChart({ weekCounts, analysis }: NormChartProps) {
  const { weekComparison: cmp } = analysis;
  const max = Math.max(
    ...CONTENT_TYPES.map((t) => Math.max(weekCounts[t] ?? 0, NORMS[t].min ?? NORMS[t].max ?? 1)),
    1,
  );

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
          Норми цього тижня
        </h2>
        <p className="text-[10px] text-zinc-600">
          vs минулий: {cmp.posts} постів
          <Trend current={cmp.posts} prev={cmp.prevPosts} />
          {" · "}
          {cmp.avgViews}v
          <Trend current={cmp.avgViews} prev={cmp.prevAvgViews} />
          {" · "}
          {cmp.avgRepliesPer1k}/1k
          <Trend current={cmp.avgRepliesPer1k} prev={cmp.prevAvgRepliesPer1k} />
        </p>
      </div>
      <ul className="mt-4 space-y-2.5">
        {CONTENT_TYPES.map((type) => {
          const count = weekCounts[type] ?? 0;
          const norm = NORMS[type];
          const target = norm.min ?? norm.max ?? 1;
          const styles = TYPE_STYLES[type];
          return (
            <li key={type}>
              <div className="mb-1 flex justify-between text-[11px]">
                <span className={styles.accent}>{type}</span>
                <span className="tabular-nums text-zinc-500">
                  {count}/{norm.min != null && norm.max != null ? `${norm.min}–${norm.max}` : norm.min ?? `≤${norm.max}`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
                <div
                  className={`h-full rounded-full ${styles.dot} transition-all`}
                  style={{ width: `${(count / max) * 100}%` }}
                />
              </div>
              <div
                className="relative -mt-2 h-2"
                title={`target ${target}`}
              >
                <div
                  className="absolute top-0 h-full w-0.5 bg-zinc-500/60"
                  style={{ left: `${(target / max) * 100}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
