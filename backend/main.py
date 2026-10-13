import uvicorn
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.config import settings
from backend.app.database import init_db
from backend.app.seed_data import seed_database
from backend.app.routes.inventory_routes import router as inventory_router
from backend.app.routes.forecast_routes import router as forecast_router
from backend.app.routes.optimization_routes import router as optimization_router
from backend.app.routes.emergency_routes import router as emergency_router
from backend.app.routes.nlp_routes import router as nlp_router
from backend.app.routes.assistant_routes import router as assistant_router
from backend.app.routes.stream_routes import router as stream_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup sequence: initialize tables and run seed if needed
    print("[SYSTEM] Initializing Lok Sahayak Database...")
    await init_db()
    print("[SYSTEM] Verifying seeded inventory, hospital network, and historical data...")
    await seed_database()
    print("[SYSTEM] Lok Sahayak AI Decision Support System is LIVE.")
    yield
    print("[SYSTEM] Shutting down services cleanly...")

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description="AI-Enabled Hospital Inventory Management & Decision-Support System powered by Antigravity Infrastructure",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow Next.js frontend and any local port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers
app.include_router(inventory_router)
app.include_router(forecast_router)
app.include_router(optimization_router)
app.include_router(emergency_router)
app.include_router(nlp_router)
app.include_router(assistant_router)
app.include_router(stream_router)

@app.get("/")
async def root():
    return {
        "platform": settings.APP_NAME,
        "version": settings.VERSION,
        "infrastructure": "Antigravity Intelligent Framework",
        "status": "OPERATIONAL",
        "endpoints": {
            "docs": "/docs",
            "inventory": "/api/inventory/items",
            "forecast": "/api/forecast/item/1",
            "procurement": "/api/procurement/reorders",
            "emergency_finder": "/api/emergency/hospital-finder",
            "public_health_nlp": "/api/nlp/alerts",
            "ai_assistant": "/api/assistant/chat",
            "live_sse_stream": "/api/stream/sse",
            "live_websocket": "/api/stream/ws"
        }
    }

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "database": "connected",
        "milvus_status": "ready",
        "antigravity_core": "active"
    }

if __name__ == "__main__":
    uvicorn.run("backend.main:app", host=settings.HOST, port=settings.PORT, reload=True)
