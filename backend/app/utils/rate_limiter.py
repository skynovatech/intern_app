import time
import threading
from collections import defaultdict
from fastapi import HTTPException, status


class InMemoryRateLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._requests: dict[str, list[float]] = defaultdict(list)

    def check(self, key: str, max_requests: int = 10, window_seconds: int = 60):
        now = time.time()
        window_start = now - window_seconds
        with self._lock:
            self._requests[key] = [t for t in self._requests[key] if t > window_start]
            if len(self._requests[key]) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {window_seconds} seconds.",
                )
            self._requests[key].append(now)


rate_limiter = InMemoryRateLimiter()
