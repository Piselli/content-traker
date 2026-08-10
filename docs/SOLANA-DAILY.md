# Solana daily — agent contract

Solana-exclusive metrics + quiet news. Complements global `radar` (all chains) and `stonkfun:daily`.

Trigger in chat: **`solana день`** / **`solana day`**.

## What runs without Cursor

GitHub Action `.github/workflows/solana-daily.yml` at **00:10 UTC** → `scripts/solana-daily.mjs` → `public/solana-daily.json`.

- DefiLlama (free): Solana TVL, fees 24h, revenue 24h, DEX volume 24h, top fee/revenue protocols
- RSS (Solana-filtered): Solana Compass, SolanaFloor, Helius blog; Blockworks / The Defiant only if title matches Solana
- Embeds latest StonkFun totals from `public/stonkfun-revenue.json` when present
- **ntfy only on spike**: metric ±`SPIKE_PCT`% (default **25**) vs ~7d median — otherwise quiet

## Agent: `solana день`

1. `git pull` (or read latest `public/solana-daily.json` + `public/stonkfun-revenue.json`)
2. UA reply with:
   - key numbers (TVL, fees, rev, DEX vol + 1d change if present)
   - StonkFun today-so-far / last closed day if available
   - **1–2 tweet ideas** (cynical CT, scorecard/plate friendly) — not a digest dump
3. Expand signals only if spike list non-empty or user asks «що є»

Quiet otherwise. Do not ping the user every morning in chat — Action + ntfy cover spikes.

## Tweet idea shapes (pick what fits norms)

1. Missing / under-indexed protocol vs Llama boards
2. $0-raised fee printers on Solana
3. Fees vs TVL weirdness
4. Launchpad / bot / DEX revenue share shift
5. DEX vol vs app fees divergence
6. Day spike vs 7d median (only when real)

## Manual

```bash
npm run solana:daily
DRY_RUN=1 npm run solana:daily
```
