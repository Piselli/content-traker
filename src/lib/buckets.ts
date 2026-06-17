export const BUCKETS = ["CT", "football", "humor", "builder"] as const;
export type Bucket = (typeof BUCKETS)[number];

export const BUCKET_TARGETS: Record<Bucket, number> = {
  CT: 40,
  football: 25,
  humor: 25,
  builder: 10,
};

export function matchBucket(raw: string): Bucket | undefined {
  const lower = raw.toLowerCase().trim();
  if (lower === "ct" || lower.includes("crypto")) return "CT";
  if (lower.includes("football") || lower.includes("футбол")) return "football";
  if (lower.includes("humor") || lower.includes("meme") || lower.includes("гumor"))
    return "humor";
  if (lower.includes("builder") || lower.includes("movematch") || lower.includes("irl"))
    return "builder";
  return BUCKETS.find((b) => lower === b.toLowerCase());
}
