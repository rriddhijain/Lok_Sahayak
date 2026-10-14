"use client";

import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  CheckCircle2,
  AlertTriangle,
  TrendingDown,
  ShieldCheck,
  Star,
  Clock,
  DollarSign,
  Sparkles,
  ArrowRight,
  Send,
  Building,
} from "lucide-react";
import { arrivalText } from "@/lib/roles";
import { approvePurchaseOrder, fetchPurchaseOrders, updatePurchaseOrder, fetchOrderOptions, createManualOrder } from "@/lib/api";

interface ProcurementViewProps {
  reorders: any[];
  suppliers: any[];
  onOrderApproved?: () => void;
}

export default function ProcurementView({
  reorders,
  suppliers,
  onOrderApproved,
}: ProcurementViewProps) {
  const [approvingId, setApprovingId] = useState<number | null>(null);

  const [message, setMessage] = useState("");
  const [orderMode, setOrderMode] = useState("ai");
  const [options, setOptions] = useState<any[]>([]);
  const [manualItemId, setManualItemId] = useState("");
  const [manualQuantity, setManualQuantity] = useState("");
  const [placingManual, setPlacingManual] = useState(false);
  const selectedOption = options.find(o => String(o.item_id) === manualItemId);
  const quantity = Number(manualQuantity);
  const validQuantity = /^\d+$/.test(manualQuantity) && Number.isSafeInteger(quantity) && quantity > 0 && quantity <= 2147483647;
  const manualUnitCost = selectedOption && selectedOption.bulk_discount_threshold && quantity >= selectedOption.bulk_discount_threshold && selectedOption.discounted_unit_cost
    ? selectedOption.discounted_unit_cost : selectedOption?.unit_cost;
  const loadOptions = () => fetchOrderOptions().then(setOptions).catch(e => {setOptions([]); setMessage(e.message);});
  const handleManual = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOption || selectedOption.has_approved_order || !validQuantity || placingManual) return;
    setPlacingManual(true);
    try {
      const result = await createManualOrder(selectedOption.item_id, quantity);
      setMessage(`Manual order approved for ${result.item_name}: ${result.ordered_quantity} units. Stock changes after receipt.`);
      setManualQuantity("");
      await Promise.all([loadOrders(), loadOptions()]);
      onOrderApproved?.();
    } catch (e: any) {setMessage(e.message);} finally {setPlacingManual(false);}
  };
  const [orders, setOrders] = useState<any[]>([]);
  const loadOrders = () => fetchPurchaseOrders().then(setOrders).catch(e => setMessage(e.message));
  useEffect(() => {loadOrders(); loadOptions();}, [reorders]);
  const [workingOrder, setWorkingOrder] = useState<number | null>(null);
  const handleOrder = async (id: number, action: string) => {
    setWorkingOrder(id);
    try {const d = await updatePurchaseOrder(id, action); setMessage(d.message); await loadOrders(); onOrderApproved?.();}
    catch(e: any) {setMessage(e.message);} finally {setWorkingOrder(null);}
  };
  const handleApprove = async (r: any) => {
    setApprovingId(r.item_id);
    try {
      await approvePurchaseOrder(r.item_id, r.supplier_id, r.suggested_qty, r.unit_cost);
      setMessage(`Order approved for ${r.item_name}. It is listed below under approved orders; stock changes after receipt.`);
      await loadOrders();
      if (onOrderApproved) onOrderApproved();
    } catch (err: any) {
      setMessage(err.message || "Failed to submit approval.");
    } finally {
      setApprovingId(null);
    }
  };

  const totalProcurementBudget = reorders.reduce((sum, r) => sum + (r.total_estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      {message && <p role="status" className="p-4 rounded-xl bg-sky-50 text-sky-900 border border-sky-200 text-sm">{message}</p>}
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Purchasing & Order Planning
            </h2>
            <p className="text-xs text-slate-500">
              Recommended quantities, supplier reliability, and delivery times
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Recommended purchase budget
            </span>
            <span className="text-lg font-black text-slate-900 font-mono">
              ${totalProcurementBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      <section className="p-5 bg-white border border-slate-200 rounded-2xl space-y-4">
        <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="font-bold mb-2">Order quantity</legend>
          <label><input type="radio" name="order-mode" value="ai" checked={orderMode === "ai"} onChange={() => setOrderMode("ai")} /> Let AI decide</label>
          <label><input type="radio" name="order-mode" value="manual" checked={orderMode === "manual"} onChange={() => setOrderMode("manual")} /> Enter quantity manually</label>
        </fieldset>
        {orderMode === "ai" ? <p className="text-xs text-slate-500">Approve a recommended order below to use the existing AI-calculated quantity.</p> : <form onSubmit={handleManual} className="space-y-3">
          <p className="text-xs text-slate-500">Choose any catalog medicine/supply and order an exact quantity. The preferred supplier and applicable price are calculated automatically.</p>
          <label className="block text-sm">Medicine / supply
            <select aria-label="Medicine for manual order" value={manualItemId} disabled={placingManual} onChange={e => setManualItemId(e.target.value)} required className="block w-full p-2 border rounded-lg mt-1">
              <option value="">Choose a medicine / supply</option>
              {options.map(o => <option key={o.item_id} value={o.item_id} disabled={o.has_approved_order}>{o.item_name}{o.has_approved_order ? " (order already approved)" : ""}</option>)}
            </select>
          </label>
          <label className="block text-sm">Quantity to order
            <input aria-label="Manual order quantity" type="number" min="1" max="2147483647" step="1" value={manualQuantity} onChange={e => setManualQuantity(e.target.value)} required disabled={placingManual} className="block p-2 border rounded-lg mt-1" />
          </label>
          {manualQuantity && !validQuantity && <p role="alert" className="text-sm text-rose-700">Enter a positive whole number no greater than 2,147,483,647.</p>}
          {selectedOption && <p className="text-sm text-slate-600">Supplier: {selectedOption.supplier_name} · Delivery: {selectedOption.lead_time_days} days · Current stock: {selectedOption.current_stock}. {validQuantity && <>Order: {quantity} units × ${manualUnitCost.toFixed(2)} = <strong>${(quantity * manualUnitCost).toFixed(2)}</strong></>}</p>}
          <button type="submit" disabled={!selectedOption || selectedOption.has_approved_order || !validQuantity || placingManual} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm disabled:opacity-50">{placingManual ? "Placing order..." : "Place manual order"}</button>
        </form>}
      </section>
      {/* Grid: Recommended Purchase Orders + Supplier Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recommended Reorders List (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Recommended Purchase Orders ({reorders.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Quantities balance ordering and storage costs
            </span>
          </div>

          <div className="space-y-3">
            {reorders.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                <p className="text-xs font-medium text-slate-600">All replenishment orders satisfied</p>
                <p className="text-[11px] text-slate-400">Inventory levels conform to target safety buffers</p>
              </div>
            ) : (
              reorders.map((r) => (
                <div
                  key={r.item_id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 transition-all space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{r.item_name}</span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                            r.urgency === "CRITICAL"
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-amber-100 text-amber-800 border border-amber-200"
                          }`}
                        >
                          {r.urgency}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">
                        Item code: {r.sku} • Current Stock: {r.current_stock} (Reorder level: {r.reorder_point})
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        ${(r.total_estimated_cost ?? r.suggested_qty * r.unit_cost).toFixed(2)}
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {r.suggested_qty} units @ ${r.unit_cost}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 leading-relaxed font-mono text-[11px]">
                    {r.reason || "Stock has breached safety replenishment threshold. Supplier lead time factor applied."}
                  </p>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{r.supplier_name || "MediPharma Global"} ({r.lead_time_days ?? 3} days delivery)</span>
                    </div>

                    <button
                      onClick={() => handleApprove(r)}
                      disabled={approvingId !== null || placingManual}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {approvingId === r.item_id ? (
                        "Approving..."
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Approve order
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Qualified Supplier Scorecards (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Qualified Medical Suppliers ({suppliers.length})
            </h3>
            <span className="text-xs text-slate-400">Reliability Rank</span>
          </div>

          <div className="space-y-3">
            {suppliers.map((sup) => (
              <div
                key={sup.id}
                className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{sup.name}</h4>
                    <span className="text-[10px] text-slate-500">{sup.category}</span>
                  </div>
                  <div className="flex items-center gap-1 bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded-md border border-emerald-200 text-xs font-bold font-mono">
                    <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
                    {Math.round((sup.reliability_score ?? 0.95) * 100)}%
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-[10px] font-mono bg-white p-2 rounded-lg border border-slate-200">
                  <div>
                    <span className="text-slate-400 block">Lead Time</span>
                    <strong className="text-slate-800">{sup.avg_lead_time_days ?? 2.5} days</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">On-time delivery</span>
                    <strong className="text-emerald-700">
                      {Math.round((sup.on_time_delivery_rate ?? 0.98) * 100)}%
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Compliance</span>
                    <strong className="text-slate-800">
                      {Math.round((sup.quality_compliance ?? 0.99) * 100)}%
                    </strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <section className="p-5 bg-white border rounded-2xl space-y-3"><h3 className="font-bold text-sm">Purchase order history</h3><p className="text-xs text-slate-500">Approval places an order. Record delivery to add the received batch to stock, or cancel the order.</p>
        {orders.length === 0 && <p className="text-sm text-slate-500">No saved orders yet.</p>}
        {orders.map(o => <div key={o.id} className="p-3 border rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs"><div><strong>Order #{o.id}: {o.item_name}</strong><p>{o.suggested_qty} units · {o.supplier_name} · {o.status}</p>{o.status === "APPROVED" && <p className="text-sky-800 font-semibold mt-1">{arrivalText(o)} · {new Date(o.expected_arrival_at).toLocaleDateString()}</p>}</div>{o.status === "APPROVED" && <div className="flex gap-2"><button disabled={workingOrder !== null} className="px-3 py-2 rounded-lg bg-slate-900 text-white disabled:opacity-50" onClick={() => handleOrder(o.id,"receive")}>Record delivery</button><button disabled={workingOrder !== null} className="px-3 py-2 border rounded-lg disabled:opacity-50" onClick={() => handleOrder(o.id,"cancel")}>Cancel order</button></div>}</div>)}
      </section>
    </div>
  );
}
