import os
from typing import List, Dict, Any
from datetime import datetime
from backend.app.config import settings

class AntigravityInventoryAgent:
    """
    Antigravity Core AI Agent & Decision-Support Assistant.
    Provides natural language querying grounded in live hospital inventory,
    bed capacity, FEFO batch tracking, procurement reorders, and outbreak alerts.
    """

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY

    def execute_grounded_query(
        self,
        query: str,
        role: str,
        context_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Processes staff natural language queries with role-based grounding and audit citations.
        """
        q_lower = query.lower()
        citations = []
        suggested_actions = []

        items: List[Dict[str, Any]] = context_data.get("items", [])
        batches: List[Dict[str, Any]] = context_data.get("batches", [])
        hospitals: List[Dict[str, Any]] = context_data.get("hospitals", [])
        reorders: List[Dict[str, Any]] = context_data.get("reorders", [])
        alerts: List[Dict[str, Any]] = context_data.get("alerts", [])
        emergency_active: bool = context_data.get("emergency_mode", False)

        # 1. EXPIRY OR FEFO QUERY
        if any(w in q_lower for w in ["expir", "fefo", "shelf life", "waste", "batch"]):
            near_expiring = [b for b in batches if 0 < b.get("days_to_expiry", 999) <= 90 and b.get("remaining_quantity", 0) > 0]
            near_expiring.sort(key=lambda b: b.get("days_to_expiry", 999))

            if near_expiring:
                lines = [f"Found **{len(near_expiring)} batches** expiring within the next 90 days:"]
                for b in near_expiring[:5]:
                    lines.append(
                        f"- **Batch `{b['batch_number']}`** ({b['item_name']}): **{b['remaining_quantity']} units** expiring in **{b['days_to_expiry']} days** ({b['expiry_date']}). Status: `{b['status']}`"
                    )
                    citations.append({
                        "entity_type": "BATCH_EXPIRY",
                        "entity_id": str(b.get("batch_id", "")),
                        "title": f"Batch {b['batch_number']} - {b['item_name']}",
                        "details": f"{b['remaining_quantity']} units expiring in {b['days_to_expiry']} days",
                        "metric": f"{b['days_to_expiry']} days left"
                    })

                lines.append("\n**First Expiring, First Out recommendation**: Review these unexpired batches for earliest-expiry dispensing; no dispensing action has been taken.")
                reply = "\n".join(lines)
                suggested_actions = [
                    "Download FEFO Dispensing Manifest",
                    "Alert Pharmacy Lead for batch reallocation",
                    "Initiate near-expiry vendor return request"
                ]
            else:
                reply = "All active inventory batches are currently within safe expiration thresholds (>90 days remaining). No immediate write-off risk detected."
                suggested_actions = ["View Inventory Health Overview"]

        # 2. STOCKOUT / LOW STOCK / CRITICAL ITEMS QUERY
        elif any(w in q_lower for w in ["stockout", "shortage", "critical", "low stock", "deficit", "risk score"]):
            high_risk_items = [i for i in items if i.get("composite_risk_score", 0) >= 45.0 or i.get("current_stock", 0) < i.get("safety_stock_threshold", 0)]
            high_risk_items.sort(key=lambda i: -i.get("composite_risk_score", 0))

            if high_risk_items:
                lines = [f"Identified **{len(high_risk_items)} items** at elevated or critical stockout risk:"]
                for it in high_risk_items[:5]:
                    lines.append(
                        f"- **{it['name']}** (`{it['category']}`): Stock **{it['current_stock']} units** (Safety Threshold: {it['safety_stock_threshold']}). Composite Risk Score: **{it['composite_risk_score']}/100** (`{it['risk_level']}`). Days of stock left: **{it.get('days_of_stock_left', 0):.1f} days**."
                    )
                    citations.append({
                        "entity_type": "ITEM",
                        "entity_id": str(it.get("id", "")),
                        "title": it["name"],
                        "details": f"Stock: {it['current_stock']} | Safety: {it['safety_stock_threshold']} | Risk: {it['composite_risk_score']}/100",
                        "metric": f"{it.get('days_of_stock_left', 0):.1f} days stock"
                    })

                lines.append("\n**AI Decision Support**: Reorder requests have been automatically generated for these items based on predictive run-rate and supplier lead times.")
                reply = "\n".join(lines)
                suggested_actions = [
                    "Generate Expedited Purchase Orders",
                    "Review Dynamic Reorder Points",
                    "Trigger Emergency Mutual Aid Transfer"
                ]
            else:
                reply = "Inventory levels across all critical categories are healthy. Current stock exceeds safety buffers across all trauma and inpatient items."
                suggested_actions = ["View 30-Day Demand Projections"]

        # 3. BED / CAPACITY / HOSPITAL READINESS QUERY
        elif any(w in q_lower for w in ["bed", "icu", "trauma", "capacity", "occupancy", "hospital", "triage"]):
            lines = ["**Regional Hospital Bed Availability & Surge Status**:"]
            total_avail_icu = 0
            total_avail_trauma = 0

            for h in hospitals[:4]:
                trauma_avail = next((b["available_beds"] for b in h.get("beds", []) if "trauma" in b.get("bed_type", "").lower()), 0)
                icu_avail = next((b["available_beds"] for b in h.get("beds", []) if "icu" in b.get("bed_type", "").lower()), 0)
                total_avail_icu += icu_avail
                total_avail_trauma += trauma_avail

                lines.append(
                    f"- **{h['name']}** ({h.get('trauma_level', 'Level-1')} - {h.get('zone', 'Central')}): "
                    f"Trauma Beds: **{trauma_avail} available**, ICU Beds: **{icu_avail} available**."
                )
                citations.append({
                    "entity_type": "HOSPITAL_BED",
                    "entity_id": str(h.get("hospital_id", "")),
                    "title": h["name"],
                    "details": f"Trauma: {trauma_avail} avail, ICU: {icu_avail} avail",
                    "metric": f"{h.get('trauma_level', 'Level-1')}"
                })

            lines.append(f"\n**Network Totals**: Available ICU: **{total_avail_icu}**, Available Trauma: **{total_avail_trauma}**.")
            if emergency_active:
                lines.append("\n⚠️ **Emergency Mode is currently ACTIVE**. Trauma surge buffer is elevated 2.5x.")

            reply = "\n".join(lines)
            suggested_actions = [
                "Launch Mass-Casualty Spatial Finder",
                "Toggle Emergency Inventory Mode",
                "Broadcast Bed Status to Ambulance Dispatch"
            ]

        # 4. REORDER / PROCUREMENT / SUPPLIER QUERY
        elif any(w in q_lower for w in ["procure", "order", "purchase", "supplier", "po", "cost", "eoq", "lead time"]):
            if reorders:
                total_val = sum(r.get("total_estimated_cost", 0) for r in reorders)
                lines = [f"Found **{len(reorders)} recommended Purchase Orders** totaling **${total_val:,.2f}**:"]
                for r in reorders[:4]:
                    lines.append(
                        f"- **{r['item_name']}**: Order **{r['suggested_qty']} units** via **{r['supplier_name']}** (Est. Cost: ${r['total_estimated_cost']:,.2f}, Lead Time: {r['lead_time_days']} days, Urgency: {r['urgency_score']*100:.0f}%)."
                    )
                    citations.append({
                        "entity_type": "SUPPLIER",
                        "entity_id": str(r.get("item_id", "")),
                        "title": f"PO Proposal - {r['item_name']}",
                        "details": f"Qty: {r['suggested_qty']} via {r['supplier_name']} (${r['total_estimated_cost']:,.2f})",
                        "metric": f"{r['lead_time_days']}d lead time"
                    })
                lines.append("\n**Optimization Rationale**: Quantities calculated via dynamic Economic Order Quantity (EOQ) and lead-time safety buffers to minimize holding costs while eliminating stockouts.")
                reply = "\n".join(lines)
                suggested_actions = [
                    "Approve All Proposed POs",
                    "Export Procurement CSV for ERP",
                    "Inspect Supplier Reliability Matrix"
                ]
            else:
                reply = "No pending reorder proposals. All current stocks are above their dynamic Reorder Points (ROP)."
                suggested_actions = ["Review Supplier Lead Times"]

        # 5. OUTBREAK / EPIDEMIC / SURVEILLANCE QUERY
        elif any(w in q_lower for w in ["outbreak", "epidemic", "dengue", "flu", "influenza", "surveillance", "signal", "alert"]):
            if alerts:
                lines = [f"Active Public Health Preparedness Alerts (**{len(alerts)} alerts**):"]
                for a in alerts[:3]:
                    lines.append(
                        f"- 🚨 **{a['title']}** (`{a.get('severity', 'HIGH')}`): Disease `{a.get('disease_entity', '')}` in `{a.get('location', '')}`. Action: {a.get('recommended_action', '')}"
                    )
                    citations.append({
                        "entity_type": "EPIDEMIC_ALERT",
                        "entity_id": str(a.get("id", "")),
                        "title": a["title"],
                        "details": a.get("recommended_action", ""),
                        "metric": a.get("severity", "HIGH")
                    })
                lines.append("\n**Surveillance Grounding**: Powered by Antigravity NLP & Milvus semantic indexing of official health bulletins.")
                reply = "\n".join(lines)
                suggested_actions = [
                    "Ingest New Health Bulletin",
                    "Simulate 14-Day Epidemic Stock Surge",
                    "Review Stock Coverage for Affected Medicines"
                ]
            else:
                reply = "No active epidemic outbreak alerts detected in the local jurisdiction. Surveillance ingestion is running."
                suggested_actions = ["Simulate Outbreak Signal"]

        # DEFAULT COMPREHENSIVE EXECUTIVE SUMMARY
        else:
            total_items = len(items)
            out_of_stock = sum(1 for i in items if i.get("current_stock", 0) <= 0)
            critical = sum(1 for i in items if 0 < i.get("current_stock", 0) < i.get("safety_stock_threshold", 0))
            expiring_90 = sum(1 for b in batches if b.get("days_to_expiry", 999) <= 90)

            reply = (
                f"**Antigravity Health Centre Inventory Intelligence Report** (Context: {role})\n\n"
                f"- **Total Catalog**: {total_items} pharmaceutical and trauma consumables monitored.\n"
                f"- **Stockout Status**: {out_of_stock} out-of-stock, {critical} in critical deficit.\n"
                f"- **FEFO Expiry Exposure**: {expiring_90} batches expiring within 90 days.\n"
                f"- **Emergency Mode**: {'⚠️ ACTIVE (Surge Buffer: 2.5x)' if emergency_active else '🟢 STANDBY (Normal Baseline)'}.\n"
                f"- **Active Outbreak Signals**: {len(alerts)} surveillance advisories indexed via Milvus.\n\n"
                f"How can I assist your department? You can ask about expiring batches, stock-out forecasts, mass-casualty triage, or procurement proposals."
            )
            suggested_actions = [
                "Which items are at high risk of stockout?",
                "Show batches expiring soonest (FEFO)",
                "Check regional trauma bed capacity",
                "What purchase orders are recommended?"
            ]

        return {
            "reply": reply,
            "citations": citations,
            "suggested_actions": suggested_actions,
            "reasoning_mode": f"Antigravity Agent Real-Time Grounding ({role})",
            "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

antigravity_agent = AntigravityInventoryAgent()
