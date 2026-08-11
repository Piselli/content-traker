# Content Tracker — Agent guide

## What this repo is

Personal **X (@piselliii) content habit tracker** — weekly norms, Done logging, ideas, Jarvis export.

**Separate from** `ffl-moves` / MoveMatch. Do not merge repos or share deploy.

## Quick start

```bash
npm install
npm run dev   # http://localhost:3000
npm run build
```

## Architecture

```
src/app/page.tsx              → Dashboard
public/tracker-data.json      → repo sync (agent commits; site merges on load)
public/radar-data.json        → crypto signals → angles (daily `radar`)
public/solana-daily.json      → Solana metrics + quiet news (`solana день`)
public/stonkfun-revenue.json  → StonkFun UTC daily revenue
docs/RADAR.md                 → radar agent contract
docs/SOLANA-DAILY.md          → Solana daily agent contract
src/hooks/useTracker.ts       → localStorage + repo merge
src/lib/norms.ts              → weekly norm definitions
src/lib/analysis.ts           → insights, slots, buckets, engagement
JARVIS.md                     → X content strategy
.cursor/rules/project.mdc     → logging + radar + ideas (`Ідея:`) workflows
```

## Agent: `radar` / `радар`

1. Follow `docs/RADAR.md` — broad lanes (L1/L2, bridges, perps, campaigns…), upsert signals, cluster angles
2. Write `public/radar-data.json` → **commit + push** (same as tracker logging)
3. UA reply: **quiet by default** (1 line). Expand only on spike/pattern / user ask
4. On PICK: read ready / noteworthy angles first

## Agent: `solana день` / `solana day`

1. Follow `docs/SOLANA-DAILY.md` — pattern detectors → angles (not a metrics dump)
2. Read `public/solana-daily.json` `angles[]` (+ `stonkfun-revenue.json`); run `npm run solana:daily` if stale
3. UA: if ready angles → **1–2 tweet hooks**; else quiet 1-liner. No full digest unless asked
4. Auto: GH Action 00:10 UTC; **ntfy only on fresh patterns/spikes**

## Agent: screenshot + URL from user

1. Read screenshot for views / likes / replies / hours since post
2. Classify primary type + traits + slot + bucket (see JARVIS.md)
3. Upsert in `public/tracker-data.json` by tweet URL
4. `git commit` + `git push origin main` — **always, without asking** when user sends URL+screenshot (overrides general commit-only-when-asked rule)
5. Reply in Ukrainian with what was logged + confirm push
6. If open ideas exist (`ideas[]` without `usedAt`), briefly remind (1–3 lines)

### Chat: `Ідея:` / `Idea:`

Append to `tracker-data.json` → `ideas[]` → commit + push → short UA ack. On any tweet work (PICK/DRAFT/опублікував), remind open ideas.

### Auto-sync (free — no X API)

- `npm run sync:x` — refresh **likes + replies** for tweet URLs already in tracker (syndication, $0)
- GitHub Action `.github/workflows/sync-x.yml` every 3h — same, auto-commits `tracker-data.json` (no secrets)
- **Does not** auto-discover new posts or pull views — after you post, paste URL in chat once for classify + log
- Auto-synced entries (if any) have `classificationPending: true` — not counted in norms until classified

User workflow: advise in chat → post on X → «опублікував» + URL (+ screenshot) → ~3h screenshot → ~24h screenshot.

## Data model

```ts
LogEntry {
  id, type, fullTypes?, traits?, visualCluster?, slot?, bucket?,
  at, tweetUrl?, ageHours?, views?, likes?, replies?,
  snapshots?, note?
}
Idea { id, text, type?, createdAt }
```

`visualCluster`: `scorecard` | `collage` | `chart` | `screenshot` | `meme` | `text-only` — see `src/lib/visualClusters.ts` + JARVIS.md § Visual clusters.

Stored: localStorage + `public/tracker-data.json` (git).

- GitHub: `Piselli/content-traker` (typo in name)
- Vercel project: `content-tracker`
- Production: https://content-tracker-vert.vercel.app

## Common tasks

| Task | Where |
|------|--------|
| Change norms | `src/lib/norms.ts` |
| New habit type | `src/lib/types.ts` CONTENT_TYPES + norms + styles |
| Jarvis prompt | `JARVIS.md` |
| User onboarding | `docs/CURSOR.md` |

## Data model

```ts
LogEntry { id, type, at, tweetUrl?, views?, likes?, note? }
Idea { id, text, type?, createdAt }
```

Stored in browser localStorage only.
