#!/usr/bin/env node
/**
 * StonkFun revenue tracker (UTC) — snapshot-based day boundaries.
 *
 * Every run:
 *   1) Pull totals → append to snapshots[]
 *   2) Recompute day open/close from snapshot nearest UTC midnight
 *   3) ntfy once when a day first closes cleanly
 *
 * This survives missed 00:05 GH cron: hourly runs still close days using
 * the snapshot closest to midnight (not “whenever the job woke up”).
 *
 *   npm run stonkfun:daily
 *   DRY_RUN=1 npm run stonkfun:daily
 *
 * Env: NTFY_TOPIC, NTFY=0, DRY_RUN=1
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA_PATH = join(ROOT, "public/stonkfun-revenue.json");
const TOPIC = process.env.NTFY_TOPIC || "piselliii-content-tracker";
const DRY_RUN = process.env.DRY_RUN === "1";
const NTFY_OFF = process.env.NTFY === "0";

/** Prefer snapshots within this skew of UTC midnight for a “clean” close */
const CLEAN_SKEW_MS = 90 * 60 * 1000;
/** Keep ~16 days of hourly points */
const MAX_SNAPSHOTS = 24 * 16;
const API = "https://www.stonkfun.xyz/api/public/v1";

function utcDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function midnightMs(dateStr) {
  return Date.parse(`${dateStr}T00:00:00.000Z`);
}

function nextUtcDate(dateStr) {
  return new Date(midnightMs(dateStr) + 86400000).toISOString().slice(0, 10);
}

function prevUtcDate(dateStr) {
  return new Date(midnightMs(dateStr) - 86400000).toISOString().slice(0, 10);
}

function emptyData() {
  return {
    updatedAt: null,
    source: "https://www.stonkfun.xyz/api/public/v1/revenue",
    latest: null,
    snapshots: [],
    days: [],
  };
}

function load() {
  if (!existsSync(DATA_PATH)) return emptyData();
  const d = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  d.snapshots ||= [];
  d.days ||= [];
  return d;
}

function save(data) {
  data.updatedAt = new Date().toISOString();
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + "\n");
}

async function fetchJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { "User-Agent": "content-tracker-stonkfun-daily/2.0" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} ${path}`);
  return res.json();
}

async function pullTotals() {
  const [revBody, statsBody] = await Promise.all([
    fetchJson("/revenue?limit=1"),
    fetchJson("/stats"),
  ]);
  const rev = revBody.data.revenue;
  const tokens = statsBody.data.tokens;
  const at = revBody.meta?.generatedAt || new Date().toISOString();
  return {
    at,
    totalRevenueUsd: rev.totalRevenueUsd,
    totalBuybackUsd: rev.totalBuybackUsd,
    buybackCount: rev.buybackCount,
    volume24hUsd: tokens.totalVolume24hUsd,
    tokensTotal: tokens.total,
    graduated: tokens.graduated,
  };
}

function fmtUsd(n) {
  if (n == null || Number.isNaN(n)) return "n/a";
  return `$${Math.round(n).toLocaleString("en-US")}`;
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
      Tags: "chart_with_upwards_trend,stonk",
      Priority: "default",
    },
    body: message,
  });
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}`);
}

function pushSnapshot(data, totals) {
  const at = totals.at || new Date().toISOString();
  const last = data.snapshots[data.snapshots.length - 1];
  // Dedup if same minute + same total
  if (
    last &&
    Math.abs(Date.parse(last.at) - Date.parse(at)) < 60_000 &&
    Math.abs((last.totalRevenueUsd || 0) - totals.totalRevenueUsd) < 0.01
  ) {
    return last;
  }
  const snap = {
    at,
    totalRevenueUsd: totals.totalRevenueUsd,
    totalBuybackUsd: totals.totalBuybackUsd,
    buybackCount: totals.buybackCount,
    volume24hUsd: totals.volume24hUsd,
    tokensTotal: totals.tokensTotal,
  };
  data.snapshots.push(snap);
  if (data.snapshots.length > MAX_SNAPSHOTS) {
    data.snapshots = data.snapshots.slice(-MAX_SNAPSHOTS);
  }
  return snap;
}

/** Snapshot closest to target epoch ms */
function nearestSnapshot(snapshots, targetMs) {
  if (!snapshots.length) return null;
  let best = null;
  let bestDist = Infinity;
  for (const s of snapshots) {
    const t = Date.parse(s.at);
    if (Number.isNaN(t)) continue;
    const dist = Math.abs(t - targetMs);
    if (dist < bestDist) {
      bestDist = dist;
      best = { snap: s, distMs: dist };
    }
  }
  return best;
}

function findDay(data, date) {
  return data.days.find((d) => d.date === date);
}

function upsertDay(data, date) {
  let day = findDay(data, date);
  if (!day) {
    day = {
      date,
      openTotalUsd: null,
      closeTotalUsd: null,
      revenueUsd: null,
      closed: false,
      notified: false,
      openAt: null,
      closeAt: null,
      openSkewMin: null,
      closeSkewMin: null,
      approximate: false,
    };
    data.days.push(day);
    data.days.sort((a, b) => a.date.localeCompare(b.date));
  }
  return day;
}

/**
 * Rebuild open/close for a UTC calendar day from snapshots nearest midnights.
 * Frozen days (notified or legacy closed without snapshots) are left alone.
 */
function reconcileDay(data, date, nowMs) {
  const day = upsertDay(data, date);
  if (day.notified || day.freeze) return { day, newlyClosed: false };

  const openBound = midnightMs(date);
  const closeBound = midnightMs(nextUtcDate(date));
  const openHit = nearestSnapshot(data.snapshots, openBound);
  const closeHit = nearestSnapshot(data.snapshots, closeBound);

  // Open: prefer snap near this day's midnight; else inherit previous close
  if (openHit && openHit.distMs <= CLEAN_SKEW_MS * 2) {
    day.openTotalUsd = openHit.snap.totalRevenueUsd;
    day.openAt = openHit.snap.at;
    day.openSkewMin = Math.round(openHit.distMs / 60000);
  } else if (day.openTotalUsd == null) {
    const prev = findDay(data, prevUtcDate(date));
    if (prev?.closeTotalUsd != null) {
      day.openTotalUsd = prev.closeTotalUsd;
      day.openAt = prev.closeAt;
      day.openSkewMin = null;
      day.note = [day.note, "open inherited from previous close"].filter(Boolean).join("; ");
    }
  }

  const pastCloseBound = nowMs >= closeBound;
  const closeOk =
    closeHit &&
    pastCloseBound &&
    closeHit.distMs <= CLEAN_SKEW_MS * 3 &&
    day.openTotalUsd != null;

  let newlyClosed = false;
  if (closeOk && !day.closed) {
    day.closeTotalUsd = closeHit.snap.totalRevenueUsd;
    day.closeAt = closeHit.snap.at;
    day.closeSkewMin = Math.round(closeHit.distMs / 60000);
    day.revenueUsd = day.closeTotalUsd - day.openTotalUsd;
    day.closed = true;
    day.approximate = closeHit.distMs > CLEAN_SKEW_MS || (day.openSkewMin != null && day.openSkewMin > 90);
    newlyClosed = true;
  } else if (closeOk && day.closed && !day.notified && !day.freeze) {
    // refine before notify
    day.closeTotalUsd = closeHit.snap.totalRevenueUsd;
    day.closeAt = closeHit.snap.at;
    day.closeSkewMin = Math.round(closeHit.distMs / 60000);
    day.revenueUsd = day.closeTotalUsd - day.openTotalUsd;
    day.approximate = closeHit.distMs > CLEAN_SKEW_MS || (day.openSkewMin != null && day.openSkewMin > 90);
  }

  // Today running: ensure open exists from earliest snap on this UTC date if still null
  if (!day.closed && day.openTotalUsd == null) {
    const daySnaps = data.snapshots.filter((s) => utcDate(new Date(s.at)) === date);
    if (daySnaps.length) {
      const first = daySnaps[0];
      day.openTotalUsd = first.totalRevenueUsd;
      day.openAt = first.at;
      day.openSkewMin = Math.round(Math.abs(Date.parse(first.at) - openBound) / 60000);
      day.approximate = true;
      day.note = [day.note, "open = first snapshot on UTC day (not midnight)"].filter(Boolean).join("; ");
    }
  }

  return { day, newlyClosed };
}

async function main() {
  const now = new Date();
  const nowMs = now.getTime();
  const today = utcDate(now);
  const totals = await pullTotals();

  const data = load();
  data.latest = totals;
  pushSnapshot(data, totals);

  // Mark legacy closed days as frozen so we don't rewrite partial history
  for (const d of data.days) {
    if (d.closed && d.notified == null) {
      d.notified = true;
      d.freeze = true;
    }
  }

  const newlyClosed = [];
  // Reconcile yesterday + today (+ day before if needed)
  const dates = [prevUtcDate(today), today];
  // Also any unclosed day still open in file
  for (const d of data.days) {
    if (!d.closed && !dates.includes(d.date)) dates.push(d.date);
  }
  dates.sort();

  for (const date of dates) {
    const { day, newlyClosed: nc } = reconcileDay(data, date, nowMs);
    if (nc) newlyClosed.push(day);
  }

  const todayDay = findDay(data, today);
  const todayRunning =
    todayDay?.openTotalUsd != null
      ? totals.totalRevenueUsd - todayDay.openTotalUsd
      : null;

  console.log(
    `[stonkfun] UTC ${today} total=${fmtUsd(totals.totalRevenueUsd)} today_so_far=${fmtUsd(todayRunning)} snapshots=${data.snapshots.length}`,
  );
  for (const d of data.days.slice(-4)) {
    console.log(
      `  day ${d.date} closed=${d.closed} rev=${fmtUsd(d.revenueUsd)} openSkew=${d.openSkewMin ?? "—"}m closeSkew=${d.closeSkewMin ?? "—"}m approx=${!!d.approximate} notified=${!!d.notified}`,
    );
  }

  if (!DRY_RUN) {
    save(data);
    console.log(`[wrote] ${DATA_PATH}`);
  } else {
    console.log("[dry-run] no write");
  }

  for (const c of newlyClosed) {
    if (c.notified) continue;
    const skew = c.closeSkewMin != null ? ` · close±${c.closeSkewMin}m` : "";
    const approx = c.approximate ? " · approximate" : "";
    const msg = `${c.date} UTC: ${fmtUsd(c.revenueUsd)} revenue (cum ${fmtUsd(c.closeTotalUsd)})${skew}${approx}`;
    if (!DRY_RUN) {
      await ntfy(`StonkFun ${c.date}`, msg);
      c.notified = true;
      c.freeze = true;
      save(data);
    }
  }

  // Heartbeat only if zero closed days ever and no prior notify — avoid spam
  if (
    !DRY_RUN &&
    newlyClosed.length === 0 &&
    data.days.filter((d) => d.closed).length === 0 &&
    data.snapshots.length <= 2
  ) {
    await ntfy(
      "StonkFun watch on",
      `snapshots live · hourly GH · day close via midnight-nearest snap · cum ${fmtUsd(totals.totalRevenueUsd)}`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
