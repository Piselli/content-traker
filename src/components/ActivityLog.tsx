"use client";

import { TYPE_STYLES } from "@/lib/styles";
import type { LogEntry } from "@/lib/types";
import { formatLogDay, formatLogTime } from "@/lib/week";

interface ActivityLogProps {
  logs: LogEntry[];
}

export function ActivityLog({ logs }: ActivityLogProps) {
  const grouped = logs.slice(0, 40).reduce<Record<string, LogEntry[]>>(
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
    <div className="max-h-[420px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
      {days.map((day) => (
        <div key={day} className="border-b border-zinc-800/80 last:border-0">
          <div className="sticky top-0 bg-zinc-900/95 px-4 py-2 text-xs font-medium text-zinc-500 backdrop-blur">
            {day}
          </div>
          <ul className="px-2 pb-2">
            {grouped[day].map((log) => (
              <li
                key={log.id}
                className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-zinc-800/50"
              >
                <span className="w-12 shrink-0 tabular-nums text-zinc-500">
                  {formatLogTime(log.at)}
                </span>
                <span
                  className={`h-2 w-2 shrink-0 rounded-full ${TYPE_STYLES[log.type].dot}`}
                />
                <span className="text-zinc-200">{log.type}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
