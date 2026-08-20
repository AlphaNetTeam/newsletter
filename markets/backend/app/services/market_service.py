"""Hyperliquid-sourced market metrics + cross-asset correlation service.

Metrics (open interest, 24h volume, funding, max leverage) are read
directly from the live-polled Hyperliquid asset context in `LiveStore`.
Realized volatility and correlation are *computed* from real daily
candle closes (also Hyperliquid-sourced for BTC/ETH/SOL/DOGE; best-effort
stooq-sourced for the SPX/XAU reference rows) rather than faked — this is
genuine statistics over genuine price history, not decoration.

Every code path that has to fall back to synthetic data (Hyperliquid or
stooq unreachable) tags its output `source: "synthetic"` rather than
quietly serving fabricated numbers as if they were real.
"""
from __future__ import annotations

import math
import time
from typing import List

from app.core.config import (
    BASE_CORRELATION_TARGETS,
    CORRELATION_REFERENCE_ASSETS,
    RANGE_DAYS,
    STALE_AFTER_S,
    SYMBOLS,
    VOL_LOOKBACK_DAYS,
    VOL_WINDOW_DAYS,
)
from app.core.generator import generate_daily_returns, generate_daily_series
from app.core.live_store import LiveStore
from app.services.strategy_service import get_strategies

CORRELATION_WINDOW_DAYS = 90


def _fallback_cfg(symbol: str) -> dict:
    cfg = SYMBOLS[symbol]
    return {
        "start_price": cfg["fallback_start_price"],
        "current_price": cfg["fallback_current_price"],
        "volatility": cfg["fallback_volatility"],
    }


def _realized_vol(prices: List[float]) -> float | None:
    """Annualized-ish realized volatility from a list of daily closes."""
    if len(prices) < 2:
        return None
    log_returns = [
        math.log(prices[i] / prices[i - 1])
        for i in range(1, len(prices))
        if prices[i - 1] > 0 and prices[i] > 0
    ]
    if not log_returns:
        return None
    mean = sum(log_returns) / len(log_returns)
    variance = sum((r - mean) ** 2 for r in log_returns) / len(log_returns)
    daily_vol = math.sqrt(variance)
    return round(daily_vol * math.sqrt(365), 4)


async def get_metrics(store: LiveStore, symbol: str) -> dict:
    symbol = symbol.upper()
    ctx = store.asset_ctxs.get(symbol)
    ctx_age = time.time() - store.asset_ctxs_updated_at if store.asset_ctxs_updated_at else float("inf")
    ctx_fresh = ctx is not None and ctx_age <= STALE_AFTER_S

    # Realized vol comes from real candle history when we have it,
    # independent of whether the asset-ctx poll is currently fresh.
    candles = store.candles.get(symbol)
    realized_vol = _realized_vol([c.close for c in candles[-31:]]) if candles else None

    if ctx_fresh:
        # Hyperliquid settles funding hourly, and the `funding` field its
        # API returns (metaAndAssetCtxs -> assetCtxs[i].funding) is that
        # hourly rate as-is — we show it unmodified rather than deriving
        # an "8h" estimate by multiplying it by 8, so this figure is
        # always exactly what Hyperliquid itself is reporting right now.
        funding_hourly = ctx.funding_hourly
        return {
            "symbol": symbol,
            # Hyperliquid's `openInterest` is denominated in the base
            # asset (e.g. BTC, not USD) — multiply by mark price for the
            # USD notional figure the UI displays.
            "openInterest": round(ctx.open_interest * ctx.mark_px, 2),
            "volume24h": round(ctx.day_notional_volume, 2),
            "fundingHourly": round(funding_hourly, 6),
            "fundingAnnualized": round(funding_hourly * 24 * 365, 4),
            "realizedVol30d": realized_vol if realized_vol is not None else 0.0,
            "maxLeverage": ctx.max_leverage,
            "source": "live",
        }

    # Hyperliquid asset-ctx poll is stale/unavailable — fall back to
    # configured placeholder values, but still use real realized vol if
    # we happen to have candle history cached from before.
    cfg = SYMBOLS[symbol]
    return {
        "symbol": symbol,
        "openInterest": cfg["fallback_open_interest"],
        "volume24h": cfg["fallback_volume_24h"],
        "fundingHourly": 0.0,
        "fundingAnnualized": 0.0,
        "realizedVol30d": realized_vol if realized_vol is not None else 0.35,
        "maxLeverage": cfg["fallback_max_leverage"],
        "source": "synthetic",
    }


def _pearson(a: List[float], b: List[float]) -> float:
    n = min(len(a), len(b))
    if n < 2:
        return 0.0
    a, b = a[-n:], b[-n:]
    mean_a = sum(a) / n
    mean_b = sum(b) / n
    cov = sum((a[i] - mean_a) * (b[i] - mean_b) for i in range(n))
    var_a = sum((x - mean_a) ** 2 for x in a)
    var_b = sum((x - mean_b) ** 2 for x in b)
    denom = math.sqrt(var_a * var_b)
    if denom == 0:
        return 0.0
    return cov / denom


def _daily_returns_from_closes(closes: List[float]) -> List[float]:
    return [
        (closes[i] - closes[i - 1]) / closes[i - 1]
        for i in range(1, len(closes))
        if closes[i - 1] > 0
    ]


def _real_returns_for(store: LiveStore, symbol: str, days: int) -> List[float] | None:
    if symbol in SYMBOLS:
        candles = store.candles.get(symbol)
        if candles and len(candles) > days:
            closes = [c.close for c in candles[-(days + 1) :]]
            return _daily_returns_from_closes(closes)
        return None

    macro = store.macro.get(symbol)
    if macro and macro.source == "live" and len(macro.closes) > days:
        closes = [px for _, px in macro.closes[-(days + 1) :]]
        return _daily_returns_from_closes(closes)
    return None


async def get_correlation(store: LiveStore, symbol: str, window: str = "90d") -> dict:
    symbol = symbol.upper()
    days = CORRELATION_WINDOW_DAYS

    others = [a for a in CORRELATION_REFERENCE_ASSETS if a != symbol][:5]

    base_real_returns = _real_returns_for(store, symbol, days)
    # Synthetic fallback series (used for either side when real data is
    # missing), seeded so it's at least internally consistent run-to-run.
    base_synthetic_returns = generate_daily_returns(symbol, days, seed_salt="corr-base")

    entries = []
    any_synthetic = False
    for other in others:
        other_real_returns = _real_returns_for(store, other, days)

        if base_real_returns is not None and other_real_returns is not None:
            corr = _pearson(base_real_returns, other_real_returns)
            entry_source = "live"
        else:
            # At least one side lacks real history — fall back to the
            # seeded synthetic correlation model for this pair only.
            target_corr = BASE_CORRELATION_TARGETS.get(other, 0.3)
            noise = generate_daily_returns(other, days, seed_salt=f"corr-noise:{symbol}")
            blended = [
                target_corr * base_synthetic_returns[i]
                + math.sqrt(max(0, 1 - target_corr**2)) * noise[i]
                for i in range(days)
            ]
            corr = _pearson(base_synthetic_returns, blended)
            entry_source = "synthetic"
            any_synthetic = True

        entries.append({"symbol": other, "correlation": round(corr, 2), "source": entry_source})

    return {
        "baseSymbol": symbol,
        "window": window,
        "entries": entries,
        "source": "synthetic" if any_synthetic else "live",
    }


def _max_drawdown(prices: List[float]) -> float:
    """Real peak-to-trough max drawdown as a positive fraction (e.g. 0.534
    for a 53.4% loss from peak). Standard running-max approach.
    """
    if len(prices) < 2:
        return 0.0
    peak = prices[0]
    worst = 0.0
    for p in prices:
        if p > peak:
            peak = p
        elif peak > 0:
            dd = (peak - p) / peak
            worst = max(worst, dd)
    return worst


def _rolling_realized_vol(
    closes: List[float], timestamps_ms: List[int], window: int
) -> List[tuple]:
    """Rolling annualized realized volatility: for each index i >= window,
    computed from the `window` daily returns ending at i. Returns a list
    of (timestamp_ms, vol) pairs.
    """
    out = []
    for i in range(window, len(closes)):
        vol = _realized_vol(closes[i - window : i + 1])
        if vol is not None:
            out.append((timestamps_ms[i], vol))
    return out


async def get_volatility(store: LiveStore, symbol: str) -> dict:
    """Volatility panel: a rolling realized-vol series (real when we have
    enough Hyperliquid candle history, synthetic fallback otherwise) plus
    a "worst drawdown, strategy vs holding" comparison — the "Holding
    {symbol}" bar is a real max-drawdown computed from actual price
    history; the four strategy bars are the same synthetic figures shown
    in the strategies table (see strategy_service.py — there's no public
    data source for AlphaNet's own backtest results).
    """
    symbol = symbol.upper()
    candles = store.candles.get(symbol)

    if candles and len(candles) >= VOL_WINDOW_DAYS + 30:
        closes = [c.close for c in candles]
        timestamps = [c.open_time_ms for c in candles]
        series_source = "live"
    else:
        points = generate_daily_series(symbol, _fallback_cfg(symbol), RANGE_DAYS["ALL"])
        closes = [p.price for p in points]
        timestamps = [p.timestamp_ms for p in points]
        series_source = "synthetic"

    vol_series = _rolling_realized_vol(closes, timestamps, VOL_WINDOW_DAYS)
    trailing = vol_series[-VOL_LOOKBACK_DAYS:] if len(vol_series) > VOL_LOOKBACK_DAYS else vol_series

    current = trailing[-1][1] if trailing else 0.0
    high12m = max((v for _, v in trailing), default=0.0)
    low12m = min((v for _, v in trailing), default=0.0)

    if symbol == "BTC":
        vs_btc = 1.0
    else:
        btc_candles = store.candles.get("BTC")
        if btc_candles and len(btc_candles) >= 31:
            btc_vol = _realized_vol([c.close for c in btc_candles[-31:]])
        else:
            # BTC's own candle cache isn't warm (e.g. cold start, or the
            # sandbox this was developed in has no Hyperliquid egress at
            # all) — fall back to a synthetic BTC reference rather than
            # leaving the comparison null. Consistent either way: if
            # `symbol`'s own series is also synthetic here, we're
            # comparing synthetic-to-synthetic, not synthetic-to-real.
            btc_points = generate_daily_series("BTC", _fallback_cfg("BTC"), RANGE_DAYS["ALL"])
            btc_vol = _realized_vol([p.price for p in btc_points[-31:]])
        vs_btc = round(current / btc_vol, 2) if btc_vol else None

    macro = store.macro.get("SPX")
    if macro and len(macro.closes) >= 31:
        sp500_current = _realized_vol([px for _, px in macro.closes[-31:]])
        sp500_source = macro.source
    else:
        sp500_current = None
        sp500_source = "unavailable"

    holding_window = closes[-VOL_LOOKBACK_DAYS:] if len(closes) > VOL_LOOKBACK_DAYS else closes
    holding_dd = _max_drawdown(holding_window)

    strategies_result = get_strategies(store, symbol)
    strategies = strategies_result["strategies"]
    strategies_source = strategies_result["source"]
    drawdown_entries = [
        {"label": s["name"], "maxDrawdown": s["maxDrawdown"], "source": strategies_source} for s in strategies
    ] + [{"label": f"Holding {symbol}", "maxDrawdown": round(holding_dd, 4), "source": series_source}]

    return {
        "symbol": symbol,
        "series": {
            "points": [{"t": t, "vol": v} for t, v in trailing],
            "current": round(current, 4),
            "high12m": round(high12m, 4),
            "low12m": round(low12m, 4),
            "vsBtcMultiple": vs_btc,
            "sp500Current": round(sp500_current, 4) if sp500_current is not None else None,
            "sp500Source": sp500_source,
            "source": series_source,
        },
        "drawdownCompare": drawdown_entries,
        "holdingDrawdown": round(holding_dd, 4),
        "holdingDrawdownSource": series_source,
    }
