#!/usr/bin/env node
/**
 * Push reminders via ntfy.sh (free, no API key).
 *
 * Setup:
 *   1. Install ntfy app on phone
 *   2. Subscribe to topic (default: piselliii-content-tracker)
 *   3. Set GitHub secret NTFY_TOPIC (optional — uses default if unset)
 *
 * Usage:
 *   npm run reminders
 *   DRY_RUN=1 npm run reminders
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_PATH = join(__dirname, "../public/tracker-data.json");
const STATE_PATH = join(__dirname, "../.ntfy-reminder-state.json");
const TOPIC = process.env.NTFY_TOPIC || "piselliii-content-tracker";
const DRY_RUN = process.env.DRY_RUN === "1";

function hoursSince(iso, now = new Date()) {
  return Math.max(0, (now.getTime() - Date.parse(iso)) / 3_600_000);
}

function loadState() {
  if (!existsSync(STATE_PATH)) return { sent: {} };
  try {
    return JSON.parse(readFileSync(STATE_PATH, "utf8"));
  } catch {
    return { sent: {} };
  }
}

function saveState(state) {
  if (DRY_RUN) return;
  writeFileSync(STATE_PATH, `${JSON.stringify(state, null, 2)}\n`);
}

async function ntfy(title, message, tags = []) {
  const url = `https://ntfy.sh/${TOPIC}`;
  console.log(`[ntfy] ${title}: ${message}`);
  if (DRY_RUN) return;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Title: title,
      Tags: tags.join(","),
      Priority: "high",
    },
    body: message,
  });
  if (!res.ok) throw new Error(`ntfy HTTP ${res.status}`);
}

function alreadySent(state, key) {
  return !!state.sent[key];
}

function markSent(state, key) {
  state.sent[key] = new Date().toISOString();
  const keys = Object.keys(state.sent);
  if (keys.length > 200) {
    for (const k of keys.slice(0, keys.length - 200)) delete state.sent[k];
  }
}

async function main() {
  const now = new Date();
  const data = JSON.parse(readFileSync(DATA_PATH, "utf8"));
  const state = loadState();
  let sent = 0;

  for (const log of data.logs) {
    if (!log.tweetUrl) continue;
    const age = hoursSince(log.at, now);

    // Move 3: 55–70 min reply window
    if (age >= 0.9 && age <= 1.2) {
      const key = `reply60:${log.id}`;
      if (!alreadySent(state, key)) {
        await ntfy(
          "60 хв — відповідай у коментах",
          `Move 3: ${log.type} · ${log.tweetUrl}`,
          ["speech_balloon"],
        );
        markSent(state, key);
        sent++;
      }
    }

    // Pending classification > 3h
    if (log.classificationPending && age >= 3) {
      const key = `pending:${log.id}`;
      if (!alreadySent(state, key)) {
        await ntfy(
          "Класифікуй пост",
          `Auto-sync чекає тип: ${log.tweetUrl}`,
          ["warning"],
        );
        markSent(state, key);
        sent++;
      }
    }
  }

  saveState(state);
  console.log(JSON.stringify({ sent, topic: TOPIC, dryRun: DRY_RUN }, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
