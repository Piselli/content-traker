"use client";

import { ActivityLog } from "@/components/ActivityLog";
import { HabitCard } from "@/components/HabitCard";
import { IdeasPanel } from "@/components/IdeasPanel";
import { WeekSummary } from "@/components/WeekSummary";
import { useTracker } from "@/hooks/useTracker";
import { CONTENT_TYPES } from "@/lib/types";
import { weekRangeLabel } from "@/lib/week";

export function Dashboard() {
  const {
    ready,
    data,
    weekCounts,
    logDone,
    undoLast,
    removeLog,
    updateLog,
    addIdea,
    removeIdea,
    exportBackup,
    exportForJarvis,
    restoreBackup,
  } = useTracker();

  function download(filename: string, content: string) {
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleExport() {
    download(
      `content-tracker-${new Date().toISOString().slice(0, 10)}.json`,
      exportBackup(),
    );
  }

  function handleJarvisExport() {
    download(
      `jarvis-week-${new Date().toISOString().slice(0, 10)}.json`,
      exportForJarvis(),
    );
  }

  function handleImport() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          restoreBackup(String(reader.result));
        } catch {
          alert("Invalid backup file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-zinc-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
            @piselliii
          </p>
          <h1 className="text-2xl font-semibold text-zinc-100">Content Tracker</h1>
          <p className="mt-1 text-sm text-zinc-500">{weekRangeLabel(new Date())}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleJarvisExport}
            className="rounded-lg border border-violet-800/60 bg-violet-950/40 px-3 py-1.5 text-xs text-violet-300 hover:text-violet-100"
          >
            Copy for Jarvis
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Backup
          </button>
          <button
            type="button"
            onClick={handleImport}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200"
          >
            Import
          </button>
        </div>
      </header>

      <WeekSummary weekCounts={weekCounts} />

      <section className="mt-6">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
          Habits
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {CONTENT_TYPES.map((type) => (
            <HabitCard
              key={type}
              type={type}
              count={weekCounts[type] ?? 0}
              logs={data.logs}
              onDone={(opts) => logDone(type, opts)}
              onUndo={() => undoLast(type)}
            />
          ))}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Log
          </h2>
          <ActivityLog
            logs={data.logs}
            onRemove={removeLog}
            onUpdate={updateLog}
          />
        </section>
        <section>
          <IdeasPanel ideas={data.ideas} onAdd={addIdea} onRemove={removeIdea} />
        </section>
      </div>
    </div>
  );
}
