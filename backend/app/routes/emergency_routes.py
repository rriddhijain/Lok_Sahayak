from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.hospital import Hospital, BedAllocation, ApplicationState
from backend.app.models.inventory import Item
from backend.app.schemas.emergency_schemas import (
    EmergencySearchRequest, HospitalRankedResponse,
    EmergencyModeToggleRequest, EmergencyModeStatusResponse
)
from backend.app.services.spatial_emergency import SpatialEmergencyEngine
from backend.app.services.sse_websocket import broadcaster

router = APIRouter(prefix="/api/emergency", tags=["Emergency & Spatial Intelligence"])

from backend.app.services.emergency_stock import EMERGENCY_STATE, reserve_applies

@router.post("/hospital-finder", response_model=List[HospitalRankedResponse])
async def search_nearby_hospitals(
    req: EmergencySearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Spatial search accepting incident GPS coordinates (lat, lon) and ranking
    nearby network hospitals based on Haversine distance, required bed type,
    and real-time available capacity.
    """
    hosp_res = await db.execute(select(Hospital).options(selectinload(Hospital.beds)))
    hospitals = hosp_res.scalars().all()

    ranked = SpatialEmergencyEngine.rank_hospitals_for_incident(
        incident_lat=req.incident_latitude,
        incident_lon=req.incident_longitude,
        hospitals=hospitals,
        required_bed_type=req.required_bed_type,
        min_available_beds=req.min_available_beds,
        max_radius_km=req.max_radius_km
    )
    return ranked

@router.get("/hospitals")
async def list_network_hospitals(db: AsyncSession = Depends(get_db)):
    """Lists all hospitals with full bed capacity breakdowns."""
    hosp_res = await db.execute(select(Hospital).options(selectinload(Hospital.beds)))
    hospitals = hosp_res.scalars().all()

    output = []
    for h in hospitals:
        bed_breakdown = [
            {
                "bed_type": b.bed_type,
                "total_capacity": b.total_capacity,
                "available_beds": b.available_beds,
                "occupied_beds": b.occupied_beds,
                "occupancy_pct": round((b.occupied_beds / b.total_capacity * 100) if b.total_capacity > 0 else 0, 1)
            }
            for b in h.beds
        ]
        total_cap = sum(b.total_capacity for b in h.beds)
        total_avail = sum(b.available_beds for b in h.beds)

        output.append({
            "id": h.id,
            "hospital_code": h.hospital_code,
            "name": h.name,
            "address": h.address,
            "zone": h.zone,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "contact_phone": h.contact_phone,
            "trauma_level": h.trauma_level,
            "total_beds": total_cap,
            "available_beds": total_avail,
            "beds": bed_breakdown
        })
    return output

@router.get("/status", response_model=EmergencyModeStatusResponse)
async def get_emergency_status(db: AsyncSession = Depends(get_db)):
    """Returns current emergency mode status and trauma surge requirements."""
    items_res = await db.execute(select(Item))
    critical_items = [item for item in items_res.scalars().all() if reserve_applies(item)]

    surge_calc = SpatialEmergencyEngine.calculate_emergency_inventory_surge(
        critical_items,
        surge_multiplier=EMERGENCY_STATE["surge_multiplier"] if EMERGENCY_STATE["is_emergency_active"] else 1.0
    )

    return {
        "is_emergency_active": EMERGENCY_STATE["is_emergency_active"],
        "incident_type": EMERGENCY_STATE["incident_type"],
        "surge_multiplier": EMERGENCY_STATE["surge_multiplier"],
        "activated_at": EMERGENCY_STATE["activated_at"],
        "reserve_disease": EMERGENCY_STATE["reserve_disease"],
        "critical_trauma_items": surge_calc["critical_trauma_items"],
        "total_emergency_items_monitored": surge_calc["total_emergency_items_monitored"],
        "items_in_deficit": surge_calc["items_in_deficit"]
    }

@router.post("/toggle", response_model=EmergencyModeStatusResponse)
async def toggle_emergency_mode(
    req: EmergencyModeToggleRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Activates or deactivates Emergency Inventory Mode.
    Dynamically adjusts trauma safety stock buffers (e.g. 2.5x) and broadcasts live SSE alert.
    """
    now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")

    next_state = dict(EMERGENCY_STATE)
    next_state["is_emergency_active"] = req.enable_emergency_mode
    if req.enable_emergency_mode:
        next_state["incident_type"] = req.incident_type
        next_state["reserve_disease"] = req.reserve_disease
        next_state["surge_multiplier"] = req.surge_multiplier
        next_state["activated_at"] = now_str
        next_state["incident_location"] = req.incident_location
    else:
        next_state["incident_type"] = "Normal Baseline Operations"
        next_state["surge_multiplier"] = 1.0
        next_state["activated_at"] = None
        next_state["incident_location"] = None

    items_res = await db.execute(select(Item))
    critical_items = [item for item in items_res.scalars().all() if reserve_applies(item, next_state)]

    surge_calc = SpatialEmergencyEngine.calculate_emergency_inventory_surge(
        critical_items,
        surge_multiplier=next_state["surge_multiplier"]
    )

    import json
    state_row = await db.get(ApplicationState, "emergency")
    if state_row:
        state_row.value = json.dumps(next_state)
    else:
        db.add(ApplicationState(key="emergency", value=json.dumps(next_state)))
    await db.commit()

    EMERGENCY_STATE.update(next_state)

    # Broadcast event to all connected dashboard tabs
    await broadcaster.broadcast("EMERGENCY_MODE_STATE", {
        "is_active": EMERGENCY_STATE["is_emergency_active"],
        "incident_type": EMERGENCY_STATE["incident_type"],
        "reserve_disease": EMERGENCY_STATE["reserve_disease"],
        "surge_multiplier": EMERGENCY_STATE["surge_multiplier"],
        "incident_location": EMERGENCY_STATE["incident_location"],
        "deficits_detected": surge_calc["items_in_deficit"],
        "timestamp": now_str
    })

    return {
        "is_emergency_active": EMERGENCY_STATE["is_emergency_active"],
        "incident_type": EMERGENCY_STATE["incident_type"],
        "surge_multiplier": EMERGENCY_STATE["surge_multiplier"],
        "activated_at": EMERGENCY_STATE["activated_at"],
        "reserve_disease": EMERGENCY_STATE["reserve_disease"],
        "critical_trauma_items": surge_calc["critical_trauma_items"],
        "total_emergency_items_monitored": surge_calc["total_emergency_items_monitored"],
        "items_in_deficit": surge_calc["items_in_deficit"]
    }

from pydantic import BaseModel, Field
from typing import Literal
from sqlalchemy import update
from backend.app.models.hospital import PatientDispatch

class DispatchRequest(BaseModel):
    hospital_id: int
    bed_type: str = "Trauma"
    patients: int = Field(default=1, gt=0, le=100)

class DispatchUpdate(BaseModel):
    action: Literal["reject", "reassign", "complete"]
    hospital_id: Optional[int] = None

class BedUpdate(BaseModel):
    bed_type: str
    available_beds: int = Field(ge=0)

async def reserve_beds(db, hospital_id, bed_type, patients):
    result = await db.execute(update(BedAllocation).where(BedAllocation.hospital_id == hospital_id,
        BedAllocation.bed_type == bed_type, BedAllocation.available_beds >= patients).values(
        available_beds=BedAllocation.available_beds-patients, occupied_beds=BedAllocation.occupied_beds+patients))
    if result.rowcount != 1:
        raise HTTPException(409, "Not enough available beds of the selected type at this hospital")

async def release_beds(db, dispatch):
    result = await db.execute(update(BedAllocation).where(BedAllocation.hospital_id == dispatch.hospital_id,
        BedAllocation.bed_type == dispatch.bed_type, BedAllocation.occupied_beds >= dispatch.patients).values(
        available_beds=BedAllocation.available_beds+dispatch.patients, occupied_beds=BedAllocation.occupied_beds-dispatch.patients))
    if result.rowcount != 1:
        raise HTTPException(409, "Bed counts changed. Refresh before updating this dispatch")

@router.get("/dispatches")
async def list_dispatches(db: AsyncSession = Depends(get_db)):
    rows = (await db.execute(select(PatientDispatch).order_by(PatientDispatch.id.desc()))).scalars().all()
    names = {h.id:h.name for h in (await db.execute(select(Hospital))).scalars()}
    return [{"id":d.id, "hospital_id":d.hospital_id, "hospital_name":names.get(d.hospital_id), "bed_type":d.bed_type,
             "patients":d.patients, "status":d.status, "created_at":d.created_at} for d in rows]

@router.post("/dispatches")
async def create_dispatch(req: DispatchRequest, db: AsyncSession = Depends(get_db)):
    await reserve_beds(db, req.hospital_id, req.bed_type, req.patients)
    dispatch = PatientDispatch(hospital_id=req.hospital_id, bed_type=req.bed_type, patients=req.patients)
    db.add(dispatch)
    await db.commit()
    await broadcaster.broadcast("DISPATCH_UPDATE", {"message":f"Dispatch #{dispatch.id} saved; {req.patients} beds reserved"})
    return {"id":dispatch.id, "status":dispatch.status}

@router.patch("/dispatches/{dispatch_id}")
async def change_dispatch(dispatch_id: int, req: DispatchUpdate, db: AsyncSession = Depends(get_db)):
    dispatch = await db.get(PatientDispatch, dispatch_id)
    if not dispatch:
        raise HTTPException(404, "Dispatch not found")
    if dispatch.status != "DISPATCHED":
        raise HTTPException(409, "This dispatch is already closed")
    # Conditional update serializes competing dispatch actions before modifying bed counts.
    target_status = "DISPATCHED" if req.action == "reassign" else ("REJECTED" if req.action == "reject" else "COMPLETED")
    lock = await db.execute(update(PatientDispatch).where(PatientDispatch.id == dispatch_id,
        PatientDispatch.status == "DISPATCHED", PatientDispatch.hospital_id == dispatch.hospital_id).values(status=target_status))
    if lock.rowcount != 1:
        raise HTTPException(409, "Dispatch changed; refresh and try again")
    await release_beds(db, dispatch)
    if req.action == "reassign":
        if req.hospital_id is None or req.hospital_id == dispatch.hospital_id:
            raise HTTPException(422, "Choose a different destination hospital")
        await reserve_beds(db, req.hospital_id, dispatch.bed_type, dispatch.patients)
        dispatch.hospital_id = req.hospital_id
    dispatch.status = target_status
    await db.commit()
    await broadcaster.broadcast("DISPATCH_UPDATE", {"message":f"Dispatch #{dispatch_id}: {req.action}; bed availability updated"})
    return {"id":dispatch_id, "status":dispatch.status}

@router.patch("/hospitals/{hospital_id}/beds")
async def change_beds(hospital_id: int, req: BedUpdate, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import func
    bed = (await db.execute(select(BedAllocation).where(BedAllocation.hospital_id == hospital_id,
            BedAllocation.bed_type == req.bed_type))).scalars().first()
    if not bed:
        raise HTTPException(404, "Bed type not found at this hospital")
    reserved = (await db.execute(select(func.coalesce(func.sum(PatientDispatch.patients), 0)).where(
        PatientDispatch.hospital_id == hospital_id, PatientDispatch.bed_type == req.bed_type,
        PatientDispatch.status == "DISPATCHED"))).scalar_one()
    if req.available_beds > bed.total_capacity - reserved:
        raise HTTPException(422, "Availability exceeds capacity after accounting for active dispatch reservations")
    bed.available_beds = req.available_beds
    bed.occupied_beds = bed.total_capacity - req.available_beds
    await db.commit()
    await broadcaster.broadcast("BED_UPDATE", {"message":f"{req.bed_type} bed availability updated"})
    return {"success":True, "available_beds":bed.available_beds}

async def restore_emergency_state():
    import json
    from backend.app.database import AsyncSessionLocal
    async with AsyncSessionLocal() as db:
        row = await db.get(ApplicationState, "emergency")
        if row:
            EMERGENCY_STATE.update(json.loads(row.value))
