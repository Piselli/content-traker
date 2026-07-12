import type { ContentType, Norm } from "./types";

export const NORMS: Record<ContentType, Norm> = {
  "hot topic": { min: 7, label: "hot topic" },
  meme: { min: 3, label: "meme" },
  useful: { min: 2, label: "useful" },
  bait: { min: 2, max: 4, label: "bait" },
  provocative: { min: 3, label: "provocative" },
  "strategic QT": { min: 3, max: 5, label: "strategic QT" },
  builder: { max: 2, label: "builder" },
  "meta reach": { max: 1, label: "meta reach" },
};

export function normLabel(norm: Norm): string {
  if (norm.min != null && norm.max != null) return `${norm.min}–${norm.max}`;
  if (norm.min != null) return `${norm.min}+`;
  if (norm.max != null) return `≤${norm.max}`;
  return "—";
}

export type NormStatus = "idle" | "progress" | "done" | "over";

export function getNormStatus(count: number, norm: Norm): NormStatus {
  if (norm.max != null && count > norm.max) return "over";
  if (norm.min != null && count >= norm.min) {
    if (norm.max != null && count <= norm.max) return "done";
    if (norm.max == null) return "done";
  }
  if (norm.min == null && norm.max != null && count <= norm.max) return "done";
  if (count > 0) return "progress";
  return "idle";
}

export function progressPercent(count: number, norm: Norm): number {
  const target = norm.min ?? norm.max ?? 1;
  return Math.min(100, Math.round((count / target) * 100));
}
