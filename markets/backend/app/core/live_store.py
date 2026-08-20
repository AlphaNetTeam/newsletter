"""In-process shared state, kept warm by background polling tasks
(app/core/background.py) and read directly by the request handlers —
so a normal API request never blocks on an outbound Hyperliquid call,
it just reads whatever the last poll cached here.

This is deliberately a single-process, in-memory store (no Redis/DB):
fine for one uvicorn worker. If you scale to multiple workers/processes,
move this to Redis (or run the pollers in one dedicated process and have
API workers read from Redis) so they share one view of the world instead
of each polling Hyperliquid independently.
"""
from __future__ import annotations

import asyncio
import time
from dataclasses import dataclass, field

from app.services.hyperliquid_client import AssetCtxSnapshot, Candle


@dataclass
class MacroSeries:
    symbol: str
    closes: list[tuple[int, float]]  # (unix_ms, close)
    source: str  # "live" or "synthetic"
    fetched_at: float


@dataclass
class NewsItem:
    title: str
    url: str
    source: str  # feed name, e.g. "CoinDesk"
    published_at_ms: int


class ConnectionManager:
    """Fan-out broadcaster for our own /ws/prices clients."""

    def __init__(self) -> None:
        self._clients: set = set()
        self._lock = asyncio.Lock()

    async def connect(self, ws) -> None:
        await ws.accept()
        async with self._lock:
            self._clients.add(ws)

    async def disconnect(self, ws) -> None:
        async with self._lock:
            self._clients.discard(ws)

    async def broadcast(self, message: dict) -> None:
        async with self._lock:
            targets = list(self._clients)
        stale = []
        for ws in targets:
            try:
                await ws.send_json(message)
            except Exception:
                stale.append(ws)
        if stale:
            async with self._lock:
                for ws in stale:
                    self._clients.discard(ws)

    @property
    def client_count(self) -> int:
        return len(self._clients)


class LiveStore:
    def __init__(self) -> None:
        # Real-time mid prices, pushed by the Hyperliquid WS relay.
        self.mids: dict[str, float] = {}
        self.mids_updated_at: dict[str, float] = {}
        self.ws_connected: bool = False

        # REST-polled snapshot (funding, open interest, volume, mark/oracle
        # price, max leverage) — refreshed every ASSET_CTX_POLL_INTERVAL_S.
        self.asset_ctxs: dict[str, AssetCtxSnapshot] = {}
        self.asset_ctxs_updated_at: float = 0.0
        self.rest_ok: bool = False

        # Daily candle history per symbol, refreshed periodically.
        self.candles: dict[str, list[Candle]] = {}
        self.candles_updated_at: dict[str, float] = {}

        # Best-effort macro reference series (SPX / XAU) for correlation.
        self.macro: dict[str, MacroSeries] = {}

        # Recent crypto news, merged from public RSS feeds (see
        # news_service.py). Kept as one shared raw pool — per-symbol
        # filtering happens cheaply at read time rather than fetching
        # separately per symbol.
        self.news_raw: list[NewsItem] = []
        self.news_updated_at: float = 0.0
        self.news_source: str = "unavailable"  # "live" | "unavailable"

        # Raw items from AlphaNet's own real strategy-performance API
        # (alphanet.phoenix.global/api/orderly/trade/recentStat) — see
        # phoenix_client.py / strategy_service.py. Kept as one shared raw
        # pool (all symbols, all strategies); per-symbol top-N-by-ROI
        # filtering happens cheaply at read time.
        self.strategies_raw: list[dict] = []
        self.strategies_updated_at: float = 0.0
        self.strategies_source: str = "unavailable"  # "live" | "unavailable"

        self.connections = ConnectionManager()

    def set_mids(self, mids: dict[str, float], tracked_symbols: set[str]) -> None:
        now = time.time()
        for sym, px in mids.items():
            if sym in tracked_symbols and px > 0:
                self.mids[sym] = px
                self.mids_updated_at[sym] = now

    def latest_price(self, symbol: str, max_age_s: float) -> tuple[float | None, bool]:
        """Returns (price, is_fresh). Prefers the WS mid price if fresh;
        falls back to the REST-polled mark price if the WS feed is stale.
        """
        now = time.time()
        ws_age = now - self.mids_updated_at.get(symbol, 0)
        if symbol in self.mids and ws_age <= max_age_s:
            return self.mids[symbol], True

        ctx = self.asset_ctxs.get(symbol)
        rest_age = now - self.asset_ctxs_updated_at
        if ctx and rest_age <= max_age_s:
            return ctx.mark_px, True

        # Stale-but-present data is still returned (better than nothing)
        # but callers should treat is_fresh=False as "not live".
        if symbol in self.mids:
            return self.mids[symbol], False
        if ctx:
            return ctx.mark_px, False
        return None, False
