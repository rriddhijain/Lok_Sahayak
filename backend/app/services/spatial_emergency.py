import math
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.models.hospital import Hospital, BedAllocation
from backend.app.models.inventory import Item

class SpatialEmergencyEngine:
    """
    Emergency Response and Spatial Intelligence Service:
    1. Haversine spatial ranking of hospitals by distance and real-time bed capacity.
    2. Dynamic Emergency Inventory Surge mode for mass-casualty incidents.
    """

    EARTH_RADIUS_KM = 6371.0

    @classmethod
    def haversine_distance(cls, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """
        Calculates great-circle distance between two GPS coordinates in kilometers.
        """
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        delta_phi = math.radians(lat2 - lat1)
        delta_lambda = math.radians(lon2 - lon1)

        a = math.sin(delta_phi / 2.0) ** 2 + \
            math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return round(cls.EARTH_RADIUS_KM * c, 2)

    @classmethod
    def rank_hospitals_for_incident(
        cls,
        incident_lat: float,
        incident_lon: float,
        hospitals: List[Hospital],
        required_bed_type: str = "Trauma",
        min_available_beds: int = 1,
        max_radius_km: float = 60.0
    ) -> List[Dict[str, Any]]:
        """
        Ranks all network hospitals based on incident proximity, bed availability, and trauma level.
        """
        results = []

        for h in hospitals:
            dist = cls.haversine_distance(incident_lat, incident_lon, h.latitude, h.longitude)
            if dist > max_radius_km:
                continue

            # Find matching bed allocation
            matched_bed = next(
                (b for b in h.beds if b.bed_type.lower() == required_bed_type.lower()),
                None
            )

            # Fallback to general ICU if specific trauma not tracked
            if not matched_bed and required_bed_type.lower() == "trauma":
                matched_bed = next((b for b in h.beds if "icu" in b.bed_type.lower()), None)

            total_cap = matched_bed.total_capacity if matched_bed else 0
            avail_beds = matched_bed.available_beds if matched_bed else 0
            occ_beds = matched_bed.occupied_beds if matched_bed else 0

            if avail_beds < min_available_beds and min_available_beds > 0:
                status = "SATURATED"
            elif avail_beds <= 3:
                status = "LIMITED"
            else:
                status = "AVAILABLE"

            occupancy_pct = round((occ_beds / total_cap * 100.0) if total_cap > 0 else 100.0, 1)

            # Estimate ambulance transit time assuming 45 km/h urban speed + 5 min staging
            transit_mins = round((dist / 45.0) * 60.0 + 5.0, 1)

            # Readiness Score (0 to 100):
            # Proximity factor: 100 at 0km, decays with distance
            proximity_score = max(0.0, 100.0 - (dist * 2.0))
            # Capacity factor
            capacity_score = min(100.0, (avail_beds / max(1, total_cap)) * 100.0)
            # Trauma tier bonus
            trauma_bonus = 20.0 if "level-1" in (h.trauma_level or "").lower() else (10.0 if "level-2" in (h.trauma_level or "").lower() else 0.0)

            readiness_score = round(0.45 * proximity_score + 0.40 * capacity_score + 0.15 * trauma_bonus, 1)

            results.append({
                "hospital_id": h.id,
                "hospital_code": h.hospital_code,
                "name": h.name,
                "address": h.address,
                "zone": h.zone,
                "trauma_level": h.trauma_level or "Level-1",
                "latitude": h.latitude,
                "longitude": h.longitude,
                "contact_phone": h.contact_phone,
                "distance_km": dist,
                "estimated_transit_minutes": transit_mins,
                "bed_type": required_bed_type,
                "total_capacity": total_cap,
                "available_beds": avail_beds,
                "occupied_beds": occ_beds,
                "occupancy_pct": occupancy_pct,
                "status": status,
                "readiness_score": readiness_score
            })

        # Sort by readiness score descending (highest readiness first)
        results.sort(key=lambda x: (x["status"] == "SATURATED", -x["readiness_score"]))
        return results

    @classmethod
    def calculate_emergency_inventory_surge(
        cls,
        critical_items: List[Item],
        surge_multiplier: float = 2.5
    ) -> Dict[str, Any]:
        """
        Dynamically adjusts safety thresholds for trauma and emergency consumables
        and calculates surge deficit and dispatch recommendations.
        """
        surge_items = []
        deficit_count = 0

        for item in critical_items:
            surge_threshold = int(item.safety_stock_threshold * surge_multiplier)
            deficit = max(0, surge_threshold - item.current_stock)
            is_deficit = deficit > 0
            if is_deficit:
                deficit_count += 1

            rapid_dispatch = max(item.min_order_qty, deficit) if is_deficit else 0

            surge_items.append({
                "item_id": item.id,
                "item_code": item.item_code,
                "name": item.name,
                "category": item.category,
                "current_stock": item.current_stock,
                "baseline_safety_stock": item.safety_stock_threshold,
                "emergency_surge_threshold": surge_threshold,
                "deficit": deficit,
                "is_critical_shortage": item.current_stock < item.safety_stock_threshold,
                "recommended_rapid_dispatch_qty": rapid_dispatch
            })

        # Sort items with largest deficit first
        surge_items.sort(key=lambda x: (-x["deficit"], x["is_critical_shortage"]))

        return {
            "total_emergency_items_monitored": len(critical_items),
            "items_in_deficit": deficit_count,
            "surge_multiplier": surge_multiplier,
            "critical_trauma_items": surge_items
        }
