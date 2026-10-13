from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.inventory import Item
from backend.app.models.supplier import Supplier, SupplierCostMatrix
from backend.app.models.alerts import ReorderRecommendation
from backend.app.models.transactions import DailyConsumptionSummary
from backend.app.services.reorder_optimizer import ReorderOptimizer
from backend.app.services.sse_websocket import broadcaster

router = APIRouter(prefix="/api/procurement", tags=["Optimization & Procurement Engine"])

@router.get("/reorders")
async def get_reorder_recommendations(
    filter_urgent_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Evaluates all items using the Reorder Engine (EOQ, dynamic ROP, Supplier Intelligence)
    and returns prioritized Purchase Order recommendations.
    """
    # Fetch all items, suppliers, cost matrices
    items_res = await db.execute(select(Item))
    items = items_res.scalars().all()

    suppliers_res = await db.execute(select(Supplier))
    suppliers = suppliers_res.scalars().all()

    matrices_res = await db.execute(select(SupplierCostMatrix))
    matrices = matrices_res.scalars().all()

    recommendations = []

    for item in items:
        # Calculate recent run rate
        hist_res = await db.execute(
            select(DailyConsumptionSummary)
            .where(DailyConsumptionSummary.item_id == item.id)
            .order_by(DailyConsumptionSummary.date.desc())
            .limit(30)
        )
        hist = hist_res.scalars().all()
        avg_daily = (sum(h.total_consumed for h in hist) / len(hist)) if hist else 6.0
        predicted_30d = avg_daily * 30.0

        reorder_eval = ReorderOptimizer.evaluate_item_reorder(
            item, predicted_30d, suppliers, matrices
        )
        if reorder_eval:
            if filter_urgent_only and reorder_eval["urgency_score"] < 0.6:
                continue
            recommendations.append(reorder_eval)

    # Sort by urgency score descending
    recommendations.sort(key=lambda x: -x["urgency_score"])
    return recommendations

@router.get("/suppliers")
async def get_supplier_scorecards(db: AsyncSession = Depends(get_db)):
    """Provides supplier performance metrics, reliability scores, and historical lead times."""
    suppliers_res = await db.execute(select(Supplier).options(selectinload(Supplier.cost_matrices)))
    suppliers = suppliers_res.scalars().all()

    scorecards = []
    for s in suppliers:
        # Composite Grade based on reliability and on-time rate
        perf_index = (s.reliability_score * 0.5) + (s.on_time_delivery_rate * 0.3) + (s.quality_compliance_score * 0.2)
        if perf_index >= 0.94:
            grade = "A+ (Elite Certified)"
        elif perf_index >= 0.88:
            grade = "A (Reliable Partner)"
        elif perf_index >= 0.80:
            grade = "B (Acceptable)"
        else:
            grade = "C (High Risk / Delay Prone)"

        scorecards.append({
            "id": s.id,
            "supplier_code": s.supplier_code,
            "name": s.name,
            "contact_email": s.contact_email,
            "contact_phone": s.contact_phone,
            "location_city": s.location_city,
            "historical_lead_time_days": s.historical_lead_time_days,
            "reliability_score": s.reliability_score,
            "on_time_delivery_rate": s.on_time_delivery_rate,
            "quality_compliance_score": s.quality_compliance_score,
            "composite_grade": grade,
            "active_items_supplied": len(s.cost_matrices),
            "payment_terms": s.payment_terms
        })

    scorecards.sort(key=lambda x: -x["reliability_score"])
    return scorecards

@router.post("/reorders/approve")
async def approve_purchase_order(
    item_id: int = Query(...),
    supplier_id: int = Query(...),
    quantity: int = Query(...),
    unit_cost: float = Query(...),
    db: AsyncSession = Depends(get_db)
):
    """Approves a proposed purchase order and creates a formal reorder record."""
    item_res = await db.execute(select(Item).where(Item.id == item_id))
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    supplier_res = await db.execute(select(Supplier).where(Supplier.id == supplier_id))
    supplier = supplier_res.scalars().first()
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    total_cost = round(quantity * unit_cost, 2)

    # Increase item stock and log receipt transaction so approval takes effect
    item.current_stock += quantity
    db.add(item)

    from backend.app.models.transactions import StockTransaction
    txn = StockTransaction(
        item_id=item.id,
        transaction_type="RECEIPT",
        quantity=quantity,
        department="Central Pharmacy Supply",
        reference_id=f"PO-{item.id}-{int(now.timestamp())}",
        recorded_by="Procurement Officer",
        notes=f"Approved Purchase Order: {quantity} units supplied by {supplier.name} at ${unit_cost:.2f}/unit."
    )
    db.add(txn)

    po = ReorderRecommendation(
        item_id=item.id,
        supplier_id=supplier.id,
        suggested_qty=quantity,
        current_stock=item.current_stock,
        predicted_demand_30d=float(quantity),
        safety_stock=item.safety_stock_threshold,
        supplier_lead_time_days=supplier.historical_lead_time_days,
        unit_cost=unit_cost,
        total_estimated_cost=total_cost,
        urgency_score=0.9,
        status="APPROVED",
        reasoning=f"Approved by Procurement Officer. Lead time: {supplier.historical_lead_time_days} days. Total: ${total_cost:,.2f}",
        timestamp=now
    )
    db.add(po)
    await db.commit()

    # Broadcast real-time stock update
    await broadcaster.broadcast("INVENTORY_UPDATE", {
        "item_name": item.name,
        "quantity_changed": quantity,
        "current_stock": item.current_stock,
        "transaction_type": "PURCHASE_ORDER_RECEIPT"
    })

    # Broadcast event
    await broadcaster.broadcast("PO_APPROVED", {
        "item_name": item.name,
        "supplier_name": supplier.name,
        "quantity": quantity,
        "total_cost": total_cost,
        "lead_time_days": supplier.historical_lead_time_days
    })

    return {
        "success": True,
        "status": "APPROVED",
        "po_id": po.id,
        "item_name": item.name,
        "supplier_name": supplier.name,
        "ordered_quantity": quantity,
        "new_stock_level": item.current_stock,
        "total_cost": total_cost,
        "estimated_arrival_days": supplier.historical_lead_time_days
    }

@router.get("/orders/approved")
async def get_approved_orders(db: AsyncSession = Depends(get_db)):
    """Returns recently approved purchase orders."""
    res = await db.execute(
        select(ReorderRecommendation)
        .where(ReorderRecommendation.status == "APPROVED")
        .order_by(ReorderRecommendation.timestamp.desc())
        .limit(20)
    )
    approved = res.scalars().all()
    out = []
    for a in approved:
        item = await db.get(Item, a.item_id)
        supplier = await db.get(Supplier, a.supplier_id) if a.supplier_id else None
        out.append({
            "id": a.id,
            "item_id": a.item_id,
            "item_name": item.name if item else "Medical Consumable",
            "supplier_name": supplier.name if supplier else "Qualified Supplier",
            "quantity": a.suggested_qty,
            "unit_cost": a.unit_cost,
            "total_cost": a.total_estimated_cost,
            "timestamp": a.timestamp.strftime("%Y-%m-%d %H:%M") if a.timestamp else "Recently",
            "status": "ORDER_CONFIRMED"
        })
    return out
