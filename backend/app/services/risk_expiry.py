import math
from datetime import datetime, timedelta
from typing import List, Dict, Any, Tuple
from backend.app.models.inventory import Item, Batch
from backend.app.models.supplier import Supplier

class RiskAndExpiryEngine:
    """
    Evaluates:
    1. Time-to-stock-out and probability
    2. FEFO (First-Expired, First-Out) batch allocation
    3. Multi-factor Composite Inventory Risk Score (0-100)
    """

    @staticmethod
    def calculate_stockout_probability(current_stock: int, safety_threshold: int, daily_run_rate: float) -> Tuple[float, float, str]:
        """
        Returns (stockout_probability_pct, days_left, status)
        """
        if daily_run_rate <= 0:
            daily_run_rate = 1.0

        days_left = current_stock / daily_run_rate

        if current_stock <= 0:
            return 100.0, 0.0, "OUT_OF_STOCK"
        elif current_stock < safety_threshold:
            # Deficit below safety buffer: high probability
            ratio = current_stock / safety_threshold
            prob = 70.0 + (1.0 - ratio) * 28.0
            return round(prob, 1), round(days_left, 1), "CRITICAL_LOW"
        elif days_left < 7.0:
            prob = 60.0 + (7.0 - days_left) * 4.0
            return round(min(95.0, prob), 1), round(days_left, 1), "REORDER_RECOMMENDED"
        elif days_left < 14.0:
            prob = 35.0 + (14.0 - days_left) * 2.5
            return round(prob, 1), round(days_left, 1), "MONITORING"
        else:
            prob = max(2.0, 25.0 * math.exp(-0.05 * (days_left - 14)))
            return round(prob, 1), round(days_left, 1), "HEALTHY"

    @staticmethod
    def calculate_expiry_risk(batches: List[Batch]) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Computes batch expiration risks under FEFO.
        Returns (expiry_risk_score_0_100, batch_risk_details)
        """
        now = datetime.utcnow()
        total_remaining = sum(b.remaining_quantity for b in batches)

        if total_remaining == 0:
            return 0.0, []

        weighted_risk_qty = 0.0
        details = []

        for b in batches:
            delta_days = (b.expiry_date - now).days
            if delta_days <= 0:
                status = "EXPIRED"
                weight = 1.0
                risk_level = "CRITICAL"
            elif delta_days <= 30:
                status = "CRITICAL (<30d)"
                weight = 0.85
                risk_level = "HIGH"
            elif delta_days <= 90:
                status = "WARNING (<90d)"
                weight = 0.40
                risk_level = "MODERATE"
            else:
                status = "SAFE"
                weight = 0.05
                risk_level = "LOW"

            weighted_risk_qty += b.remaining_quantity * weight

            details.append({
                "batch_id": b.id,
                "batch_number": b.batch_number,
                "remaining_quantity": b.remaining_quantity,
                "expiry_date": b.expiry_date.strftime("%Y-%m-%d"),
                "days_to_expiry": delta_days,
                "status": status,
                "risk_level": risk_level
            })

        expiry_score = min(100.0, (weighted_risk_qty / total_remaining) * 100.0)
        return round(expiry_score, 1), details

    @classmethod
    def compute_composite_risk_score(
        cls,
        item: Item,
        batches: List[Batch],
        supplier: Supplier = None,
        daily_run_rate: float = 10.0
    ) -> Dict[str, Any]:
        """
        Composite Risk Score = w_stockout * StockoutRisk + w_expiry * ExpiryRisk + w_supplier * SupplierRisk
        Weights: Stockout (45%), Expiry (35%), Supplier Lead Time (20%)
        """
        stockout_prob, days_left, stock_status = cls.calculate_stockout_probability(
            item.current_stock, item.safety_stock_threshold, daily_run_rate
        )

        expiry_score, batch_details = cls.calculate_expiry_risk(batches)

        # Supplier lead time & reliability risk
        if supplier:
            rel = max(0.0, min(1.0, supplier.reliability_score))
            lt_days = supplier.historical_lead_time_days
            # Higher lead time and lower reliability increase risk
            supplier_risk = (1.0 - rel) * 60.0 + min(40.0, (lt_days / 14.0) * 40.0)
        else:
            supplier_risk = 30.0  # default baseline

        # If item is trauma critical, amplify stockout penalty
        w_stockout = 0.50 if item.is_trauma_critical else 0.45
        w_expiry = 0.30 if item.is_trauma_critical else 0.35
        w_supplier = 0.20

        composite = (w_stockout * stockout_prob) + (w_expiry * expiry_score) + (w_supplier * supplier_risk)
        composite = round(min(100.0, max(0.0, composite)), 1)

        if composite >= 70.0:
            risk_level = "HIGH"
        elif composite >= 45.0:
            risk_level = "ELEVATED"
        elif composite >= 25.0:
            risk_level = "MODERATE"
        else:
            risk_level = "LOW"

        return {
            "composite_risk_score": composite,
            "risk_level": risk_level,
            "stockout_risk_score": stockout_prob,
            "expiry_risk_score": expiry_score,
            "supplier_risk_score": round(supplier_risk, 1),
            "days_of_stock_left": days_left,
            "stock_status": stock_status,
            "batch_details": batch_details,
            "explainability": (
                f"Composite score {composite}/100 derived from: "
                f"Stock-Out Risk={stockout_prob}% (Current Stock: {item.current_stock}, Safety: {item.safety_stock_threshold}), "
                f"Expiry Risk={expiry_score}% (Batches evaluated: {len(batches)}), "
                f"Supplier Lead-Time Risk={supplier_risk:.1f}%."
            )
        }

    @staticmethod
    def allocate_fefo(item_id: int, item_name: str, batches: List[Batch], requested_qty: int) -> Dict[str, Any]:
        """
        Executes First-Expired, First-Out (FEFO) allocation.
        Picks batches with earliest expiry_date first, ensuring older batches are used before newer stock.
        """
        now = datetime.utcnow()
        # Sort batches by expiry_date ascending, only considering unexpired and non-zero
        valid_batches = [
            b for b in batches
            if b.remaining_quantity > 0 and b.expiry_date > now
        ]
        valid_batches.sort(key=lambda b: b.expiry_date)

        allocated_total = 0
        allocations = []
        remaining_needed = requested_qty

        for b in valid_batches:
            if remaining_needed <= 0:
                break
            take_qty = min(b.remaining_quantity, remaining_needed)
            days_to_exp = (b.expiry_date - now).days
            allocations.append({
                "batch_id": b.id,
                "batch_number": b.batch_number,
                "allocated_quantity": take_qty,
                "expiry_date": b.expiry_date.strftime("%Y-%m-%d"),
                "days_to_expiry": days_to_exp,
                "is_at_risk": days_to_exp <= 45
            })
            allocated_total += take_qty
            remaining_needed -= take_qty

        unfulfilled = max(0, requested_qty - allocated_total)

        return {
            "item_id": item_id,
            "item_name": item_name,
            "requested_quantity": requested_qty,
            "allocated_total": allocated_total,
            "unfulfilled_quantity": unfulfilled,
            "allocations": allocations,
            "policy": "First-Expired, First-Out (FEFO)",
            "status": "FULFILLED" if unfulfilled == 0 else "PARTIAL_FULFILLMENT"
        }
