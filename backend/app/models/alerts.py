from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class AIPreparednessAlert(Base):
    __tablename__ = "ai_preparedness_alerts"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(250), nullable=False)
    severity = Column(String(20), default="HIGH")  # CRITICAL, HIGH, MEDIUM, LOW
    disease_entity = Column(String(100), nullable=False)  # Dengue, Influenza, Cholera, COVID-19, Trauma Surge
    location = Column(String(150), nullable=False)
    outbreak_level = Column(String(50), default="Regional Spike")
    affected_categories = Column(String(200), nullable=False)  # "IV Fluids, Antibiotics, Platelet Kits"
    recommended_action = Column(Text, nullable=False)
    mathematical_reasoning = Column(Text, nullable=False)
    data_source = Column(String(200), default="National Disease Surveillance Portal & Milvus NLP Ingestion")
    is_active = Column(Boolean, default=True)
    confidence_score = Column(Float, default=0.92)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

class InventoryAnomaly(Base):
    __tablename__ = "inventory_anomalies"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    anomaly_type = Column(String(50), nullable=False)  # UNUSUAL_SPIKE, UNUSUAL_DROP, STOCK_LEAKAGE
    consumption_value = Column(Float, nullable=False)
    expected_baseline = Column(Float, nullable=False)
    z_score = Column(Float, nullable=False)
    deviation_pct = Column(Float, nullable=False)
    flagged_reason = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING_REVIEW")  # PENDING_REVIEW, INVESTIGATED, RESOLVED
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    item = relationship("Item", back_populates="anomalies")

class ReorderRecommendation(Base):
    __tablename__ = "reorder_recommendations"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("items.id", ondelete="CASCADE"), nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id", ondelete="SET NULL"), nullable=True)
    suggested_qty = Column(Integer, nullable=False)
    current_stock = Column(Integer, nullable=False)
    predicted_demand_30d = Column(Float, nullable=False)
    safety_stock = Column(Integer, nullable=False)
    supplier_lead_time_days = Column(Float, nullable=False)
    unit_cost = Column(Float, nullable=False)
    total_estimated_cost = Column(Float, nullable=False)
    urgency_score = Column(Float, default=0.5)  # 0 to 1.0
    status = Column(String(50), default="PROPOSED")  # PROPOSED, APPROVED, ORDERED, REJECTED
    reasoning = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)

from sqlalchemy import Index, text
Index("uq_active_order_per_item", ReorderRecommendation.item_id, unique=True,
      sqlite_where=text("status = 'APPROVED'"), postgresql_where=text("status = 'APPROVED'"))
