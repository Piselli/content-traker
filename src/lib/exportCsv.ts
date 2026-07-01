import { allDisplayTypes } from "./traits";
import type { AppData } from "./types";
import { resolveVisualCluster } from "./visualClusters";

function esc(value: string | number | undefined | null): string {
  const s = value == null ? "" : String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportLogsCsv(data: AppData): string {
  const header = [
    "at",
    "type",
    "all_types",
    "bucket",
    "visual_cluster",
    "slot",
    "views",
    "likes",
    "replies",
    "tweet_url",
    "note",
  ].join(",");

  const rows = data.logs.map((log) =>
    [
      log.at,
      log.type,
      allDisplayTypes(log).join(" + "),
      log.bucket ?? "",
      resolveVisualCluster(log),
      log.slot ?? "",
      log.views ?? "",
      log.likes ?? "",
      log.replies ?? "",
      log.tweetUrl ?? "",
      log.note ?? "",
    ]
      .map(esc)
      .join(","),
  );

  return [header, ...rows].join("\n");
}
