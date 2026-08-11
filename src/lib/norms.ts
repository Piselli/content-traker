import type { ContentType, Norm } from "./types";

/**
 * Weekly type norms — Aug 2026 retune:
 * Solana eco + StonkFun + radar value up; meme capped; football seasonal low (via lanes/buckets).
 */
export const NORMS: Record<ContentType, Norm> = {
  "hot topic": { min: 5, label: "hot topic" },
  meme: { min: 1, max: 2, label: "meme" },
  useful: { min: 4, label: "useful" },
  bait: { min: 1, max: 3, label: "bait" },
  provocative: { min: 2, label: "provocative" },
  "strategic QT": { min: 2, max: 4, label: "strategic QT" },
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

/** Norm closed for the week — hit target or exceeded max (still disciplined). */
export function isNormClosed(status: NormStatus): boolean {
  return status === "done" || status === "over";
}

export function progressPercent(count: number, norm: Norm): number {
  const target = norm.min ?? norm.max ?? 1;
  return Math.min(100, Math.round((count / target) * 100));
}
