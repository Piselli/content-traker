"use client";

import { ActivityLog } from "@/components/ActivityLog";
import { HabitCard } from "@/components/HabitCard";
import { IdeasPanel } from "@/components/IdeasPanel";
import { QuickLogPanel } from "@/components/QuickLogPanel";
import { WeekInsights } from "@/components/WeekInsights";
import { WeekSummary } from "@/components/WeekSummary";
import { useTracker } from "@/hooks/useTracker";
import { CONTENT_TYPES } from "@/lib/types";
import { weekRangeLabel } from "@/lib/week";
import { useState } from "react";

export function Dashboard() {
  const {
    ready,
    data,
    weekCounts,
    weekAnalysis,
    logDone,
    upsertLog,
    undoLast,
    removeLog,
    addIdea,
    removeIdea,
    exportBackup,
    copyForJarvis,
    restoreBackup,
  } = useTracker();

  const [copied, setCopied] = useState(false);

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

  async function handleJarvisCopy() {
    try {
      await copyForJarvis();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      alert("Could not copy — check browser permissions");
    }
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
    <div className="relative mx-auto min-h-screen max-w-6xl px-4 py-8 sm:px-6">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-950/20 via-zinc-950 to-zinc-950" />

      <div className="relative">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-violet-400/70">
              @piselliii
            </p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-zinc-50">
              Content Tracker
            </h1>
            <p className="mt-1.5 text-sm text-zinc-500">{weekRangeLabel(new Date())}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleJarvisCopy}
              className="rounded-xl border border-violet-500/30 bg-violet-950/50 px-3.5 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-400/50 hover:bg-violet-900/40"
            >
              {copied ? "Скопійовано!" : "Copy for Jarvis"}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-xl border border-zinc-700/80 px-3.5 py-2 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              Backup
            </button>
            <button
              type="button"
              onClick={handleImport}
              className="rounded-xl border border-zinc-700/80 px-3.5 py-2 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              Import
            </button>
          </div>
        </header>

        <WeekSummary weekCounts={weekCounts} analysis={weekAnalysis} />

        <section className="mt-8">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
            Звички
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENT_TYPES.map((type) => (
              <HabitCard
                key={type}
                type={type}
                count={weekCounts[type] ?? 0}
                logs={data.logs}
                onDone={() => logDone(type)}
                onUndo={() => undoLast(type)}
              />
            ))}
          </div>
        </section>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-xs font-medium uppercase tracking-widest text-zinc-500">
              Журнал
            </h2>
            <ActivityLog logs={data.logs} onRemove={removeLog} />
          </section>
          <section>
            <IdeasPanel ideas={data.ideas} onAdd={addIdea} onRemove={removeIdea} />
          </section>
        </div>

        <section className="mt-8">
          <WeekInsights analysis={weekAnalysis} />
        </section>

        <details className="mt-6 group">
          <summary className="cursor-pointer list-none text-xs text-zinc-600 transition hover:text-zinc-400">
            <span className="group-open:hidden">▸ Ручний ввід (fallback)</span>
            <span className="hidden group-open:inline">▾ Ручний ввід (fallback)</span>
          </summary>
          <div className="mt-3">
            <QuickLogPanel logs={data.logs} onUpsert={upsertLog} />
          </div>
        </details>
      </div>
    </div>
  );
}
