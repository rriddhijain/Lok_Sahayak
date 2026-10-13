"""Delivery estimates are calculated from the saved approval time and supplier lead time."""
from datetime import datetime, timedelta, timezone
import math

def delivery_estimate(order, now=None):
    now = now or datetime.now(timezone.utc).replace(tzinfo=None)
    expected = order.timestamp + timedelta(days=order.supplier_lead_time_days)
    seconds = (expected - now).total_seconds()
    days = max(0, math.ceil(seconds / 86400))
    overdue_days = max(0, math.ceil(-seconds / 86400))
    status = "OVERDUE" if seconds < 0 else ("TODAY" if expected.date() == now.date() else "EXPECTED")
    return {"expected_arrival_at": expected.isoformat() + "Z", "days_until_arrival": days,
            "overdue_days": overdue_days, "delivery_status": status}
