"""A cap on request bodies.

Starlette reads and parses the whole body before pydantic's max_length checks run,
so without it one large POST to the public /run sat in the worker's memory (a
500 MB body took the process past 1.6 GB, more than Render's instance has).
"""

from fastapi import HTTPException, status
from starlette.types import ASGIApp, Message, Receive, Scope, Send

# The largest request the app takes is /run's (schemas/run.py): 50k characters of
# code and 1,000 inputs of 1,000, about 2 MB of Greek as browsers send it (UTF-8).
MAX_BODY_BYTES = 4 * 1024 * 1024


class BodyLimit:
    def __init__(self, app: ASGIApp, max_bytes: int = MAX_BODY_BYTES) -> None:
        self.app = app
        self.max_bytes = max_bytes

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return
        length = dict(scope["headers"]).get(b"content-length")
        if length is not None and (not length.isdigit() or int(length) > self.max_bytes):
            await send_too_large(send)
            return
        received = 0

        async def counted() -> Message:
            # A chunked body has no Content-Length: count it as it arrives. FastAPI
            # re-raises an HTTPException from reading the body, and answers it.
            nonlocal received
            message = await receive()
            if message["type"] == "http.request":
                received += len(message.get("body", b""))
                if received > self.max_bytes:
                    raise HTTPException(status.HTTP_413_CONTENT_TOO_LARGE, "Request too large")
            return message

        await self.app(scope, counted, send)


async def send_too_large(send: Send) -> None:
    body = b'{"detail":"Request too large"}'
    await send(
        {
            "type": "http.response.start",
            "status": status.HTTP_413_CONTENT_TOO_LARGE,
            "headers": [
                (b"content-type", b"application/json"),
                (b"content-length", str(len(body)).encode()),
            ],
        }
    )
    await send({"type": "http.response.body", "body": body})
