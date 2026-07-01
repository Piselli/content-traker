#!/usr/bin/env node
import { classifySyncedTweet } from "./classify-tweet.mjs";
/**
 * Sync @piselliii posts + metrics into public/tracker-data.json
 *
 * Without X_BEARER_TOKEN: refresh likes/replies for known tweet URLs (syndication).
 * With X_BEARER_TOKEN: also ingest new posts + views (impression_count).
 *
 * Usage:
 *   npm run sync:x
 *   DRY_RUN=1 npm run sync:x
 */

import { readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../public/tracker-data.json");
const USERNAME = process.env.X_USERNAME || "piselliii";
const BEARER = process.env.X_BEARER_TOKEN?.trim();
const DRY_RUN = process.env.DRY_RUN === "1";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function syndicationToken(id) {
  return ((Number(id) / 1e15) * Math.PI).toString(36).replace(/(0+|\.)/g, "");
}

function extractTweetId(url) {
  const match = String(url ?? "").match(/status\/(\d+)/i);
  return match?.[1] ?? null;
}

function tweetUrl(id) {
  return `https://x.com/i/status/${id}`;
}

function hoursSince(iso, now = new Date()) {
  return Math.max(0, Math.round((now.getTime() - Date.parse(iso)) / 3_600_000));
}

function metricsDiffer(a, b) {
  return a.views !== b.views || a.likes !== b.likes || a.replies !== b.replies;
}

function pushSnapshot(log, now) {
  if (log.views == null && log.likes == null && log.replies == null) return;
  const snapshots = [...(log.snapshots ?? [])];
  const checkedAt = now.toISOString();
  const ageHours = log.ageHours ?? hoursSince(log.at, now);
  const last = snapshots[0];
  if (
    last &&
    last.ageHours === ageHours &&
    last.views === log.views &&
    last.likes === log.likes &&
    last.replies === log.replies
  ) {
    return;
  }
  snapshots.unshift({
    ageHours,
    views: log.views,
    likes: log.likes,
    replies: log.replies,
    checkedAt,
  });
  log.snapshots = snapshots.slice(0, 24);
}

async function fetchSyndication(tweetId) {
  const url = new URL("https://cdn.syndication.twimg.com/tweet-result");
  url.searchParams.set("id", tweetId);
  url.searchParams.set("token", syndicationToken(tweetId));
  url.searchParams.set("lang", "en");
  const res = await fetch(url);
  if (!res.ok) throw new Error(`syndication ${tweetId}: HTTP ${res.status}`);
  const data = await res.json();
  if (data.__typename === "TweetTombstone" || !data.id_str) return null;
  return {
    likes: data.favorite_count ?? undefined,
    replies: data.conversation_count ?? undefined,
  };
}

async function xApi(path) {
  const res = await fetch(`https://api.x.com${path}`, {
    headers: { Authorization: `Bearer ${BEARER}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`X API ${path}: ${res.status} ${body.slice(0, 200)}`);
  }
  return res.json();
}

async function fetchApiMetrics(ids) {
  const map = new Map();
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100);
    const params = new URLSearchParams({
      ids: chunk.join(","),
      "tweet.fields": "public_metrics,created_at,text",
    });
    const res = await xApi(`/2/tweets?${params}`);
    for (const tw of res.data ?? []) {
      const m = tw.public_metrics ?? {};
      map.set(tw.id, {
        at: tw.created_at,
        text: tw.text,
        views: m.impression_count,
        likes: m.like_count,
        replies: m.reply_count,
      });
    }
    await sleep(200);
  }
  return map;
}

async function ingestTimeline(data, byId, now) {
  const userRes = await xApi(`/2/users/by/username/${USERNAME}`);
  const userId = userRes.data.id;
  const params = new URLSearchParams({
    max_results: "20",
    "tweet.fields": "created_at,public_metrics,text",
    exclude: "retweets",
  });
  const tl = await xApi(`/2/users/${userId}/tweets?${params}`);
  let added = 0;

  for (const tw of tl.data ?? []) {
    if (byId.has(tw.id)) continue;
    const m = tw.public_metrics ?? {};
    const preview = (tw.text ?? "").replace(/\s+/g, " ").slice(0, 120);
    const classified = classifySyncedTweet(tw.text ?? "");
    data.logs.push({
      id: `x-${tw.id}`,
      type: classified.type,
      traits: classified.traits,
      bucket: classified.bucket,
      visualCluster: classified.visualCluster,
      classificationPending: classified.classificationPending,
      at: tw.created_at,
      updatedAt: now.toISOString(),
      syncedAt: now.toISOString(),
      tweetUrl: tweetUrl(tw.id),
      ageHours: hoursSince(tw.created_at, now),
      views: m.impression_count,
      likes: m.like_count,
      replies: m.reply_count,
      note: `auto-sync · ${preview}`,
    });
    byId.set(tw.id, data.logs[data.logs.length - 1]);
    added++;
  }

  return added;
}

function applyMetrics(log, metrics, now) {
  const ageHours = hoursSince(log.at, now);
  const next = {
    views: metrics.views ?? log.views,
    likes: metrics.likes,
    replies: metrics.replies,
    ageHours,
  };
  const prev = {
    views: log.views,
    likes: log.likes,
    replies: log.replies,
  };
  if (!metricsDiffer(prev, next) && log.ageHours === ageHours) return false;
  if (metricsDiffer(prev, next)) pushSnapshot(log, now);
  log.views = next.views;
  log.likes = next.likes;
  log.replies = next.replies;
  log.ageHours = ageHours;
  log.updatedAt = now.toISOString();
  log.syncedAt = now.toISOString();
  return true;
}

async function syncMetrics(data, now) {
  const ids = [];
  const logsById = new Map();
  for (const log of data.logs) {
    const id = extractTweetId(log.tweetUrl);
    if (!id) continue;
    ids.push(id);
    logsById.set(id, log);
  }
  if (ids.length === 0) return 0;

  let updated = 0;

  if (BEARER) {
    const metricsMap = await fetchApiMetrics(ids);
    for (const [id, log] of logsById) {
      const metrics = metricsMap.get(id);
      if (!metrics) continue;
      if (applyMetrics(log, metrics, now)) updated++;
    }
    return updated;
  }

  for (const [id, log] of logsById) {
    try {
      const metrics = await fetchSyndication(id);
      await sleep(250);
      if (!metrics) continue;
      if (applyMetrics(log, metrics, now)) updated++;
    } catch (err) {
      console.error(`metrics ${id}:`, err.message);
    }
  }
  return updated;
}

async function main() {
  const now = new Date();
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const byId = new Map();
  for (const log of data.logs) {
    const id = extractTweetId(log.tweetUrl);
    if (id) byId.set(id, log);
  }

  let ingested = 0;
  if (BEARER) {
    ingested = await ingestTimeline(data, byId, now);
  } else {
    console.warn("X_BEARER_TOKEN not set — metrics only, no new-post ingest");
  }

  const metricsUpdated = await syncMetrics(data, now);

  data.logs.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  data.syncVersion = (data.syncVersion ?? 0) + 1;
  data.updatedAt = now.toISOString();

  const summary = { metricsUpdated, ingested, dryRun: DRY_RUN, bearer: !!BEARER };
  console.log(JSON.stringify(summary, null, 2));

  if (!DRY_RUN && (metricsUpdated > 0 || ingested > 0)) {
    writeFileSync(DATA_PATH, `${JSON.stringify(data, null, 2)}\n`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
