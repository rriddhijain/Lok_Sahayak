export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: string;
  current_stock: number;
  unit: string;
  safety_threshold: number;
  baseline_safety_stock_threshold?: number;
  reserve_multiplier?: number;
  unit_cost: number;
  incoming_order?: {id: number; quantity: number; lead_time_days: number; expected_arrival_at: string; days_until_arrival: number; overdue_days: number; delivery_status: string} | null;
  storage_temp_c?: number | null;
  cold_chain_required: boolean;
  trauma_critical: boolean;
  status: "OPTIMAL" | "LOW_STOCK" | "STOCKOUT" | "EXPIRING_SOON";
  risk_score: number;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  risk_factors?: {
    stock_out_risk: number;
    expiry_risk: number;
    lead_time_risk: number;
    trauma_weight: number;
    formula?: string;
  };
  reorder_recommendation?: {
    is_reorder_needed: boolean;
    reorder_point: number;
    suggested_order_qty: number;
    confidence_score: number;
    reason: string;
    calculated_at: string;
    formula_used: string;
  };
  daily_burn_rate?: number;
  days_until_stockout?: number;
  anomalies?: AnomalyRecord[];
}

export interface BatchItem {
  id: number;
  item_id: number;
  item_name?: string;
  batch_number: string;
  expiry_date: string;
  days_to_expiry: number;
  current_quantity: number;
  unit_cost: number;
  supplier_name?: string;
  is_expired: boolean;
  is_near_expiry: boolean;
}

export interface AnomalyRecord {
  id?: number;
  item_id: number;
  item_name?: string;
  anomaly_type: "SPIKE_CONSUMPTION" | "UNUSUAL_DROP" | "SUDDEN_OUTFLOW";
  z_score: number;
  observed_value: number;
  expected_mean: number;
  timestamp: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  notes?: string;
}

export interface PreparednessAlert {
  id: number;
  title: string;
  source_bulletin: string;
  disease_detected: string;
  confidence: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  recommended_action: string;
  inventory_impact_rationale: string;
  timestamp: string;
  is_resolved?: boolean;
}

export interface NetworkHospital {
  id: number;
  name: string;
  trauma_level: "Level-1" | "Level-2" | "Level-3" | "District";
  latitude: number;
  longitude: number;
  total_beds: number;
  available_beds: number;
  trauma_beds_available: number;
  icu_beds_available: number;
  general_beds_available: number;
  oxygen_beds_available: number;
  distance_km?: number;
  estimated_transit_mins?: number;
  contact_phone?: string;
  beds?: {bed_type: string; total_capacity: number; available_beds: number; occupied_beds: number}[];
  last_sync_timestamp: string;
}

export interface ForecastDataPoint {
  date: string;
  historical_consumption?: number;
  predicted_demand: number;
  confidence_lower_80: number;
  confidence_upper_80: number;
  confidence_lower_95: number;
  confidence_upper_95: number;
}

export interface ForecastOverview {
  item_id: number;
  item_name: string;
  current_stock: number;
  daily_demand_mean: number;
  days_until_depletion: number;
  projected_stockout_date: string;
  mae: number;
  rmse: number;
  r2_score: number;
  series: ForecastDataPoint[];
}

export interface LiveNotification {
  id: string;
  type: "EMERGENCY" | "ANOMALY" | "NLP_ALERT" | "STOCK_MOVE" | "PROCUREMENT";
  title: string;
  message: string;
  timestamp: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  meta?: any;
}
