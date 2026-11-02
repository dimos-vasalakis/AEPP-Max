"""Where the interpreter runs: a few threads of its own, with a short queue.

The interpreter is pure Python, so a run holds the GIL the event loop needs. In
asyncio's default pool (asyncio.to_thread), a burst of public /run requests, each
allowed RunLimits' timeout, took every thread and nearly all the CPU: token checks
(security.py) wait in that same pool, so the agent, saving, billing and Stripe's
webhook stalled with it. Here at most `run_workers` programs run at once, in anyio's
worker threads (not that pool), at most `run_queue` more requests wait, and the rest
get 503 straight away. One process holds it all, as on Render.

/check only parses, in milliseconds, but runs can hold their threads for the whole
timeout. So it has threads and a queue of its own: an infinite loop elsewhere doesn't
delay or refuse the editor's error marks.
"""

from collections.abc import Callable
from functools import partial

import anyio
import anyio.to_thread
from fastapi import HTTPException, status

from app.core.config import get_settings


class _Pool:
    def __init__(self) -> None:
        self.limiter: anyio.CapacityLimiter | None = None  # made on first use, in the event loop
        self.admitted = 0  # running or waiting for a thread

    async def call[T](self, func: Callable[..., T], args: tuple[object, ...], queue: bool) -> T:
        settings = get_settings()
        if queue and self.admitted >= settings.run_workers + settings.run_queue:
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                "Interpreter busy",
                headers={"Retry-After": "2"},
            )
        if self.limiter is None:
            self.limiter = anyio.CapacityLimiter(settings.run_workers)
        self.admitted += 1
        try:
            return await anyio.to_thread.run_sync(partial(func, *args), limiter=self.limiter)
        finally:
            self.admitted -= 1


_runs = _Pool()
_checks = _Pool()


async def in_interpreter[T](func: Callable[..., T], *args: object, queue: bool = True) -> T:
    """`func(*args)` on one of the interpreter's threads. With `queue` (the public
    endpoints), 503 at once when the queue is full; the agent's tools wait instead."""
    return await _runs.call(func, args, queue)


async def in_checker[T](func: Callable[..., T], *args: object) -> T:
    """`func(*args)` for /check, apart from the runs."""
    return await _checks.call(func, args, True)
