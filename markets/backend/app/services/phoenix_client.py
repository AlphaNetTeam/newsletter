"""Client for AlphaNet's own real strategy-performance API.

`alphanet.phoenix.global/api/orderly/trade/recentStat` is the actual
backend the production alphanet.global site reads for its "Strategies
on {symbol}" table — this is genuinely real data, not a synthetic
stand-in, and requires no API key (a public unauthenticated GET). See
`app/core/config.py` for the documented response shape and
`strategy_service.py` for how each item gets parsed and mapped onto the
StrategyOut schema.
"""
from __future__ import annotations

import logging
from typing import List

import httpx

from app.core.config import PHOENIX_RECENT_STAT_URL, PHOENIX_RECENT_STAT_WINDOW_DAYS

logger = logging.getLogger("phoenix_client")


async def fetch_recent_stats(client: httpx.AsyncClient) -> List[dict]:
    """Returns the raw `data` array from the recentStat endpoint. Raises
    on any failure (bad status, bad envelope, non-list data) — the caller
    (background.py's refresh loop) decides how to handle that, same
    pattern as every other upstream client in this app.
    """
    resp = await client.get(
        PHOENIX_RECENT_STAT_URL, params={"t": PHOENIX_RECENT_STAT_WINDOW_DAYS}
    )
    resp.raise_for_status()
    body = resp.json()
    if not isinstance(body, dict) or body.get("code") != 200:
        raise ValueError(f"unexpected response envelope: code={body.get('code') if isinstance(body, dict) else type(body)}")
    data = body.get("data")
    if not isinstance(data, list):
        raise ValueError("expected 'data' to be a list")
    return data
