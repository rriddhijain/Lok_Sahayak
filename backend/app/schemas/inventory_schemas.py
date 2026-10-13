from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

class BatchBase(BaseModel):
    batch_number: str
    item_id: int
    initial_quantity: int
    remaining_quantity: int
    manufacturing_date: datetime
    expiry_date: datetime
    unit_purchase_price: float = 0.0
    supplier_id: Optional[int] = None

class BatchCreate(BatchBase):
    pass

class BatchResponse(BatchBase):
    id: int
    days_to_expiry: int
    expiry_status: str  # "EXPIRED", "CRITICAL (<30d)", "WARNING (<90d)", "SAFE"
    created_at: datetime

    class Config:
        from_attributes = True

class ItemBase(BaseModel):
    item_code: str
    name: str
    category: str
    unit: str = "units"
    current_stock: int
    safety_stock_threshold: int
    reorder_point: int
    min_order_qty: int = 20
    unit_cost: float = 10.0
    is_trauma_critical: bool = False
    storage_temp_c: Optional[float] = None
    description: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class ItemResponse(ItemBase):
    id: int
    stock_status: str  # "OUT_OF_STOCK", "CRITICAL_LOW", "REORDER_RECOMMENDED", "HEALTHY", "OVERSTOCKED"
    composite_risk_score: float  # 0.0 to 100.0
    risk_level: str  # "HIGH", "ELEVATED", "MODERATE", "LOW"
    days_of_stock_left: float
    batches: List[BatchResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class StockAdjustmentRequest(BaseModel):
    quantity: int
    transaction_type: str = "CONSUMPTION"  # "CONSUMPTION", "RECEIPT", "TRANSFER", "EMERGENCY_DISPATCH"
    batch_id: Optional[int] = None
    department: str = "Emergency Dept"
    reference_id: Optional[str] = None
    notes: Optional[str] = None

class FEFOAllocationItem(BaseModel):
    batch_id: int
    batch_number: str
    allocated_quantity: int
    expiry_date: datetime
    days_to_expiry: int
    is_at_risk: bool

class FEFOAllocationResponse(BaseModel):
    item_id: int
    item_name: str
    requested_quantity: int
    allocated_total: int
    unfulfilled_quantity: int
    allocations: List[FEFOAllocationItem]
    policy: str = "First-Expired, First-Out (FEFO)"
