import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware


class InMemoryRateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests: int, window_seconds: int) -> None:
        super().__init__(app)
        self.requests = requests
        self.window_seconds = window_seconds
        self._hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(
        self, request: Request, call_next: Callable[[Request], Awaitable[Response]]
    ) -> Response:
        if request.url.path.endswith("/health"):
            return await call_next(request)

        now = time.monotonic()
        client = request.client.host if request.client else "unknown"
        hits = self._hits[client]
        while hits and now - hits[0] > self.window_seconds:
            hits.popleft()

        if len(hits) >= self.requests:
            return Response("Rate limit exceeded", status_code=429)

        hits.append(now)
        return await call_next(request)
