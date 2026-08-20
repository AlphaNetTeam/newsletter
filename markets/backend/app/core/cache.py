"""A tiny in-process TTL cache.

The production site fronts its API with Cloudflare and almost certainly
caches expensive upstream calls; we mirror that shape here with a minimal
dependency-free TTL cache instead of pulling in Redis for a demo project.
For a real multi-instance deployment, swap this out for Redis without
changing any call sites (the interface is a plain get/set).
"""
from __future__ import annotations

import time
from typing import Any, Callable, Dict, Optional, Tuple


class TTLCache:
    def __init__(self) -> None:
        self._store: Dict[str, Tuple[float, Any]] = {}

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            return None
        expires_at, value = entry
        if time.time() > expires_at:
            self._store.pop(key, None)
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: float) -> None:
        self._store[key] = (time.time() + ttl_seconds, value)

    async def get_or_set(
        self, key: str, ttl_seconds: float, factory: Callable[[], Any]
    ) -> Any:
        cached = self.get(key)
        if cached is not None:
            return cached
        value = await factory() if _is_coroutine_factory(factory) else factory()
        self.set(key, value, ttl_seconds)
        return value


def _is_coroutine_factory(factory: Callable[[], Any]) -> bool:
    import inspect

    return inspect.iscoroutinefunction(factory)


cache = TTLCache()
