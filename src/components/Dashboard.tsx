"use client";

import { ActivityLog } from "@/components/ActivityLog";
import { ActivityHeatmap } from "@/components/ActivityHeatmap";
import { HabitCard } from "@/components/HabitCard";
import { IdeasPanel } from "@/components/IdeasPanel";
import { NormChart } from "@/components/NormChart";
import { QuickLogPanel } from "@/components/QuickLogPanel";
import { useToast } from "@/components/Toast";
import { WeekInsights } from "@/components/WeekInsights";
import { WeekSummary } from "@/components/WeekSummary";
import { useTracker } from "@/hooks/useTracker";
import { CONTENT_TYPES } from "@/lib/types";
import { weekRangeLabel } from "@/lib/week";
import { useState } from "react";

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse space-y-8 px-4 py-8">
      <div className="h-20 rounded-2xl bg-zinc-900" />
      <div className="grid gap-3 sm:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 rounded-2xl bg-zinc-900" />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-40 rounded-2xl bg-zinc-900" />
        ))}
      </div>
    </div>
  );
}

export function Dashboard() {
  const {
    ready,
    data,
    weekCounts,
    weekComboCounts,
    weekAnalysis,
    logDone,
    upsertLog,
    undoLast,
    removeLog,
    addIdea,
    removeIdea,
    markIdeaUsed,
    exportBackup,
    exportCsv,
    copyForJarvis,
    restoreBackup,
  } = useTracker();

  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const pendingCount = data.logs.filter((l) => l.classificationPending).length;

  function download(filename: string, content: string, mime = "application/json") {
    const blob = new Blob([content], { type: mime });
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
    toast("Backup downloaded", "success");
  }

  function handleCsvExport() {
    download(
      `content-tracker-${new Date().toISOString().slice(0, 10)}.csv`,
      exportCsv(),
      "text/csv",
    );
    toast("CSV exported", "success");
  }

  async function handleJarvisCopy() {
    try {
      await copyForJarvis();
      setCopied(true);
      toast("Скопійовано для Jarvis", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast("Could not copy — check browser permissions", "error");
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
          toast("Backup restored", "success");
        } catch {
          toast("Invalid backup file", "error");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  if (!ready) return <DashboardSkeleton />;

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
              onClick={handleCsvExport}
              className="rounded-xl border border-zinc-700/80 px-3.5 py-2 text-xs text-zinc-400 transition hover:text-zinc-200"
            >
              CSV
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

        {pendingCount > 0 && (
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-950/20 px-4 py-3 text-sm text-amber-100/90">
            {pendingCount} auto-synced post{pendingCount === 1 ? "" : "s"} need classification — paste URL + type in chat or Quick log.
          </div>
        )}

        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
            <h2 className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              Звички
            </h2>
            <div className="min-w-0 w-full max-w-md rounded-xl border border-zinc-800/80 bg-zinc-900/50 px-3 py-2 sm:ml-auto">
              <p className="text-[10px] uppercase tracking-widest text-zinc-600">Активність</p>
              <ActivityHeatmap logs={data.logs} />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {CONTENT_TYPES.map((type) => (
              <HabitCard
                key={type}
                type={type}
                count={weekCounts[type] ?? 0}
                comboCount={weekComboCounts[type] ?? 0}
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
          <section className="flex flex-col gap-6">
            <NormChart weekCounts={weekCounts} analysis={weekAnalysis} />
            <IdeasPanel
              ideas={data.ideas}
              onAdd={addIdea}
              onRemove={removeIdea}
              onMarkUsed={markIdeaUsed}
            />
          </section>
        </div>

        <section className="mt-8">
          <WeekInsights analysis={weekAnalysis} logs={data.logs} />
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
