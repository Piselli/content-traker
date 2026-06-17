"use client";

import { useState } from "react";
import {
  getNormStatus,
  normLabel,
  NORMS,
  progressPercent,
} from "@/lib/norms";
import { TYPE_STYLES } from "@/lib/styles";
import type { ContentType, LogEntry, LogOptions } from "@/lib/types";
import { dayKey, last7DayKeys } from "@/lib/week";

interface HabitCardProps {
  type: ContentType;
  count: number;
  logs: LogEntry[];
  onDone: (opts?: LogOptions) => void;
  onUndo: () => void;
}

export function HabitCard({
  type,
  count,
  logs,
  onDone,
  onUndo,
}: HabitCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [tweetUrl, setTweetUrl] = useState("");
  const [ageHours, setAgeHours] = useState("");
  const [views, setViews] = useState("");
  const [likes, setLikes] = useState("");
  const [replies, setReplies] = useState("");

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

  function submit(opts?: LogOptions) {
    onDone(opts);
    setTweetUrl("");
    setAgeHours("");
    setViews("");
    setLikes("");
    setReplies("");
    setExpanded(false);
  }

  function submitExpanded() {
    submit({
      tweetUrl: tweetUrl || undefined,
      ageHours: ageHours ? Number(ageHours) : undefined,
      views: views ? Number(views) : undefined,
      likes: likes ? Number(likes) : undefined,
      replies: replies ? Number(replies) : undefined,
    });
  }

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

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-semibold tabular-nums text-zinc-100">
            {countLabel}
          </span>
          <span className="text-xs text-zinc-500">this week</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onUndo}
            disabled={count === 0}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 disabled:opacity-30"
            title="Remove last"
          >
            −
          </button>
          <button
            type="button"
            onClick={() => onDone({ count: 1 })}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            title="Add one"
          >
            +
          </button>
        </div>
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

      <div className="flex flex-col gap-2 pt-1">
        <button
          type="button"
          onClick={() => submit({ count: 1 })}
          className="w-full rounded-lg bg-zinc-100 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-white"
        >
          Done
        </button>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          {expanded ? "hide link & metrics" : "+ link / metrics"}
        </button>
        {expanded && (
          <div className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950/50 p-3">
            <input
              value={tweetUrl}
              onChange={(e) => setTweetUrl(e.target.value)}
              placeholder="tweet URL (optional)"
              className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
            />
            <div className="flex gap-2">
              <input
                value={ageHours}
                onChange={(e) => setAgeHours(e.target.value)}
                placeholder="hours since post"
                className="w-1/2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
              />
              <input
                value={views}
                onChange={(e) => setViews(e.target.value)}
                placeholder="views"
                className="w-1/2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
            <div className="flex gap-2">
              <input
                value={likes}
                onChange={(e) => setLikes(e.target.value)}
                placeholder="likes"
                className="w-1/2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
              />
              <input
                value={replies}
                onChange={(e) => setReplies(e.target.value)}
                placeholder="replies"
                className="w-1/2 rounded border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-100 placeholder:text-zinc-600"
              />
            </div>
            <button
              type="button"
              onClick={submitExpanded}
              className="rounded-lg border border-zinc-600 py-1.5 text-xs font-medium text-zinc-200 hover:bg-zinc-800"
            >
              Log
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
