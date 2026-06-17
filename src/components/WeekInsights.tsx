"use client";

import type { WeekAnalysis } from "@/lib/analysis";
import { TYPE_STYLES } from "@/lib/styles";

interface WeekInsightsProps {
  analysis: WeekAnalysis;
}

function tierClass(tier: string): string {
  switch (tier) {
    case "strong":
      return "text-emerald-400";
    case "ok":
      return "text-amber-400";
    case "weak":
      return "text-red-400";
    default:
      return "text-zinc-500";
  }
}

export function WeekInsights({ analysis }: WeekInsightsProps) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        Insights
      </h2>

      <ul className="mt-3 space-y-2">
        {analysis.insights.map((line) => (
          <li key={line} className="text-sm text-zinc-300">
            {line}
          </li>
        ))}
      </ul>

      {analysis.todayPriority.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Today priority types
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {analysis.todayPriority.map((type) => (
              <span
                key={type}
                className={`rounded-full border border-zinc-700 px-2 py-0.5 text-xs ${TYPE_STYLES[type].accent}`}
              >
                {type}
              </span>
            ))}
          </div>
        </div>
      )}

      {analysis.performers.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Performance (views / hour)
          </p>
          <ul className="mt-2 space-y-1.5">
            {analysis.performers.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-2 text-xs text-zinc-400"
              >
                <span className={`h-2 w-2 rounded-full ${TYPE_STYLES[p.type].dot}`} />
                <span className="text-zinc-300">
                  {p.type}
                  {p.traits?.map((t) => (
                    <span key={t} className="text-zinc-500">
                      {" "}
                      +{t}
                    </span>
                  ))}
                </span>
                <span>
                  {p.views}v @ {p.ageHours}h
                </span>
                <span className="tabular-nums">{p.viewsPerHour}/h</span>
                <span className={tierClass(p.tier)}>{p.tier}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.normGaps.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Norm gaps
          </p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            {analysis.normGaps.slice(0, 5).map((g) => (
              <li key={g.type}>
                <span className={TYPE_STYLES[g.type].accent}>{g.type}</span>{" "}
                {g.count}/{g.normLabel} · need +{g.needed}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
