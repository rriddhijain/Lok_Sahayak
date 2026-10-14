from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.services.emergency_stock import reserve_multiplier, effective_safety_stock
from backend.app.database import get_db
from backend.app.models.inventory import Item
from backend.app.models.supplier import Supplier, SupplierCostMatrix
from backend.app.models.alerts import ReorderRecommendation
from backend.app.models.transactions import DailyConsumptionSummary
from backend.app.services.reorder_optimizer import ReorderOptimizer
from backend.app.services.order_delivery import delivery_estimate
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

    approved = (await db.execute(select(ReorderRecommendation.item_id).where(ReorderRecommendation.status == "APPROVED"))).scalars().all()
    recommendations = []

    for item in items:
        if item.id in approved:
            continue
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
            item, predicted_30d, suppliers, matrices, surge_multiplier=reserve_multiplier(item)
        )
        if reorder_eval and reorder_eval["needs_reorder"]:
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
    quantity: int = Query(..., gt=0, le=2147483647),
    unit_cost: float = Query(..., gt=0, allow_inf_nan=False),
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

    existing = (await db.execute(select(ReorderRecommendation).where(ReorderRecommendation.item_id == item_id, ReorderRecommendation.status == "APPROVED"))).scalars().first()
    if existing:
        raise HTTPException(409, "An approved order already exists for this item")
    matrix = (await db.execute(select(SupplierCostMatrix).where(SupplierCostMatrix.item_id == item_id, SupplierCostMatrix.supplier_id == supplier_id))).scalars().first()
    delivery_days = matrix.lead_time_days if matrix else supplier.historical_lead_time_days
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    total_cost = round(quantity * unit_cost, 2)

    po = ReorderRecommendation(
        item_id=item.id,
        supplier_id=supplier.id,
        suggested_qty=quantity,
        current_stock=item.current_stock,
        predicted_demand_30d=float(quantity),
        safety_stock=effective_safety_stock(item),
        supplier_lead_time_days=delivery_days,
        unit_cost=unit_cost,
        total_estimated_cost=total_cost,
        urgency_score=0.9,
        status="APPROVED",
        reasoning=f"Approved by Procurement Officer. Lead time: {supplier.historical_lead_time_days} days. Total: ${total_cost:,.2f}",
        timestamp=now
    )
    db.add(po)
    from sqlalchemy.exc import IntegrityError
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, "An approved order already exists for this item")

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
        "total_cost": total_cost,
        "estimated_arrival_days": delivery_days,
        **delivery_estimate(po)
    }

from pydantic import BaseModel, Field
from typing import Literal
from datetime import timedelta
from backend.app.models.inventory import Batch
from backend.app.models.transactions import StockTransaction

class OrderAction(BaseModel):
    action: Literal["receive", "cancel"]

@router.get("/orders")
async def list_orders(db: AsyncSession = Depends(get_db)):
    orders = (await db.execute(select(ReorderRecommendation).where(ReorderRecommendation.status != "PROPOSED").order_by(ReorderRecommendation.timestamp.desc()))).scalars().all()
    items = {i.id: i.name for i in (await db.execute(select(Item))).scalars()}
    suppliers = {s.id: s.name for s in (await db.execute(select(Supplier))).scalars()}
    return [{"id": o.id, "item_name": items.get(o.item_id), "supplier_name": suppliers.get(o.supplier_id),
             "suggested_qty": o.suggested_qty, "status": o.status, "total_cost": o.total_estimated_cost,
             "timestamp": o.timestamp, "item_id": o.item_id, "lead_time_days": o.supplier_lead_time_days, **delivery_estimate(o)} for o in orders]

@router.patch("/orders/{order_id}")
async def update_order(order_id: int, req: OrderAction, db: AsyncSession = Depends(get_db)):
    from sqlalchemy import update
    order = await db.get(ReorderRecommendation, order_id)
    if not order:
        raise HTTPException(404, "Order not found")
    new_status = "RECEIVED" if req.action == "receive" else "CANCELLED"
    changed = await db.execute(update(ReorderRecommendation).where(ReorderRecommendation.id == order_id, ReorderRecommendation.status == "APPROVED").values(status=new_status))
    if changed.rowcount != 1:
        raise HTTPException(409, "Only approved orders can be received or cancelled")
    if req.action == "receive":
        item = await db.get(Item, order.item_id)
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        # Demo receipt: an explicit estimated shelf life, replace with supplier batch metadata in deployment.
        batch = Batch(item_id=item.id, batch_number=f"RECEIPT-{order.id}", initial_quantity=order.suggested_qty,
                      remaining_quantity=order.suggested_qty, manufacturing_date=now, expiry_date=now + timedelta(days=365),
                      unit_purchase_price=order.unit_cost, supplier_id=order.supplier_id)
        db.add(batch)
        await db.flush()
        await db.execute(update(Item).where(Item.id == item.id).values(current_stock=Item.current_stock + order.suggested_qty))
        db.add(StockTransaction(item_id=item.id, batch_id=batch.id, transaction_type="RECEIPT", quantity=order.suggested_qty,
                                reference_id=f"ORDER-{order.id}", notes="Recorded purchase delivery; demo shelf life: 365 days"))
    await db.commit()
    message = f"Order #{order_id} {'received and stock updated' if req.action == 'receive' else 'cancelled'}"
    await broadcaster.broadcast("ORDER_UPDATED", {"message": message})
    return {"status": new_status, "message": message}

class ManualOrderRequest(BaseModel):
    item_id: int
    quantity: int = Field(gt=0, le=2147483647)

async def manual_order_options(db):
    items = (await db.execute(select(Item))).scalars().all()
    suppliers = (await db.execute(select(Supplier))).scalars().all()
    matrices = (await db.execute(select(SupplierCostMatrix))).scalars().all()
    approved = set((await db.execute(select(ReorderRecommendation.item_id).where(ReorderRecommendation.status == "APPROVED"))).scalars().all())
    options = []
    for item in items:
        proposal = ReorderOptimizer.evaluate_item_reorder(item, 180, suppliers, matrices, surge_multiplier=reserve_multiplier(item))
        if not proposal["supplier_id"]:
            continue
        matrix = next((m for m in matrices if m.item_id == item.id and m.supplier_id == proposal["supplier_id"]), None)
        options.append({"item_id": item.id, "item_name": item.name, "unit": item.unit,
                        "current_stock": item.current_stock, "supplier_id": proposal["supplier_id"],
                        "supplier_name": proposal["supplier_name"], "lead_time_days": proposal["lead_time_days"],
                        "unit_cost": matrix.unit_cost if matrix else item.unit_cost,
                        "bulk_discount_threshold": matrix.bulk_discount_threshold if matrix else None,
                        "discounted_unit_cost": matrix.discounted_unit_cost if matrix else None,
                        "has_approved_order": item.id in approved})
    return options

@router.get("/order-options")
async def get_manual_order_options(db: AsyncSession = Depends(get_db)):
    return await manual_order_options(db)

@router.post("/orders/manual")
async def create_manual_order(req: ManualOrderRequest, db: AsyncSession = Depends(get_db)):
    option = next((o for o in await manual_order_options(db) if o["item_id"] == req.item_id), None)
    if not option:
        raise HTTPException(404, "Medicine or available supplier not found")
    cost = option["unit_cost"]
    if option["bulk_discount_threshold"] and req.quantity >= option["bulk_discount_threshold"] and option["discounted_unit_cost"]:
        cost = option["discounted_unit_cost"]
    return await approve_purchase_order(req.item_id, option["supplier_id"], req.quantity, cost, db)
