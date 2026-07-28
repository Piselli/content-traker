#!/usr/bin/env node
/**
 * Crypto Radar watcher — accumulate quietly, ntfy only on spike / pattern.
 *
 * Runs on GitHub Actions (free, no Cursor tokens, laptop off OK).
 *
 *   npm run radar:watch
 *   DRY_RUN=1 npm run radar:watch
 *
 * Env:
 *   NTFY_TOPIC — same as reminders (default piselliii-content-tracker)
 *   DRY_RUN=1  — no write / no ntfy
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createHash } from "crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "public/radar-data.json");
const STATE_PATH = join(ROOT, ".radar-watch-state.json");
const TOPIC = process.env.NTFY_TOPIC || "piselliii-content-tracker";
const DRY_RUN = process.env.DRY_RUN === "1";
const NOW = new Date();
const TODAY = NOW.toISOString().slice(0, 10);
const SCAN_ISO = NOW.toISOString();

/** RSS / Atom feeds — free, no API keys */
const FEEDS = [
  { id: "coindesk", url: "https://www.coindesk.com/arc/outboundfeeds/rss/" },
  { id: "thedefiant", url: "https://thedefiant.io/feed" },
  { id: "cointelegraph", url: "https://cointelegraph.com/rss" },
  { id: "decrypt", url: "https://decrypt.co/feed" },
  { id: "blockworks", url: "https://blockworks.co/feed" },
];

const LANE_RULES = [
  { lane: "failures-rugs", re: /\b(hack|exploit|breach|rug|insolven|shutdown|delist|drain|stolen|paused withdrawals|flash crash)\b/i },
  { lane: "regulation", re: /\b(SEC|CFTC|CLARITY|bill|senate|lawsuit|sues|enforcement|ban)\b/i },
  { lane: "capital-flows", re: /\b(ETF|ETP|inflow|outflow|AUM|treasury|raise|funding)\b/i },
  { lane: "perps-derivatives", re: /\b(perp|perpetual|open interest|OI|liquidat)\b/i },
  { lane: "rwa-compliance", re: /\b(RWA|tokeniz|permissioned|KYC|allowlist)\b/i },
  { lane: "bridges-liquidity", re: /\b(bridge|bridged|cross-?chain|net flow)\b/i },
  { lane: "stables-payments", re: /\b(stablecoin|USDC|USDT|Circle|Tether|payments rail)\b/i },
  { lane: "ai-crypto", re: /\b(AI agent|agentic|x402|LLM)\b/i },
  { lane: "cex-tradfi", re: /\b(Coinbase|Binance|Kalshi|Polymarket|prediction market|Morgan Stanley|BlackRock|Fidelity)\b/i },
  { lane: "incentives-campaigns", re: /\b(airdrop|points program|liquidity mining|incentive)\b/i },
  { lane: "l1-l2", re: /\b(Solana|Ethereum|Base|Arbitrum|Optimism|Tron|L2|mainnet|Alpenglow)\b/i },
  { lane: "defi-infra", re: /\b(Uniswap|Aave|DEX|AMM|Raydium|Morpho)\b/i },
  { lane: "memes-casino", re: /\b(memecoin|pump\.fun|PUMP|casino)\b/i },
];

/** Spike: notify even as a single signal — keep strict to avoid spam */
const SPIKE_RE =
  /\b((hack|exploit|breach|drain).{0,40}\$\d|\b\$\d+(\.\d+)?\s*(M|B|million|billion)\b.{0,40}(hack|exploit|drain|stolen)|rug\s*pull|exit\s*scam|insolven|wind(ing)?\s+down|shuts?\s+down|shutdown|paused withdrawals|flash crash|launches?\s+.{0,30}\b(ETF|ETP)s?\b|(ETF|ETP)s?\s+.{0,20}(launch|debut)|sues?\s+.{0,20}(SEC|CFTC|Coinbase|Binance|Apple))\b/i;

const CLUSTER_TAGS = [
  { tag: "wrappers-etf", re: /\b(ETF|ETP|BlackRock|Fidelity|Morgan Stanley|IBIT|ETHA|MSSE|MSOL)\b/i },
  { tag: "hl-perps-rwa", re: /\b(Hyperliquid|\bHYPE\b|permissioned pool|RWA perp)\b/i },
  { tag: "bridge-fail", re: /\b(bridge.{0,40}(hack|exploit|drain)|solver.{0,30}(breach|compromise)|HTLC)\b/i },
  { tag: "clarity-policy", re: /\b(CLARITY Act|Senate.{0,20}crypto|CFTC.{0,20}(sue|perp))\b/i },
  { tag: "l1-winners", re: /\b(TVL|DEX volume|chain fees|Alpenglow)\b/i },
  { tag: "stables-ai", re: /\b(stablecoin yield|Agent Stack|x402|Circle Agent)\b/i },
];

function slug(s, max = 40) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, max);
}

function shortHash(s) {
  return createHash("sha1").update(s).digest("hex").slice(0, 8);
}

function decodeXml(s) {
  return String(s || "")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .trim();
}

function pickTag(block, names) {
  for (const name of names) {
    const re = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i");
    const m = block.match(re);
    if (m) return decodeXml(m[1]);
  }
  return "";
}

function parseFeed(xml) {
  const items = [];
  const chunks = xml.match(/<item[\s>][\s\S]*?<\/item>|<entry[\s>][\s\S]*?<\/entry>/gi) || [];
  for (const block of chunks.slice(0, 25)) {
    const title = pickTag(block, ["title"]);
    let link =
      pickTag(block, ["link"]) ||
      (block.match(/<link[^>]+href=["']([^"']+)["']/i) || [])[1] ||
      "";
    link = link.replace(/\s+/g, "").trim();
    const pub =
      pickTag(block, ["pubDate", "published", "updated", "dc:date"]) || SCAN_ISO;
    if (!title || !link) continue;
    let at;
    try {
      at = new Date(pub).toISOString().slice(0, 10);
    } catch {
      at = TODAY;
    }
    if (Number.isNaN(Date.parse(at))) at = TODAY;
    items.push({ title, url: link, at, pubRaw: pub });
  }
  return items;
}

function classifyLane(title) {
  for (const rule of LANE_RULES) {
    if (rule.re.test(title)) return rule.lane;
  }
  return "narrative-rotation";
}

function classifyKind(title, lane) {
  if (lane === "failures-rugs") {
    if (/\b(hack|exploit|breach|drain|stolen)\b/i.test(title)) return "exploit";
    return "failure";
  }
  if (lane === "regulation") return "policy";
  if (lane === "capital-flows") return /\b(launch|debut|lists?)\b/i.test(title) ? "shipping" : "capital";
  if (lane === "incentives-campaigns") return "campaign";
  if (/\b(launch|ships?|introduc|debut|rolls? out)\b/i.test(title)) return "shipping";
  if (/\b(\$|volume|TVL|inflow|outflow|% )\b/i.test(title)) return "metric";
  return "narrative";
}

function isSpike(title) {
  return SPIKE_RE.test(title);
}

function clusterTags(title) {
  return CLUSTER_TAGS.filter((c) => c.re.test(title)).map((c) => c.tag);
}

function loadJson(path, fallback) {
  if (!existsSync(path)) return fallback;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return fallback;
  }
}

function saveJson(path, obj) {
  if (DRY_RUN) {
    console.log(`[dry-run] skip write ${path}`);
    return;
  }
  writeFileSync(path, `${JSON.stringify(obj, null, 2)}\n`);
}

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "content-tracker-radar-watch/1.0 (+github.com/Piselli/content-traker)",
      Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, */*",
    },
    signal: AbortSignal.timeout(25_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
  return res.text();
}

async function ntfy(title, message, tags = ["radar"], priority = "default") {
  console.log(`[ntfy] ${title} — ${message}`);
  if (DRY_RUN) return;
  const res = await fetch(`https://ntfy.sh/${TOPIC}`, {
    method: "POST",
    headers: {
      Title: title,
      Tags: tags.join(","),
      Priority: priority,
    },
    body: message,
  });
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}`);
}

function daysBetween(a, b) {
  return Math.abs(Date.parse(a) - Date.parse(b)) / 86_400_000;
}

function expireData(data) {
  const cutoff = new Date(NOW);
  cutoff.setUTCDate(cutoff.getUTCDate() - 14);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const angleSigs = new Set();
  for (const a of data.angles) {
    if (a.status === "open" || a.status === "ready") {
      for (const id of a.signalIds || []) angleSigs.add(id);
    }
    if ((a.status === "open" || a.status === "ready") && a.expiresAt) {
      if (Date.parse(a.expiresAt) < NOW.getTime()) {
        a.status = "expired";
        a.noteworthy = false;
      }
    }
  }

  for (const s of data.signals) {
    if (s.status !== "open") continue;
    if (s.at < cutoffStr && !angleSigs.has(s.id)) s.status = "expired";
  }

  // Cap open signals
  const open = data.signals.filter((s) => s.status === "open").sort((a, b) => b.at.localeCompare(a.at));
  if (open.length > 40) {
    for (const s of open.slice(40)) {
      if (!angleSigs.has(s.id)) s.status = "expired";
    }
  }
}

function ensureLane(data, id, label, watch) {
  if (!data.lanes.some((l) => l.id === id)) {
    data.lanes.push({ id, label, watch });
  }
}

async function main() {
  const data = loadJson(DATA_PATH, null);
  if (!data) throw new Error("missing public/radar-data.json");
  const state = loadJson(STATE_PATH, { notified: {}, lastRunAt: null });

  ensureLane(data, "failures-rugs", "Failures / rugs", "Shutdowns, rugs, exploits, violent dumps");

  const existingUrls = new Set(
    data.signals.map((s) => (s.url || "").split("?")[0].toLowerCase()).filter(Boolean),
  );
  const existingKeys = new Set(data.signals.map((s) => s.id));

  const fetched = [];
  for (const feed of FEEDS) {
    try {
      const xml = await fetchText(feed.url);
      const items = parseFeed(xml);
      console.log(`[feed] ${feed.id}: ${items.length} items`);
      for (const it of items) fetched.push({ ...it, source: feed.id });
    } catch (e) {
      console.warn(`[feed] ${feed.id} failed: ${e.message}`);
    }
  }

  // Prefer last ~5 days for new signals
  const freshCutoff = new Date(NOW);
  freshCutoff.setUTCDate(freshCutoff.getUTCDate() - 5);

  const candidates = [];
  for (const it of fetched) {
    const urlKey = it.url.split("?")[0].toLowerCase();
    if (existingUrls.has(urlKey)) continue;
    if (Date.parse(it.at) < freshCutoff.getTime() - 86_400_000) continue;

    // Skip pure price noise
    if (/^(bitcoin|btc|ethereum|eth)\s+(price|falls?|drops?|surges?|rises?)\b/i.test(it.title) && !isSpike(it.title)) {
      continue;
    }

    const lane = classifyLane(it.title);
    const kind = classifyKind(it.title, lane);
    const id = `sig-${it.at.replace(/-/g, "")}-${slug(it.title, 28)}-${shortHash(urlKey)}`;
    if (existingKeys.has(id)) continue;

    const spike = isSpike(it.title);
    candidates.push({
      score: spike ? 100 : 10,
      at: it.at,
      spike,
      signal: {
        id,
        at: it.at,
        scannedAt: SCAN_ISO,
        lane,
        kind,
        what: it.title.slice(0, 220),
        why: spike
          ? "Watcher spike: strong failure/shipping/capital headline — check for take."
          : "Watcher inbox — accumulate for clusters.",
        source: it.source,
        url: it.url,
        status: "open",
        tags: clusterTags(it.title),
        watcher: true,
      },
    });
  }

  // Prefer spikes, then newest; cap per run so cron doesn't flood JSON
  candidates.sort((a, b) => b.score - a.score || b.at.localeCompare(a.at));
  const MAX_NEW = 20;
  const added = [];
  const spikeIds = [];
  for (const c of candidates.slice(0, MAX_NEW)) {
    data.signals.push(c.signal);
    existingUrls.add((c.signal.url || "").split("?")[0].toLowerCase());
    existingKeys.add(c.signal.id);
    added.push(c.signal.id);
    if (c.spike) spikeIds.push(c.signal.id);
  }

  // Cluster by shared tags among open signals in last 7d
  const openRecent = data.signals.filter(
    (s) => s.status === "open" && daysBetween(s.at, TODAY) <= 7,
  );
  const byTag = new Map();
  for (const s of openRecent) {
    const tags = s.tags?.length ? s.tags : clusterTags(s.what);
    s.tags = tags;
    for (const t of tags) {
      if (!byTag.has(t)) byTag.set(t, []);
      byTag.get(t).push(s);
    }
  }

  const touchedAngles = [];
  const notifyPatterns = [];
  const addedSet = new Set(added);

  for (const [tag, sigs] of byTag) {
    const uniq = [...new Map(sigs.map((s) => [s.id, s])).values()];
    if (uniq.length < 2) continue;

    // Only evolve / notify clusters that gained a signal this run (avoids spam on every cron)
    const newInCluster = uniq.filter((s) => addedSet.has(s.id));
    if (newInCluster.length === 0) continue;

    const lanes = [...new Set(uniq.map((s) => s.lane))];
    const angId = `ang-watch-${tag}`;
    let ang = data.angles.find((a) => a.id === angId);
    const signalIds = uniq
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 6)
      .map((s) => s.id);
    const newest = uniq.map((s) => s.at).sort().at(-1);
    const freshEnough = daysBetween(newest, TODAY) <= 3;
    const thesis = `Watcher cluster [${tag}]: ${uniq.length} related receipts in ~7d across ${lanes.join(", ")}.`;
    const voiceHook = `Pattern forming: ${tag.replace(/-/g, " ")}.`;
    const expires = new Date(NOW);
    expires.setUTCDate(expires.getUTCDate() + 4);
    const shouldPing = freshEnough && newInCluster.length >= 1 && uniq.length >= 2;

    if (!ang || ang.status === "expired" || ang.status === "killed") {
      if (ang && (ang.status === "expired" || ang.status === "killed")) {
        // revive
      } else {
        ang = null;
      }
      const body = {
        id: angId,
        at: SCAN_ISO,
        thesis,
        voiceHook,
        signalIds,
        lanes,
        pattern: tag.includes("fail") || tag.includes("bridge") ? "failure-rug" : "same-week-convergence",
        suggestedType: tag.includes("fail") ? "provocative" : "hot topic",
        visualHint: `Receipts for ${tag}: dates + sources`,
        expiresAt: expires.toISOString(),
        status: "ready",
        noteworthy: shouldPing,
        watcher: true,
      };
      if (!ang) {
        data.angles.push(body);
        ang = body;
      } else {
        Object.assign(ang, body);
      }
      if (shouldPing) notifyPatterns.push(ang);
      touchedAngles.push(ang.id);
    } else {
      const before = new Set(ang.signalIds);
      const grew = signalIds.some((id) => !before.has(id));
      ang.signalIds = [...new Set([...ang.signalIds, ...signalIds])].slice(0, 8);
      ang.thesis = thesis;
      ang.voiceHook = voiceHook;
      ang.at = SCAN_ISO;
      ang.expiresAt = expires.toISOString();
      ang.status = "ready";
      ang.noteworthy = shouldPing && grew;
      if (ang.noteworthy) notifyPatterns.push(ang);
      touchedAngles.push(ang.id);
    }
  }

  // Cap ready/open angles
  const live = data.angles.filter((a) => a.status === "open" || a.status === "ready");
  if (live.length > 12) {
    const sorted = [...live].sort((a, b) => (a.at < b.at ? -1 : 1));
    for (const a of sorted.slice(0, live.length - 12)) {
      if (a.watcher) {
        a.status = "expired";
        a.noteworthy = false;
      }
    }
  }

  expireData(data);

  // Day note
  const day = {
    date: TODAY,
    at: SCAN_ISO,
    note: `Watcher: +${added.length} signals, spikes=${spikeIds.length}, patternPings=${notifyPatterns.length}.`,
    signalIdsAdded: added,
    angleIdsTouched: [...new Set(touchedAngles)],
    noteworthyIds: [...spikeIds, ...notifyPatterns.map((a) => a.id)],
  };
  data.days = data.days.filter((d) => !(d.date === TODAY && String(d.note || "").startsWith("Watcher:")));
  data.days.push(day);
  data.updatedAt = SCAN_ISO;

  saveJson(DATA_PATH, data);

  // Notify only for THIS run's spikes + patterns that gained new receipts
  let notified = 0;
  for (const id of spikeIds) {
    const key = `spike:${id}`;
    if (state.notified[key]) continue;
    const s = data.signals.find((x) => x.id === id);
    if (!s) continue;
    await ntfy(
      "Radar spike",
      `${s.what}\n${s.url || ""}\n→ напиши «радар» у Cursor якщо хочеш тейк`,
      ["warning", "radar"],
      "high",
    );
    state.notified[key] = SCAN_ISO;
    notified++;
  }

  for (const ang of notifyPatterns) {
    const key = `pattern:${ang.id}:${[...addedSet].filter((id) => ang.signalIds.includes(id)).sort().join(",")}`;
    if (state.notified[key]) continue;
    const lines = ang.signalIds
      .slice(0, 4)
      .map((id) => data.signals.find((s) => s.id === id))
      .filter(Boolean)
      .map((s) => `• ${s.at}: ${s.what.slice(0, 100)}`);
    await ntfy(
      "Radar pattern",
      `${ang.voiceHook}\n${ang.thesis}\n${lines.join("\n")}\n→ «радар» / PICK у Cursor`,
      ["chart_with_upwards_trend", "radar"],
      "default",
    );
    state.notified[key] = SCAN_ISO;
    notified++;
  }

  // Prune notify state
  const keys = Object.keys(state.notified);
  if (keys.length > 300) {
    for (const k of keys.slice(0, keys.length - 300)) delete state.notified[k];
  }
  state.lastRunAt = SCAN_ISO;
  saveJson(STATE_PATH, state);

  console.log(
    JSON.stringify(
      {
        added: added.length,
        spikes: spikeIds.length,
        patterns: notifyPatterns.length,
        notified,
        dryRun: DRY_RUN,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
