"use client";

import { useState } from "react";
import { TYPE_STYLES } from "@/lib/styles";
import { comboTraits, normTypes } from "@/lib/traits";
import type { LogEntry } from "@/lib/types";
import { formatLogDay, formatLogTime, hoursSince } from "@/lib/week";

interface ActivityLogProps {
  logs: LogEntry[];
  onRemove: (id: string) => void;
}

const BUCKET_LABELS: Record<string, string> = {
  CT: "CT",
  football: "⚽",
  humor: "😏",
  builder: "🔨",
};

function formatMetrics(log: LogEntry): string | null {
  const parts: string[] = [];
  const liveHours = hoursSince(log.at);
  if (liveHours > 0 || log.views != null) parts.push(`${liveHours} год`);
  if (log.views != null) parts.push(`${log.views} перегл.`);
  if (log.likes != null) parts.push(`${log.likes} ♥`);
  if (log.replies != null) parts.push(`${log.replies} ↩`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ActivityLog({ logs, onRemove }: ActivityLogProps) {
  const grouped = logs.slice(0, 50).reduce<Record<string, LogEntry[]>>(
    (acc, log) => {
      const key = formatLogDay(log.at);
      if (!acc[key]) acc[key] = [];
      acc[key].push(log);
      return acc;
    },
    {},
  );

  const days = Object.keys(grouped);

  if (days.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/30 p-8 text-center text-sm text-zinc-500">
        Поки порожньо — натисни Done або скинь скрін + URL у чат.
      </div>
    );
  }

  return (
    <div className="max-h-[520px] overflow-y-auto rounded-2xl border border-zinc-800/80 bg-zinc-900/40">
      {days.map((day) => (
        <div key={day} className="border-b border-zinc-800/60 last:border-0">
          <div className="sticky top-0 bg-zinc-900/95 px-4 py-2.5 text-xs font-medium text-zinc-500 backdrop-blur">
            {day}
          </div>
          <ul className="px-2 pb-2 pt-1">
            {grouped[day].map((log) => (
              <LogRow key={log.id} log={log} onRemove={onRemove} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function LogRow({
  log,
  onRemove,
}: {
  log: LogEntry;
  onRemove: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const metrics = formatMetrics(log);
  const snapshots = log.snapshots ?? [];

  return (
    <li className="group rounded-xl px-2 py-2.5 hover:bg-zinc-800/40">
      <div className="flex items-start gap-3 text-sm">
        <span className="w-11 shrink-0 pt-0.5 tabular-nums text-[11px] text-zinc-500">
          {formatLogTime(log.at)}
        </span>
        <span
          className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TYPE_STYLES[log.type].dot}`}
        />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            {log.classificationPending ? (
              <span className="rounded-full border border-amber-500/40 bg-amber-950/50 px-2 py-0.5 text-[10px] text-amber-200">
                classify me
              </span>
            ) : (
              normTypes(log).map((t) => (
                <span
                  key={t}
                  className={`rounded-full border px-2 py-0.5 text-[10px] ${TYPE_STYLES[t].accent} border-zinc-700 bg-zinc-800/80`}
                >
                  {t}
                </span>
              ))
            )}
            {!log.classificationPending &&
              comboTraits(log).map((t) => (
              <span
                key={t}
                className="rounded-full border border-violet-500/25 bg-violet-950/30 px-2 py-0.5 text-[10px] text-violet-300/90"
              >
                {t}
              </span>
            ))}
            {log.slot != null && (
              <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">
                #{log.slot}
              </span>
            )}
            {log.bucket && (
              <span className="text-[10px] text-zinc-500" title={log.bucket}>
                {BUCKET_LABELS[log.bucket] ?? log.bucket}
              </span>
            )}
          </div>
          {metrics && (
            <p className="mt-1 text-xs tabular-nums text-zinc-500">{metrics}</p>
          )}
          {log.tweetUrl && (
            <a
              href={log.tweetUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block truncate text-xs text-sky-500/90 hover:text-sky-400 hover:underline"
            >
              {log.tweetUrl}
            </a>
          )}
          {snapshots.length > 0 && (
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="mt-1.5 text-[10px] text-zinc-600 hover:text-zinc-400"
            >
              {open ? "сховати" : "показати"} історію ({snapshots.length})
            </button>
          )}
          {open &&
            snapshots.map((s, i) => (
              <p key={i} className="mt-1 text-[11px] tabular-nums text-zinc-600">
                was: {s.ageHours} год · {s.views ?? "?"} перегл. · {s.likes ?? "?"} ♥ ·{" "}
                {s.replies ?? "?"} ↩
              </p>
            ))}
        </div>
        <button
          type="button"
          onClick={() => onRemove(log.id)}
          className="shrink-0 text-xs text-zinc-700 opacity-0 transition group-hover:opacity-100 hover:text-red-400"
        >
          ×
        </button>
      </div>
    </li>
  );
}
