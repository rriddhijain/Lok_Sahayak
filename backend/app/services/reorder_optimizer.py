import math
from typing import List, Dict, Any, Optional
from datetime import datetime
from backend.app.models.inventory import Item
from backend.app.models.supplier import Supplier, SupplierCostMatrix

class ReorderOptimizer:
    """
    Intelligent Procurement Algorithm & Reorder Engine.
    Combines:
    - Predicted future demand (30-day forecast)
    - Dynamic safety buffer & Reorder Point (ROP)
    - Economic Order Quantity (EOQ) & bulk volume tiers
    - Supplier Intelligence scoring (lead time, reliability, cost)
    """

    ORDERING_COST_K = 45.0  # Administrative & dispatch handling cost per order
    ANNUAL_HOLDING_RATE_H = 0.22  # 22% annual holding/storage cost

    @classmethod
    def evaluate_item_reorder(
        cls,
        item: Item,
        predicted_30d_demand: float,
        suppliers: List[Supplier],
        cost_matrices: List[SupplierCostMatrix]
    ) -> Optional[Dict[str, Any]]:
        """
        Determines whether a reorder is needed and computes suggested purchase quantity,
        optimal supplier, cost estimate, and mathematical explainability.
        """
        daily_demand = max(0.5, predicted_30d_demand / 30.0)
        annual_demand = daily_demand * 365.0

        # Choose best supplier using Supplier Intelligence
        best_supplier = None
        best_matrix = None
        best_utility = -1.0

        for s in suppliers:
            # Match matrix if available
            matrix = next((m for m in cost_matrices if m.supplier_id == s.id and m.item_id == item.id), None)
            unit_price = matrix.unit_cost if matrix else item.unit_cost
            lead_time = matrix.lead_time_days if matrix else s.historical_lead_time_days

            # Utility function: Reliability (40%), On-Time (30%), Short Lead-Time (20%), Price Competitiveness (10%)
            price_norm = max(0.1, 1.0 - (unit_price / (item.unit_cost * 1.5 + 1e-3)))
            lt_norm = max(0.1, 1.0 - (lead_time / 20.0))
            utility = (
                0.40 * s.reliability_score +
                0.30 * s.on_time_delivery_rate +
                0.20 * lt_norm +
                0.10 * price_norm
            )

            if utility > best_utility:
                best_utility = utility
                best_supplier = s
                best_matrix = matrix

        # Fallbacks if no supplier found
        lead_time_days = best_matrix.lead_time_days if best_matrix else (best_supplier.historical_lead_time_days if best_supplier else 7.0)
        supplier_rel = best_supplier.reliability_score if best_supplier else 0.85
        unit_price = best_matrix.unit_cost if best_matrix else item.unit_cost

        # 1. Dynamic Safety Stock & Reorder Point (ROP)
        # Higher buffer for unreliable suppliers or trauma critical items
        rel_buffer = 1.0 + (1.0 - supplier_rel) * 1.2
        crit_buffer = 1.35 if item.is_trauma_critical else 1.0
        effective_safety_stock = int(item.safety_stock_threshold * rel_buffer * crit_buffer)

        lead_time_demand = daily_demand * lead_time_days
        reorder_point = int(lead_time_demand + effective_safety_stock)

        # Trigger check: if current stock <= ROP
        needs_reorder = item.current_stock <= reorder_point

        # Calculate EOQ
        holding_cost = cls.ANNUAL_HOLDING_RATE_H * max(1.0, unit_price)
        eoq = math.sqrt((2.0 * annual_demand * cls.ORDERING_COST_K) / holding_cost)

        # Net deficit to replenish back to target safety stock + lead-time buffer
        target_inventory = reorder_point + int(daily_demand * 14) # 14-day working stock
        deficit = target_inventory - item.current_stock

        suggested_qty = max(item.min_order_qty, int(max(eoq, deficit)))

        # Bulk discount evaluation
        bulk_applied = False
        if best_matrix and best_matrix.bulk_discount_threshold:
            bulk_thresh = best_matrix.bulk_discount_threshold
            # If within 25% of bulk tier, calculate if bulk tier is financially advantageous
            if suggested_qty >= bulk_thresh * 0.75:
                bulk_qty = max(suggested_qty, bulk_thresh)
                bulk_cost = bulk_qty * best_matrix.discounted_unit_cost
                normal_cost = suggested_qty * unit_price
                if bulk_cost <= normal_cost * 1.15:
                    suggested_qty = bulk_qty
                    unit_price = best_matrix.discounted_unit_cost
                    bulk_applied = True

        total_cost = round(suggested_qty * unit_price, 2)

        # Urgency scoring (0.0 to 1.0)
        days_of_stock = item.current_stock / daily_demand
        if item.current_stock <= 0:
            urgency = 1.0
        elif item.current_stock < item.safety_stock_threshold:
            urgency = 0.85 + 0.15 * (1.0 - item.current_stock / item.safety_stock_threshold)
        elif days_of_stock < lead_time_days:
            urgency = 0.75
        elif item.current_stock <= reorder_point:
            urgency = 0.55
        else:
            urgency = 0.20

        if item.is_trauma_critical:
            urgency = min(1.0, urgency * 1.25)

        urgency = round(urgency, 2)

        reasoning = (
            f"ROP Trigger: Current stock ({item.current_stock}) vs ROP ({reorder_point}). "
            f"Calculated from Lead Time Demand ({lead_time_demand:.1f} = {daily_demand:.1f}/day × {lead_time_days}d) "
            f"+ Safety Buffer ({effective_safety_stock} units, adjusted for {supplier_rel*100:.0f}% supplier reliability). "
            f"EOQ calculated as {int(eoq)} units. "
            f"{'Bulk tier applied (' + str(best_matrix.bulk_discount_threshold) + ' units at discounted $' + str(unit_price) + ').' if bulk_applied else ''}"
        )

        return {
            "item_id": item.id,
            "item_name": item.name,
            "item_code": item.item_code,
            "category": item.category,
            "current_stock": item.current_stock,
            "safety_stock": effective_safety_stock,
            "reorder_point": reorder_point,
            "needs_reorder": needs_reorder,
            "predicted_demand_30d": round(predicted_30d_demand, 1),
            "daily_demand_rate": round(daily_demand, 2),
            "supplier_id": best_supplier.id if best_supplier else None,
            "supplier_name": best_supplier.name if best_supplier else "Generic Preferred Distributor",
            "supplier_reliability": round(supplier_rel, 2),
            "lead_time_days": round(lead_time_days, 1),
            "suggested_qty": suggested_qty,
            "unit_cost": round(unit_price, 2),
            "total_estimated_cost": total_cost,
            "urgency_score": urgency,
            "reasoning": reasoning,
            "status": "PROPOSED",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }
