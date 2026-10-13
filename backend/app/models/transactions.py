from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Date, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class StockTransaction(Base):
    __tablename__ = "stock_transactions"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    batch_id = Column(Integer, ForeignKey("batches.id", ondelete="SET NULL"), nullable=True, index=True)
    transaction_type = Column(String(50), nullable=False)  # "CONSUMPTION", "RECEIPT", "TRANSFER", "DISPOSAL", "EMERGENCY_DISPATCH"
    quantity = Column(Integer, nullable=False)  # negative for consumption, positive for receipt
    department = Column(String(100), default="Emergency Dept")  # ICU, OT, OPD, Trauma, Pediatric, Inpatient
    reference_id = Column(String(100), nullable=True)  # Prescription ID or PO ID
    recorded_by = Column(String(100), default="system")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    notes = Column(Text, nullable=True)

    # Relationships
    item = relationship("Item", back_populates="transactions")
    batch = relationship("Batch", back_populates="transactions")

class DailyConsumptionSummary(Base):
    __tablename__ = "daily_consumption_summaries"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    total_consumed = Column(Integer, default=0, nullable=False)
    stock_at_end_of_day = Column(Integer, default=0, nullable=False)
    emergency_usage = Column(Integer, default=0)
    is_weekend = Column(Integer, default=0)
    epidemic_surge_factor = Column(Float, default=1.0)
