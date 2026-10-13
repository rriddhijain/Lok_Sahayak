from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class ChatMessage(BaseModel):
    role: str  # "user", "assistant", "system"
    content: str

class GroundedDataCitation(BaseModel):
    entity_type: str  # "ITEM", "HOSPITAL_BED", "BATCH_EXPIRY", "SUPPLIER", "EPIDEMIC_ALERT"
    entity_id: Optional[str] = None
    title: str
    details: str
    metric: Optional[str] = None

class AssistantQueryRequest(BaseModel):
    query: str
    role_context: str = "Hospital Administrator"  # "Hospital Administrator", "Inventory Manager", "Procurement Staff"
    history: List[ChatMessage] = []

class AssistantQueryResponse(BaseModel):
    reply: str
    citations: List[GroundedDataCitation] = []
    suggested_actions: List[str] = []
    reasoning_mode: str = "Antigravity Real-Time Inventory Grounding"
    generated_at: str
