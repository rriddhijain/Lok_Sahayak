"""Shared reserve policy. Baseline database thresholds are never overwritten."""
import math
from backend.app.services.public_health_nlp import PublicHealthNLPPipeline

EMERGENCY_STATE = {
    "is_emergency_active": False, "incident_type": "Normal Operations",
    "surge_multiplier": 1.0, "activated_at": None, "incident_location": None,
    "reserve_disease": "Trauma / Mass Casualty",
}

def reserve_applies(item, state=None):
    state = EMERGENCY_STATE if state is None else state
    disease = state.get("reserve_disease", "Trauma / Mass Casualty")
    if disease == "Trauma / Mass Casualty":
        return bool(item.is_trauma_critical)
    targets = PublicHealthNLPPipeline.DISEASE_TAXONOMY.get(disease, {}).get("target_items", [])
    name = item.name.lower()
    return any(target.lower() in name or
               (target == "Salbutamol Respules" and "salbutamol" in name and "respules" in name)
               for target in targets)

def reserve_multiplier(item):
    return EMERGENCY_STATE["surge_multiplier"] if EMERGENCY_STATE["is_emergency_active"] and reserve_applies(item) else 1.0

def effective_safety_stock(item):
    return math.ceil(item.safety_stock_threshold * reserve_multiplier(item))
