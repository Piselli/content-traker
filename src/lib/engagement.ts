export function replyRatePercent(views?: number, replies?: number): number | undefined {
  if (views == null || views <= 0 || replies == null) return undefined;
  return Math.round((replies / views) * 1000) / 10;
}

export function likeRatePercent(views?: number, likes?: number): number | undefined {
  if (views == null || views <= 0 || likes == null) return undefined;
  return Math.round((likes / views) * 1000) / 10;
}

export function formatRate(rate?: number): string {
  if (rate == null) return "—";
  return `${rate}%`;
}

/** Replies per 1,000 impressions — playbook primary signal (12+ = strong). */
export function repliesPer1k(views?: number, replies?: number): number | undefined {
  if (views == null || views <= 0 || replies == null) return undefined;
  return Math.round((replies / views) * 10000) / 10;
}
