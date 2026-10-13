from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.inventory import Item
from backend.app.models.alerts import AIPreparednessAlert
from backend.app.schemas.alert_schemas import (
    AIAlertResponse, PublicHealthSignalIngestRequest
)
from backend.app.services.public_health_nlp import public_health_pipeline
from backend.app.services.sse_websocket import broadcaster

router = APIRouter(prefix="/api/nlp", tags=["Public Health NLP Pipeline & Milvus"])

@router.get("/alerts")
async def list_ai_preparedness_alerts(
    active_only: bool = True,
    db: AsyncSession = Depends(get_db)
):
    """Lists proactive AI preparedness alerts derived from Milvus NLP surveillance signals."""
    stmt = select(AIPreparednessAlert)
    if active_only:
        stmt = stmt.where(AIPreparednessAlert.is_active == True)
    stmt = stmt.order_by(AIPreparednessAlert.timestamp.desc())

    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return alerts

@router.post("/ingest")
async def ingest_health_surveillance_signal(
    req: PublicHealthSignalIngestRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Ingests an external disease surveillance bulletin, extracts entities,
    indexes into Milvus Vector Database, cross-references internal hospital inventory,
    and generates an explainable AI Preparedness Alert.
    """
    # 1. Ingest into NLP and vector pipeline
    signal = public_health_pipeline.ingest_signal(
        headline=req.headline,
        content=req.content,
        source_agency=req.source_agency
    )

    # 2. Fetch live inventory items
    items_res = await db.execute(select(Item))
    items = items_res.scalars().all()

    items_dict = [
        {
            "id": i.id,
            "name": i.name,
            "current_stock": i.current_stock,
            "safety_stock_threshold": i.safety_stock_threshold,
            "daily_run_rate": 10.0 if "Trauma" in i.category else 20.0
        }
        for i in items
    ]

    # 3. Cross-reference for alert generation
    alert_data = public_health_pipeline.cross_reference_preparedness_alert(signal, items_dict)

    persisted_alert = None
    if alert_data:
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        persisted_alert = AIPreparednessAlert(
            title=alert_data["title"],
            severity=alert_data["severity"],
            disease_entity=alert_data["disease_entity"],
            location=alert_data["location"],
            outbreak_level=alert_data["outbreak_level"],
            affected_categories=alert_data["affected_categories"],
            recommended_action=alert_data["recommended_action"],
            mathematical_reasoning=alert_data["mathematical_reasoning"],
            data_source=alert_data["data_source"],
            is_active=True,
            confidence_score=alert_data["confidence_score"],
            timestamp=now
        )
        db.add(persisted_alert)
        await db.commit()

        # Broadcast live alert to all connected dashboards
        await broadcaster.broadcast("AI_PREPAREDNESS_ALERT", {
            "title": persisted_alert.title,
            "severity": persisted_alert.severity,
            "disease_entity": persisted_alert.disease_entity,
            "location": persisted_alert.location,
            "recommended_action": persisted_alert.recommended_action,
            "mathematical_reasoning": persisted_alert.mathematical_reasoning,
            "timestamp": persisted_alert.timestamp.strftime("%Y-%m-%d %H:%M:%S")
        })

    return {
        "success": True,
        "signal_processed": {
            "id": signal["id"],
            "disease_entity": signal["disease_entity"],
            "location": signal["location"],
            "severity": signal["severity"],
            "outbreak_level": signal["outbreak_level"],
            "vector_dimension": len(signal["vector"])
        },
        "preparedness_alert_generated": persisted_alert is not None,
        "alert": persisted_alert
    }

@router.get("/search")
async def search_health_signals(
    query: str = Query(..., min_length=2),
    top_k: int = Query(5, ge=1, le=20)
):
    """Performs semantic vector search across indexed public health disease signals."""
    results = public_health_pipeline.search_similar_signals(query, top_k=top_k)
    return {
        "query": query,
        "results_count": len(results),
        "matches": results
    }
