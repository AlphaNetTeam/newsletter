"""Price history + stats service.

Primary source is the `LiveStore`, kept warm by the background polling
loops (app/core/background.py) which pull real data from Hyperliquid.
A request handler never blocks on an outbound network call in the
common case — it just reads whatever's cached in the store.

Two fallback layers, in order:
  1. Cold cache (symbol not warmed yet, e.g. right after startup): do a
     one-off on-demand fetch straight from Hyperliquid.
  2. Hyperliquid totally unreachable even for the on-demand fetch: fall
     back to the deterministic synthetic generator, clearly tagged
     `source: "synthetic"` in every response — never silently pretend
     synthetic data is real.
"""
from __future__ import annotations

import time
from datetime import datetime, timezone
from typing import List, Literal, Tuple

import httpx

from app.core.config import RANGE_DAYS, STALE_AFTER_S, SYMBOLS
from app.core.generator import PricePoint, generate_daily_series
from app.core.live_store import LiveStore
from app.services import hyperliquid_client

RangeKey = Literal["1M", "3M", "1Y", "ALL"]
DAY_MS = 24 * 60 * 60 * 1000


def _fallback_cfg(symbol: str) -> dict:
    cfg = SYMBOLS[symbol]
    return {
        "start_price": cfg["fallback_start_price"],
        "current_price": cfg["fallback_current_price"],
        "volatility": cfg["fallback_volatility"],
    }


async def _on_demand_fetch(symbol: str) -> List[hyperliquid_client.Candle] | None:
    end_ms = int(time.time() * 1000)
    start_ms = end_ms - RANGE_DAYS["ALL"] * DAY_MS
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            return await hyperliquid_client.fetch_candles(client, symbol, "1d", start_ms, end_ms)
    except Exception:
        return None


async def get_price_series(
    store: LiveStore, symbol: str, range_key: RangeKey
) -> Tuple[List[PricePoint], str]:
    """Returns (points, source) where source is 'live' or 'synthetic'."""
    symbol = symbol.upper()
    days = RANGE_DAYS[range_key]

    candles = store.candles.get(symbol)
    source = "live"

    if not candles:
        # Cold cache — background loop hasn't warmed this symbol yet.
        candles = await _on_demand_fetch(symbol)
        if candles:
            store.candles[symbol] = candles
            store.candles_updated_at[symbol] = time.time()

    if not candles:
        # Hyperliquid unreachable even on-demand — last resort.
        points = generate_daily_series(symbol, _fallback_cfg(symbol), days)
        return points, "synthetic"

    points = [PricePoint(timestamp_ms=c.open_time_ms, price=c.close) for c in candles]
    return points[-days:], source


def _pct_change(old: float, new: float) -> float:
    if old == 0:
        return 0.0
    return round((new - old) / old, 4)


async def get_stats(store: LiveStore, symbol: str) -> dict:
    symbol = symbol.upper()

    all_points, series_source = await get_price_series(store, symbol, "ALL")
    one_month_points, _ = await get_price_series(store, symbol, "1M")
    one_year_points, _ = await get_price_series(store, symbol, "1Y")

    # Prefer the real-time mid/mark price over the last daily candle close
    # when we have a recent one — this is what makes "currentPrice" feel
    # actually live rather than updating once a day.
    live_price, is_fresh = store.latest_price(symbol, STALE_AFTER_S)
    if live_price is not None:
        current_price = live_price
        source = "live" if (is_fresh or series_source == "live") else series_source
    else:
        current_price = all_points[-1].price
        source = series_source

    change_1m = _pct_change(one_month_points[0].price, current_price)
    change_1y = _pct_change(one_year_points[0].price, current_price)

    now = datetime.now(timezone.utc)
    jan1 = datetime(now.year, 1, 1, tzinfo=timezone.utc)
    jan1_ms = int(jan1.timestamp() * 1000)
    ytd_start_point = min(all_points, key=lambda p: abs(p.timestamp_ms - jan1_ms))
    change_ytd = _pct_change(ytd_start_point.price, current_price)

    # All-time-high / 12-month-low are *derived* from the actual series
    # (over the fetched window) rather than hardcoded, so they always stay
    # consistent with what the chart renders. Note: for symbols with less
    # than a full year of Hyperliquid listing history, "12-month low" is
    # really "low since listing".
    ath_price = max(p.price for p in (all_points + [PricePoint(0, current_price)]))
    low_12m_price = min(p.price for p in (one_year_points + [PricePoint(0, current_price)]))

    return {
        "symbol": symbol,
        "currentPrice": round(current_price, 6 if current_price < 10 else 2),
        "change1m": change_1m,
        "changeYtd": change_ytd,
        "change1y": change_1y,
        "athPrice": round(ath_price, 6 if ath_price < 10 else 2),
        "low12mPrice": round(low_12m_price, 6 if low_12m_price < 10 else 2),
        "source": source,
    }
