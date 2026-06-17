"use client";

import { useState } from "react";
import { TYPE_STYLES } from "@/lib/styles";
import type { LogEntry } from "@/lib/types";
import { formatLogDay, formatLogTime } from "@/lib/week";

interface ActivityLogProps {
  logs: LogEntry[];
  onRemove: (id: string) => void;
  onUpdate: (
    id: string,
    patch: Partial<
      Pick<LogEntry, "tweetUrl" | "ageHours" | "views" | "likes" | "replies">
    >,
  ) => void;
}

function formatMetrics(log: LogEntry): string | null {
  const parts: string[] = [];
  if (log.ageHours != null) parts.push(`${log.ageHours}h`);
  if (log.views != null) parts.push(`${log.views}v`);
  if (log.likes != null) parts.push(`${log.likes}♥`);
  if (log.replies != null) parts.push(`${log.replies}↩`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ActivityLog({ logs, onRemove, onUpdate }: ActivityLogProps) {
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
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6 text-center text-sm text-zinc-500">
        No activity yet — hit Done on a habit.
      </div>
    );
  }

  return (
    <div className="max-h-[480px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
      {days.map((day) => (
        <div key={day} className="border-b border-zinc-800/80 last:border-0">
          <div className="sticky top-0 bg-zinc-900/95 px-4 py-2 text-xs font-medium text-zinc-500 backdrop-blur">
            {day}
          </div>
          <ul className="px-2 pb-2">
            {grouped[day].map((log) => (
              <LogRow key={log.id} log={log} onRemove={onRemove} onUpdate={onUpdate} />
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
  onUpdate,
}: {
  log: LogEntry;
  onRemove: (id: string) => void;
  onUpdate: ActivityLogProps["onUpdate"];
}) {
  const [editing, setEditing] = useState(false);
  const [ageHours, setAgeHours] = useState(log.ageHours?.toString() ?? "");
  const [views, setViews] = useState(log.views?.toString() ?? "");
  const [likes, setLikes] = useState(log.likes?.toString() ?? "");
  const [replies, setReplies] = useState(log.replies?.toString() ?? "");
  const [url, setUrl] = useState(log.tweetUrl ?? "");

  const metrics = formatMetrics(log);
  const snapshotCount = log.snapshots?.length ?? 0;

  function save() {
    onUpdate(log.id, {
      tweetUrl: url || undefined,
      ageHours: ageHours ? Number(ageHours) : undefined,
      views: views ? Number(views) : undefined,
      likes: likes ? Number(likes) : undefined,
      replies: replies ? Number(replies) : undefined,
    });
    setEditing(false);
  }

  return (
    <li className="group rounded-lg px-2 py-2 hover:bg-zinc-800/50">
      <div className="flex items-center gap-3 text-sm">
        <span className="w-12 shrink-0 tabular-nums text-zinc-500">
          {formatLogTime(log.at)}
        </span>
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${TYPE_STYLES[log.type].dot}`}
        />
        <span className="min-w-0 flex-1 text-zinc-200">
          {log.type}
          {log.secondaryType && (
            <span className="text-zinc-500"> + {log.secondaryType}</span>
          )}
        </span>
        {metrics && (
          <span className="text-xs tabular-nums text-zinc-500">{metrics}</span>
        )}
        {snapshotCount > 0 && (
          <span className="text-[10px] text-zinc-600">+{snapshotCount} check</span>
        )}
        <button
          type="button"
          onClick={() => setEditing((v) => !v)}
          className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-zinc-300"
        >
          edit
        </button>
        <button
          type="button"
          onClick={() => onRemove(log.id)}
          className="text-xs text-zinc-600 opacity-0 group-hover:opacity-100 hover:text-red-400"
        >
          ×
        </button>
      </div>
      {log.tweetUrl && !editing && (
        <a
          href={log.tweetUrl}
          target="_blank"
          rel="noreferrer"
          className="ml-[3.75rem] mt-1 block truncate text-xs text-sky-500 hover:underline"
        >
          {log.tweetUrl}
        </a>
      )}
      {editing && (
        <div className="ml-[3.75rem] mt-2 flex flex-col gap-1.5">
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="tweet URL"
            className="rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs text-zinc-100"
          />
          <div className="flex gap-2">
            <input
              value={ageHours}
              onChange={(e) => setAgeHours(e.target.value)}
              placeholder="hours since post"
              className="w-1/2 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
            />
            <input
              value={views}
              onChange={(e) => setViews(e.target.value)}
              placeholder="views"
              className="w-1/2 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <input
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              placeholder="likes"
              className="w-1/2 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
            />
            <input
              value={replies}
              onChange={(e) => setReplies(e.target.value)}
              placeholder="replies"
              className="w-1/2 rounded border border-zinc-700 bg-zinc-950 px-2 py-1 text-xs"
            />
          </div>
          {snapshotCount > 0 && (
            <p className="text-[10px] text-zinc-600">
              Saving keeps previous check-in in history ({snapshotCount} stored).
            </p>
          )}
          <button
            type="button"
            onClick={save}
            className="self-start rounded bg-zinc-700 px-2 py-0.5 text-xs text-zinc-200"
          >
            save
          </button>
        </div>
      )}
    </li>
  );
}
