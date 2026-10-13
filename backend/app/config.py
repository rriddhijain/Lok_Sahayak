import os
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseModel):
    APP_NAME: str = "Lok Sahayak - Smart Health Centre Inventory"
    VERSION: str = "2.0.0"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./hospital_inventory.db")
    MILVUS_URI: str = os.getenv("MILVUS_URI", "./milvus_health_nlp.db")
    MILVUS_COLLECTION: str = "health_surveillance_signals"
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    EMBEDDING_DIM: int = 128
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
    ]

settings = Settings()
