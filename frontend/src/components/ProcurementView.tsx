"use client";

import React, { useState } from "react";
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
import { approvePurchaseOrder } from "@/lib/api";

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

  const handleApprove = async (r: any) => {
    setApprovingId(r.item_id);
    try {
      await approvePurchaseOrder(r.item_id, r.supplier_id, r.suggested_qty, r.unit_cost);
      if (onOrderApproved) onOrderApproved();
    } catch (err) {
      alert("Failed to submit approval.");
    } finally {
      setApprovingId(null);
    }
  };

  const totalProcurementBudget = reorders.reduce((sum, r) => sum + (r.total_estimated_cost || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-slate-100 text-slate-800 border border-slate-200">
            <ShoppingCart className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Procurement & Dynamic EOQ Optimization
            </h2>
            <p className="text-xs text-slate-500">
              Multi-attribute supplier utility ranking, holding cost minimization, and automated reorder points
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              Recommended PO Allocation
            </span>
            <span className="text-lg font-black text-slate-900 font-mono">
              ${totalProcurementBudget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Grid: Recommended Purchase Orders + Supplier Scorecards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Recommended Reorders List (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-600" />
              Dynamic EOQ Purchase Orders ({reorders.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">
              Formula: EOQ = √((2·D·K)/(h·C))
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
                        SKU: {r.sku} • Current Stock: {r.current_stock} (Safe Min: {r.reorder_point})
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
                      <span>{r.supplier_name || "MediPharma Global"} ({r.lead_time_days ?? 3}d SLA)</span>
                    </div>

                    <button
                      onClick={() => handleApprove(r)}
                      disabled={approvingId === r.item_id}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-1.5"
                    >
                      {approvingId === r.item_id ? (
                        "Approving..."
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          Approve PO
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
                    <span className="text-slate-400 block">On-Time SLA</span>
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
    </div>
  );
}
