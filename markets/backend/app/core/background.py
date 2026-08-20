"""Background asyncio tasks that keep `LiveStore` warm. Started from
FastAPI's lifespan (app/main.py) and cancelled on shutdown.

Six independent loops:
  1. `poll_asset_ctxs_loop`   — REST poll every ~8s: funding/OI/volume/leverage
  2. `run_ws_relay`           — persistent WS subscription: real-time mid prices
  3. `refresh_candles_loop`   — REST poll every ~5min: daily OHLC history
  4. `refresh_macro_loop`     — every ~6h: SPX/XAU reference series
  5. `refresh_news_loop`      — every ~10min: recent-news RSS feeds
  6. `refresh_strategies_loop` — every ~10min: AlphaNet's own real strategy-performance API

Each loop is defensive: a failed iteration logs and retries rather than
crashing the process, so a transient Hyperliquid outage degrades to
"stale data, clearly labeled" rather than taking the whole API down.
Failure logging is throttled (full traceback only on the first failure
and every 10th afterward) so a sustained outage doesn't flood the logs —
see `_FailureLogger` below.
"""
from __future__ import annotations

import asyncio
import logging
import time

import httpx

from app.core.config import (
    ASSET_CTX_POLL_INTERVAL_S,
    CANDLE_REFRESH_INTERVAL_S,
    MACRO_REFRESH_INTERVAL_S,
    NEWS_REFRESH_INTERVAL_S,
    RANGE_DAYS,
    STRATEGIES_REFRESH_INTERVAL_S,
    SYMBOLS,
)
from app.core.live_store import LiveStore
from app.services import hyperliquid_client, macro_client, news_service, phoenix_client

logger = logging.getLogger("background")

DAY_MS = 24 * 60 * 60 * 1000


class _FailureLogger:
    """Logs the first failure loudly (with traceback), then only every
    Nth repeat, and logs once more when it recovers. Prevents a sustained
    outage from writing a full traceback every poll cycle forever.
    """

    def __init__(self, name: str, remind_every: int = 10):
        self.name = name
        self.remind_every = remind_every
        self._consecutive = 0

    def failure(self, detail: str) -> None:
        self._consecutive += 1
        if self._consecutive == 1:
            logger.warning("%s: failed (%s) — will keep retrying", self.name, detail)
        elif self._consecutive % self.remind_every == 0:
            logger.warning("%s: still failing after %d attempts (%s)", self.name, self._consecutive, detail)

    def success(self) -> None:
        if self._consecutive:
            logger.info("%s: recovered after %d failed attempt(s)", self.name, self._consecutive)
        self._consecutive = 0


async def poll_asset_ctxs_loop(store: LiveStore, stop_event: asyncio.Event) -> None:
    fail_log = _FailureLogger("asset-ctx poll")
    async with httpx.AsyncClient(timeout=6.0) as client:
        while not stop_event.is_set():
            try:
                ctxs = await hyperliquid_client.fetch_meta_and_asset_ctxs(client)
                relevant = {sym: ctx for sym, ctx in ctxs.items() if sym in SYMBOLS}
                if relevant:
                    store.asset_ctxs.update(relevant)
                    store.asset_ctxs_updated_at = time.time()
                    store.rest_ok = True
                    fail_log.success()
            except Exception as e:
                store.rest_ok = False
                fail_log.failure(f"{type(e).__name__}: {e}")

            await _sleep_or_stop(stop_event, ASSET_CTX_POLL_INTERVAL_S)


async def refresh_candles_loop(store: LiveStore, stop_event: asyncio.Event) -> None:
    fail_logs = {symbol: _FailureLogger(f"candle refresh [{symbol}]") for symbol in SYMBOLS}
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            end_ms = int(time.time() * 1000)
            start_ms = end_ms - RANGE_DAYS["ALL"] * DAY_MS
            for symbol in SYMBOLS:
                try:
                    candles = await hyperliquid_client.fetch_candles(
                        client, symbol, "1d", start_ms, end_ms
                    )
                    if candles:
                        store.candles[symbol] = candles
                        store.candles_updated_at[symbol] = time.time()
                        fail_logs[symbol].success()
                except Exception as e:
                    fail_logs[symbol].failure(f"{type(e).__name__}: {e}")
                # Small stagger between symbols so we don't fire 4 requests
                # in the same instant every cycle.
                await asyncio.sleep(0.5)

            await _sleep_or_stop(stop_event, CANDLE_REFRESH_INTERVAL_S)


async def refresh_macro_loop(store: LiveStore, stop_event: asyncio.Event) -> None:
    fail_logs = {symbol: _FailureLogger(f"macro refresh [{symbol}]") for symbol in ["SPX", "XAU"]}
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            for symbol in ["SPX", "XAU"]:
                try:
                    series = await macro_client.fetch_macro_series(client, symbol)
                    if series:
                        store.macro[symbol] = series
                        fail_logs[symbol].success()
                except Exception as e:
                    fail_logs[symbol].failure(f"{type(e).__name__}: {e}")
                await asyncio.sleep(0.5)

            await _sleep_or_stop(stop_event, MACRO_REFRESH_INTERVAL_S)


async def refresh_news_loop(store: LiveStore, stop_event: asyncio.Event) -> None:
    """Refreshes the shared raw news pool from public RSS feeds (see
    news_service.py). Per-symbol filtering happens at request time from
    whatever's cached here — feeds don't need to be fetched per symbol.
    """
    fail_log = _FailureLogger("news refresh")
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            try:
                items = await news_service.fetch_all_feeds(client)
                if items:
                    store.news_raw = items
                    store.news_updated_at = time.time()
                    store.news_source = "live"
                    fail_log.success()
                else:
                    # Every feed failed — leave any previously-cached items
                    # in place (still real, just aging) but flip the
                    # freshness label if we never had any to begin with.
                    if not store.news_raw:
                        store.news_source = "unavailable"
                    fail_log.failure("all feeds returned zero items")
            except Exception as e:
                fail_log.failure(f"{type(e).__name__}: {e}")

            await _sleep_or_stop(stop_event, NEWS_REFRESH_INTERVAL_S)


async def refresh_strategies_loop(store: LiveStore, stop_event: asyncio.Event) -> None:
    """Refreshes the shared raw strategies pool from AlphaNet's own real
    recentStat API (see phoenix_client.py). Per-symbol top-N-by-ROI
    filtering happens at request time from whatever's cached here — the
    upstream endpoint returns all symbols/strategies in one call.
    """
    fail_log = _FailureLogger("strategies refresh")
    async with httpx.AsyncClient(timeout=10.0) as client:
        while not stop_event.is_set():
            try:
                items = await phoenix_client.fetch_recent_stats(client)
                if items:
                    store.strategies_raw = items
                    store.strategies_updated_at = time.time()
                    store.strategies_source = "live"
                    fail_log.success()
                else:
                    if not store.strategies_raw:
                        store.strategies_source = "unavailable"
                    fail_log.failure("recentStat returned zero items")
            except Exception as e:
                fail_log.failure(f"{type(e).__name__}: {e}")

            await _sleep_or_stop(stop_event, STRATEGIES_REFRESH_INTERVAL_S)


async def run_ws_relay(store: LiveStore, stop_event: asyncio.Event) -> None:
    tracked = set(SYMBOLS.keys())
    loop = asyncio.get_event_loop()

    def on_mids(mids: dict[str, float]) -> None:
        store.set_mids(mids, tracked)
        # Fan out to connected frontend clients. set_mids is sync (called
        # from the relay's receive loop); schedule the broadcast instead
        # of awaiting it inline so a slow/blocked client can't stall the
        # upstream websocket read loop.
        relevant = {s: mids[s] for s in tracked if s in mids}
        if relevant:
            loop.create_task(
                store.connections.broadcast({"type": "mids", "data": relevant, "ts": time.time()})
            )

    def on_status(connected: bool) -> None:
        store.ws_connected = connected

    relay = hyperliquid_client.HyperliquidWsRelay(on_mids=on_mids, on_status=on_status)
    run_task = asyncio.create_task(relay.run())
    await stop_event.wait()
    relay.stop()
    run_task.cancel()
    try:
        await run_task
    except asyncio.CancelledError:
        pass


async def _sleep_or_stop(stop_event: asyncio.Event, seconds: float) -> None:
    try:
        await asyncio.wait_for(stop_event.wait(), timeout=seconds)
    except asyncio.TimeoutError:
        pass


def start_all(store: LiveStore) -> tuple[list[asyncio.Task], asyncio.Event]:
    stop_event = asyncio.Event()
    tasks = [
        asyncio.create_task(poll_asset_ctxs_loop(store, stop_event)),
        asyncio.create_task(refresh_candles_loop(store, stop_event)),
        asyncio.create_task(refresh_macro_loop(store, stop_event)),
        asyncio.create_task(refresh_news_loop(store, stop_event)),
        asyncio.create_task(refresh_strategies_loop(store, stop_event)),
        asyncio.create_task(run_ws_relay(store, stop_event)),
    ]
    return tasks, stop_event


async def stop_all(tasks: list[asyncio.Task], stop_event: asyncio.Event) -> None:
    stop_event.set()
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)
