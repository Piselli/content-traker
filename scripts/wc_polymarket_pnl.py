#!/usr/bin/env python3
"""Rough WC Polymarket PnL snapshot — public API, no keys.

Usage:
  python3 scripts/wc_polymarket_pnl.py
  python3 scripts/wc_polymarket_pnl.py --json
  python3 scripts/wc_polymarket_pnl.py --max-wallets 150

Router DNS often fails on *.polymarket.com — script falls back to 8.8.8.8 / 1.1.1.1.
"""

from __future__ import annotations

import argparse
import json
import socket
import ssl
import subprocess
import sys
import time
from collections import defaultdict
from urllib.parse import urlparse

GAMMA = "https://gamma-api.polymarket.com"
DATA = "https://data-api.polymarket.com"
HEADERS = {"User-Agent": "content-tracker-wc-pnl/1.1"}
WC_KEYWORDS = (
    "world cup",
    "world-cup",
    "fifa",
    "fifwc",
    "wc 2026",
    "wc2026",
    "2026 fifa",
)
FALLBACK_IPS = ("104.18.34.205", "172.64.153.51")


def resolve_host(hostname: str) -> str:
    try:
        return socket.gethostbyname(hostname)
    except OSError:
        pass
    for resolver in ("8.8.8.8", "1.1.1.1"):
        try:
            out = subprocess.check_output(
                ["dig", "+short", hostname, f"@{resolver}"],
                text=True,
                timeout=8,
                stderr=subprocess.DEVNULL,
            )
            for line in out.splitlines():
                ip = line.strip().rstrip(".")
                if ip and "." in ip:
                    return ip
        except (subprocess.SubprocessError, FileNotFoundError, OSError):
            continue
    return FALLBACK_IPS[0]


def _decode_chunked(data: bytes) -> bytes:
    out = bytearray()
    pos = 0
    while pos < len(data):
        line_end = data.find(b"\r\n", pos)
        if line_end == -1:
            break
        size_hex = data[pos:line_end].split(b";", 1)[0]
        try:
            size = int(size_hex, 16)
        except ValueError:
            break
        if size == 0:
            break
        start = line_end + 2
        out.extend(data[start : start + size])
        pos = start + size + 2
    return bytes(out)


def https_get(url: str, timeout: float = 30) -> bytes:
    parsed = urlparse(url)
    host = parsed.netloc
    path = parsed.path or "/"
    if parsed.query:
        path = f"{path}?{parsed.query}"

    ip = resolve_host(host)
    ctx = ssl.create_default_context()
    with socket.create_connection((ip, 443), timeout=timeout) as sock:
        with ctx.wrap_socket(sock, server_hostname=host) as tls:
            req = (
                f"GET {path} HTTP/1.1\r\n"
                f"Host: {host}\r\n"
                f"User-Agent: {HEADERS['User-Agent']}\r\n"
                f"Accept: application/json\r\n"
                f"Connection: close\r\n\r\n"
            )
            tls.sendall(req.encode())
            chunks: list[bytes] = []
            while True:
                part = tls.recv(65536)
                if not part:
                    break
                chunks.append(part)
    raw = b"".join(chunks)
    header_end = raw.find(b"\r\n\r\n")
    if header_end == -1:
        raise RuntimeError(f"Bad HTTP response from {host}")
    header_blob, body = raw[:header_end], raw[header_end + 4 :]
    status_line = header_blob.split(b"\r\n", 1)[0].decode(errors="replace")
    if " 200 " not in status_line and not status_line.endswith(" 200"):
        raise RuntimeError(f"HTTP error {status_line} for {url}")
    if b"Transfer-Encoding: chunked" in header_blob:
        body = _decode_chunked(body)
    return body


def get_json(url: str, retries: int = 3) -> object:
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            return json.loads(https_get(url).decode())
        except (OSError, RuntimeError, TimeoutError, json.JSONDecodeError) as e:
            last_err = e
            time.sleep(0.6 * (attempt + 1))
    raise RuntimeError(
        f"GET failed: {url}\n{last_err}\n"
        "Router DNS tip: networksetup -setdnsservers Wi-Fi 8.8.8.8 1.1.1.1"
    )


def wc_blob(*parts: str) -> str:
    return " ".join(p for p in parts if p).lower()


def is_wc_event(event: dict) -> bool:
    blob = wc_blob(
        str(event.get("slug", "")),
        str(event.get("title", "")),
        str(event.get("description", "")),
        str(event.get("ticker", "")),
    )
    return any(k in blob for k in WC_KEYWORDS)


def is_wc_position(pos: dict) -> bool:
    blob = wc_blob(
        str(pos.get("title", "")),
        str(pos.get("slug", "")),
        str(pos.get("eventSlug", "")),
    )
    return any(k in blob for k in WC_KEYWORDS)


def fetch_wc_events(limit_pages: int = 10) -> list[dict]:
    events: list[dict] = []
    for closed in ("false", "true"):
        offset = 0
        page_size = 100
        for _ in range(limit_pages):
            qs = f"limit={page_size}&offset={offset}&closed={closed}"
            batch = get_json(f"{GAMMA}/events?{qs}")
            if not isinstance(batch, list) or not batch:
                break
            events.extend(e for e in batch if is_wc_event(e))
            offset += page_size
            if len(batch) < page_size:
                break
    seen: set[str] = set()
    uniq: list[dict] = []
    for e in events:
        key = str(e.get("slug") or e.get("id"))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(e)
    return uniq


def market_condition_ids(event: dict) -> list[str]:
    ids: list[str] = []
    for m in event.get("markets") or []:
        cid = m.get("conditionId") or m.get("condition_id")
        if cid:
            ids.append(str(cid))
    return ids


def holders_for_market(condition_id: str, limit: int = 200) -> list[dict]:
    data = get_json(f"{DATA}/holders?market={condition_id}&limit={limit}")
    rows: list[dict] = []
    if not isinstance(data, list):
        return rows
    for group in data:
        rows.extend(group.get("holders") or [])
    return rows


def positions_for_wallet(wallet: str) -> list[dict]:
    data = get_json(f"{DATA}/positions?user={wallet}&limit=500")
    return data if isinstance(data, list) else []


def median(values: list[float]) -> float:
    if not values:
        return 0.0
    s = sorted(values)
    n = len(s)
    mid = n // 2
    if n % 2:
        return s[mid]
    return (s[mid - 1] + s[mid]) / 2


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--max-markets", type=int, default=25)
    parser.add_argument("--max-wallets", type=int, default=120)
    args = parser.parse_args()

    print("Fetching WC events...", file=sys.stderr)
    events = fetch_wc_events()
    if not events:
        print("No WC events found.", file=sys.stderr)
        return 1

    condition_ids: list[str] = []
    for e in events:
        condition_ids.extend(market_condition_ids(e))
    condition_ids = list(dict.fromkeys(condition_ids))[: args.max_markets]

    print(
        f"Events: {len(events)} | Markets for holders: {len(condition_ids)}",
        file=sys.stderr,
    )

    wallet_rank: dict[str, float] = defaultdict(float)
    for i, cid in enumerate(condition_ids):
        print(f"  holders {i + 1}/{len(condition_ids)}...", file=sys.stderr)
        try:
            for h in holders_for_market(cid):
                w = (h.get("proxyWallet") or h.get("address") or "").lower()
                if w.startswith("0x"):
                    wallet_rank[w] += float(h.get("amount") or 0)
        except RuntimeError as e:
            print(f"    skip: {e}", file=sys.stderr)
        time.sleep(0.12)

    if not wallet_rank:
        print("No wallets from holders.", file=sys.stderr)
        return 1

    top_wallets = [
        w for w, _ in sorted(wallet_rank.items(), key=lambda x: x[1], reverse=True)
    ][: args.max_wallets]

    print(f"Fetching positions for {len(top_wallets)} wallets...", file=sys.stderr)
    wallet_pnl: dict[str, float] = {}
    for i, wallet in enumerate(top_wallets):
        if (i + 1) % 20 == 0 or i == 0:
            print(f"  positions {i + 1}/{len(top_wallets)}...", file=sys.stderr)
        try:
            positions = positions_for_wallet(wallet)
            wc_pnl = sum(
                float(p.get("cashPnl") or 0)
                for p in positions
                if is_wc_position(p)
            )
            wallet_pnl[wallet] = wc_pnl
        except RuntimeError:
            continue
        time.sleep(0.1)

    pnls = list(wallet_pnl.values())
    if not pnls:
        print("No WC PnL collected.", file=sys.stderr)
        return 1

    winners = sum(1 for p in pnls if p > 0)
    losers = sum(1 for p in pnls if p < 0)
    flat = sum(1 for p in pnls if p == 0)
    total = len(pnls)
    pct_losing = round(100 * losers / total, 1)
    pct_winning = round(100 * winners / total, 1)

    result = {
        "method": "top holders by size on WC markets → sum cashPnl on WC positions",
        "events": len(events),
        "markets_scanned": len(condition_ids),
        "wallets_analyzed": total,
        "winners": winners,
        "losers": losers,
        "flat": flat,
        "pct_losing": pct_losing,
        "pct_winning": pct_winning,
        "median_pnl_usd": round(median(pnls), 2),
        "avg_pnl_usd": round(sum(pnls) / total, 2),
        "total_pnl_usd": round(sum(pnls), 2),
        "event_titles": [e.get("title", e.get("slug", ""))[:80] for e in events[:10]],
    }

    if args.json:
        print(json.dumps(result, indent=2))
        return 0

    print("\n=== WC Polymarket PnL snapshot ===")
    print(f"Метод:              {result['method']}")
    print(f"WC events:          {result['events']}")
    print(f"Markets scanned:    {result['markets_scanned']}")
    print(f"Wallets analyzed:   {result['wallets_analyzed']}")
    print(f"У мінусі:           {losers} ({pct_losing}%)")
    print(f"У плюсі:            {winners} ({pct_winning}%)")
    print(f"Нуль:               {flat}")
    print(f"Median PnL:         ${result['median_pnl_usd']}")
    print(f"Avg PnL:            ${result['avg_pnl_usd']}")
    print(f"Sum PnL (sample):   ${result['total_pnl_usd']}")
    print("\nSample events:")
    for t in result["event_titles"]:
        print(f"  • {t}")
    print(
        "\nDisclaimer: sample = top holders on WC markets, not all retail. "
        "Pair with platform-wide stats (≈84% wallets red)."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
