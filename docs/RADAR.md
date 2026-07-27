# Crypto Radar — agent contract

Working memory for **Abhi-style** posts: multi-signal patterns across a week, not a news dump.

Trigger: user writes **`radar`** / **`радар`** (optionally with focus: `radar RWA`, `radar only DeFi`).

Goal: cover many lanes → keep **signals** → promote **angles** when 2+ receipts rhyme → surface on **PICK**.

---

## Lifecycle

```
daily radar → add signals → cluster into angles → expire / use → (optional) promote thesis later
```

- **Signal** = one dated fact + source (shipping, capital, policy, metric, flip, narrative).
- **Angle** = publishable thesis built from ≥2 signals (or 1 very strong + clear mechanism).
- **Pattern** = recurring shape (same-week convergence, capital rotation, timeline flip, silent standard).

Not a wiki. Not Judgment OS. If it can’t become a tweet within ~7 days, expire or demote.

---

## Lanes (scan all unless user narrows)

| id | What to watch |
|----|----------------|
| `defi-infra` | DEX / AMM / perps venues, hooks, allowlists, new market types |
| `rwa-compliance` | Tokenized assets, KYC rails, permissioned secondary markets |
| `capital-flows` | ETF inflows/outflows, treasury buys, unlocks, raises |
| `regulation` | Bills, SEC/CFTC, bans, clarity drafts, enforcement |
| `cex-tradfi` | CEX × TradFi bridges, brokerage crypto, prediction markets M&A |
| `l1-l2` | Chain launches, migrations, fee wars, sequencer drama |
| `stables-payments` | Stablecoin rails, banking partners, settlement |
| `memes-casino` | Pump metas, casino overlay, narrative flips for liquidity |
| `ai-crypto` | AI agent tokens, infra narratives (skeptical by default) |
| `narrative-rotation` | What’s hot → cold; sector leadership (DeFi vs RWA vs meme) |

Football / CT meta stay in normal PICK — radar is **crypto pattern fuel**.

---

## Pattern shapes (prefer these)

1. **Same-week convergence** — 2–3 major actors ship the *same* capability (Abhi: UNI + Raydium + HL permissioned).
2. **Demand flip** — volume/flows move to a new category (e.g. RWA > crypto on a venue).
3. **Capital rotation** — ETF / treasury / sector money switches (ETH vs BTC week).
4. **Timeline flip** — same actor said X, did Y (receipts + dates).
5. **Silent standard** — compliance/permissioning becomes default without debate.
6. **Illusion-of-earn** — product usage collapses if casino overlay removed.

---

## Data

Source of truth: `public/radar-data.json`

```ts
type RadarSignal = {
  id: string;           // sig-YYYYMMDD-short
  at: string;           // ISO date of event (not scan day)
  scannedAt: string;    // ISO when logged
  lane: string;
  kind: "shipping" | "capital" | "policy" | "metric" | "flip" | "narrative";
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
};

type RadarDay = {
  date: string;         // YYYY-MM-DD
  at: string;
  note: string;         // 2–4 lines: what changed / what’s forming
  signalIdsAdded: string[];
  angleIdsTouched: string[];
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
3. **Scan breadth:** web search / reliable sources across **all lanes** (or user subset). Prefer primary blogs, CoinDesk/Defiant/Blockworks-class, protocol announcements — not random CT rumor.
4. Add only **new** signals (dedupe by same actor+event). Skip price-only noise unless it proves a rotation (`capital` / `metric` with numbers).
5. **Cluster:** if ≥2 open signals rhyme → create/update an `angle` (`ready` if ≥2 solid receipts).
6. Append a `days[]` entry for today.
7. **Commit + push** `public/radar-data.json` (same urgency as tracker/judgment logging).
8. Reply **Ukrainian**, short:
   - new signals count by lane
   - ready angles (thesis + voiceHook + expires)
   - 1 line: what’s *forming* but not ready yet
   - do **not** dump a full news digest

### Optional focus

- `radar RWA` / `radar capital` → still peek adjacent lanes for convergence.
- Paste a link/screenshot mid-day → upsert as signal without full scan (`radar add` / just the URL).

---

## On PICK / WEEK / «що постити»

1. Load open/ready angles from radar **before** inventing topics.
2. Prefer `ready` angles that match norm gaps (`useful` / `hot topic` / `provocative`).
3. Mark angle `used` + `usedTweetUrl` when user posts from it (with tracker log).
4. Never force a dead angle — if expired or crowded (everyone already posted the Abhi shape), kill it.

---

## Quality bar

| Do | Don’t |
|----|--------|
| Facts with dates + URLs | Vibes / “CT says” |
| Mechanism thesis | “Notable shift” corporate tone |
| Cynical voiceHook | Essay dumps into JSON |
| Expire aggressively | Infinite archive of headlines |
| Same-week tables / timelines as visualHint | Fake precision |

Reference bar: Abhi permissioned-DEX week — three dated shipping events → one structural claim. Your version adds **voice** + **visual**, not softer language.

---

## Git

Updating radar = `git commit` + `git push origin main` immediately. No ask.
