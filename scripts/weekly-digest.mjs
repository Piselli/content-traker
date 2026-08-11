#!/usr/bin/env node
/**
 * Weekly digest → evidence/weekly/YYYY-MM-DD.md
 * Top/bottom by replies-per-1k + views. Run Sundays or on demand.
 *
 *   npm run digest:week
 *   DRY_RUN=1 npm run digest:week
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "public/tracker-data.json");
const OUT_DIR = join(ROOT, "evidence/weekly");
const DRY = process.env.DRY_RUN === "1";

function startOfWeek(d = new Date()) {
  const x = new Date(d);
  const day = x.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day; // Monday UTC
  x.setUTCDate(x.getUTCDate() + diff);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}

function rpv(l) {
  const v = l.views || 0;
  const r = l.replies || 0;
  if (v <= 0) return 0;
  return (r / v) * 1000;
}

function line(l) {
  const note = (l.note || "").replace(/\s+/g, " ").slice(0, 90);
  return `- ${l.at?.slice(0, 10)} · **${l.type}** · ${l.views ?? "?"}v / ${l.replies ?? 0}r · ${rpv(l).toFixed(1)}/1k — ${note}`;
}

const data = JSON.parse(readFileSync(DATA, "utf8"));
const weekStart = startOfWeek();
const weekEnd = new Date(weekStart);
weekEnd.setUTCDate(weekEnd.getUTCDate() + 7);
const logs = (data.logs || []).filter((l) => {
  const t = Date.parse(l.at);
  return t >= weekStart.getTime() && t < weekEnd.getTime() && !l.classificationPending;
});

const byRpv = [...logs].sort((a, b) => rpv(b) - rpv(a));
const byViews = [...logs].sort((a, b) => (b.views || 0) - (a.views || 0));
const weekKey = weekStart.toISOString().slice(0, 10);

const md = `# Week of ${weekKey}

Posts: **${logs.length}**

## Top replies/1k
${byRpv.slice(0, 5).map(line).join("\n") || "_none_"}

## Bottom replies/1k (min 200 views)
${byRpv
  .filter((l) => (l.views || 0) >= 200)
  .slice(-5)
  .reverse()
  .map(line)
  .join("\n") || "_none_"}

## Top views
${byViews.slice(0, 5).map(line).join("\n") || "_none_"}

## Types
${Object.entries(
  logs.reduce((a, l) => {
    a[l.type] = (a[l.type] || 0) + 1;
    return a;
  }, {}),
)
  .sort((a, b) => b[1] - a[1])
  .map(([t, n]) => `- ${t}: ${n}`)
  .join("\n") || "_none_"}

---
Generated ${new Date().toISOString()}
`;

if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true });
const out = join(OUT_DIR, `${weekKey}.md`);
console.log(md);
if (!DRY) {
  writeFileSync(out, md);
  console.log(`[wrote] ${out}`);
} else {
  console.log("[dry-run] no write");
}
