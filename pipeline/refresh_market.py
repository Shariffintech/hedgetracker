"""Refresh the clearly labeled BTC market-context series from Coinbase Exchange."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import sys
from urllib.request import Request, urlopen


SOURCE_URL = "https://api.exchange.coinbase.com/products/BTC-USD/candles?granularity=86400"
OUTPUT = Path(__file__).resolve().parent / "market" / "btc-usd.json"


def main() -> int:
    try:
        request = Request(SOURCE_URL, headers={"User-Agent": "HedgeTracker research", "Accept": "application/json"})
        with urlopen(request, timeout=12) as response:
            candles = json.load(response)
        today = datetime.now(timezone.utc).date()
        rows = sorted(
            ({"date": datetime.fromtimestamp(row[0], timezone.utc).date().isoformat(), "closeUsd": float(row[4])}
             for row in candles if datetime.fromtimestamp(row[0], timezone.utc).date() < today),
            key=lambda row: row["date"],
        )[-90:]
        if len(rows) < 30 or any(row["closeUsd"] <= 0 for row in rows):
            raise ValueError("Coinbase returned too few valid completed daily candles")
        payload = {"source": "Coinbase Exchange BTC-USD daily candles", "sourceUrl": SOURCE_URL, "retrievedAt": today.isoformat(), "rows": rows}
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        OUTPUT.write_text(json.dumps(payload, indent=2) + "\n")
        print(f"Refreshed {len(rows)} BTC market-context observations through {rows[-1]['date']}")
        return 0
    except Exception as error:
        if OUTPUT.exists():
            print(f"Market refresh unavailable; retaining dated snapshot: {error}", file=sys.stderr)
            return 0
        print(f"Market refresh failed and no snapshot exists: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
