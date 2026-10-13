from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Supplier(Base):
    __tablename__ = "suppliers"

    id = Column(Integer, primary_key=True, index=True)
    supplier_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    contact_email = Column(String(150), nullable=True)
    contact_phone = Column(String(50), nullable=True)
    historical_lead_time_days = Column(Float, nullable=False, default=7.0)
    reliability_score = Column(Float, nullable=False, default=0.90)  # 0.0 to 1.0 (90%)
    on_time_delivery_rate = Column(Float, nullable=False, default=0.88)
    quality_compliance_score = Column(Float, nullable=False, default=0.95)
    location_city = Column(String(100), default="National Distribution Hub")
    payment_terms = Column(String(100), default="Net 30")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    cost_matrices = relationship("SupplierCostMatrix", back_populates="supplier", cascade="all, delete-orphan")
    batches = relationship("Batch", back_populates="supplier")

class SupplierCostMatrix(Base):
    __tablename__ = "supplier_cost_matrices"

    id = Column(Integer, primary_key=True, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="CASCADE"), nullable=False, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    unit_cost = Column(Float, nullable=False)
    min_order_qty = Column(Integer, nullable=False, default=50)
    bulk_discount_threshold = Column(Integer, default=500)
    discounted_unit_cost = Column(Float, nullable=False)
    lead_time_days = Column(Integer, nullable=False, default=5)

    # Relationships
    supplier = relationship("Supplier", back_populates="cost_matrices")
    item = relationship("Item", back_populates="cost_matrices")
