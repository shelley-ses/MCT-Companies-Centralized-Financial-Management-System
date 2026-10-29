from __future__ import annotations
import asyncio
import json
from typing import Any, List
from fastapi import WebSocket, WebSocketDisconnect

class ConnectionManager:
    """Manages active WebSocket connections for multi-tab real-time sync."""
    def __init__(self) -> None:
        self.active_connections: List[WebSocket] = []
        self._loop: asyncio.AbstractEventLoop | None = None

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        try:
            self._loop = asyncio.get_running_loop()
        except RuntimeError:
            pass

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast JSON message to all connected clients."""
        payload = json.dumps(message)
        dead_connections: list[WebSocket] = []
        for connection in list(self.active_connections):
            try:
                await connection.send_text(payload)
            except Exception:
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)

    def broadcast_sync(self, message: dict[str, Any]) -> None:
        """
        Thread-safe and synchronous-friendly broadcast caller.
        """
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(self.broadcast(message))
            return
        except RuntimeError:
            pass

        server_loop = self._loop
        if server_loop is not None and server_loop.is_running():
            try:
                asyncio.run_coroutine_threadsafe(self.broadcast(message), server_loop)
                return
            except Exception:
                pass

        # No client has ever connected (so there is nothing to send to), or the loop is gone.
        if not self.active_connections:
            return
        try:
            asyncio.run(self.broadcast(message))
        except Exception:
            pass


ws_manager = ConnectionManager()
