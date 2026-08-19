"""Thin client for Hyperliquid's public `/info` REST API and public
websocket feed. No API key / signing required — these are the same
anonymous endpoints Hyperliquid's own UI uses for market data.

Endpoint shapes verified against
https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api
(2026-08). If Hyperliquid changes their API, this is the one file that
should need updating — callers (`price_service`, `market_service`,
`background`) only see plain dataclasses / dicts.
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Callable, Iterable

import httpx
import websockets
from websockets.exceptions import WebSocketException

from app.core.config import (
    HYPERLIQUID_INFO_URL,
    HYPERLIQUID_WS_URL,
    WS_RECONNECT_MAX_BACKOFF_S,
    WS_RECONNECT_MIN_BACKOFF_S,
)

logger = logging.getLogger("hyperliquid_client")


@dataclass
class AssetCtxSnapshot:
    symbol: str
    mark_px: float
    oracle_px: float
    mid_px: float
    prev_day_px: float
    funding_hourly: float  # Hyperliquid settles funding hourly
    open_interest: float  # in base-asset units
    day_notional_volume: float  # USD
    max_leverage: int


@dataclass
class Candle:
    open_time_ms: int
    close_time_ms: int
    open: float
    high: float
    low: float
    close: float
    volume: float


def _to_float(v, default: float = 0.0) -> float:
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


async def fetch_meta_and_asset_ctxs(
    client: httpx.AsyncClient,
) -> dict[str, AssetCtxSnapshot]:
    """POST {"type": "metaAndAssetCtxs"} -> [meta, assetCtxs], index-aligned
    with meta["universe"]. Returns a dict keyed by ticker symbol.
    """
    resp = await client.post(HYPERLIQUID_INFO_URL, json={"type": "metaAndAssetCtxs"})
    resp.raise_for_status()
    meta, asset_ctxs = resp.json()

    universe = meta.get("universe", [])
    out: dict[str, AssetCtxSnapshot] = {}
    for i, entry in enumerate(universe):
        if i >= len(asset_ctxs):
            break
        symbol = entry.get("name")
        if not symbol:
            continue
        ctx = asset_ctxs[i]
        out[symbol] = AssetCtxSnapshot(
            symbol=symbol,
            mark_px=_to_float(ctx.get("markPx")),
            oracle_px=_to_float(ctx.get("oraclePx")),
            mid_px=_to_float(ctx.get("midPx")),
            prev_day_px=_to_float(ctx.get("prevDayPx")),
            funding_hourly=_to_float(ctx.get("funding")),
            open_interest=_to_float(ctx.get("openInterest")),
            day_notional_volume=_to_float(ctx.get("dayNtlVlm")),
            max_leverage=int(entry.get("maxLeverage") or 0),
        )
    return out


async def fetch_candles(
    client: httpx.AsyncClient,
    coin: str,
    interval: str,
    start_ms: int,
    end_ms: int,
) -> list[Candle]:
    """POST {"type": "candleSnapshot", "req": {...}}. Hyperliquid caps
    results at 5000 candles per call — daily candles over a 3-year window
    (~1095 rows) fit comfortably in one request, so no pagination needed
    for the ranges this app uses.
    """
    body = {
        "type": "candleSnapshot",
        "req": {"coin": coin, "interval": interval, "startTime": start_ms, "endTime": end_ms},
    }
    resp = await client.post(HYPERLIQUID_INFO_URL, json=body)
    resp.raise_for_status()
    raw = resp.json()
    if not isinstance(raw, list):
        return []

    candles = [
        Candle(
            open_time_ms=int(c["t"]),
            close_time_ms=int(c["T"]),
            open=_to_float(c.get("o")),
            high=_to_float(c.get("h")),
            low=_to_float(c.get("l")),
            close=_to_float(c.get("c")),
            volume=_to_float(c.get("v")),
        )
        for c in raw
    ]
    candles.sort(key=lambda c: c.open_time_ms)
    return candles


class HyperliquidWsRelay:
    """Maintains a persistent websocket subscription to Hyperliquid's
    `allMids` channel and invokes `on_mids` with every push. Runs forever
    until `stop()` is called; reconnects with exponential backoff on any
    disconnect/error, since Hyperliquid's docs explicitly say clients
    should expect drops and handle reconnection themselves.
    """

    def __init__(self, on_mids: Callable[[dict[str, float]], None], on_status: Callable[[bool], None]):
        self._on_mids = on_mids
        self._on_status = on_status
        self._stop = asyncio.Event()

    def stop(self) -> None:
        self._stop.set()

    async def run(self) -> None:
        backoff = WS_RECONNECT_MIN_BACKOFF_S
        while not self._stop.is_set():
            try:
                async with websockets.connect(HYPERLIQUID_WS_URL, ping_interval=20, ping_timeout=20) as ws:
                    await ws.send(
                        '{"method":"subscribe","subscription":{"type":"allMids"}}'
                    )
                    self._on_status(True)
                    backoff = WS_RECONNECT_MIN_BACKOFF_S
                    async for raw_msg in ws:
                        if self._stop.is_set():
                            break
                        self._handle_message(raw_msg)
            except (WebSocketException, OSError, asyncio.TimeoutError) as e:
                logger.warning("Hyperliquid WS disconnected (%s); reconnecting in %ss", e, backoff)
            except Exception:
                logger.exception("Unexpected error in Hyperliquid WS relay")
            finally:
                self._on_status(False)

            if self._stop.is_set():
                break
            await asyncio.sleep(backoff)
            backoff = min(backoff * 2, WS_RECONNECT_MAX_BACKOFF_S)

    def _handle_message(self, raw_msg: str) -> None:
        import json

        try:
            msg = json.loads(raw_msg)
        except ValueError:
            return
        if msg.get("channel") != "allMids":
            return
        mids = msg.get("data", {}).get("mids", {})
        parsed = {sym: _to_float(px) for sym, px in mids.items()}
        if parsed:
            self._on_mids(parsed)
