from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from typing import List, Optional
from datetime import datetime, timezone

from backend.app.database import get_db
from backend.app.models.inventory import Item, Batch
from backend.app.models.supplier import Supplier
from backend.app.models.transactions import StockTransaction, DailyConsumptionSummary
from backend.app.models.alerts import InventoryAnomaly
from backend.app.schemas.inventory_schemas import (
    ItemResponse, ItemCreate, BatchResponse, BatchCreate,
    StockAdjustmentRequest, FEFOAllocationResponse
)
from backend.app.services.risk_expiry import RiskAndExpiryEngine
from backend.app.services.anomaly_detection import InventoryAnomalyDetector
from backend.app.services.sse_websocket import broadcaster
from backend.app.services.order_delivery import delivery_estimate
from backend.app.models.alerts import ReorderRecommendation

router = APIRouter(prefix="/api/inventory", tags=["Inventory & Consumables"])

@router.get("/summary")
async def get_inventory_summary(db: AsyncSession = Depends(get_db)):
    """High-level KPI metrics for the hospital inventory."""
    items_result = await db.execute(select(Item).options(selectinload(Item.batches)))
    items = items_result.scalars().all()

    now = datetime.now(timezone.utc).replace(tzinfo=None)
    total_items = len(items)
    out_of_stock = sum(1 for i in items if i.current_stock <= 0)
    critical_low = sum(1 for i in items if 0 < i.current_stock < i.safety_stock_threshold)
    trauma_critical = sum(1 for i in items if i.is_trauma_critical)
    total_valuation = sum(i.current_stock * i.unit_cost for i in items)

    # Expiry risks
    batches_result = await db.execute(select(Batch))
    batches = batches_result.scalars().all()

    expiring_30 = sum(1 for b in batches if 0 < (b.expiry_date - now).days <= 30 and b.remaining_quantity > 0)
    expiring_90 = sum(1 for b in batches if 0 < (b.expiry_date - now).days <= 90 and b.remaining_quantity > 0)
    expired = sum(1 for b in batches if (b.expiry_date - now).days <= 0 and b.remaining_quantity > 0)

    # Average risk score
    risk_scores = []
    for i in items:
        risk_info = RiskAndExpiryEngine.compute_composite_risk_score(i, i.batches)
        risk_scores.append(risk_info["composite_risk_score"])
    avg_risk = round(sum(risk_scores) / len(risk_scores), 1) if risk_scores else 0.0

    return {
        "total_catalog_items": total_items,
        "out_of_stock_count": out_of_stock,
        "critical_low_count": critical_low,
        "trauma_critical_items": trauma_critical,
        "total_stock_valuation": round(total_valuation, 2),
        "batches_expiring_30d": expiring_30,
        "batches_expiring_90d": expiring_90,
        "batches_expired": expired,
        "network_composite_risk_index": avg_risk
    }

@router.get("/items")
async def list_items(
    category: Optional[str] = None,
    risk_level: Optional[str] = None,
    search: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """List all inventory items with computed risk scores, FEFO batch counts, and days left."""
    stmt = select(Item).options(selectinload(Item.batches))
    if category:
        stmt = stmt.where(Item.category == category)
    if search:
        stmt = stmt.where(Item.name.ilike(f"%{search}%") | Item.item_code.ilike(f"%{search}%"))

    result = await db.execute(stmt)
    items = result.scalars().all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    approved_orders = (await db.execute(select(ReorderRecommendation).where(ReorderRecommendation.status == "APPROVED"))).scalars().all()
    incoming = {o.item_id: {"id": o.id, "quantity": o.suggested_qty, "lead_time_days": o.supplier_lead_time_days, **delivery_estimate(o)} for o in approved_orders}
    output = []
    for item in items:
        risk_info = RiskAndExpiryEngine.compute_composite_risk_score(item, item.batches)
        if risk_level and risk_info["risk_level"] != risk_level:
            continue

        hist = (await db.execute(select(DailyConsumptionSummary).where(DailyConsumptionSummary.item_id == item.id).order_by(DailyConsumptionSummary.date.desc()).limit(30))).scalars().all()
        daily_rate = sum(h.total_consumed for h in hist) / len(hist) if hist else 0
        risk_info = RiskAndExpiryEngine.compute_composite_risk_score(item, item.batches, daily_run_rate=daily_rate)
        batch_list = []
        for b in item.batches:
            days_exp = (b.expiry_date - now).days
            if days_exp <= 0:
                exp_stat = "EXPIRED"
            elif days_exp <= 30:
                exp_stat = "CRITICAL (<30d)"
            elif days_exp <= 90:
                exp_stat = "WARNING (<90d)"
            else:
                exp_stat = "SAFE"

            batch_list.append({
                "id": b.id,
                "batch_number": b.batch_number,
                "item_id": b.item_id,
                "initial_quantity": b.initial_quantity,
                "remaining_quantity": b.remaining_quantity,
                "manufacturing_date": b.manufacturing_date,
                "expiry_date": b.expiry_date,
                "unit_purchase_price": b.unit_purchase_price,
                "supplier_id": b.supplier_id,
                "days_to_expiry": days_exp,
                "expiry_status": exp_stat,
                "created_at": b.created_at
            })

        output.append({
            "id": item.id,
            "item_code": item.item_code,
            "incoming_order": incoming.get(item.id),
            "name": item.name,
            "category": item.category,
            "unit": item.unit,
            "current_stock": item.current_stock,
            "safety_stock_threshold": item.safety_stock_threshold,
            "reorder_point": item.reorder_point,
            "min_order_qty": item.min_order_qty,
            "unit_cost": item.unit_cost,
            "is_trauma_critical": item.is_trauma_critical,
            "storage_temp_c": item.storage_temp_c,
            "description": item.description,
            "stock_status": risk_info["stock_status"],
            "composite_risk_score": risk_info["composite_risk_score"],
            "risk_level": risk_info["risk_level"],
            "risk_factors": {"stock_out_risk": risk_info["stockout_risk_score"] / 100, "expiry_risk": risk_info["expiry_risk_score"] / 100,
                "lead_time_risk": risk_info["supplier_risk_score"] / 100, "trauma_weight": 1.0, "formula": risk_info["explainability"]},
            "daily_run_rate": round(daily_rate, 2),
            "days_of_stock_left": round(item.current_stock / daily_rate, 1) if daily_rate else None,
            "batches": batch_list,
            "created_at": item.created_at,
            "updated_at": item.updated_at
        })

    # Sort items with highest composite risk first
    output.sort(key=lambda x: -x["composite_risk_score"])
    return output

@router.get("/items/{item_id}")
async def get_item_details(item_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Item).options(selectinload(Item.batches), selectinload(Item.anomalies)).where(Item.id == item_id)
    )
    item = result.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    risk_info = RiskAndExpiryEngine.compute_composite_risk_score(item, item.batches)
    return {
        "item": item,
        "risk_analysis": risk_info,
        "batches": item.batches,
        "anomalies": item.anomalies
    }

@router.get("/batches")
async def list_batches(
    item_id: Optional[int] = None,
    expiry_warning_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """List batches sorted by FEFO (earliest expiry first)."""
    stmt = select(Batch).options(selectinload(Batch.item))
    if item_id:
        stmt = stmt.where(Batch.item_id == item_id)
    stmt = stmt.order_by(Batch.expiry_date.asc())

    result = await db.execute(stmt)
    batches = result.scalars().all()
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    output = []
    for b in batches:
        days_exp = (b.expiry_date - now).days
        if days_exp <= 0:
            status = "EXPIRED"
        elif days_exp <= 30:
            status = "CRITICAL (<30d)"
        elif days_exp <= 90:
            status = "WARNING (<90d)"
        else:
            status = "SAFE"

        if expiry_warning_only and status == "SAFE":
            continue

        output.append({
            "id": b.id,
            "batch_number": b.batch_number,
            "item_id": b.item_id,
            "item_name": b.item.name if b.item else "Unknown",
            "item_category": b.item.category if b.item else "",
            "initial_quantity": b.initial_quantity,
            "remaining_quantity": b.remaining_quantity,
            "manufacturing_date": b.manufacturing_date,
            "expiry_date": b.expiry_date,
            "days_to_expiry": days_exp,
            "status": status,
            "unit_purchase_price": b.unit_purchase_price,
            "supplier_id": b.supplier_id
        })
    return output

@router.post("/adjust")
async def record_stock_movement(req: StockAdjustmentRequest, db: AsyncSession = Depends(get_db)):
    """
    Records a stock transaction (consumption, receipt, emergency dispatch).
    Automatically triggers Anomaly Detection and broadcasts real-time events.
    """
    if req.batch_id:
        batch_res = await db.execute(select(Batch).where(Batch.id == req.batch_id))
        batch = batch_res.scalars().first()
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        item_id = batch.item_id
    else:
        raise HTTPException(status_code=400, detail="Batch ID required for accurate tracking")

    item_res = await db.execute(select(Item).where(Item.id == item_id))
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    now = datetime.now(timezone.utc).replace(tzinfo=None)

    if req.transaction_type not in {"CONSUMPTION", "RECEIPT", "TRANSFER", "EMERGENCY_DISPATCH", "DISPOSAL"}:
        raise HTTPException(422, "Unknown stock movement type")
    if req.transaction_type != "RECEIPT" and batch.expiry_date <= now:
        raise HTTPException(400, "Expired batches cannot be dispensed")
    # Update quantities
    if req.transaction_type != "RECEIPT":
        qty = abs(req.quantity)
        if batch.remaining_quantity < qty or item.current_stock < qty:
            raise HTTPException(status_code=400, detail=f"Insufficient batch quantity. Available: {batch.remaining_quantity}")
        batch.remaining_quantity -= qty
        item.current_stock -= qty
        delta = -qty
    else:  # RECEIPT or positive
        qty = abs(req.quantity)
        batch.remaining_quantity += qty
        item.current_stock += qty
        delta = qty

    tx = StockTransaction(
        item_id=item.id,
        batch_id=batch.id,
        transaction_type=req.transaction_type,
        quantity=delta,
        department=req.department,
        reference_id=req.reference_id or f"TX-{int(now.timestamp())}",
        recorded_by="Staff Requisition Portal",
        timestamp=now,
        notes=req.notes
    )
    session_added = [tx]

    # Check for anomaly if consumption
    anomaly_flag = None
    if req.transaction_type == "CONSUMPTION":
        # Fetch last 30 daily consumptions
        hist_res = await db.execute(
            select(DailyConsumptionSummary)
            .where(DailyConsumptionSummary.item_id == item.id)
            .order_by(DailyConsumptionSummary.date.desc())
            .limit(30)
        )
        hist = hist_res.scalars().all()
        hist_vals = [float(h.total_consumed) for h in hist]

        anomaly_flag = InventoryAnomalyDetector.detect_consumption_anomaly(
            item.id, item.name, float(qty), hist_vals
        )
        if anomaly_flag:
            anomaly_entry = InventoryAnomaly(
                item_id=item.id,
                anomaly_type=anomaly_flag["anomaly_type"],
                consumption_value=anomaly_flag["consumption_value"],
                expected_baseline=anomaly_flag["expected_baseline"],
                z_score=anomaly_flag["z_score"],
                deviation_pct=anomaly_flag["deviation_pct"],
                flagged_reason=anomaly_flag["flagged_reason"],
                status="PENDING_REVIEW",
                timestamp=now
            )
            db.add(anomaly_entry)

    db.add(tx)
    await db.commit()

    # Broadcast real-time event to SSE and WebSocket clients
    await broadcaster.broadcast("INVENTORY_UPDATE", {
        "item_id": item.id,
        "item_name": item.name,
        "current_stock": item.current_stock,
        "transaction_type": req.transaction_type,
        "quantity_changed": delta,
        "batch_id": batch.id,
        "department": req.department,
        "has_anomaly": anomaly_flag is not None,
        "anomaly": anomaly_flag
    })

    return {
        "success": True,
        "item_id": item.id,
        "item_name": item.name,
        "new_stock": item.current_stock,
        "batch_remaining": batch.remaining_quantity,
        "anomaly_flag": anomaly_flag
    }

@router.post("/fefo-allocate", response_model=FEFOAllocationResponse)
async def allocate_fefo(
    item_id: int = Query(...),
    quantity: int = Query(..., gt=0),
    db: AsyncSession = Depends(get_db)
):
    """Computes a First-Expired, First-Out (FEFO) dispensing plan."""
    item_res = await db.execute(select(Item).where(Item.id == item_id))
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    batches_res = await db.execute(select(Batch).where(Batch.item_id == item_id))
    batches = batches_res.scalars().all()

    allocation = RiskAndExpiryEngine.allocate_fefo(item.id, item.name, batches, quantity)
    return allocation

@router.post("/dispense")
async def dispense_batches(item_id: int = Query(...), quantity: int = Query(..., gt=0), db: AsyncSession = Depends(get_db)):
    """Recalculate and commit the entire earliest-expiry allocation in one transaction."""
    from sqlalchemy import update
    item = await db.get(Item, item_id)
    if not item:
        raise HTTPException(404, "Item not found")
    batches = (await db.execute(select(Batch).where(Batch.item_id == item_id))).scalars().all()
    plan = RiskAndExpiryEngine.allocate_fefo(item.id, item.name, batches, quantity)
    if plan["unfulfilled_quantity"]:
        raise HTTPException(409, "Not enough unexpired stock to fulfill the complete request")
    changed = await db.execute(update(Item).where(Item.id == item_id, Item.current_stock >= quantity).values(current_stock=Item.current_stock-quantity))
    if changed.rowcount != 1:
        raise HTTPException(409, "Stock changed; refresh before dispensing")
    for allocation in plan["allocations"]:
        bid, qty = allocation["batch_id"], allocation["allocated_quantity"]
        changed = await db.execute(update(Batch).where(Batch.id == bid, Batch.remaining_quantity >= qty).values(remaining_quantity=Batch.remaining_quantity-qty))
        if changed.rowcount != 1:
            raise HTTPException(409, "Batch stock changed; refresh before dispensing")
        db.add(StockTransaction(item_id=item_id, batch_id=bid, transaction_type="CONSUMPTION", quantity=-qty,
                                department="Clinical Dispensing", notes="Earliest-expiry batch dispensing"))
    hist = (await db.execute(select(DailyConsumptionSummary).where(DailyConsumptionSummary.item_id == item_id).order_by(DailyConsumptionSummary.date.desc()).limit(30))).scalars().all()
    anomaly = InventoryAnomalyDetector.detect_consumption_anomaly(item.id, item.name, float(quantity), [float(h.total_consumed) for h in hist])
    if anomaly:
        db.add(InventoryAnomaly(item_id=item.id, anomaly_type=anomaly["anomaly_type"], consumption_value=anomaly["consumption_value"],
            expected_baseline=anomaly["expected_baseline"], z_score=anomaly["z_score"], deviation_pct=anomaly["deviation_pct"],
            flagged_reason=anomaly["flagged_reason"], status="PENDING_REVIEW"))
    today = datetime.now(timezone.utc).date()
    daily = (await db.execute(select(DailyConsumptionSummary).where(DailyConsumptionSummary.item_id == item_id, DailyConsumptionSummary.date == today))).scalars().first()
    if daily:
        daily.total_consumed += quantity
    else:
        db.add(DailyConsumptionSummary(item_id=item_id, date=today, total_consumed=quantity, stock_at_end_of_day=item.current_stock))
    await db.commit()
    await broadcaster.broadcast("INVENTORY_UPDATE", {"item_name":item.name, "quantity_changed":-quantity,
        "current_stock":item.current_stock, "transaction_type":"CONSUMPTION", "has_anomaly":bool(anomaly), "anomaly":anomaly})
    return {"success":True, "dispensed":quantity}
