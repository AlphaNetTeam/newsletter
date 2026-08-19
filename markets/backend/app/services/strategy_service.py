""""Strategies on {symbol}" panel — AlphaNet's real trading strategies
and their real live performance figures.

Primary source is `alphanet.phoenix.global`'s own recentStat API (see
`phoenix_client.py`) — the same backend the production alphanet.global
site itself reads, kept warm by a background refresh loop
(`app/core/background.py`) into `LiveStore.strategies_raw`. Per the
user's instruction, this filters that pool to the records whose market
matches the page's selected symbol, then returns the top 4 by 30D ROI
(`totalReturn`) among just those. As of when this was last checked,
every one of the 15 real markets (including BTC) has exactly 3 strategy
records rather than 4 — so today this returns 3 for every symbol. That's
not a bug: it's however many real records exist for that market right
now. If AlphaNet's own data later has more than 3 for a given symbol,
this naturally returns up to `STRATEGIES_TOP_N` (4) once they show up —
no code change needed for that.

Only when that API is completely unreachable does this fall back to a
deterministic synthetic generator seeded from `STRATEGY_DEFS`
(`app/core/config.py`) — always tagged `source: "synthetic"`, never
presented as real trading results.
"""
from __future__ import annotations

import hashlib
import logging
import random
from typing import List, Optional

from app.core.config import (
    STRATEGIES_TOP_N,
    STRATEGY_DEFS,
    STRATEGY_DESCRIPTION_FALLBACK,
    STRATEGY_DESCRIPTIONS,
)
from app.core.live_store import LiveStore

logger = logging.getLogger("strategy_service")

EQUITY_CURVE_POINTS = 48


def _slugify(name: str) -> str:
    return name.strip().lower().replace(" ", "-").replace("_", "-")


def _phoenix_symbol(symbol: str) -> str:
    """AlphaNet's real API uses Orderly-style tickers, e.g. 'PERP_BTC_USDC'."""
    return f"PERP_{symbol.upper()}_USDC"


def _humanize_duration(start_s: int, end_s: int) -> str:
    total_days = max(0, int(end_s) - int(start_s)) // 86400
    years, remainder_days = divmod(total_days, 365)
    months = remainder_days // 30
    return f"{years}Y {months}M" if years else f"{months}M"


def _to_float(v, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


def _parse_live_item(item: dict) -> Optional[dict]:
    """Maps one raw recentStat record onto the StrategyOut shape. Returns
    None (and logs) for a malformed record rather than crashing the whole
    endpoint over one bad entry.
    """
    try:
        name = item["strategy"]
        symbol = item["symbol"]
        max_cap = _to_float(item.get("maxCapacity"))
        actual_cap = _to_float(item.get("actualCapacity"))
        capacity_pct = (actual_cap / max_cap) if max_cap > 0 else 0.0

        tags_raw = item.get("tag") or ""
        badges = [t.strip().upper() for t in tags_raw.split(",") if t.strip()]

        daily = item.get("dailyStatList") or []
        daily_sorted = sorted(daily, key=lambda d: int(d.get("timestamp", 0)))
        equity_curve = [_to_float(d.get("pnl")) for d in daily_sorted]
        if not equity_curve:
            equity_curve = [0.0, _to_float(item.get("totalReturn"))]

        start_time = int(item.get("startTime") or 0)
        end_time = int(item.get("endTime") or start_time)

        return {
            "key": _slugify(item.get("strategyName") or f"{name}-{symbol}"),
            "name": name,
            "badges": badges,
            "tagline": (item.get("marketProfile") or "").upper(),
            "description": STRATEGY_DESCRIPTIONS.get(name, STRATEGY_DESCRIPTION_FALLBACK),
            "type": item.get("strategyType") or "Multi-Alpha",
            "version": item.get("version") or "",
            "liveSince": _humanize_duration(start_time, end_time),
            "trades": int(item.get("totalTrades") or 0),
            "roi": round(_to_float(item.get("totalReturn")), 4),
            "sharpe": round(_to_float(item.get("sharpeRatio")), 2),
            "maxDrawdown": round(_to_float(item.get("maxDrawDown")), 4),
            "winRate": round(_to_float(item.get("winRate")), 4),
            "capacityPct": round(capacity_pct, 4),
            "equityCurve": [round(v, 4) for v in equity_curve],
        }
    except (KeyError, TypeError, ValueError) as e:
        logger.warning("strategy_service: failed to parse live item (%s): %r", e, item.get("strategyName") if isinstance(item, dict) else item)
        return None


def _seed_for(symbol: str, key: str, salt: str) -> int:
    digest = hashlib.sha256(f"{symbol}:{key}:{salt}".encode()).hexdigest()
    return int(digest[:16], 16)


def _jitter(rng: random.Random, base: float, spread: float) -> float:
    """Multiplicative jitter: base * (1 + U(-spread, +spread))."""
    return base * (1 + rng.uniform(-spread, spread))


def _synthetic_equity_curve(symbol: str, key: str, roi: float) -> List[float]:
    """A short cumulative-return sparkline ending at `roi`, built as a
    seeded Brownian bridge so it looks like a real equity curve rather
    than a straight line, while staying pinned to the headline ROI shown
    next to it. Only used in the synthetic fallback path.
    """
    rng = random.Random(_seed_for(symbol, key, "equity-curve"))
    n = EQUITY_CURVE_POINTS - 1
    step_vol = max(0.02, abs(roi) / 12)

    w = [0.0]
    for _ in range(n):
        w.append(w[-1] + rng.gauss(0, step_vol))

    curve = []
    for i in range(EQUITY_CURVE_POINTS):
        trend = roi * (i / n)
        bridge_noise = w[i] - (i / n) * w[n]
        curve.append(round(trend + bridge_noise * 0.5, 4))

    curve[0] = 0.0
    curve[-1] = round(roi, 4)
    return curve


def _synthetic_strategies(symbol: str) -> dict:
    symbol = symbol.upper()
    out = []
    for defn in STRATEGY_DEFS:
        if symbol == "BTC":
            roi, sharpe, max_dd, win_rate, capacity = (
                defn["base_roi"],
                defn["base_sharpe"],
                defn["base_max_drawdown"],
                defn["base_win_rate"],
                defn["base_capacity_pct"],
            )
        else:
            rng = random.Random(_seed_for(symbol, defn["key"], "metrics"))
            roi = max(-0.9, _jitter(rng, defn["base_roi"], 0.35))
            sharpe = max(0.1, _jitter(rng, defn["base_sharpe"], 0.25))
            max_dd = min(0.95, max(0.01, _jitter(rng, defn["base_max_drawdown"], 0.3)))
            win_rate = min(0.95, max(0.05, _jitter(rng, defn["base_win_rate"], 0.15)))
            capacity = min(0.97, max(0.03, _jitter(rng, defn["base_capacity_pct"], 0.4)))

        out.append(
            {
                "key": defn["key"],
                "name": defn["name"],
                "badges": defn["badges"],
                "tagline": defn["tagline"],
                "description": STRATEGY_DESCRIPTIONS.get(defn["name"], STRATEGY_DESCRIPTION_FALLBACK),
                "type": defn["type"],
                "version": defn["version"],
                "liveSince": defn["liveSince"],
                "trades": defn["trades"],
                "roi": round(roi, 4),
                "sharpe": round(sharpe, 2),
                "maxDrawdown": round(max_dd, 4),
                "winRate": round(win_rate, 4),
                "capacityPct": round(capacity, 4),
                "equityCurve": _synthetic_equity_curve(symbol, defn["key"], roi),
            }
        )

    return {"symbol": symbol, "strategies": out, "source": "synthetic"}


def get_strategies(store: LiveStore, symbol: str) -> dict:
    """Top `STRATEGIES_TOP_N` strategies trading `symbol`, ranked by 30D
    ROI, from AlphaNet's real recentStat API if the background loop has
    it warm; falls back to the synthetic generator otherwise.

    Returns however many real records actually exist for `symbol` (today
    that's 3 for every market — see module docstring), capped at
    `STRATEGIES_TOP_N`. Not padded or topped up with synthetic filler
    when live data is available but sparse: a partial real result is
    still real, and silently blending in fabricated rows would defeat
    the whole point of `source: "live"` meaning "trust this".
    """
    symbol = symbol.upper()

    if store.strategies_raw:
        target = _phoenix_symbol(symbol)
        matching = [item for item in store.strategies_raw if item.get("symbol") == target]
        parsed = [p for p in (_parse_live_item(item) for item in matching) if p is not None]
        parsed.sort(key=lambda s: s["roi"], reverse=True)
        top = parsed[:STRATEGIES_TOP_N]
        if top:
            return {"symbol": symbol, "strategies": top, "source": "live"}

    return _synthetic_strategies(symbol)
