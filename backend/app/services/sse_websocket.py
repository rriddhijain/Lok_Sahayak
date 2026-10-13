import asyncio
import json
from typing import List, Set
from fastapi import WebSocket
from datetime import datetime

class RealtimeAlertBroadcaster:
    """
    Manages Server-Sent Events (SSE) and WebSockets for real-time dashboard alerts,
    anomaly broadcasts, and emergency mode state updates.
    """

    def __init__(self):
        self.active_websockets: Set[WebSocket] = set()
        self.sse_subscribers: Set[asyncio.Queue] = set()

    # --- WebSocket Management ---
    async def connect_websocket(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)

    def disconnect_websocket(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)

    async def broadcast_websocket(self, message: dict):
        text = json.dumps(message)
        dead = []
        for ws in self.active_websockets:
            try:
                await ws.send_text(text)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.active_websockets.discard(ws)

    # --- Server-Sent Events (SSE) Management ---
    def subscribe_sse(self) -> asyncio.Queue:
        queue = asyncio.Queue()
        self.sse_subscribers.add(queue)
        return queue

    def unsubscribe_sse(self, queue: asyncio.Queue):
        self.sse_subscribers.discard(queue)

    async def broadcast_sse(self, event_type: str, data: dict):
        payload = {
            "event": event_type,
            "data": data,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        for q in list(self.sse_subscribers):
            try:
                await q.put(payload)
            except Exception:
                self.sse_subscribers.discard(q)

    # --- Unified Broadcaster ---
    async def broadcast(self, event_type: str, data: dict):
        msg = {
            "type": event_type,
            "payload": data,
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
        await self.broadcast_websocket(msg)
        await self.broadcast_sse(event_type, data)

broadcaster = RealtimeAlertBroadcaster()
