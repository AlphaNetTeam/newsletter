"""Deterministic synthetic market data generator.

This is the fallback data source used whenever the live upstream price
API (CoinGecko) can't be reached — which is always true inside this
sandboxed dev environment, and may also be true behind restrictive
corporate networks. It is seeded per-symbol so results are stable across
requests/instances without needing a database.

The approach: a seeded Brownian bridge in log-price space, pinned exactly
to the configured start/current price anchors at both ends — giving a
chart that looks like real historical data (bounded, realistic-looking
excursions) while remaining perfectly reproducible.
"""
from __future__ import annotations

import hashlib
import math
import random
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import List

from app.core.config import SymbolConfig


@dataclass
class PricePoint:
    timestamp_ms: int
    price: float


def _seed_for(symbol: str, salt: str = "") -> int:
    digest = hashlib.sha256(f"{symbol}:{salt}".encode()).hexdigest()
    return int(digest[:16], 16)


def generate_daily_series(
    symbol: str, cfg: SymbolConfig, days: int, as_of: datetime | None = None
) -> List[PricePoint]:
    """Generate `days` of daily close prices ending "today", bridged so the
    series starts at cfg.start_price (days ago) and ends at cfg.current_price.

    Note: the bridge anchors are defined relative to the *3-year* window
    (`RANGE_DAYS["ALL"]`) so that shorter ranges (1M/3M/1Y) are simply a
    trailing slice of the same full series, exactly like a real charting
    API would behave.
    """
    from app.core.config import RANGE_DAYS

    total_days = RANGE_DAYS["ALL"]
    n = total_days - 1  # number of steps
    rng = random.Random(_seed_for(symbol, "daily-series"))

    log_start = math.log(cfg["start_price"])
    log_end = math.log(cfg["current_price"])

    # True Brownian bridge: W(t) is a standard random walk, B(t) = W(t) -
    # (t/n)*W(n) is pinned to 0 at both t=0 and t=n. This produces a
    # realistic, mean-reverting-looking noise path with *bounded* excursions
    # (unlike a raw random walk + linear correction, which can wander
    # arbitrarily far before being dragged back, producing unrealistic
    # runs pinned against a clip ceiling/floor).
    w = [0.0]
    for _ in range(n):
        w.append(w[-1] + rng.gauss(0, cfg["volatility"]))

    bridged = []
    for i in range(total_days):
        trend = log_start + (log_end - log_start) * (i / n)
        bridge_noise = w[i] - (i / n) * w[n]
        bridged.append(trend + bridge_noise)

    # The bridge construction pins bridged[0] == log_start and
    # bridged[-1] == log_end exactly already; re-assign for float safety.
    # No artificial ceiling/floor clipping — the actual all-time-high and
    # 12-month-low stats are *derived* from this series (see
    # price_service.get_stats) rather than the other way around, so there's
    # nothing to reconcile.
    bridged[-1] = log_end
    bridged[0] = log_start

    prices = [math.exp(v) for v in bridged]

    as_of = as_of or datetime.now(timezone.utc)
    start_date = as_of - timedelta(days=total_days - 1)
    full_series = [
        PricePoint(
            timestamp_ms=int((start_date + timedelta(days=i)).timestamp() * 1000),
            price=round(prices[i], 6),
        )
        for i in range(total_days)
    ]

    # Return only the trailing `days` requested.
    return full_series[-days:]


def generate_daily_returns(symbol: str, days: int, seed_salt: str) -> List[float]:
    """Standardized (mean 0, std 1) synthetic daily return series, used as
    the shared 'market factor' + per-asset idiosyncratic noise inputs to
    the correlation model.
    """
    rng = random.Random(_seed_for(symbol, seed_salt))
    raw = [rng.gauss(0, 1) for _ in range(days)]
    mean = sum(raw) / len(raw)
    variance = sum((x - mean) ** 2 for x in raw) / len(raw)
    std = math.sqrt(variance) or 1.0
    return [(x - mean) / std for x in raw]


def deterministic_daily_jitter(symbol: str, field: str, low: float, high: float) -> float:
    """A value that changes once per calendar day (deterministic given the
    date), used for metrics like funding rate that should look 'live' but
    stay stable within a day and across replicas/requests.
    """
    today = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    rng = random.Random(_seed_for(symbol, f"{field}:{today}"))
    return low + rng.random() * (high - low)
