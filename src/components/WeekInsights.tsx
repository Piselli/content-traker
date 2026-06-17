"use client";

import type { WeekAnalysis } from "@/lib/analysis";
import { formatRate } from "@/lib/engagement";
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

function tierLabel(tier: string): string {
  switch (tier) {
    case "strong":
      return "сильно";
    case "ok":
      return "норм";
    case "weak":
      return "слабо";
    default:
      return tier;
  }
}

const BUCKET_LABELS: Record<string, string> = {
  CT: "CT + crypto",
  football: "Футбол",
  humor: "Humor / meme",
  builder: "Builder",
};

export function WeekInsights({ analysis }: WeekInsightsProps) {
  const { nextSlot } = analysis;

  return (
    <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-5 backdrop-blur">
      <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
        Аналітика
      </h2>

      <div className="mt-4 rounded-xl border border-sky-500/20 bg-sky-950/20 p-4">
        <p className="text-[10px] font-medium uppercase tracking-widest text-sky-400/80">
          Наступний слот #{nextSlot.slot}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {nextSlot.suggestedTypes.map((type) => (
            <span
              key={type}
              className={`rounded-full border border-sky-500/30 bg-sky-950/40 px-2.5 py-1 text-xs ${TYPE_STYLES[type].accent}`}
            >
              {type}
            </span>
          ))}
        </div>
        {nextSlot.avoid.length > 0 && (
          <p className="mt-2 text-xs text-zinc-500">
            Уникай у 1-м слоті: {nextSlot.avoid.join(", ")}
          </p>
        )}
      </div>

      <ul className="mt-4 space-y-2">
        {analysis.insights.map((line) => (
          <li key={line} className="text-sm leading-relaxed text-zinc-300">
            {line}
          </li>
        ))}
      </ul>

      {analysis.bucketMix.some((b) => b.count > 0) && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Bucket mix (тиждень)
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.bucketMix.map((b) => (
              <li key={b.bucket} className="text-xs text-zinc-400">
                <div className="mb-1 flex justify-between">
                  <span>{BUCKET_LABELS[b.bucket] ?? b.bucket}</span>
                  <span>
                    {b.actualPct}% · ціль {b.targetPct}%
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-zinc-500"
                    style={{ width: `${Math.min(100, b.actualPct)}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.performers.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Ефективність
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.performers.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-2 text-zinc-400">
                  <span className={`h-2 w-2 rounded-full ${TYPE_STYLES[p.type].dot}`} />
                  <span className="text-zinc-200">
                    {p.type}
                    {p.slot != null && (
                      <span className="text-zinc-600"> · слот {p.slot}</span>
                    )}
                  </span>
                  <span className={tierClass(p.tier)}>{tierLabel(p.tier)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 tabular-nums text-zinc-500">
                  <span>
                    {p.views} перегл. / {p.ageHours} год
                  </span>
                  <span>{p.viewsPerHour}/год</span>
                  {p.replyRate != null && (
                    <span>↩ {formatRate(p.replyRate)}</span>
                  )}
                  {p.likeRate != null && <span>♥ {formatRate(p.likeRate)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.normGaps.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Відставання від норм
          </p>
          <ul className="mt-2 space-y-1 text-xs text-zinc-400">
            {analysis.normGaps.slice(0, 6).map((g) => (
              <li key={g.type}>
                <span className={TYPE_STYLES[g.type].accent}>{g.type}</span>{" "}
                {g.count}/{g.normLabel} · потрібно +{g.needed}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
