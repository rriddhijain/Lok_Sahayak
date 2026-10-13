from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    item_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), index=True, nullable=False)
    category = Column(String(100), index=True, nullable=False)  # Antibiotics, IV Fluids, Trauma Supplies, Analgesics, PPE, etc.
    unit = Column(String(50), default="units")  # vials, ampoules, bags, boxes, kits
    current_stock = Column(Integer, default=0, nullable=False)
    safety_stock_threshold = Column(Integer, default=50, nullable=False)
    reorder_point = Column(Integer, default=100, nullable=False)
    min_order_qty = Column(Integer, default=20, nullable=False)
    unit_cost = Column(Float, default=10.0, nullable=False)
    is_trauma_critical = Column(Boolean, default=False)
    storage_temp_c = Column(Float, nullable=True)  # e.g., 2-8 C for cold chain
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    batches = relationship("Batch", back_populates="item", cascade="all, delete-orphan")
    transactions = relationship("StockTransaction", back_populates="item")
    cost_matrices = relationship("SupplierCostMatrix", back_populates="item")
    anomalies = relationship("InventoryAnomaly", back_populates="item")

class Batch(Base):
    __tablename__ = "batches"

    id = Column(Integer, primary_key=True, index=True)
    batch_number = Column(String(100), unique=True, index=True, nullable=False)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    initial_quantity = Column(Integer, nullable=False)
    remaining_quantity = Column(Integer, nullable=False)
    manufacturing_date = Column(DateTime, nullable=False)
    expiry_date = Column(DateTime, nullable=False, index=True)
    unit_purchase_price = Column(Float, default=0.0)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    item = relationship("Item", back_populates="batches")
    supplier = relationship("Supplier", back_populates="batches")
    transactions = relationship("StockTransaction", back_populates="batch")
