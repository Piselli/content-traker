#!/usr/bin/env node
/**
 * Solana daily → tweet-fuel patterns (not a metrics digest).
 *
 * Pulls Llama + RSS + StonkFun embed, then runs detectors:
 *   ATH / multi-week high, rank flip, share shift, fees↔DEX divergence,
 *   cross-chain gap, spike vs 7d median, StonkFun vs Llama boards.
 *
 * ntfy ONLY when a fresh pattern/spike fires (not every morning).
 *
 *   npm run solana:daily
 *   DRY_RUN=1 npm run solana:daily
 *
 * Chat: «solana день» → read angles[] + 1–2 tweet ideas (quiet if empty).
 *
 * Env: NTFY_TOPIC, NTFY=0, DRY_RUN=1, SPIKE_PCT (default 25)
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
const COMPARE_CHAINS = ["Ethereum", "Base", "BSC", "Arbitrum", "Solana"];

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
    source: "defillama + solana RSS + pattern detectors",
    latest: null,
    days: [],
    signals: [],
    spikes: [],
    patterns: [],
    angles: [],
  };
}

function load() {
  if (!existsSync(DATA_PATH)) return emptyData();
  const d = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  d.patterns ||= [];
  d.angles ||= [];
  d.spikes ||= [];
  d.signals ||= [];
  d.days ||= [];
  return d;
}

function save(data) {
  data.updatedAt = new Date().toISOString();
  data.source = "defillama + solana RSS + pattern detectors";
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

function maxOf(nums) {
  const a = nums.filter((x) => x != null && !Number.isNaN(x));
  return a.length ? Math.max(...a) : null;
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "content-tracker-solana-daily/2.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.json();
}

function mapTop(list, valueKey) {
  return [...(list || [])]
    .filter((p) => p.total24h)
    .sort((a, b) => b.total24h - a.total24h)
    .slice(0, 12)
    .map((p) => ({
      name: p.displayName || p.name,
      category: p.category || null,
      [valueKey]: p.total24h,
    }));
}

/** last N daily points from Llama totalDataChart [[tsMs, value], ...] */
function chartTail(chart, days = 90) {
  if (!Array.isArray(chart) || !chart.length) return [];
  return chart.slice(-days).map(([ts, v]) => ({
    date: new Date(ts * 1000).toISOString().slice(0, 10),
    value: v,
  }));
}

async function pullLlama() {
  const [chains, fees, revenue, dexs, ethFees, baseFees] = await Promise.all([
    fetchJson(`${LL}/v2/chains`),
    fetchJson(`${LL}/overview/fees/solana`),
    fetchJson(
      `${LL}/overview/fees/solana?dataType=dailyRevenue`,
    ),
    fetchJson(`${LL}/overview/dexs/solana`),
    fetchJson(`${LL}/overview/fees/ethereum`).catch(() => null),
    fetchJson(`${LL}/overview/fees/base`).catch(() => null),
  ]);

  const sol = (chains || []).find((c) => c.name === "Solana") || {};
  const feesChart = chartTail(fees.totalDataChart, 90);
  const revChart = chartTail(revenue.totalDataChart, 90);
  const dexChart = chartTail(dexs.totalDataChart, 90);

  const chainFees = {};
  for (const c of COMPARE_CHAINS) {
    const row = (chains || []).find((x) => x.name === c);
    if (row) chainFees[c] = { tvlUsd: row.tvl ?? null };
  }
  chainFees.Solana = {
    ...(chainFees.Solana || {}),
    fees24hUsd: fees.total24h ?? null,
    revenue24hUsd: revenue.total24h ?? null,
    dexVolume24hUsd: dexs.total24h ?? null,
  };
  if (ethFees) chainFees.Ethereum = { ...(chainFees.Ethereum || {}), fees24hUsd: ethFees.total24h ?? null };
  if (baseFees) chainFees.Base = { ...(chainFees.Base || {}), fees24hUsd: baseFees.total24h ?? null };

  const topFees = mapTop(fees.protocols, "fees24h");
  const topRevenue = mapTop(revenue.protocols, "revenue24h");

  const launchpadFees = topFees
    .filter((p) => /launchpad|pump\.fun/i.test(`${p.category} ${p.name}`))
    .reduce((s, p) => s + (p.fees24h || 0), 0);
  const dexFees = topFees
    .filter((p) => /dex/i.test(p.category || ""))
    .reduce((s, p) => s + (p.fees24h || 0), 0);
  const appFees = topFees
    .filter((p) => /trading app|telegram bot|bot/i.test(p.category || ""))
    .reduce((s, p) => s + (p.fees24h || 0), 0);
  const totalTop = topFees.reduce((s, p) => s + (p.fees24h || 0), 0) || 1;

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
    shares: {
      launchpadPct: Math.round((launchpadFees / totalTop) * 1000) / 10,
      dexPct: Math.round((dexFees / totalTop) * 1000) / 10,
      appsBotsPct: Math.round((appFees / totalTop) * 1000) / 10,
    },
    chainFees,
    history: {
      fees90d: feesChart,
      revenue90d: revChart,
      dex90d: dexChart,
    },
  };
}

function readStonkfun() {
  if (!existsSync(STONK_PATH)) return null;
  try {
    const s = JSON.parse(readFileSync(STONK_PATH, "utf8"));
    const open = (s.days || []).find((d) => !d.closed);
    const closed = (s.days || []).filter((d) => d.closed).slice(-7);
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
        headers: { "User-Agent": "content-tracker-solana-daily/2.0" },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const xml = await res.text();
      for (const item of parseRss(xml, feed.id)) {
        const always =
          feed.id === "solana-compass" || feed.id === "solana-floor" || feed.id === "helius";
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
  const hist = days.filter((d) => d.date !== latest.date && d.metrics).slice(-7);
  const spikes = [];
  for (const { key, label } of METRIC_KEYS) {
    const cur = latest[key];
    if (cur == null) continue;
    const med = median(hist.map((d) => d.metrics?.[key]));
    if (med == null || med === 0) continue;
    const changePct = ((cur - med) / med) * 100;
    if (Math.abs(changePct) >= SPIKE_PCT) {
      spikes.push({
        kind: "spike",
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

/** Build tweet-fuel patterns from today vs history / peers */
function detectPatterns(data, metrics, stonk) {
  const date = metrics.date;
  const at = metrics.at;
  const out = [];
  const histDays = data.days.filter((d) => d.date !== date && d.metrics).slice(-30);

  // --- ATH / multi-week high (from Llama 90d chart, exclude today if last point) ---
  for (const [chartKey, label, metricKey] of [
    ["fees90d", "fees 24h", "fees24hUsd"],
    ["revenue90d", "revenue 24h", "revenue24hUsd"],
    ["dex90d", "DEX vol 24h", "dexVolume24hUsd"],
  ]) {
    const series = metrics.history?.[chartKey] || [];
    const prior = series.slice(0, -1).map((p) => p.value);
    const cur = metrics[metricKey];
    const peak = maxOf(prior);
    if (cur != null && peak != null && cur >= peak * 0.995) {
      out.push({
        id: `ath-${metricKey}-${date}`,
        kind: "ath",
        date,
        at,
        strength: "high",
        title: `Solana ${label} at/near 90d high`,
        detail: `${fmtUsd(cur)} vs prior peak ${fmtUsd(peak)}`,
        tweetHook: `Solana ${label} just printed a ~90d high (${fmtUsd(cur)}). CT still debating vibes.`,
      });
    }
  }

  // --- Rank flip in top fees ---
  const prev = histDays.at(-1)?.metrics?.topFees;
  const curTop = metrics.topFees || [];
  if (prev?.length && curTop.length) {
    const prevRank = new Map(prev.map((p, i) => [p.name, i]));
    for (let i = 0; i < Math.min(5, curTop.length); i++) {
      const name = curTop[i].name;
      const old = prevRank.get(name);
      if (old != null && old > i && old - i >= 2) {
        out.push({
          id: `flip-${name.replace(/\W+/g, "").slice(0, 20)}-${date}`,
          kind: "rank-flip",
          date,
          at,
          strength: "med",
          title: `${name} climbed fees board (#${old + 1} → #${i + 1})`,
          detail: `${fmtUsd(curTop[i].fees24h)} fees 24h`,
          tweetHook: `${name} just jumped ${old - i} spots on Solana fees (#${old + 1} → #${i + 1}). Rank flips > vibes.`,
        });
      }
    }
    // #1 changed
    if (prev[0]?.name && curTop[0]?.name && prev[0].name !== curTop[0].name) {
      out.push({
        id: `leader-${curTop[0].name.replace(/\W+/g, "").slice(0, 20)}-${date}`,
        kind: "leader-change",
        date,
        at,
        strength: "high",
        title: `Fees leader: ${prev[0].name} → ${curTop[0].name}`,
        detail: `${curTop[0].name} ${fmtUsd(curTop[0].fees24h)} vs old #1 ${prev[0].name}`,
        tweetHook: `Solana fees crown flipped: ${prev[0].name} → ${curTop[0].name}. Attention follows the printer.`,
      });
    }
  }

  // --- Share shift (launchpad / apps) ---
  const prevShares = histDays.at(-1)?.metrics?.shares;
  const shares = metrics.shares;
  if (shares && prevShares) {
    for (const [key, label] of [
      ["launchpadPct", "launchpad"],
      ["appsBotsPct", "apps/bots"],
      ["dexPct", "DEX"],
    ]) {
      const delta = (shares[key] ?? 0) - (prevShares[key] ?? 0);
      if (Math.abs(delta) >= 8) {
        out.push({
          id: `share-${key}-${date}`,
          kind: "share-shift",
          date,
          at,
          strength: Math.abs(delta) >= 12 ? "high" : "med",
          title: `${label} fee share ${delta > 0 ? "+" : ""}${delta.toFixed(1)}pp`,
          detail: `now ${shares[key]}% (was ${prevShares[key]}%)`,
          tweetHook: `Solana fee mix shifted: ${label} ${delta > 0 ? "ate" : "lost"} ${Math.abs(delta).toFixed(1)}pp in a day. Chain story = fee mix, not TVL cosplay.`,
        });
      }
    }
  }

  // --- Divergence: DEX vol vs fees ---
  if (metrics.dexChange1dPct != null && metrics.feesChange1dPct != null) {
    const gap = metrics.dexChange1dPct - metrics.feesChange1dPct;
    if (Math.abs(gap) >= 20) {
      out.push({
        id: `div-dex-fees-${date}`,
        kind: "divergence",
        date,
        at,
        strength: "med",
        title: `DEX vol vs fees divergence (${gap > 0 ? "+" : ""}${gap.toFixed(1)}pp)`,
        detail: `DEX ${metrics.dexChange1dPct}% / fees ${metrics.feesChange1dPct}% (1d)`,
        tweetHook:
          gap > 0
            ? `Solana DEX volume up, fees not following. Volume without take rate is just noise.`
            : `Solana fees up while DEX vol lags — apps/launchpads extracting harder than spot flow.`,
      });
    }
  }

  // --- Cross-chain fees ---
  const solF = metrics.chainFees?.Solana?.fees24hUsd;
  const ethF = metrics.chainFees?.Ethereum?.fees24hUsd;
  const baseF = metrics.chainFees?.Base?.fees24hUsd;
  if (solF != null && ethF != null && solF > ethF) {
    out.push({
      id: `xchain-sol-gt-eth-${date}`,
      kind: "cross-chain",
      date,
      at,
      strength: "high",
      title: `Solana fees > Ethereum (${fmtUsd(solF)} vs ${fmtUsd(ethF)})`,
      detail: baseF != null ? `Base ${fmtUsd(baseF)}` : "",
      tweetHook: `Solana fees (${fmtUsd(solF)}) > Ethereum (${fmtUsd(ethF)}) today. Narratives update slower than printers.`,
    });
  }
  if (solF != null && baseF != null && solF > baseF * 3) {
    out.push({
      id: `xchain-sol-vs-base-${date}`,
      kind: "cross-chain",
      date,
      at,
      strength: "low",
      title: `Solana fees ≫ Base (${fmtUsd(solF)} vs ${fmtUsd(baseF)})`,
      detail: "",
      tweetHook: `Solana still printing ~${(solF / Math.max(baseF, 1)).toFixed(1)}× Base fees. L2 discourse ≠ fee reality.`,
    });
  }

  // --- StonkFun missing from Llama boards ---
  if (stonk?.latestTotalUsd != null || stonk?.todaySoFarUsd != null) {
    const names = new Set(
      [...(metrics.topFees || []), ...(metrics.topRevenue || [])].map((p) =>
        (p.name || "").toLowerCase(),
      ),
    );
    const onBoard = [...names].some((n) => /stonk/.test(n));
    if (!onBoard) {
      out.push({
        id: `stonk-gap-${date}`,
        kind: "stonkfun-gap",
        date,
        at,
        strength: "med",
        title: "StonkFun still absent from Llama Solana fee boards",
        detail: `SF today-so-far ${fmtUsd(stonk.todaySoFarUsd)} · total ${fmtUsd(stonk.latestTotalUsd)}`,
        tweetHook: `Still won't see StonkFun on DefiLlama Solana roundups. Boards ≠ printers.`,
      });
    }
  }

  // --- Weird fees/TVL ratio vs recent median ---
  if (metrics.fees24hUsd != null && metrics.tvlUsd) {
    const ratio = metrics.fees24hUsd / metrics.tvlUsd;
    const histRatios = histDays
      .map((d) => {
        const f = d.metrics?.fees24hUsd;
        const t = d.metrics?.tvlUsd;
        return f != null && t ? f / t : null;
      })
      .filter((x) => x != null);
    const medR = median(histRatios);
    if (medR && ratio > medR * 1.5) {
      out.push({
        id: `fees-tvl-${date}`,
        kind: "weird-ratio",
        date,
        at,
        strength: "med",
        title: `Fees/TVL elevated vs recent median`,
        detail: `today ${(ratio * 100).toFixed(3)}% · median ${(medR * 100).toFixed(3)}%`,
        tweetHook: `Solana fees/TVL running hot vs its own recent baseline. Extraction > deposits.`,
      });
    }
  }

  return out;
}

function patternsToAngles(patterns) {
  return patterns
    .filter((p) => p.strength === "high" || p.strength === "med")
    .slice(0, 6)
    .map((p) => ({
      id: `angle-${p.id}`,
      status: "ready",
      patternId: p.id,
      kind: p.kind,
      date: p.date,
      at: p.at,
      title: p.title,
      hook: p.tweetHook,
      detail: p.detail,
    }));
}

function upsertDay(data, metrics) {
  let day = data.days.find((d) => d.date === metrics.date);
  if (!day) {
    day = { date: metrics.date, metrics: null, stonkfun: null };
    data.days.push(day);
  }
  // don't persist full 90d charts into every day (bloat) — strip history on disk day
  const { history, ...rest } = metrics;
  day.metrics = { ...rest, historyDays: history?.fees90d?.length ?? 0 };
  day.stonkfun = readStonkfun();
  data.days.sort((a, b) => a.date.localeCompare(b.date));
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
  const stonk = readStonkfun();
  // keep history on latest only (for detectors this run)
  data.latest = { ...metrics };
  delete data.latest.history; // slim latest; patterns carry the takeaway
  data.latest.historyDays = metrics.history?.fees90d?.length ?? 0;
  data.latest.shares = metrics.shares;
  data.latest.chainFees = metrics.chainFees;
  data.latest.topFees = metrics.topFees;
  data.latest.topRevenue = metrics.topRevenue;
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
  const patterns = detectPatterns(data, metrics, stonk);
  // fold spike-as-pattern for angles
  for (const s of spikes) {
    patterns.push({
      id: `spike-${s.metric}-${s.date}`,
      kind: "spike",
      date: s.date,
      at: s.at,
      strength: Math.abs(s.changePct) >= 40 ? "high" : "med",
      title: `${s.label} ${s.changePct >= 0 ? "+" : ""}${s.changePct}% vs 7d median`,
      detail: `${fmtUsd(s.value)} vs med ${fmtUsd(s.median7d)}`,
      tweetHook: `Solana ${s.label}: ${fmtUsd(s.value)} (${s.changePct >= 0 ? "+" : ""}${s.changePct}% vs ~7d median).`,
    });
  }

  const prevPat = new Set((data.patterns || []).map((p) => p.id));
  const freshPatterns = patterns.filter((p) => !prevPat.has(p.id));
  data.patterns = [...patterns, ...(data.patterns || []).filter((p) => p.date !== metrics.date)].slice(
    0,
    80,
  );

  const angles = patternsToAngles(patterns);
  // replace today's ready angles; keep older unused briefly
  data.angles = [
    ...angles,
    ...(data.angles || []).filter((a) => a.date !== metrics.date && a.status !== "used"),
  ].slice(0, 40);

  const prevSpikeKeys = new Set((data.spikes || []).map((s) => `${s.date}:${s.metric}`));
  const freshSpikes = spikes.filter((s) => !prevSpikeKeys.has(`${s.date}:${s.metric}`));
  data.spikes = [...spikes, ...(data.spikes || []).filter((s) => s.date !== metrics.date)].slice(
    0,
    50,
  );

  console.log(
    `[solana] ${metrics.date} TVL=${fmtUsd(metrics.tvlUsd)} fees=${fmtUsd(metrics.fees24hUsd)} rev=${fmtUsd(metrics.revenue24hUsd)} dex=${fmtUsd(metrics.dexVolume24hUsd)} news+${added} patterns=${patterns.length} fresh=${freshPatterns.length} angles=${angles.length}`,
  );
  for (const p of patterns.slice(0, 8)) {
    console.log(`  · [${p.kind}/${p.strength}] ${p.title}`);
  }

  if (!DRY_RUN) {
    save(data);
    console.log(`[wrote] ${DATA_PATH}`);
  } else {
    console.log("[dry-run] no write");
  }

  // ntfy: fresh high/med patterns (cap 3) + classic spikes
  const notify = [
    ...freshPatterns.filter((p) => p.strength === "high" || p.strength === "med").slice(0, 3),
  ];
  for (const p of notify) {
    if (!DRY_RUN) await ntfy(`Solana · ${p.kind}`, `${p.title}\n${p.tweetHook}`);
  }
  for (const s of freshSpikes) {
    if (notify.some((p) => p.id === `spike-${s.metric}-${s.date}`)) continue;
    const dir = s.changePct >= 0 ? "+" : "";
    const msg = `${s.label} ${fmtUsd(s.value)} (${dir}${s.changePct}% vs 7d median ${fmtUsd(s.median7d)})`;
    if (!DRY_RUN) await ntfy(`Solana spike · ${s.date}`, msg);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
