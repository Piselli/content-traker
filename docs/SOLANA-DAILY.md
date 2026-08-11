# Solana daily — agent contract

Solana **tweet-fuel** engine: metrics + detectors → patterns/angles. Complements global `radar` and `stonkfun:daily`.

Trigger in chat: **`solana день`** / **`solana day`**.

## What runs without Cursor

GitHub Action `.github/workflows/solana-daily.yml` at **00:10 UTC** → `scripts/solana-daily.mjs` → `public/solana-daily.json`.

Sources:
- DefiLlama: Solana TVL / fees / revenue / DEX vol + top protocols + 90d charts
- Cross-chain fees peek (ETH, Base) for comparison detectors
- RSS (Solana-filtered): Compass, SolanaFloor, Helius; Blockworks / Defiant if Solana in title
- StonkFun totals from `public/stonkfun-revenue.json`

| **Detectors → `patterns[]` / `angles[]`:**
| kind | When it fires |
|------|----------------|
| `ath` | fees/rev/DEX at or near 90d high |
| `rank-flip` / `leader-change` | protocol climbs board or #1 changes |
| `share-shift` | launchpad / DEX / apps fee mix moves ≥8pp day |
| `divergence` | DEX vol vs fees 1d change gap ≥20pp |
| `weird-ratio` | fees/TVL elevated vs recent median |
| `spike` | metric ±`SPIKE_PCT`% (default 25) vs ~7d median |

**Not surfaced (by design):** Sol-vs-ETH/Base chain flex · StonkFun Llama-gap (support lane, not value).

**ntfy** only on fresh high/med patterns (capped) or classic spikes — not a daily digest.

## Agent: `solana день`

1. Read `public/solana-daily.json` (+ `stonkfun-revenue.json`); run `npm run solana:daily` if stale (>~18h)
2. UA reply:
   - if `angles` empty / only weak → **1 quiet line** + key numbers optional
   - if angles ready → **1–2 tweet hooks** from `angles[].hook` (cynical CT, scorecard/plate friendly)
3. Do **not** dump full Llama tables unless asked

## Manual

```bash
npm run solana:daily
DRY_RUN=1 npm run solana:daily
```
