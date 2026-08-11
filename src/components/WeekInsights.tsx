"use client";

import type { WeekAnalysis } from "@/lib/analysis";
import { formatRate } from "@/lib/engagement";
import { TYPE_STYLES } from "@/lib/styles";
import type { LogEntry } from "@/lib/types";
import { getVisualClusterBenchmarks } from "@/lib/visualClusters";

interface WeekInsightsProps {
  analysis: WeekAnalysis;
  logs: LogEntry[];
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

const BUCKET_COLORS: Record<string, string> = {
  CT: "bg-sky-500",
  football: "bg-emerald-500",
  humor: "bg-yellow-500",
  builder: "bg-violet-500",
};

function TypeBadge({ type, primary }: { type: string; primary?: boolean }) {
  const styles = TYPE_STYLES[type as keyof typeof TYPE_STYLES];
  if (!styles) return <span className="text-zinc-400">{type}</span>;
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[10px] ${
        primary
          ? `${styles.accent} border-zinc-700 bg-zinc-900/80`
          : "border-zinc-800 bg-zinc-950/60 text-zinc-400"
      }`}
    >
      {type}
    </span>
  );
}

export function WeekInsights({ analysis, logs }: WeekInsightsProps) {
  const { nextSlot, bucketMix } = analysis;
  const benchmarks = getVisualClusterBenchmarks(logs);
  const bucketTotal = bucketMix.reduce((a, b) => a + b.count, 0) || 1;

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
        {nextSlot.suggestedCombos.length > 0 && (
          <div className="mt-3">
            <p className="text-[10px] text-zinc-500">Combo (2 типи в 1 пості):</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              {nextSlot.suggestedCombos.map((combo) => (
                <span
                  key={combo.join("+")}
                  className="rounded-lg border border-violet-500/25 bg-violet-950/30 px-2.5 py-1 text-[11px] text-violet-200"
                >
                  {combo.join(" + ")}
                </span>
              ))}
            </div>
          </div>
        )}
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

      {bucketMix.some((b) => b.count > 0) && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Bucket mix (тиждень) · {bucketTotal} постів
          </p>
          <div className="mt-2 flex h-3 overflow-hidden rounded-full bg-zinc-800">
            {bucketMix
              .filter((b) => b.count > 0)
              .map((b) => (
                <div
                  key={b.bucket}
                  className={`${BUCKET_COLORS[b.bucket] ?? "bg-zinc-500"} transition-all`}
                  style={{ width: `${(b.count / bucketTotal) * 100}%` }}
                  title={`${BUCKET_LABELS[b.bucket]}: ${b.count} (${b.actualPct}%, ціль ${b.targetPct}%)`}
                />
              ))}
          </div>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-500">
            {bucketMix.map((b) => (
              <li key={b.bucket} className="flex items-center gap-1.5">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${BUCKET_COLORS[b.bucket]}`}
                />
                {BUCKET_LABELS[b.bucket]} {b.actualPct}% / {b.targetPct}%
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.laneMix.some((l) => l.count > 0 || l.needed > 0) && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Lanes (тиждень)
          </p>
          <ul className="mt-2 space-y-1 text-[11px] text-zinc-400">
            {analysis.laneMix.map((l) => (
              <li key={l.lane} className="flex justify-between gap-2">
                <span>{l.label}</span>
                <span
                  className={
                    l.status === "over"
                      ? "text-amber-400"
                      : l.needed > 0
                        ? "text-rose-400"
                        : "text-emerald-400/80"
                  }
                >
                  {l.count}/{l.normLabel}
                  {l.needed > 0 ? ` · +${l.needed}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.visualClusters.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Visual clusters (тиждень)
          </p>
          <ul className="mt-2 space-y-1.5">
            {analysis.visualClusters.map((v) => {
              const bench = benchmarks[v.cluster];
              const vsBench =
                bench.avgViews > 0
                  ? Math.round(((v.avgViews - bench.avgViews) / bench.avgViews) * 100)
                  : 0;
              return (
                <li key={v.cluster} className="flex justify-between text-xs text-zinc-400">
                  <span>
                    {v.label}{" "}
                    <span className="text-zinc-600">×{v.count}</span>
                  </span>
                  <span className="tabular-nums">
                    {v.avgViews}v · {v.rpv}/1k
                    {vsBench !== 0 && (
                      <span className={vsBench > 0 ? "text-emerald-400" : "text-red-400"}>
                        {" "}
                        ({vsBench > 0 ? "+" : ""}
                        {vsBench}% vs all-time)
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {analysis.performers.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Ефективність (replies/1k → views)
          </p>
          <ul className="mt-2 space-y-2">
            {analysis.performers.slice(0, 5).map((p) => (
              <li
                key={p.id}
                className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 px-3 py-2 text-xs"
              >
                <div className="flex flex-wrap items-center gap-1.5 text-zinc-400">
                  {p.allTypes.map((t, i) => (
                    <TypeBadge key={t} type={t} primary={i === 0} />
                  ))}
                  {p.slot != null && (
                    <span className="text-[10px] text-zinc-600">· слот {p.slot}</span>
                  )}
                  <span className={tierClass(p.replyTier)} title="Playbook: replies/1k">
                    ↩ {tierLabel(p.replyTier)}
                  </span>
                  <span className={`${tierClass(p.tier)} opacity-60`} title="Views/hour">
                    {p.viewsPerHour}/год
                  </span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1 tabular-nums text-zinc-500">
                  {p.repliesPer1k != null && (
                    <span className="text-zinc-300">
                      {p.replies ?? 0} replies · {p.repliesPer1k}/1k
                    </span>
                  )}
                  <span>
                    {p.views} перегл. / {p.ageHours} год
                  </span>
                  {p.likeRate != null && <span>♥ {formatRate(p.likeRate)}</span>}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {analysis.comboHits.length > 0 && (
        <div className="mt-5">
          <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500">
            Combo coverage (не в нормах)
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {analysis.comboHits.map((c) => (
              <li
                key={c.type}
                className="rounded-lg border border-violet-500/20 bg-violet-950/20 px-2.5 py-1 text-xs text-violet-200"
              >
                {c.type} <span className="text-violet-400">+{c.count}</span>
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
