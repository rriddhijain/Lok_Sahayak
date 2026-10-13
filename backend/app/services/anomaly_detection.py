import numpy as np
from typing import List, Dict, Any, Optional
from datetime import datetime

class InventoryAnomalyDetector:
    """
    Statistical and rolling anomaly detection service for medical inventory consumption.
    Detects unusual consumption spikes, drops, and sudden depletion events.
    """

    @staticmethod
    def detect_consumption_anomaly(
        item_id: int,
        item_name: str,
        current_consumption: float,
        historical_consumptions: List[float],
        z_threshold: float = 2.3
    ) -> Optional[Dict[str, Any]]:
        """
        Calculates Z-score and IQR bounds. Returns anomaly metadata if flagged, else None.
        """
        if len(historical_consumptions) < 5:
            # Insufficient samples for robust baseline
            return None

        arr = np.array(historical_consumptions, dtype=float)
        mean_val = float(np.mean(arr))
        std_val = float(np.std(arr))

        if std_val < 0.5:
            std_val = max(1.0, mean_val * 0.15)

        z_score = (current_consumption - mean_val) / std_val
        deviation_pct = ((current_consumption - mean_val) / (mean_val + 1e-5)) * 100.0

        # IQR calculation
        q25, q75 = np.percentile(arr, [25, 75])
        iqr = q75 - q25
        upper_fence = q75 + 1.5 * iqr
        lower_fence = max(0.0, q25 - 1.5 * iqr)

        is_spike = z_score >= z_threshold or current_consumption > upper_fence * 1.2
        is_drop = (z_score <= -z_threshold and mean_val > 10.0) or (current_consumption < lower_fence and mean_val > 15.0)

        if not (is_spike or is_drop):
            return None

        if is_spike:
            anomaly_type = "UNUSUAL_SPIKE"
            if z_score > 3.5:
                operational_category = "CRITICAL_SURGE_EVENT"
                reason = f"Extreme spike: {current_consumption:.1f} units consumed vs baseline {mean_val:.1f} (Z=+{z_score:.2f}, +{deviation_pct:.1f}% deviation). Possible mass emergency or disease outbreak cluster."
            else:
                operational_category = "ELEVATED_CONSUMPTION"
                reason = f"Consumption spike: {current_consumption:.1f} units vs baseline {mean_val:.1f} (Z=+{z_score:.2f}, +{deviation_pct:.1f}% deviation). Review departmental requisition."
        else:
            anomaly_type = "UNUSUAL_DROP"
            operational_category = "SUSPECTED_RECORDING_GAP"
            reason = f"Unusual consumption collapse: {current_consumption:.1f} units recorded vs baseline {mean_val:.1f} (Z={z_score:.2f}, {deviation_pct:.1f}% deviation). Possible logging disruption or clinical shift delay."

        return {
            "item_id": item_id,
            "item_name": item_name,
            "anomaly_type": anomaly_type,
            "operational_category": operational_category,
            "consumption_value": round(current_consumption, 2),
            "expected_baseline": round(mean_val, 2),
            "z_score": round(z_score, 2),
            "deviation_pct": round(deviation_pct, 1),
            "flagged_reason": reason,
            "status": "PENDING_REVIEW",
            "mathematical_proof": f"Z = ({current_consumption:.1f} - {mean_val:.1f}) / {std_val:.2f} = {z_score:+.2f} (Threshold ±{z_threshold}). IQR fence: [{lower_fence:.1f}, {upper_fence:.1f}]",
            "timestamp": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        }

    @classmethod
    def scan_item_history_for_anomalies(
        cls,
        item_id: int,
        item_name: str,
        historical_records: List[Dict[str, Any]]
    ) -> List[Dict[str, Any]]:
        """
        Scans a sequence of daily consumption records to identify historical anomaly events.
        """
        if len(historical_records) < 7:
            return []

        values = [float(r['quantity']) for r in historical_records]
        detected = []

        # Use rolling window of previous 14 days
        for i in range(7, len(historical_records)):
            curr_val = values[i]
            history_window = values[max(0, i - 14):i]
            rec_date = historical_records[i].get('date', datetime.utcnow().strftime("%Y-%m-%d"))

            anomaly = cls.detect_consumption_anomaly(
                item_id, item_name, curr_val, history_window
            )
            if anomaly:
                anomaly['date'] = rec_date
                detected.append(anomaly)

        return detected
