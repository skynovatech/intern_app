import time
import threading
from collections import defaultdict
from fastapi import HTTPException, status


class InMemoryRateLimiter:
    def __init__(self):
        self._lock = threading.Lock()
        self._requests: dict[str, list[float]] = defaultdict(list)
        self._disabled_for = set()

    def check(self, key: str, max_requests: int = 10, window_seconds: int = 60, ip: str | None = None):
        """Global limiter with an optional per-IP divide.

        If `ip` is provided, limits are tracked per source (ip + key) so one
        client cannot throttle every other user. Without `ip`, the original
        global behaviour is preserved (used for admin/authenticated calls).
        """
        bucket = f"{ip}:{key}" if ip else f"global:{key}"
        now = time.time()
        window_start = now - window_seconds
        with self._lock:
            bucket_times = [t for t in self._requests.get(bucket, []) if t > window_start]
            if len(bucket_times) >= max_requests:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Try again in {int(window_seconds)} seconds.",
                )
            bucket_times.append(now)
            self._requests[bucket] = bucket_times

    def clear(self, key: str):
        with self._lock:
            self._requests.pop(f"global:{key}", None)
            self._requests = defaultdict(
                list,
                {k: v for k, v in self._requests.items() if not k.endswith(f":{key}")},
            )


rate_limiter = InMemoryRateLimiter()