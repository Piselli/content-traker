import type { AppData } from "./types";

const STORAGE_KEY = "piselli-content-tracker-v1";

const EMPTY: AppData = { logs: [], ideas: [] };

export function loadData(): AppData {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as AppData;
    return {
      logs: Array.isArray(parsed.logs) ? parsed.logs : [],
      ideas: Array.isArray(parsed.ideas) ? parsed.ideas : [],
    };
  } catch {
    return EMPTY;
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function importJson(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData;
  if (!Array.isArray(parsed.logs) || !Array.isArray(parsed.ideas)) {
    throw new Error("Invalid backup file");
  }
  return parsed;
}
