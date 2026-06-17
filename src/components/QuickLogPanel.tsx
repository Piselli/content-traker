"use client";

import { useMemo, useState } from "react";
import { TYPE_STYLES } from "@/lib/styles";
import {
  PASTE_EXAMPLE,
  parseTweetLogPaste,
  parsedLogIsEmpty,
} from "@/lib/parseTweetLog";
import { CONTENT_TYPES, type ContentType } from "@/lib/types";
import { tweetUrlsMatch } from "@/lib/tweetUrl";
import type { LogEntry } from "@/lib/types";

interface QuickLogPanelProps {
  logs: LogEntry[];
    onUpsert: (
    type: ContentType,
    opts: {
      secondaryType?: ContentType;
      tweetUrl?: string;
      ageHours?: number;
      views?: number;
      likes?: number;
      replies?: number;
      note?: string;
    },
  ) => "created" | "updated";
}

export function QuickLogPanel({ logs, onUpsert }: QuickLogPanelProps) {
  const [paste, setPaste] = useState("");
  const [type, setType] = useState<ContentType>("hot topic");
  const [message, setMessage] = useState<string | null>(null);

  const parsed = useMemo(() => parseTweetLogPaste(paste), [paste]);
  const resolvedType = parsed.type ?? type;

  const existingMatch = useMemo(() => {
    if (!parsed.tweetUrl) return null;
    return logs.find(
      (l) => l.tweetUrl && tweetUrlsMatch(l.tweetUrl, parsed.tweetUrl!),
    );
  }, [logs, parsed.tweetUrl]);

  function handleApply() {
    if (parsed.type) setType(parsed.type);

    const action = onUpsert(resolvedType, {
      secondaryType: parsed.secondaryType,
      tweetUrl: parsed.tweetUrl,
      ageHours: parsed.ageHours,
      views: parsed.views,
      likes: parsed.likes,
      replies: parsed.replies,
      note: parsed.note,
    });

    setMessage(
      action === "updated"
        ? "Updated existing log (previous metrics saved in history)."
        : "Logged new entry.",
    );
    setPaste("");
  }

  const canApply = !parsedLogIsEmpty(parsed) || parsed.tweetUrl;

  return (
    <div className="rounded-xl border border-violet-900/40 bg-violet-950/20 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-xs font-medium uppercase tracking-widest text-violet-300">
            Quick log
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            Paste from chat — auto-fills type, URL, metrics. Same URL updates existing log.
          </p>
        </div>
      </div>

      <textarea
        value={paste}
        onChange={(e) => {
          setPaste(e.target.value);
          setMessage(null);
        }}
        placeholder={PASTE_EXAMPLE}
        rows={7}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-xs text-zinc-100 placeholder:text-zinc-600"
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-zinc-400">
          type
          <select
            value={resolvedType}
            onChange={(e) => setType(e.target.value as ContentType)}
            className="rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-zinc-100"
          >
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        {existingMatch && (
          <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
            will update existing
          </span>
        )}
      </div>

      {!parsedLogIsEmpty(parsed) && (
        <div className="mt-3 rounded-lg border border-zinc-800 bg-zinc-900/60 p-3 text-xs text-zinc-300">
          <p className="mb-2 font-medium text-zinc-400">Preview</p>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            <span className={TYPE_STYLES[resolvedType].accent}>{resolvedType}</span>
            {parsed.secondaryType && (
              <span className="text-zinc-500">+ {parsed.secondaryType}</span>
            )}
            {parsed.tweetUrl && (
              <span className="truncate text-sky-400">{parsed.tweetUrl}</span>
            )}
            {parsed.ageHours != null && <span>{parsed.ageHours}h</span>}
            {parsed.views != null && <span>{parsed.views}v</span>}
            {parsed.likes != null && <span>{parsed.likes}♥</span>}
            {parsed.replies != null && <span>{parsed.replies}↩</span>}
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={!canApply}
          onClick={handleApply}
          className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-40 hover:bg-violet-500"
        >
          Apply log
        </button>
        <button
          type="button"
          onClick={() => {
            setPaste(PASTE_EXAMPLE);
            setMessage(null);
          }}
          className="rounded-lg border border-zinc-700 px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200"
        >
          Example format
        </button>
      </div>

      {message && <p className="mt-2 text-xs text-emerald-400">{message}</p>}
    </div>
  );
}
