from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class AIAlertResponse(BaseModel):
    id: int
    title: str
    severity: str
    disease_entity: str
    location: str
    outbreak_level: str
    affected_categories: str
    recommended_action: str
    mathematical_reasoning: str
    data_source: str
    is_active: bool
    confidence_score: float
    timestamp: datetime

    class Config:
        from_attributes = True

class AnomalyResponse(BaseModel):
    id: int
    item_id: int
    item_name: str
    anomaly_type: str
    consumption_value: float
    expected_baseline: float
    z_score: float
    deviation_pct: float
    flagged_reason: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

class ReorderRecommendationResponse(BaseModel):
    id: int
    item_id: int
    item_name: str
    item_code: str
    category: str
    current_stock: int
    safety_stock: int
    predicted_demand_30d: float
    supplier_id: Optional[int]
    supplier_name: Optional[str]
    supplier_reliability: float
    lead_time_days: float
    suggested_qty: int
    unit_cost: float
    total_estimated_cost: float
    urgency_score: float
    reasoning: str
    status: str
    timestamp: datetime

    class Config:
        from_attributes = True

class SupplierScorecardResponse(BaseModel):
    id: int
    supplier_code: str
    name: str
    contact_email: Optional[str]
    historical_lead_time_days: float
    reliability_score: float
    on_time_delivery_rate: float
    quality_compliance_score: float
    composite_grade: str  # "A+", "A", "B", "C"
    active_items_supplied: int

class PublicHealthSignalIngestRequest(BaseModel):
    headline: str
    content: str
    source_url: Optional[str] = "https://health.gov.in/surveillance-bulletin"
    source_agency: str = "National Centre for Disease Control (NCDC)"
    timestamp: Optional[str] = None
