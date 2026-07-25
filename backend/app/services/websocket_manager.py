import json
import asyncio
import logging
from typing import Set
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: Set[WebSocket] = set()
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self._connections.discard(websocket)

    async def broadcast(self, event: str, data: dict):
        message = json.dumps({"event": event, "data": data})
        async with self._lock:
            stale = set()
            for ws in self._connections:
                try:
                    await ws.send_text(message)
                except Exception:
                    stale.add(ws)
            self._connections -= stale

    def broadcast_sync(self, event: str, data: dict):
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                loop.create_task(self.broadcast(event, data))
            else:
                asyncio.run(self.broadcast(event, data))
        except RuntimeError:
            asyncio.run(self.broadcast(event, data))

    @property
    def active_count(self) -> int:
        return len(self._connections)


manager = ConnectionManager()
