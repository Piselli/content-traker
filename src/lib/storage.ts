import { mergeAppData, type RepoData } from "./merge";
import type { AppData } from "./types";

const STORAGE_KEY = "piselli-content-tracker-v1";
const REPO_DATA_URL = "/tracker-data.json";

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

export async function mergeRepoFromUrl(): Promise<AppData | null> {
  if (typeof window === "undefined") return null;
  try {
    const res = await fetch(`${REPO_DATA_URL}?t=${Date.now()}`);
    if (!res.ok) return null;
    const remote = (await res.json()) as RepoData;
    if (!Array.isArray(remote.logs)) return null;
    const local = loadData();
    const merged = mergeAppData(local, remote);
    return merged;
  } catch {
    return null;
  }
}

export function exportJson(data: AppData): string {
  return JSON.stringify(data, null, 2);
}

export function exportRepoJson(data: AppData, deletedUrls?: string[]): string {
  const payload: RepoData = {
    ...data,
    deletedUrls,
    syncVersion: Date.now(),
    updatedAt: new Date().toISOString(),
  };
  return JSON.stringify(payload, null, 2);
}

export function importJson(raw: string): AppData {
  const parsed = JSON.parse(raw) as AppData;
  if (!Array.isArray(parsed.logs) || !Array.isArray(parsed.ideas)) {
    throw new Error("Invalid backup file");
  }
  return parsed;
}
