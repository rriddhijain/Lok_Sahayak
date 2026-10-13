from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class ForecastPoint(BaseModel):
    date: str
    predicted_demand: float
    confidence_lower: float
    confidence_upper: float
    trend: float
    is_projected: bool = True

class HistoricalPoint(BaseModel):
    date: str
    actual_consumption: float

class DemandForecastResponse(BaseModel):
    item_id: int
    item_name: str
    category: str
    current_stock: int
    daily_run_rate: float
    forecast_horizon_days: int
    model_used: str  # "ARIMA-Trend-Seasonal Decomposition", "Holt-Winters Smoothing"
    mae: float
    rmse: float
    r2_score: float
    historical: List[HistoricalPoint]
    forecast: List[ForecastPoint]
    projected_stock_out_days: Optional[float]
    projected_stock_out_date: Optional[str]
    forecast_summary: str
    mathematical_formula: str
