from pydantic import BaseModel, Field
from typing import List, Optional, Literal

ReserveDisease = Literal["Trauma / Mass Casualty", "Dengue", "Influenza / ARI", "Cholera / Gastroenteritis"]

class EmergencySearchRequest(BaseModel):
    incident_latitude: float = Field(ge=-90, le=90)
    incident_longitude: float = Field(ge=-180, le=180)
    required_bed_type: str = "Trauma"  # "Trauma", "ICU", "General", "Pediatric", "Oxygen"
    min_available_beds: int = Field(default=1, ge=1)
    max_radius_km: float = Field(default=50.0, gt=0)

class HospitalRankedResponse(BaseModel):
    hospital_id: int
    hospital_code: str
    name: str
    address: str
    zone: str
    trauma_level: str
    latitude: float
    longitude: float
    contact_phone: Optional[str]
    distance_km: float
    estimated_transit_minutes: float
    bed_type: str
    total_capacity: int
    available_beds: int
    occupied_beds: int
    occupancy_pct: float
    status: str  # "AVAILABLE", "LIMITED", "SATURATED"
    readiness_score: float  # 0 to 100 based on distance & capacity

class EmergencyModeToggleRequest(BaseModel):
    reserve_disease: ReserveDisease = "Trauma / Mass Casualty"
    enable_emergency_mode: bool
    incident_type: str = "Mass Casualty Incident"
    surge_multiplier: float = Field(default=2.5, ge=1, le=10)
    incident_location: Optional[str] = "Central Metro Highway"

class EmergencySurgeItem(BaseModel):
    item_id: int
    item_code: str
    name: str
    category: str
    current_stock: int
    baseline_safety_stock: int
    emergency_surge_threshold: int
    deficit: int
    is_critical_shortage: bool
    recommended_rapid_dispatch_qty: int

class EmergencyModeStatusResponse(BaseModel):
    reserve_disease: ReserveDisease = "Trauma / Mass Casualty"
    is_emergency_active: bool
    incident_type: str
    surge_multiplier: float
    activated_at: Optional[str]
    critical_trauma_items: List[EmergencySurgeItem]
    total_emergency_items_monitored: int
    items_in_deficit: int
