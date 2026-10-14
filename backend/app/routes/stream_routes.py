import asyncio
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse

from backend.app.services.sse_websocket import broadcaster
from backend.app.services.role_access import ADMIN, ROLES, allows_event

router = APIRouter(prefix="/api/stream", tags=["Real-time SSE & WebSockets"])

@router.get("/sse")
async def sse_alerts_stream(role: str = ADMIN):
    """
    Server-Sent Events (SSE) stream for real-time alerts, stock updates,
    and emergency mode changes. Connect via standard browser EventSource.
    """
    queue = broadcaster.subscribe_sse()

    async def event_generator():
        try:
            # Send initial handshake event
            yield f"event: CONNECTED\ndata: {json.dumps({'message': 'Connected to Lok Sahayak Live Stream'})}\n\n"
            while True:
                try:
                    # Wait for next event with a 15-second timeout for keep-alive ping
                    payload = await asyncio.wait_for(queue.get(), timeout=15.0)
                    if not allows_event(role, payload["event"]):
                        continue
                    yield f"event: {payload['event']}\ndata: {json.dumps(payload['data'])}\n\n"
                except asyncio.TimeoutError:
                    # Heartbeat comment to keep connection alive
                    yield ": ping\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            broadcaster.unsubscribe_sse(queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )

@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint for bidirectional real-time alerts and dashboard notifications.
    """
    if websocket.headers.get("X-Work-Role", websocket.query_params.get("role", ADMIN)) != ADMIN:
        await websocket.close(code=1008)
        return
    await broadcaster.connect_websocket(websocket)
    try:
        await websocket.send_text(json.dumps({
            "type": "CONNECTED",
            "message": "WebSocket real-time channel established"
        }))
        while True:
            data = await websocket.receive_text()
            # Handle client messages or ping/pong
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_text(json.dumps({"type": "PONG"}))
            except Exception:
                pass
    except WebSocketDisconnect:
        broadcaster.disconnect_websocket(websocket)
    except Exception:
        broadcaster.disconnect_websocket(websocket)
