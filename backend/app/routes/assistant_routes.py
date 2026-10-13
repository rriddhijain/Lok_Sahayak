from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.inventory import Item, Batch
from backend.app.models.hospital import Hospital
from backend.app.models.alerts import AIPreparednessAlert, ReorderRecommendation
from backend.app.models.transactions import DailyConsumptionSummary
from backend.app.models.supplier import Supplier
from backend.app.schemas.chat_schemas import (
    AssistantQueryRequest, AssistantQueryResponse
)
from backend.app.services.antigravity_agent import antigravity_agent
from backend.app.services.risk_expiry import RiskAndExpiryEngine
from backend.app.routes.emergency_routes import EMERGENCY_STATE

router = APIRouter(prefix="/api/assistant", tags=["Antigravity Natural Language Assistant"])

@router.post("/chat", response_model=AssistantQueryResponse)
async def query_antigravity_assistant(
    req: AssistantQueryRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Antigravity AI Assistant endpoint: Answers staff queries in natural language,
    grounded with live hospital inventory data, bed availability, FEFO batches,
    supplier scorecards, and public health outbreak alerts.
    """
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # 1. Fetch live snapshot of system data for factual grounding
    items_res = await db.execute(select(Item).options(selectinload(Item.batches)))
    items = items_res.scalars().all()

    items_data = []
    batches_data = []
    for item in items:
        hist = (await db.execute(select(DailyConsumptionSummary).where(DailyConsumptionSummary.item_id == item.id).order_by(DailyConsumptionSummary.date.desc()).limit(30))).scalars().all()
        daily_rate = sum(h.total_consumed for h in hist) / len(hist) if hist else 0
        risk_info = RiskAndExpiryEngine.compute_composite_risk_score(item, item.batches, daily_run_rate=daily_rate)
        items_data.append({
            "id": item.id,
            "item_code": item.item_code,
            "name": item.name,
            "category": item.category,
            "current_stock": item.current_stock,
            "safety_stock_threshold": item.safety_stock_threshold,
            "is_trauma_critical": item.is_trauma_critical,
            "composite_risk_score": risk_info["composite_risk_score"],
            "risk_level": risk_info["risk_level"],
            "days_of_stock_left": risk_info["days_of_stock_left"],
            "stock_status": risk_info["stock_status"]
        })

        for b in item.batches:
            days_exp = (b.expiry_date - now).days
            batches_data.append({
                "batch_id": b.id,
                "batch_number": b.batch_number,
                "item_name": item.name,
                "remaining_quantity": b.remaining_quantity,
                "expiry_date": b.expiry_date.strftime("%Y-%m-%d"),
                "days_to_expiry": days_exp,
                "status": "EXPIRED" if days_exp <= 0 else ("CRITICAL (<30d)" if days_exp <= 30 else ("WARNING (<90d)" if days_exp <= 90 else "SAFE"))
            })

    hosp_res = await db.execute(select(Hospital).options(selectinload(Hospital.beds)))
    hospitals = hosp_res.scalars().all()
    hosp_data = [
        {
            "hospital_id": h.id,
            "name": h.name,
            "trauma_level": h.trauma_level,
            "zone": h.zone,
            "beds": [
                {
                    "bed_type": b.bed_type,
                    "available_beds": b.available_beds,
                    "total_capacity": b.total_capacity
                } for b in h.beds
            ]
        }
        for h in hospitals
    ]

    from backend.app.routes.optimization_routes import get_reorder_recommendations
    reorders_data = await get_reorder_recommendations(db=db)

    alerts_res = await db.execute(select(AIPreparednessAlert).where(AIPreparednessAlert.is_active == True))
    alerts = alerts_res.scalars().all()
    alerts_data = [
        {
            "id": a.id,
            "title": a.title,
            "severity": a.severity,
            "disease_entity": a.disease_entity,
            "location": a.location,
            "recommended_action": a.recommended_action
        }
        for a in alerts
    ]

    context = {
        "items": items_data,
        "batches": batches_data,
        "hospitals": hosp_data,
        "reorders": reorders_data,
        "alerts": alerts_data,
        "emergency_mode": EMERGENCY_STATE["is_emergency_active"]
    }

    response = antigravity_agent.execute_grounded_query(
        query=req.query,
        role=req.role_context,
        context_data=context
    )

    return response
