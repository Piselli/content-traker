# Crypto Radar — agent contract

Working memory for **crypto takes**: dated facts across many lanes → cluster when they rhyme → fuel for PICK. Not a news digest. Not locked to any one CT style or one example week.

Trigger: user writes **`radar`** / **`радар`** (optionally with focus: `radar bridges`, `radar only L2`).

Goal: **accumulate broadly** in `public/radar-data.json`. Surface to the user **only** when something is genuinely strong or a clear pattern formed. Quiet the rest.

**Value bar (Aug 2026):** angles for PICK should pass `evidence/examples/solana-value-refs.md` — real reader usefulness (comparison, hot important fact, mechanism, receipt). Essay or visual both OK. Prefer **Solana-weighted** clusters when rhyming with @piselliii lane. Do **not** push Sol-vs-ETH flex or StonkFun-support-as-teardown as “value.”

---

## Lifecycle

```
daily radar → add signals → cluster angles when ready → expire / use
```

- **Signal** = one dated fact + source (shipping, capital, policy, metric, flip, narrative, campaign).
- **Angle** = publishable thesis from ≥2 signals (or 1 very strong + clear mechanism).
- **Pattern** = shape name (see below) — any recurring structure, not a fixed checklist from one viral post.

Not a wiki. Not Judgment OS. If it can’t become a tweet within ~7 days, expire or demote.

---

## Reply UX (critical)

On most `radar` runs:

- Upsert signals / angles → **commit + push**.
- Reply **Ukrainian, one short line**: scanned, N new signals, done — **no digest**.

**Only interrupt / expand** when at least one of:

1. **Spike** — one fact is unusually strong alone (weird bridge spike, major L1 liquidity migrate, huge campaign, regulatory hammer).
2. **Pattern** — ≥2 solid receipts rhyme into a ready angle the user hasn’t seen yet.
3. User asks (`що є`, `PICK`, `що постити`, focus lane).

**Freshness for pings:** noteworthy / user-facing alerts = events dated **last ~48–72h** (from scan day). Older receipts stay in JSON as backdrop for clusters — do **not** wake the user with “week of Jul 22” as if it were today’s news. Prefer newest confirming print when updating an angle.

Do **not** list every ready angle every day. Do **not** name-check other CT accounts as the quality bar.

---

## Lanes (scan all unless user narrows)

| id | What to watch |
|----|----------------|
| `l1-l2` | **All major L1s + L2s**: launches, migrations, fee wars, sequencer drama, “winners” by TVL/fees/users |
| `bridges-liquidity` | Bridge volumes, chain↔chain flows, weird spikes, liquidity leaving/entering ecosystems |
| `defi-infra` | DEX / AMM / hooks / new market types / venue shipping |
| `perps-derivatives` | Perp venues, OI flips, new listings, venue share shifts |
| `rwa-compliance` | Tokenized assets, KYC rails, permissioned secondary markets |
| `capital-flows` | ETF flows, treasuries, unlocks, raises, incentive / points **money campaigns** |
| `incentives-campaigns` | Airdrop seasons, points programs, liquidity mining, grant races — who is buying attention |
| `regulation` | Bills, SEC/CFTC, bans, enforcement, court fights |
| `cex-tradfi` | CEX × TradFi, brokerage crypto, prediction markets |
| `stables-payments` | Stablecoin rails, banking partners, settlement, issuer moves |
| `memes-casino` | Pump metas, casino overlay, narrative flips for liquidity |
| `ai-crypto` | AI agents, infra, payments rails — ship > vibes |
| `failures-rugs` | Project/exchange **shutdowns**, delistings, insolvency, **rugs**, honeypots, exploit drains, “we’re pausing withdrawals” |
| `narrative-rotation` | What’s hot → cold; sector / chain leadership |

Also watch (any lane): **violent dumps / flash crashes** with a clear mechanism (not “BTC −2%”) — venue blowup, oracle fail, unlock cliff, cascade liquidations.

Football / CT meta stay in normal PICK — radar is **crypto take fuel**.

---

## Pattern shapes (examples, not a closed list)

1. **Same-week convergence** — 2–3 major actors ship the *same* capability.
2. **Demand flip** — volume/flows move to a new category or chain.
3. **Capital rotation** — ETF / treasury / sector / chain money switches.
4. **Liquidity migrate** — TVL, bridge net flows, or LP inventory clearly leaves A → B.
5. **Timeline flip** — same actor said X, did Y (receipts + dates).
6. **Silent standard** — a practice becomes default without debate.
7. **Illusion-of-earn** — usage collapses if incentive / casino overlay removed.
8. **Campaign gravity** — points/airdrop/incentive sucks liquidity or mindshare for a window.
9. **Winner tape** — fees, users, OI, or bridge share concentrates in a clear leader.
10. **Failure / rug** — shutdown, exit scam, exchange death, or exploit that reveals how the sausage was made.
11. **Violent move** — outsized crash/spike with a named cause (flash crash, cascade, unlock, delist).

---

## Data

Source of truth: `public/radar-data.json`

```ts
type RadarSignal = {
  id: string;           // sig-YYYYMMDD-short
  at: string;           // ISO date of event (not scan day)
  scannedAt: string;    // ISO when logged
  lane: string;
  kind: "shipping" | "capital" | "policy" | "metric" | "flip" | "narrative" | "campaign" | "failure" | "exploit";
  what: string;         // one line fact
  why: string;          // why it might matter for a post
  source: string;       // outlet / blog / account
  url?: string;
  status: "open" | "used" | "expired";
};

type RadarAngle = {
  id: string;           // ang-YYYYMMDD-short
  at: string;
  thesis: string;       // mechanism, not headline
  voiceHook: string;    // cynical one-liner direction (not final tweet)
  signalIds: string[];
  lanes: string[];
  pattern: string;      // shape name
  suggestedType: "hot topic" | "useful" | "provocative" | "bait" | "meme";
  visualHint?: string;
  expiresAt: string;    // ISO — usually +48–72h for hot, +7d for structural
  status: "open" | "ready" | "used" | "expired" | "killed";
  usedTweetUrl?: string;
  noteworthy?: boolean; // true = worth surfacing to user on next radar / PICK
};

type RadarDay = {
  date: string;         // YYYY-MM-DD
  at: string;
  note: string;         // internal: what changed (not dumped to user by default)
  signalIdsAdded: string[];
  angleIdsTouched: string[];
  noteworthyIds?: string[]; // angles/signals worth a user ping
};
```

File shape:

```json
{
  "updatedAt": "...",
  "lanes": [ { "id", "label", "watch" } ],
  "signals": [],
  "angles": [],
  "days": []
}
```

Keep **open** signals ≤ ~40; expire older than 14d unless tied to an open angle. Keep **open/ready** angles ≤ ~12.

---

## Agent workflow on `radar`

1. Read `public/radar-data.json` (+ this doc if needed).
2. Expire: `expiresAt` past → `expired`; signals >14d with no angle → `expired`.
3. **Scan breadth (same hunt as before, wider):** web search + DefiLlama / L2Beat / bridges / ETF trackers + protocol blogs + CoinDesk/Defiant/Blockworks-class — not random CT rumor. Do not drop the news-hunt; dashboards are additive.
4. Explicitly check: **L1/L2 winners**, **bridge net flows**, **perp OI share**, **incentive campaigns**, **AI shipping**, **RWA/DEX/perps**, **regulation/TradFi**, **stables**, **shutdowns / rugs / exploits / violent dumps** — anything that can become a take.
5. Add only **new** signals (dedupe by same actor+event). Skip price-only noise unless it proves a rotation (`capital` / `metric` with numbers). Prefer logging **event `at` = real date**; backlog older than ~5–7d only if it unlocks a fresh cluster.
6. **Cluster:** if ≥2 open signals rhyme → create/update an `angle` (`ready` if ≥2 solid receipts). Mark `noteworthy: true` only for spike/pattern with a **fresh** receipt in the last ~48–72h.
7. Append a `days[]` entry for today (note is for agents, not a user dump).
8. **Commit + push** `public/radar-data.json`.
9. Reply UA per **Reply UX** above.

### Optional focus

- `radar bridges` / `radar L2` / `radar AI` → still peek adjacent lanes for convergence.
- Paste a link/screenshot mid-day → upsert as signal without full scan (`radar add` / just the URL). Quiet ack unless noteworthy.

---

## On PICK / WEEK / «що постити»

1. Load open/ready angles from radar **before** inventing topics — prefer `noteworthy` then other `ready`.
2. Prefer angles that match norm gaps (`useful` / `hot topic` / `provocative`).
3. Mark angle `used` + `usedTweetUrl` when user posts from it (with tracker log).
4. Kill crowded or dead angles; don’t force yesterday’s cluster.

---

## Quality bar

| Do | Don’t |
|----|--------|
| Facts with dates + URLs | Vibes / “CT says” |
| Mechanism thesis | “Notable shift” corporate tone |
| Cynical voiceHook | Essay dumps into JSON |
| Expire aggressively | Infinite archive of headlines |
| Tables / flow diagrams as visualHint | Fake precision |
| Broad “winners + flows” hunt | Fixate on one viral template or one account |

Strong post shape = **several dated receipts → one structural claim → your voice + visual**. The example that seeded this system was one such week — not the only shape to chase.

---

## Automated watcher (no Cursor tokens)

**Goal:** monitor continuously in the cloud; ping phone only on spike or when receipts converge into a pattern. Laptop can be off. Does **not** use Cursor Auto / agent tokens.

| Piece | Role |
|-------|------|
| `scripts/radar-watch.mjs` | RSS ingest → upsert signals → tag clusters → ntfy if spike/pattern |
| `.github/workflows/radar-watch.yml` | cron **every 30 min** (+ manual dispatch) on GitHub Actions |
| ntfy topic | same as reminders (`NTFY_TOPIC` secret, default `piselliii-content-tracker`) |

**Notify when:**
1. **Spike** — single strong headline (hack/rug/shutdown/ETF launch/lawsuit/big drain…)
2. **Pattern** — ≥2 related open signals in ~7d share a cluster tag (wrappers, bridge-fail, HL/RWA, Clarity…) and newest receipt is fresh

Otherwise only commits into `public/radar-data.json` (quiet accumulate).

**You still:** open Cursor and type `радар` / PICK when ntfy fires (or once a day) for voice + final take. Watcher is the inbox; chat agent is the editor.

Local smoke: `DRY_RUN=1 npm run radar:watch`

## Git

Updating radar (agent or watcher commit) = push to `main`. Agent runs: commit + push immediately, no ask.
