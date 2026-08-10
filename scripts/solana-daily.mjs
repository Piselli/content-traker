#!/usr/bin/env node
/**
 * Solana daily metrics + quiet Solana-only news signals.
 *
 * Like radar, but Solana-exclusive. DefiLlama free endpoints + RSS.
 * ntfy ONLY on metric spikes vs 7d median (not every day).
 *
 *   npm run solana:daily
 *   DRY_RUN=1 npm run solana:daily
 *
 * Chat trigger for agent: «solana день» / `solana day`
 *   → read public/solana-daily.json + stonkfun-revenue.json
 *   → UA: fresh numbers + 1–2 tweet ideas
 *
 * Env:
 *   NTFY_TOPIC — default piselliii-content-tracker
 *   NTFY=0     — skip push
 *   DRY_RUN=1  — no write / no ntfy
 *   SPIKE_PCT  — abs % vs 7d median to notify (default 25)
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "public/solana-daily.json");
const STONK_PATH = join(ROOT, "public/stonkfun-revenue.json");
const TOPIC = process.env.NTFY_TOPIC || "piselliii-content-tracker";
const DRY_RUN = process.env.DRY_RUN === "1";
const NTFY_OFF = process.env.NTFY === "0";
const SPIKE_PCT = Number(process.env.SPIKE_PCT || 25);

const LL = "https://api.llama.fi";

/** Solana-focused feeds — quiet ingest, not a CT timeline scrape */
const FEEDS = [
  { id: "solana-compass", url: "https://solanacompass.com/rss.xml" },
  { id: "solana-floor", url: "https://solanafloor.com/feed" },
  { id: "helius", url: "https://www.helius.dev/blog/rss.xml" },
  { id: "blockworks", url: "https://blockworks.co/feed" },
  { id: "thedefiant", url: "https://thedefiant.io/feed" },
];

const SOLANA_RE =
  /\b(solana|\bsol\b|\$sol|jupiter|raydium|meteora|pump\.fun|phantom|helius|jito|marinade|kamino|drift|tensor|magic eden|orca|axiom|gmgn|stonkfun|launchonsf)\b/i;

function utcDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function emptyData() {
  return {
    updatedAt: null,
    source: "defillama + solana RSS",
    latest: null,
    days: [],
    signals: [],
    spikes: [],
  };
}

function load() {
  if (!existsSync(DATA_PATH)) return emptyData();
  return JSON.parse(readFileSync(DATA_PATH, "utf8"));
}

function save(data) {
  data.updatedAt = new Date().toISOString();
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
}

function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return "n/a";
  const a = Math.abs(n);
  if (a >= 1e9) return `$${(n / 1e9).toFixed(2)}B`;
  if (a >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${Math.round(n)}`;
}

function pct(n) {
  if (n == null || Number.isNaN(n)) return null;
  return Math.round(n * 10) / 10;
}

function median(nums) {
  const a = nums.filter((x) => x != null && !Number.isNaN(x)).sort((x, y) => x - y);
  if (!a.length) return null;
  const m = Math.floor(a.length / 2);
  return a.length % 2 ? a[m] : (a[m - 1] + a[m]) / 2;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "content-tracker-solana-daily/1.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

async function pullLlama() {
  const [chains, fees, revenue, dexs] = await Promise.all([
    fetchJson(`${LL}/v2/chains`),
    fetchJson(
      `${LL}/overview/fees/solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    ),
    fetchJson(
      `${LL}/overview/fees/solana?dataType=dailyRevenue&excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    ),
    fetchJson(
      `${LL}/overview/dexs/solana?excludeTotalDataChart=true&excludeTotalDataChartBreakdown=true`,
    ),
  ]);

  const sol = (chains || []).find((c) => c.name === "Solana") || {};

  const topFees = [...(fees.protocols || [])]
    .filter((p) => p.total24h)
    .sort((a, b) => b.total24h - a.total24h)
    .slice(0, 10)
    .map((p) => ({
      name: p.displayName || p.name,
      category: p.category || null,
      fees24h: p.total24h,
    }));

  const topRevenue = [...(revenue.protocols || [])]
    .filter((p) => p.total24h)
    .sort((a, b) => b.total24h - a.total24h)
    .slice(0, 10)
    .map((p) => ({
      name: p.displayName || p.name,
      category: p.category || null,
      revenue24h: p.total24h,
    }));

  return {
    at: new Date().toISOString(),
    date: utcDate(),
    tvlUsd: sol.tvl ?? null,
    fees24hUsd: fees.total24h ?? null,
    feesChange1dPct: pct(fees.change_1d),
    revenue24hUsd: revenue.total24h ?? null,
    revenueChange1dPct: pct(revenue.change_1d),
    dexVolume24hUsd: dexs.total24h ?? null,
    dexChange1dPct: pct(dexs.change_1d),
    topFees,
    topRevenue,
  };
}

function readStonkfun() {
  if (!existsSync(STONK_PATH)) return null;
  try {
    const s = JSON.parse(readFileSync(STONK_PATH, "utf8"));
    const open = (s.days || []).find((d) => !d.closed);
    const closed = (s.days || []).filter((d) => d.closed).slice(-3);
    return {
      latestTotalUsd: s.latest?.totalRevenueUsd ?? null,
      todayOpenUsd: open?.openTotalUsd ?? null,
      todaySoFarUsd:
        s.latest?.totalRevenueUsd != null && open?.openTotalUsd != null
          ? s.latest.totalRevenueUsd - open.openTotalUsd
          : null,
      recentClosed: closed.map((d) => ({
        date: d.date,
        revenueUsd: d.revenueUsd,
      })),
    };
  } catch {
    return null;
  }
}

function decodeXml(s) {
  return String(s)
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseRss(xml, feedId) {
  const items = [];
  const blocks = xml.split(/<item[\s>]/i).slice(1);
  for (const block of blocks.slice(0, 12)) {
    const title = decodeXml((block.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || "").trim();
    const link = decodeXml(
      (block.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
        block.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i) ||
        [])[1] || "",
    ).trim();
    const pub =
      (block.match(/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i) ||
        block.match(/<published[^>]*>([\s\S]*?)<\/published>/i) ||
        [])[1] || "";
    if (!title || !link) continue;
    items.push({ feedId, title, url: link, publishedAt: pub ? new Date(pub).toISOString() : null });
  }
  return items;
}

async function pullSolanaNews() {
  const out = [];
  for (const feed of FEEDS) {
    try {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "content-tracker-solana-daily/1.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseRss(xml, feed.id)) {
        // SolanaFloor / Compass / Helius: keep all. Cross-chain feeds: Solana filter.
        const always = feed.id === "solana-compass" || feed.id === "solana-floor" || feed.id === "helius";
        if (!always && !SOLANA_RE.test(item.title)) continue;
        const id = `sol-${feed.id}-${createHash("sha1").update(item.url).digest("hex").slice(0, 10)}`;
        out.push({
          id,
          lane: "solana",
          title: item.title,
          url: item.url,
          feedId: feed.id,
          at: item.publishedAt || new Date().toISOString(),
          ingestedAt: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.warn(`[feed skip] ${feed.id}: ${e.message}`);
    }
  }
  return out;
}

const METRIC_KEYS = [
  { key: "tvlUsd", label: "TVL" },
  { key: "fees24hUsd", label: "fees 24h" },
  { key: "revenue24hUsd", label: "revenue 24h" },
  { key: "dexVolume24hUsd", label: "DEX vol 24h" },
];

function detectSpikes(days, latest) {
  const closed = days.filter((d) => d.metrics).slice(-8, -1); // prior days, exclude today if present
  const hist = closed.length ? closed : days.filter((d) => d.date !== latest.date).slice(-7);
  const spikes = [];
  for (const { key, label } of METRIC_KEYS) {
    const cur = latest[key];
    if (cur == null) continue;
    const med = median(hist.map((d) => d.metrics?.[key]));
    if (med == null || med === 0) continue;
    const changePct = ((cur - med) / med) * 100;
    if (Math.abs(changePct) >= SPIKE_PCT) {
      spikes.push({
        metric: key,
        label,
        value: cur,
        median7d: med,
        changePct: Math.round(changePct * 10) / 10,
        at: latest.at,
        date: latest.date,
      });
    }
  }
  return spikes;
}

function upsertDay(data, metrics) {
  let day = data.days.find((d) => d.date === metrics.date);
  if (!day) {
    day = { date: metrics.date, metrics: null, stonkfun: null };
    data.days.push(day);
  }
  day.metrics = metrics;
  day.stonkfun = readStonkfun();
  data.days.sort((a, b) => a.date.localeCompare(b.date));
  // keep ~60 days
  if (data.days.length > 60) data.days = data.days.slice(-60);
  return day;
}

async function ntfy(title, message) {
  if (NTFY_OFF) {
    console.log(`[ntfy skipped] ${title}: ${message}`);
    return;
  }
  console.log(`[ntfy] ${title}: ${message}`);
  const res = await fetch(`https://ntfy.sh/${TOPIC}`, {
    method: "POST",
    headers: {
      Title: title,
      Tags: "chart_with_upwards_trend,solana",
      Priority: "default",
    },
    body: message,
  });
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}`);
}

async function main() {
  const data = load();
  const metrics = await pullLlama();
  data.latest = metrics;
  upsertDay(data, metrics);

  const news = await pullSolanaNews();
  const existing = new Set((data.signals || []).map((s) => s.id));
  let added = 0;
  for (const s of news) {
    if (existing.has(s.id)) continue;
    data.signals.unshift(s);
    existing.add(s.id);
    added++;
  }
  data.signals = (data.signals || []).slice(0, 200);

  const spikes = detectSpikes(data.days, metrics);
  // only notify new spikes (same metric+date not already sent)
  const prevSpikeKeys = new Set(
    (data.spikes || []).map((s) => `${s.date}:${s.metric}`),
  );
  const freshSpikes = spikes.filter((s) => !prevSpikeKeys.has(`${s.date}:${s.metric}`));
  data.spikes = [...spikes, ...(data.spikes || []).filter((s) => s.date !== metrics.date)].slice(
    0,
    50,
  );

  console.log(
    `[solana] ${metrics.date} TVL=${fmtUsd(metrics.tvlUsd)} fees=${fmtUsd(metrics.fees24hUsd)} rev=${fmtUsd(metrics.revenue24hUsd)} dex=${fmtUsd(metrics.dexVolume24hUsd)} news+${added} spikes=${freshSpikes.length}`,
  );

  if (!DRY_RUN) {
    save(data);
    console.log(`[wrote] ${DATA_PATH}`);
  } else {
    console.log("[dry-run] no write");
  }

  for (const s of freshSpikes) {
    const dir = s.changePct >= 0 ? "+" : "";
    const msg = `${s.label} ${fmtUsd(s.value)} (${dir}${s.changePct}% vs 7d median ${fmtUsd(s.median7d)})`;
    if (!DRY_RUN) await ntfy(`Solana spike · ${s.date}`, msg);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
