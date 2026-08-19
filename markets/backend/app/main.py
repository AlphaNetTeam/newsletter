from __future__ import annotations

import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import market
from app.core import background
from app.core.live_store import LiveStore

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    store = LiveStore()
    app.state.store = store
    tasks, stop_event = background.start_all(store)
    app.state._bg_tasks = tasks
    app.state._bg_stop_event = stop_event
    try:
        yield
    finally:
        await background.stop_all(tasks, stop_event)


app = FastAPI(
    title="AlphaNet Clone API",
    description=(
        "Backend API for the AlphaNet strategy-page clone. Mirrors the "
        "{code, msg, data} envelope convention observed on the production "
        "alphanet.phoenix.global API. Live market data is sourced from "
        "Hyperliquid's public API (see app/services/hyperliquid_client.py)."
    ),
    version="0.2.0",
    lifespan=lifespan,
)

_allowed_origins = os.environ.get(
    "ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router)


@app.get("/api/health")
async def health():
    return {"code": 200, "msg": "success", "data": {"status": "ok"}}


@app.websocket("/ws/prices")
async def ws_prices(websocket: WebSocket):
    """Real-time price ticks, relayed from Hyperliquid's `allMids`
    websocket feed. On connect, sends the latest known mid for every
    tracked symbol immediately, then streams updates as they arrive.
    """
    store: LiveStore = websocket.app.state.store
    await store.connections.connect(websocket)
    try:
        if store.mids:
            await websocket.send_json({"type": "mids", "data": dict(store.mids), "ts": None})
        while True:
            # We don't expect messages from the client; just keep the
            # connection open and let disconnects raise.
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass
    finally:
        await store.connections.disconnect(websocket)
