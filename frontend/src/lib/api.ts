import { InventoryItem, NetworkHospital, PreparednessAlert, ForecastOverview } from "./types";
let workRole = "Hospital Administrator";
export function setApiRole(role: string) {workRole = role;}
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";
export async function request(path: string, options?: RequestInit): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {cache: "no-store", ...options, headers: {...options?.headers, "X-Work-Role": workRole}});
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(typeof data?.detail === "string" ? data.detail : `Request failed (${res.status})`);
  return data;
}
const post = (path: string, body: any, method = "POST") => request(path, {method, headers: {"Content-Type":"application/json"}, body: JSON.stringify(body)});
export const fetchInventorySummary = () => request("/api/inventory/summary");
export async function fetchInventoryItems(category?: string, riskLevel?: string, search?: string): Promise<InventoryItem[]> {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (riskLevel) params.set("risk_level", riskLevel);
  if (search) params.set("search", search);
  return (await request(`/api/inventory/items?${params}`)).map((i: any) => ({...i,
    sku: i.item_code, safety_threshold: i.safety_stock_threshold,
    trauma_critical: i.is_trauma_critical, cold_chain_required: i.storage_temp_c != null && i.storage_temp_c <= 8,
    storage_temp_c: i.storage_temp_c,
    risk_score: i.composite_risk_score,
    risk_level: i.composite_risk_score >= 70 ? "CRITICAL" : i.composite_risk_score >= 40 ? "MEDIUM" : "LOW",
    status: i.current_stock <= 0 ? "STOCKOUT" : i.current_stock < i.safety_stock_threshold ? "LOW_STOCK" : "OPTIMAL",
    days_until_stockout: i.days_of_stock_left,
    daily_burn_rate: i.daily_run_rate,
  }));
}
export async function fetchBatches(itemId?: number, expiryWarningOnly = false) {
  const params = new URLSearchParams({expiry_warning_only: String(expiryWarningOnly)});
  if (itemId) params.set("item_id", String(itemId));
  return (await request(`/api/inventory/batches?${params}`)).map((b: any) => ({...b,
    current_quantity: b.remaining_quantity, unit_cost: b.unit_purchase_price,
    is_expired: b.days_to_expiry <= 0, is_near_expiry: b.days_to_expiry > 0 && b.days_to_expiry <= 90}));
}
export const adjustStock = (payload: any) => post("/api/inventory/adjust", payload);
export const allocateFEFO = (itemId: number, quantity: number) => request(`/api/inventory/fefo-allocate?item_id=${itemId}&quantity=${quantity}`, {method:"POST"});
export const dispenseFEFO = (itemId: number, quantity: number) => request(`/api/inventory/dispense?item_id=${itemId}&quantity=${quantity}`, {method:"POST"});
export async function fetchItemForecast(itemId: number, horizon = 30): Promise<ForecastOverview> {
  const d = await request(`/api/forecast/item/${itemId}?horizon_days=${horizon}`);
  return {...d, daily_demand_mean: d.daily_run_rate, days_until_depletion: d.projected_stock_out_days,
    projected_stockout_date: d.projected_stock_out_date,
    series: [...d.historical.map((p: any) => ({date:p.date, historical_consumption:p.actual_consumption})),
      ...d.forecast.map((p: any) => ({...p,
        confidence_lower_95:p.confidence_lower, confidence_upper_95:p.confidence_upper,
        confidence_lower_80:Math.max(0, p.predicted_demand-(p.predicted_demand-p.confidence_lower)*1.282/1.96),
        confidence_upper_80:p.predicted_demand+(p.confidence_upper-p.predicted_demand)*1.282/1.96}))]};
}
export async function fetchReorders(filterUrgent = false) {
  return (await request(`/api/procurement/reorders?filter_urgent_only=${filterUrgent}`)).map((r: any) => ({...r,
    sku:r.item_code, reason:r.reasoning, urgency:r.urgency_score >= .85 ? "CRITICAL" : "Recommended"}));
}
export async function fetchSuppliers() {
  return (await request("/api/procurement/suppliers")).map((s: any) => ({...s,
    avg_lead_time_days:s.historical_lead_time_days, quality_compliance:s.quality_compliance_score,
    category:s.composite_grade}));
}
export const approvePurchaseOrder = (itemId: number, supplierId: number, qty: number, unitCost: number) => request(`/api/procurement/reorders/approve?item_id=${itemId}&supplier_id=${supplierId}&quantity=${qty}&unit_cost=${unitCost}`, {method:"POST"});
export const fetchOrderOptions = () => request("/api/procurement/order-options");
export const createManualOrder = (itemId: number, quantity: number) => post("/api/procurement/orders/manual", {item_id: itemId, quantity});
export const fetchPurchaseOrders = () => request("/api/procurement/orders");
export const updatePurchaseOrder = (id: number, action: string) => post(`/api/procurement/orders/${id}`, {action}, "PATCH");
function hospital(d: any): NetworkHospital {
  const beds = d.beds || [];
  const count = (type: string) => beds.find((b: any) => b.bed_type.toLowerCase() === type)?.available_beds ?? 0;
  const lat1 = 28.6139 * Math.PI/180, lat2 = d.latitude * Math.PI/180;
  const a = Math.sin((lat2-lat1)/2)**2 + Math.cos(lat1)*Math.cos(lat2)*Math.sin((d.longitude-77.209)*Math.PI/360)**2;
  const km = 6371*2*Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0,1-a)));
  return {...d, id:d.id ?? d.hospital_id, total_beds:d.total_beds ?? d.total_capacity, beds, trauma_beds_available:count("trauma"), icu_beds_available:count("icu"), general_beds_available:count("general"), oxygen_beds_available:count("oxygen"),
    distance_km:d.distance_km ?? Number(km.toFixed(2)), estimated_transit_mins:d.estimated_transit_mins ?? d.estimated_transit_minutes ?? Math.max(1, Math.round(km/25*60)),
    last_sync_timestamp:new Date().toISOString()};
}
export async function fetchHospitals(): Promise<NetworkHospital[]> {return (await request("/api/emergency/hospitals")).map(hospital);}
export async function searchEmergencyHospitals(payload: any): Promise<NetworkHospital[]> {return (await post("/api/emergency/hospital-finder", payload)).map(hospital);}
export const fetchEmergencyStatus = () => request("/api/emergency/status");
export const toggleEmergencyMode = (payload: any) => post("/api/emergency/toggle", payload);
export async function fetchAlerts(): Promise<PreparednessAlert[]> {return (await request("/api/nlp/alerts")).map((a: any) => ({...a,
  source_bulletin:a.data_source, disease_detected:a.disease_entity, confidence:a.confidence_score,
  inventory_impact_rationale:a.mathematical_reasoning, is_resolved:!a.is_active}));}
export const ingestHealthSignal = (payload: any) => post("/api/nlp/ingest", payload);
export async function askAIAssistant(query: string, roleContext: string, history: any[] = []) {
  const d = await post("/api/assistant/chat", {query, role_context:roleContext, history:history.map(m => ({role:m.role, content:m.content}))});
  return {...d, response:d.reply.replace(/\*\*/g, "").replace(/`/g, ""), citations:d.citations.map((c: any) => ({...c, source:c.title, reference:c.details}))};
}
export const fetchDispatches = () => request("/api/emergency/dispatches");
export const createDispatch = (payload: any) => post("/api/emergency/dispatches", payload);
export const updateDispatch = (id: number, payload: any) => post(`/api/emergency/dispatches/${id}`, payload, "PATCH");
export const updateBeds = (id: number, payload: any) => post(`/api/emergency/hospitals/${id}/beds`, payload, "PATCH");
export function subscribeToSSE(onMessage: (event: string, data: any) => void) {
  const source = new EventSource(`${API_BASE}/api/stream/sse?role=${encodeURIComponent(workRole)}`);
  source.onopen = () => onMessage("CONNECTION_STATE", {connected:true});
  source.onerror = () => onMessage("CONNECTION_STATE", {connected:false});
  ["CONNECTED","INVENTORY_UPDATE","EMERGENCY_MODE_STATE","AI_PREPAREDNESS_ALERT","PO_APPROVED","ORDER_UPDATED","BED_UPDATE","DISPATCH_UPDATE"].forEach(event => {
    source.addEventListener(event, (e) => {try {onMessage(event, JSON.parse((e as MessageEvent).data));} catch {}});
  });
  return () => source.close();
}
