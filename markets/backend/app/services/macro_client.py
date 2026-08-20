"""Best-effort free macro reference data (S&P 500, gold) for the
correlation panel's SPX/XAU rows.

Source: stooq.com's public CSV download endpoint — no key, no auth, the
same endpoint `pandas-datareader`'s `StooqDailyReader` has used for
years. It's not an SLA'd API (their robots.txt even discourages
scraping the path, though it doesn't block real HTTP clients), so this
is deliberately defensive: any failure — network error, non-200, or a
response that doesn't parse as the expected CSV shape — is treated as
"unavailable" and the caller falls back to a clearly-labeled synthetic
series (app.core.generator) rather than raising.
"""
from __future__ import annotations

import csv
import io
import time
from datetime import datetime, timezone

import httpx

from app.core.config import MACRO_FALLBACK, RANGE_DAYS, STOOQ_CSV_URL, STOOQ_TICKERS
from app.core.generator import generate_daily_series
from app.core.live_store import MacroSeries

# stooq blocks/deprioritizes requests that don't look like a normal
# browser; a realistic desktop UA is enough in practice.
_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
    )
}


async def _fetch_stooq_csv(client: httpx.AsyncClient, ticker: str) -> list[tuple[int, float]] | None:
    try:
        resp = await client.get(
            STOOQ_CSV_URL, params={"s": ticker, "i": "d"}, headers=_HEADERS, timeout=8.0
        )
        resp.raise_for_status()
        text = resp.text
    except Exception:
        return None

    if not text or "Date" not in text.splitlines()[0]:
        return None  # not the CSV we expected (e.g. an HTML error page)

    reader = csv.DictReader(io.StringIO(text))
    out: list[tuple[int, float]] = []
    for row in reader:
        try:
            date = datetime.strptime(row["Date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
            close = float(row["Close"])
        except (KeyError, ValueError):
            continue
        out.append((int(date.timestamp() * 1000), close))

    out.sort(key=lambda p: p[0])
    return out or None


async def fetch_macro_series(client: httpx.AsyncClient, symbol: str) -> MacroSeries | None:
    ticker = STOOQ_TICKERS.get(symbol)
    if not ticker:
        return None

    closes = await _fetch_stooq_csv(client, ticker)
    if closes:
        # Trim to the window we actually need (~3 years) to keep memory/
        # correlation-window slicing cheap.
        cutoff_ms = int(time.time() * 1000) - RANGE_DAYS["ALL"] * 24 * 60 * 60 * 1000
        trimmed = [p for p in closes if p[0] >= cutoff_ms] or closes[-RANGE_DAYS["ALL"] :]
        return MacroSeries(symbol=symbol, closes=trimmed, source="live", fetched_at=time.time())

    # Fallback: deterministic synthetic series, same generator used for
    # the tradable coins, clearly tagged source="synthetic".
    cfg = MACRO_FALLBACK.get(symbol)
    if not cfg:
        return None
    fallback_cfg = {
        "start_price": cfg["fallback_start_price"],
        "current_price": cfg["fallback_current_price"],
        "volatility": cfg["fallback_volatility"],
    }
    points = generate_daily_series(symbol, fallback_cfg, RANGE_DAYS["ALL"])
    closes_fallback = [(p.timestamp_ms, p.price) for p in points]
    return MacroSeries(symbol=symbol, closes=closes_fallback, source="synthetic", fetched_at=time.time())
