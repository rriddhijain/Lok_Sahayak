from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List

from backend.app.database import get_db
from backend.app.models.inventory import Item
from backend.app.models.transactions import DailyConsumptionSummary
from backend.app.schemas.forecast_schemas import DemandForecastResponse
from backend.app.services.ml_forecasting import DemandForecaster
from backend.app.services.emergency_stock import effective_safety_stock

router = APIRouter(prefix="/api/forecast", tags=["Demand Forecasting & ML"])

@router.get("/item/{item_id}", response_model=DemandForecastResponse)
async def get_item_forecast(
    item_id: int,
    horizon_days: int = Query(30, ge=7, le=90),
    db: AsyncSession = Depends(get_db)
):
    """
    Computes time-series demand forecast using Ridge trend & day-of-week seasonality decomposition.
    Evaluates out-of-sample MAE and RMSE performance metrics, and calculates projected stock-out dates.
    """
    item_res = await db.execute(select(Item).where(Item.id == item_id))
    item = item_res.scalars().first()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Fetch daily consumption history
    history_res = await db.execute(
        select(DailyConsumptionSummary)
        .where(DailyConsumptionSummary.item_id == item_id)
        .order_by(DailyConsumptionSummary.date.asc())
    )
    records = history_res.scalars().all()

    formatted_history = [
        {"date": r.date.strftime("%Y-%m-%d"), "quantity": float(r.total_consumed)}
        for r in records
    ]

    forecast_result = DemandForecaster.forecast_item_demand(
        formatted_history, item.current_stock, horizon_days=horizon_days
    )

    return {
        "item_id": item.id,
        "item_name": item.name,
        "category": item.category,
        "current_stock": item.current_stock,
        "daily_run_rate": forecast_result["daily_run_rate"],
        "forecast_horizon_days": horizon_days,
        "model_used": forecast_result["model_used"],
        "mae": forecast_result["mae"],
        "rmse": forecast_result["rmse"],
        "r2_score": forecast_result["r2_score"],
        "historical": forecast_result["historical"],
        "forecast": forecast_result["forecast"],
        "projected_stock_out_days": forecast_result["projected_stock_out_days"],
        "projected_stock_out_date": forecast_result["projected_stock_out_date"],
        "forecast_summary": forecast_result["forecast_summary"],
        "mathematical_formula": forecast_result["mathematical_formula"]
    }

@router.get("/overview")
async def get_all_forecasts_overview(db: AsyncSession = Depends(get_db)):
    """Provides high-level run-rate and stock-out runway across all items."""
    items_res = await db.execute(select(Item))
    items = items_res.scalars().all()

    summary_cards = []
    for item in items:
        history_res = await db.execute(
            select(DailyConsumptionSummary)
            .where(DailyConsumptionSummary.item_id == item.id)
            .order_by(DailyConsumptionSummary.date.desc())
            .limit(14)
        )
        recent = history_res.scalars().all()
        avg_rate = (sum(r.total_consumed for r in recent) / len(recent)) if recent else 5.0
        days_left = round(item.current_stock / max(0.1, avg_rate), 1)

        summary_cards.append({
            "item_id": item.id,
            "item_code": item.item_code,
            "name": item.name,
            "category": item.category,
            "current_stock": item.current_stock,
            "safety_stock": effective_safety_stock(item),
            "estimated_daily_rate": round(avg_rate, 1),
            "days_runway": days_left,
            "urgency": "CRITICAL" if days_left < 7 else ("WARNING" if days_left < 14 else "HEALTHY")
        })

    summary_cards.sort(key=lambda x: x["days_runway"])
    return summary_cards
