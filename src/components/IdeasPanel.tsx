"use client";

import { useState } from "react";
import { CONTENT_TYPES } from "@/lib/types";
import type { ContentType, Idea } from "@/lib/types";

interface IdeasPanelProps {
  ideas: Idea[];
  onAdd: (text: string, type?: ContentType) => void;
  onRemove: (id: string) => void;
  onMarkUsed: (id: string) => void;
}

export function IdeasPanel({ ideas, onAdd, onRemove, onMarkUsed }: IdeasPanelProps) {
  const [text, setText] = useState("");
  const [type, setType] = useState<ContentType | "">("");
  const [hideUsed, setHideUsed] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onAdd(text, type || undefined);
    setText("");
  }

  const visible = hideUsed ? ideas.filter((i) => !i.usedAt) : ideas;

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-medium text-zinc-200">Ideas</h2>
          <p className="text-xs text-zinc-500">backlog for future posts</p>
        </div>
        <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-zinc-600">
          <input
            type="checkbox"
            checked={hideUsed}
            onChange={(e) => setHideUsed(e.target.checked)}
          />
          hide used
        </label>
      </div>

      <form onSubmit={submit} className="flex flex-col gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="idea for a tweet…"
          rows={2}
          className="resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-zinc-500 focus:outline-none"
        />
        <div className="flex gap-2">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ContentType | "")}
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-2 py-2 text-xs text-zinc-300 focus:outline-none"
          >
            <option value="">any type</option>
            {CONTENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={!text.trim()}
            className="rounded-lg bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </form>

      <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
        {visible.length === 0 && (
          <li className="text-center text-xs text-zinc-600">empty</li>
        )}
        {visible.map((idea) => (
          <li
            key={idea.id}
            className={`group flex items-start gap-2 rounded-lg border px-3 py-2 ${
              idea.usedAt
                ? "border-zinc-800/50 bg-zinc-950/30 opacity-60"
                : "border-zinc-800 bg-zinc-950/50"
            }`}
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm text-zinc-200">{idea.text}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {idea.type && (
                  <p className="text-[10px] uppercase tracking-wide text-zinc-500">
                    {idea.type}
                  </p>
                )}
                {idea.usedAt && (
                  <p className="text-[10px] text-emerald-600">used</p>
                )}
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-1 opacity-0 transition group-hover:opacity-100">
              {!idea.usedAt && (
                <button
                  type="button"
                  onClick={() => onMarkUsed(idea.id)}
                  className="text-[10px] text-emerald-500 hover:text-emerald-400"
                >
                  ✓
                </button>
              )}
              <button
                type="button"
                onClick={() => onRemove(idea.id)}
                className="text-xs text-zinc-600 hover:text-red-400"
                aria-label="Remove idea"
              >
                ×
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
