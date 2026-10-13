import asyncio
import random
from datetime import datetime, timedelta, date
from sqlalchemy.future import select
from backend.app.database import AsyncSessionLocal, init_db
from backend.app.models.inventory import Item, Batch
from backend.app.models.hospital import Hospital, BedAllocation
from backend.app.models.supplier import Supplier, SupplierCostMatrix
from backend.app.models.transactions import StockTransaction, DailyConsumptionSummary
from backend.app.models.alerts import AIPreparednessAlert, InventoryAnomaly, ReorderRecommendation
from backend.app.services.public_health_nlp import public_health_pipeline

async def seed_database():
    await init_db()
    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(Item))
        existing_item = result.scalars().first()
        if existing_item:
            print("[INFO] Database already contains records. Skipping seed.")
            return

        print("[INFO] Seeding comprehensive hospital inventory, hospitals, suppliers, and historical consumption...")
        now = datetime.utcnow()

        # 1. Create Suppliers
        suppliers_data = [
            Supplier(
                supplier_code="SUP-001",
                name="Rapid Trauma Surgical Co.",
                contact_email="dispatch@rapidtrauma.com",
                contact_phone="+91-11-2345-6789",
                historical_lead_time_days=2.5,
                reliability_score=0.97,
                on_time_delivery_rate=0.96,
                quality_compliance_score=0.99,
                location_city="Central Logistics Ring",
                payment_terms="Net 15"
            ),
            Supplier(
                supplier_code="SUP-002",
                name="Bharat MedTech Logistics",
                contact_email="supply@bharatmedtech.in",
                contact_phone="+91-11-4567-8901",
                historical_lead_time_days=4.0,
                reliability_score=0.92,
                on_time_delivery_rate=0.90,
                quality_compliance_score=0.95,
                location_city="Greater Metro Warehouse",
                payment_terms="Net 30"
            ),
            Supplier(
                supplier_code="SUP-003",
                name="Apex Pharma Distributors",
                contact_email="orders@apexpharma.com",
                contact_phone="+91-11-6789-0123",
                historical_lead_time_days=6.5,
                reliability_score=0.86,
                on_time_delivery_rate=0.84,
                quality_compliance_score=0.92,
                location_city="National Hub",
                payment_terms="Net 30"
            ),
            Supplier(
                supplier_code="SUP-004",
                name="Lifeline Essential Fluids Ltd.",
                contact_email="support@lifelinefluids.org",
                contact_phone="+91-11-8901-2345",
                historical_lead_time_days=8.0,
                reliability_score=0.78,
                on_time_delivery_rate=0.74,
                quality_compliance_score=0.88,
                location_city="Outer Industrial Zone",
                payment_terms="Net 45"
            ),
        ]
        for s in suppliers_data:
            session.add(s)
        await session.flush()

        # 2. Create Hospitals & Beds
        hospitals_data = [
            (
                Hospital(
                    hospital_code="HOSP-01",
                    name="Lok Nayak Central Trauma Centre",
                    address="Jawaharlal Nehru Marg, Delhi Gate",
                    zone="Central",
                    latitude=28.6358,
                    longitude=77.2405,
                    contact_phone="+91-11-2323-2400",
                    trauma_level="Level-1 Trauma"
                ),
                [
                    ("Trauma", 45, 14, 31),
                    ("ICU", 60, 8, 52),
                    ("General", 350, 65, 285),
                    ("Pediatric", 80, 22, 58),
                    ("Oxygen", 120, 38, 82),
                ]
            ),
            (
                Hospital(
                    hospital_code="HOSP-02",
                    name="Safdarjung Apex Emergency Institute",
                    address="Ring Road, Opposite AIIMS, New Delhi",
                    zone="South Central",
                    latitude=28.5684,
                    longitude=77.2064,
                    contact_phone="+91-11-2616-5060",
                    trauma_level="Level-1 Trauma"
                ),
                [
                    ("Trauma", 50, 4, 46),
                    ("ICU", 75, 12, 63),
                    ("General", 400, 42, 358),
                    ("Pediatric", 90, 15, 75),
                    ("Oxygen", 150, 45, 105),
                ]
            ),
            (
                Hospital(
                    hospital_code="HOSP-03",
                    name="AIIMS Super Specialty Trauma Annex",
                    address="Sri Aurobindo Marg, Ansari Nagar",
                    zone="South",
                    latitude=28.5672,
                    longitude=77.2100,
                    contact_phone="+91-11-2658-8500",
                    trauma_level="Level-1 Trauma"
                ),
                [
                    ("Trauma", 60, 2, 58),
                    ("ICU", 100, 6, 94),
                    ("General", 500, 30, 470),
                    ("Pediatric", 120, 28, 92),
                    ("Oxygen", 200, 60, 140),
                ]
            ),
            (
                Hospital(
                    hospital_code="HOSP-04",
                    name="South City Metro Health Centre",
                    address="Saket District Centre, Sector 6",
                    zone="South",
                    latitude=28.5245,
                    longitude=77.1855,
                    contact_phone="+91-11-2651-5050",
                    trauma_level="Level-2 Hospital"
                ),
                [
                    ("Trauma", 25, 11, 14),
                    ("ICU", 35, 15, 20),
                    ("General", 180, 55, 125),
                    ("Pediatric", 40, 18, 22),
                    ("Oxygen", 60, 24, 36),
                ]
            ),
            (
                Hospital(
                    hospital_code="HOSP-05",
                    name="East Corridor District Health Hospital",
                    address="Vikas Marg Extn, Preet Vihar",
                    zone="East",
                    latitude=28.6280,
                    longitude=77.2950,
                    contact_phone="+91-11-2244-1122",
                    trauma_level="District Hospital"
                ),
                [
                    ("Trauma", 20, 16, 4),
                    ("ICU", 25, 18, 7),
                    ("General", 150, 70, 80),
                    ("Pediatric", 30, 14, 16),
                    ("Oxygen", 50, 32, 18),
                ]
            ),
        ]

        for hosp, beds in hospitals_data:
            session.add(hosp)
            await session.flush()
            for btype, total, avail, occ in beds:
                alloc = BedAllocation(
                    hospital_id=hosp.id,
                    bed_type=btype,
                    total_capacity=total,
                    available_beds=avail,
                    occupied_beds=occ,
                    last_updated=now
                )
                session.add(alloc)

        # 3. Create Items
        items_definitions = [
            # Trauma critical items
            {
                "item_code": "MED-TRM-01",
                "name": "Trauma Laparotomy Kit",
                "category": "Trauma Supplies",
                "unit": "sterile kits",
                "current_stock": 28,
                "safety_stock_threshold": 40,
                "reorder_point": 65,
                "min_order_qty": 30,
                "unit_cost": 145.0,
                "is_trauma_critical": True,
                "description": "Comprehensive sterile surgical kit for acute abdominal trauma and hemorrhage control."
            },
            {
                "item_code": "MED-TRM-02",
                "name": "Blood Bag CPD-A 450ml (O-Negative Compatible)",
                "category": "Blood Bank Supplies",
                "unit": "bags",
                "current_stock": 18,
                "safety_stock_threshold": 35,
                "reorder_point": 55,
                "min_order_qty": 40,
                "unit_cost": 28.5,
                "is_trauma_critical": True,
                "description": "Sterile closed blood collection bag with CPD-A1 anticoagulant."
            },
            {
                "item_code": "MED-TRM-03",
                "name": "Suture Silk 2-0 Braided with Reverse Cutting Needle",
                "category": "Trauma Supplies",
                "unit": "boxes (36 pcs)",
                "current_stock": 42,
                "safety_stock_threshold": 30,
                "reorder_point": 50,
                "min_order_qty": 25,
                "unit_cost": 34.0,
                "is_trauma_critical": True,
                "description": "High tensile non-absorbable surgical sutures for wound closure."
            },
            {
                "item_code": "MED-TRM-04",
                "name": "Morphine Sulfate 10mg/ml Ampoules",
                "category": "Analgesics & Narcotics",
                "unit": "boxes (10 amp)",
                "current_stock": 14,
                "safety_stock_threshold": 25,
                "reorder_point": 45,
                "min_order_qty": 20,
                "unit_cost": 42.0,
                "is_trauma_critical": True,
                "storage_temp_c": 22.0,
                "description": "Schedule X opioid analgesic for severe traumatic injury pain management."
            },
            {
                "item_code": "MED-TRM-05",
                "name": "Silver-Infused Burn Dressing (10x10cm)",
                "category": "Trauma Supplies",
                "unit": "packs (10 pcs)",
                "current_stock": 52,
                "safety_stock_threshold": 30,
                "reorder_point": 45,
                "min_order_qty": 20,
                "unit_cost": 55.0,
                "is_trauma_critical": True,
                "description": "Antimicrobial barrier dressing for second and third-degree burn resuscitation."
            },
            # IV Fluids
            {
                "item_code": "MED-IVF-01",
                "name": "Ringer's Lactate 500ml IV Infusion",
                "category": "IV Fluids",
                "unit": "bottles",
                "current_stock": 120,
                "safety_stock_threshold": 250,
                "reorder_point": 400,
                "min_order_qty": 200,
                "unit_cost": 2.2,
                "is_trauma_critical": True,
                "description": "Isotonic crystalloid solution for trauma resuscitation and acute dehydration."
            },
            {
                "item_code": "MED-IVF-02",
                "name": "Normal Saline 0.9% 500ml IV",
                "category": "IV Fluids",
                "unit": "bottles",
                "current_stock": 310,
                "safety_stock_threshold": 200,
                "reorder_point": 350,
                "min_order_qty": 200,
                "unit_cost": 1.9,
                "is_trauma_critical": True,
                "description": "Standard crystalloid for plasma volume expansion and drug reconstitution."
            },
            # Critical Antibiotics & Inpatient
            {
                "item_code": "MED-ATB-01",
                "name": "Amoxicillin-Clavulanate 1.2g IV Vial",
                "category": "Antibiotics",
                "unit": "vials",
                "current_stock": 85,
                "safety_stock_threshold": 100,
                "reorder_point": 160,
                "min_order_qty": 100,
                "unit_cost": 6.8,
                "is_trauma_critical": False,
                "description": "Broad-spectrum beta-lactam antibacterial for respiratory and post-op sepsis."
            },
            {
                "item_code": "MED-ATB-02",
                "name": "Ceftriaxone 1g IV / IM Injection",
                "category": "Antibiotics",
                "unit": "vials",
                "current_stock": 160,
                "safety_stock_threshold": 90,
                "reorder_point": 150,
                "min_order_qty": 100,
                "unit_cost": 4.5,
                "is_trauma_critical": False,
                "description": "Third-generation cephalosporin for severe nosocomial infections and meningitis."
            },
            {
                "item_code": "MED-ATB-03",
                "name": "Azithromycin 500mg Tablets",
                "category": "Antibiotics",
                "unit": "blisters (6 tabs)",
                "current_stock": 45,
                "safety_stock_threshold": 80,
                "reorder_point": 120,
                "min_order_qty": 60,
                "unit_cost": 3.8,
                "is_trauma_critical": False,
                "description": "Macrolide antibiotic for community-acquired pneumonia and atypical respiratory outbreaks."
            },
            # Respiratory & Critical Consumables
            {
                "item_code": "MED-RSP-01",
                "name": "Salbutamol 2.5mg Respules (Nebulizer)",
                "category": "Respiratory",
                "unit": "packs (20 pcs)",
                "current_stock": 70,
                "safety_stock_threshold": 60,
                "reorder_point": 95,
                "min_order_qty": 50,
                "unit_cost": 12.0,
                "is_trauma_critical": False,
                "description": "Short-acting beta2-agonist bronchodilator for acute asthma and bronchospasm."
            },
            {
                "item_code": "MED-PPE-01",
                "name": "N95 Surgical Respirator Masks",
                "category": "PPE & Infection Control",
                "unit": "boxes (50 pcs)",
                "current_stock": 110,
                "safety_stock_threshold": 75,
                "reorder_point": 120,
                "min_order_qty": 50,
                "unit_cost": 22.0,
                "is_trauma_critical": False,
                "description": "NIOSH-certified N95 particulate filter respirator for clinical barrier safety."
            },
        ]

        created_items = []
        for idata in items_definitions:
            item = Item(**idata)
            session.add(item)
            created_items.append(item)
        await session.flush()

        # 4. Create Batches with varying expiry dates (some safe, some <90d, some <30d, 1 expired)
        for idx, item in enumerate(created_items):
            # Batch 1: safe (expires in ~18 months)
            b1 = Batch(
                batch_number=f"BAT-{item.item_code[-6:]}-A26",
                item_id=item.id,
                initial_quantity=int(item.current_stock * 0.6) + 20,
                remaining_quantity=int(item.current_stock * 0.6),
                manufacturing_date=now - timedelta(days=120),
                expiry_date=now + timedelta(days=540),
                unit_purchase_price=item.unit_cost,
                supplier_id=suppliers_data[idx % len(suppliers_data)].id
            )
            session.add(b1)

            # Batch 2: moderate (expires in 75 days)
            b2 = Batch(
                batch_number=f"BAT-{item.item_code[-6:]}-B26",
                item_id=item.id,
                initial_quantity=int(item.current_stock * 0.3) + 10,
                remaining_quantity=int(item.current_stock * 0.3),
                manufacturing_date=now - timedelta(days=280),
                expiry_date=now + timedelta(days=75),
                unit_purchase_price=item.unit_cost * 0.95,
                supplier_id=suppliers_data[(idx + 1) % len(suppliers_data)].id
            )
            session.add(b2)

            # Special near-expiry and expired batches for selected items
            if idx in [0, 5, 7, 9]:
                # Near-expiry (<25 days) - critical FEFO alert
                b3 = Batch(
                    batch_number=f"BAT-{item.item_code[-6:]}-CRIT",
                    item_id=item.id,
                    initial_quantity=25,
                    remaining_quantity=int(item.current_stock * 0.1) or 8,
                    manufacturing_date=now - timedelta(days=340),
                    expiry_date=now + timedelta(days=22),
                    unit_purchase_price=item.unit_cost,
                    supplier_id=suppliers_data[0].id
                )
                session.add(b3)

            if idx == 1:
                # Expired batch (quarantine required)
                b_exp = Batch(
                    batch_number=f"BAT-{item.item_code[-6:]}-EXPD",
                    item_id=item.id,
                    initial_quantity=10,
                    remaining_quantity=4,
                    manufacturing_date=now - timedelta(days=400),
                    expiry_date=now - timedelta(days=5),
                    unit_purchase_price=item.unit_cost,
                    supplier_id=suppliers_data[1].id
                )
                session.add(b_exp)

        await session.flush()

        # 5. Create Supplier Cost Matrices
        for item in created_items:
            for s in suppliers_data:
                # Slight cost variations per supplier
                cost_factor = 0.92 if s.supplier_code == "SUP-002" else (1.05 if s.supplier_code == "SUP-001" else 0.98)
                u_cost = round(item.unit_cost * cost_factor, 2)
                matrix = SupplierCostMatrix(
                    supplier_id=s.id,
                    item_id=item.id,
                    unit_cost=u_cost,
                    min_order_qty=item.min_order_qty,
                    bulk_discount_threshold=item.min_order_qty * 4,
                    discounted_unit_cost=round(u_cost * 0.88, 2),
                    lead_time_days=int(s.historical_lead_time_days)
                )
                session.add(matrix)
        await session.flush()

        # 6. Generate 60 days of realistic daily consumption transactions
        random.seed(42)
        start_date = now - timedelta(days=60)

        for day_offset in range(60):
            current_day = start_date + timedelta(days=day_offset)
            is_wknd = 1 if current_day.weekday() in [5, 6] else 0

            for item in created_items:
                # Base consumption per item
                base_daily = 6.0 if "Trauma" in item.category else (18.0 if "IV Fluids" in item.category else 9.0)
                # Weekend reduction or trauma variation
                fluctuation = random.uniform(0.75, 1.25)
                consumed = max(1, int(base_daily * fluctuation * (1.2 if is_wknd and "Trauma" in item.category else (0.85 if is_wknd else 1.0))))

                # Inject deliberate ANOMALY on day 54 for Ringer's Lactate (Dengue surge spike)
                if item.item_code == "MED-IVF-01" and day_offset == 54:
                    consumed = int(base_daily * 4.2)  # Spike of ~75 units vs normal 18!

                # Daily summary record
                d_summary = DailyConsumptionSummary(
                    item_id=item.id,
                    date=current_day.date(),
                    total_consumed=consumed,
                    stock_at_end_of_day=max(5, item.current_stock + (60 - day_offset)),
                    emergency_usage=int(consumed * 0.4) if item.is_trauma_critical else int(consumed * 0.1),
                    is_weekend=is_wknd,
                    epidemic_surge_factor=1.0
                )
                session.add(d_summary)

                # Individual audit transaction
                tx = StockTransaction(
                    item_id=item.id,
                    transaction_type="CONSUMPTION",
                    quantity=-consumed,
                    department="Emergency Trauma Unit" if item.is_trauma_critical else "General Inpatient Pharmacy",
                    reference_id=f"DISP-{current_day.strftime('%Y%m%d')}-{item.id}",
                    recorded_by="Pharmacy Automation Agent",
                    timestamp=current_day,
                    notes="Daily ward requisition automated log"
                )
                session.add(tx)

        # 7. Seed Initial AI Preparedness Alerts via Public Health NLP Pipeline
        alert_1_signal = public_health_pipeline.ingest_signal(
            headline="Dengue Serotype-2 Surge Detected in South Zone Districts",
            content="State Health Surveillance reports a 220% spike in platelet demand and acute hemorrhagic cases across South Zone. Hospital networks advised to secure crystalloid IV fluids and platelet preparation consumables.",
            source_agency="State Integrated Disease Surveillance Programme (IDSP)"
        )
        alert_1 = AIPreparednessAlert(
            title=f"AI Preparedness Alert: {alert_1_signal['disease_entity']} Outbreak in {alert_1_signal['location']}",
            severity=alert_1_signal["severity"],
            disease_entity=alert_1_signal["disease_entity"],
            location=alert_1_signal["location"],
            outbreak_level=alert_1_signal["outbreak_level"],
            affected_categories=alert_1_signal["affected_categories"],
            recommended_action="Expedite purchase of Ringer's Lactate and Normal Saline. Maintain 2.2x safety stock threshold to absorb projected 14-day surge.",
            mathematical_reasoning="Cross-referenced surveillance bulletin with internal run-rate. Current IV fluid inventory covers only 4.8 days under surge velocity. Risk of acute stockout within 96 hours without expedited replenishment.",
            data_source="Milvus Surveillance Pipeline & IDSP Bulletin #402",
            is_active=True,
            confidence_score=0.94,
            timestamp=now - timedelta(hours=3)
        )
        session.add(alert_1)

        alert_2_signal = public_health_pipeline.ingest_signal(
            headline="Early Autumn Influenza & Acute Respiratory Infection Cluster in North Corridor",
            content="Local health clinics report high positivity rates for H1N1 and seasonal respiratory syncytial virus. Pediatric and elderly admissions increasing.",
            source_agency="National Centre for Disease Control (NCDC)"
        )
        alert_2 = AIPreparednessAlert(
            title=f"AI Preparedness Alert: {alert_2_signal['disease_entity']} Surge in {alert_2_signal['location']}",
            severity=alert_2_signal["severity"],
            disease_entity=alert_2_signal["disease_entity"],
            location=alert_2_signal["location"],
            outbreak_level=alert_2_signal["outbreak_level"],
            affected_categories=alert_2_signal["affected_categories"],
            recommended_action="Increase minimum order thresholds for Azithromycin and Salbutamol Nebulizer Respules. Audit N95 mask reserves.",
            mathematical_reasoning="Surveillance cluster points to +65% incidence growth over 7 days. Demand forecast predicts stock depletion in 8.2 days.",
            data_source="Milvus Surveillance Pipeline & NCDC Bulletin #118",
            is_active=True,
            confidence_score=0.88,
            timestamp=now - timedelta(hours=14)
        )
        session.add(alert_2)

        # 8. Seed Consumption Anomaly
        r_item = next(i for i in created_items if i.item_code == "MED-IVF-01")
        anomaly_log = InventoryAnomaly(
            item_id=r_item.id,
            anomaly_type="UNUSUAL_SPIKE",
            consumption_value=76.0,
            expected_baseline=18.4,
            z_score=3.68,
            deviation_pct=313.0,
            flagged_reason="Extreme spike detected: 76.0 bottles consumed vs 18.4 baseline (Z=+3.68, +313% deviation). Correlated with South Zone Dengue cluster surge.",
            status="PENDING_REVIEW",
            timestamp=now - timedelta(days=6)
        )
        session.add(anomaly_log)

        # 9. Seed Reorder Recommendation
        t_item = next(i for i in created_items if i.item_code == "MED-TRM-01")
        reorder_rec = ReorderRecommendation(
            item_id=t_item.id,
            supplier_id=suppliers_data[0].id,
            suggested_qty=60,
            current_stock=t_item.current_stock,
            predicted_demand_30d=72.0,
            safety_stock=40,
            supplier_lead_time_days=2.5,
            unit_cost=145.0,
            total_estimated_cost=8700.0,
            urgency_score=0.92,
            status="PROPOSED",
            reasoning="Current stock (28) breached safety threshold (40). Dynamic ROP triggered: Lead time demand (6.0) + Safety buffer (54 adjusted for trauma criticality). Suggested EOQ purchase of 60 kits.",
            timestamp=now - timedelta(hours=2)
        )
        session.add(reorder_rec)

        await session.commit()
        print("[SUCCESS] Database successfully populated with realistic hospital network data!")

if __name__ == "__main__":
    asyncio.run(seed_database())
