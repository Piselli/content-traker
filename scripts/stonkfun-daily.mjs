#!/usr/bin/env node
/**
 * StonkFun daily revenue snapshot (UTC).
 *
 * Fetches public API totals, closes the previous UTC day when the date rolls,
 * appends daily revenue = closeTotal - openTotal.
 *
 *   npm run stonkfun:daily
 *   DRY_RUN=1 npm run stonkfun:daily
 *
 * Env:
 *   NTFY_TOPIC — default piselliii-content-tracker
 *   NTFY=0     — skip push
 *   DRY_RUN=1  — no write / no ntfy
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

const API = "https://www.stonkfun.xyz/api/public/v1";

function utcDate(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

function prevUtcDate(dateStr) {
  const t = Date.parse(`${dateStr}T00:00:00.000Z`);
  return new Date(t - 86400000).toISOString().slice(0, 10);
}

function emptyData() {
  return {
    updatedAt: null,
    source: "https://www.stonkfun.xyz/api/public/v1/revenue",
    latest: null,
    days: [],
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

async function fetchJson(path) {
  const res = await fetch(`${API}${path}`, {
    headers: { "User-Agent": "content-tracker-stonkfun-daily/1.0" },
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

function findDay(data, date) {
  return data.days.find((d) => d.date === date);
}

function ensureOpenDay(data, date, total) {
  let day = findDay(data, date);
  if (!day) {
    day = {
      date,
      openTotalUsd: total,
      closeTotalUsd: null,
      revenueUsd: null,
      closed: false,
      openAt: new Date().toISOString(),
      closeAt: null,
    };
    data.days.push(day);
    data.days.sort((a, b) => a.date.localeCompare(b.date));
  }
  return day;
}

/**
 * Close yesterday using current total as yesterday's close.
 * open = yesterday's openTotal (set when that day first appeared, or inherited).
 */
function closeDay(data, date, closeTotal, closeAt) {
  const day = findDay(data, date);
  if (!day) {
    // No open recorded — invent open from previous closed close, else skip close
    const prev = findDay(data, prevUtcDate(date));
    const openTotal =
      prev?.closeTotalUsd ?? data.latest?.totalRevenueUsd ?? null;
    if (openTotal == null) {
      console.log(`[skip close] no open baseline for ${date}`);
      return null;
    }
    const created = {
      date,
      openTotalUsd: openTotal,
      closeTotalUsd: closeTotal,
      revenueUsd: closeTotal - openTotal,
      closed: true,
      openAt: prev?.closeAt || null,
      closeAt,
      note: "open inferred from previous close",
    };
    data.days.push(created);
    data.days.sort((a, b) => a.date.localeCompare(b.date));
    return created;
  }
  if (day.closed) {
    console.log(`[already closed] ${date} revenue=${fmtUsd(day.revenueUsd)}`);
    return day;
  }
  day.closeTotalUsd = closeTotal;
  day.revenueUsd = closeTotal - day.openTotalUsd;
  day.closed = true;
  day.closeAt = closeAt;
  return day;
}

async function main() {
  const now = new Date();
  const today = utcDate(now);
  const yesterday = prevUtcDate(today);
  const totals = await pullTotals();

  const data = load();
  data.latest = totals;

  const closed = [];

  // If we already have an open day before today, close all gaps up to yesterday
  const openDays = data.days.filter((d) => !d.closed && d.date < today);
  if (openDays.length === 0 && data.latest && data.days.length === 0) {
    // first ever run — just open today
  } else if (openDays.length > 0) {
    for (const d of openDays) {
      if (d.date <= yesterday) {
        const c = closeDay(data, d.date, totals.totalRevenueUsd, totals.at);
        if (c) closed.push(c);
      }
    }
  } else if (data.days.length > 0) {
    // Have history but yesterday not present as open — close yesterday from last close
    const y = findDay(data, yesterday);
    if (!y || !y.closed) {
      const c = closeDay(data, yesterday, totals.totalRevenueUsd, totals.at);
      if (c) closed.push(c);
    }
  }

  // Open today if missing (open = current total at first sight of this UTC day)
  const todayDay = ensureOpenDay(data, today, totals.totalRevenueUsd);
  if (!todayDay.openAt) todayDay.openAt = totals.at;

  // Running estimate for today = latest - today's open
  const todayRunning = totals.totalRevenueUsd - todayDay.openTotalUsd;

  console.log(
    `[stonkfun] UTC ${today} total=${fmtUsd(totals.totalRevenueUsd)} today_so_far=${fmtUsd(todayRunning)}`,
  );
  for (const c of closed) {
    console.log(
      `[closed] ${c.date} revenue=${fmtUsd(c.revenueUsd)} (open ${fmtUsd(c.openTotalUsd)} → close ${fmtUsd(c.closeTotalUsd)})`,
    );
  }

  if (!DRY_RUN) {
    save(data);
    console.log(`[wrote] ${DATA_PATH}`);
  } else {
    console.log("[dry-run] no write");
  }

  // Notify on newly closed days (the daily drop)
  for (const c of closed) {
    const msg = `${c.date} UTC: ${fmtUsd(c.revenueUsd)} revenue (cum ${fmtUsd(c.closeTotalUsd)})`;
    if (!DRY_RUN) await ntfy(`StonkFun ${c.date}`, msg);
  }

  // First-run / manual: ping baseline so you know watch is live
  if (!DRY_RUN && closed.length === 0 && data.days.filter((d) => d.closed).length === 0) {
    await ntfy(
      "StonkFun watch on",
      `baseline ${today} UTC · cum ${fmtUsd(totals.totalRevenueUsd)} · daily closes 00:05 UTC`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
