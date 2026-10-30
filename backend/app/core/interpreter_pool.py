"""Where the interpreter runs: a few threads of its own, with a short queue.

The interpreter is pure Python, so a run holds the GIL the event loop needs. In
asyncio's default pool (asyncio.to_thread), a burst of public /run requests, each
allowed RunLimits' timeout, took every thread and nearly all the CPU: token checks
(security.py) wait in that same pool, so the agent, saving, billing and Stripe's
webhook stalled with it. Here at most `run_workers` programs run at once, in anyio's
worker threads (not that pool), at most `run_queue` more requests wait, and the rest
get 503 straight away. One process holds it all, as on Render.
"""

from collections.abc import Callable
from functools import partial

import anyio
import anyio.to_thread
from fastapi import HTTPException, status

from app.core.config import get_settings

_limiter: anyio.CapacityLimiter | None = None
_admitted = 0  # running or waiting for a thread


def _threads() -> anyio.CapacityLimiter:
    # Made on first use, inside the event loop.
    global _limiter
    if _limiter is None:
        _limiter = anyio.CapacityLimiter(get_settings().run_workers)
    return _limiter


async def in_interpreter[T](func: Callable[..., T], *args: object, queue: bool = True) -> T:
    """`func(*args)` on one of the interpreter's threads. With `queue` (the public
    endpoints), 503 at once when the queue is full; the agent's tools wait instead."""
    global _admitted
    settings = get_settings()
    if queue and _admitted >= settings.run_workers + settings.run_queue:
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE, "Interpreter busy", headers={"Retry-After": "2"}
        )
    _admitted += 1
    try:
        return await anyio.to_thread.run_sync(partial(func, *args), limiter=_threads())
    finally:
        _admitted -= 1
