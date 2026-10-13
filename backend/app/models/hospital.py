from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from backend.app.database import Base

class Hospital(Base):
    __tablename__ = "hospitals"

    id = Column(Integer, primary_key=True, index=True)
    hospital_code = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(200), nullable=False)
    address = Column(String(300), nullable=False)
    zone = Column(String(100), nullable=False, default="Central")
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(50), nullable=True)
    trauma_level = Column(String(20), default="Level-1")  # Level-1, Level-2, District Hospital, CHC
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    beds = relationship("BedAllocation", back_populates="hospital", cascade="all, delete-orphan")

class BedAllocation(Base):
    __tablename__ = "bed_allocations"

    id = Column(Integer, primary_key=True, index=True)
    hospital_id = Column(Integer, ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    bed_type = Column(String(100), nullable=False, index=True)  # "ICU", "Trauma", "General", "Pediatric", "Isolation", "Oxygen"
    total_capacity = Column(Integer, nullable=False, default=50)
    available_beds = Column(Integer, nullable=False, default=20)
    occupied_beds = Column(Integer, nullable=False, default=30)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    hospital = relationship("Hospital", back_populates="beds")
