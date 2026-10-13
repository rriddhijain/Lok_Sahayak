"use client";

import React, { useState } from "react";
import { X, Layers, Clock, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import { allocateFEFO, adjustStock } from "@/lib/api";

interface FEFOModalProps {
  item: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function FEFOModal({ item, onClose, onSuccess }: FEFOModalProps) {
  const [requestedQty, setRequestedQty] = useState(25);
  const [loading, setLoading] = useState(false);
  const [plan, setPlan] = useState<any>(null);
  const [dispensing, setDispensing] = useState(false);

  const handleSimulate = async () => {
    if (!item) return;
    setLoading(true);
    try {
      const res = await allocateFEFO(item.id, requestedQty);
      setPlan(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteDispense = async () => {
    if (!plan || !plan.allocations) return;
    setDispensing(true);
    try {
      for (const alloc of plan.allocations) {
        await adjustStock({
          batch_id: alloc.batch_id,
          quantity: alloc.allocated_quantity,
          transaction_type: "CONSUMPTION",
          department: "Hospital Pharmacy Dispensing",
          notes: `Dispensed earliest-expiring batch first for ${item.name}`,
        });
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      alert(`Dispensing error: ${err.message}`);
    } finally {
      setDispensing(false);
    }
  };

  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-xl p-6 space-y-5 border border-slate-200 shadow-2xl animate-scale-in">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Earliest-Expiry First Dispensing Plan</h3>
              <p className="text-xs text-slate-500">
                {item.name} ({item.sku || item.item_code}) • Uses oldest batches first to prevent medicine waste
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
          <label className="text-xs font-semibold text-slate-700 block">
            Quantity to Dispense ({item.unit}):
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={requestedQty}
              onChange={(e) => setRequestedQty(Math.max(1, parseInt(e.target.value) || 1))}
              className="flex-1 px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 disabled:opacity-50 transition-all shadow-xs"
            >
              {loading ? "Calculating..." : "Find Best Batches"}
            </button>
          </div>
        </div>

        {/* Generated Plan */}
        {plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900">
              <span>Recommended Pick Schedule:</span>
              <span className="text-emerald-700 font-mono">
                {plan.total_allocated} of {requestedQty} {item.unit} available
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {plan.allocations?.map((alloc: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900">Batch #{alloc.batch_number}</span>
                    <div className="text-[11px] text-slate-500">
                      Expires: {alloc.expiry_date} ({alloc.days_until_expiry} days left)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-teal-700 font-mono text-sm">
                      Pick {alloc.allocated_quantity} {item.unit}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Remaining in batch: {alloc.remaining_in_batch}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {plan.unfulfilled_quantity > 0 && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  Shortfall: {plan.unfulfilled_quantity} {item.unit} could not be fulfilled from existing stock.
                </span>
              </div>
            )}

            <div className="pt-2 flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteDispense}
                disabled={dispensing || plan.total_allocated === 0}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all shadow-sm disabled:opacity-50"
              >
                {dispensing ? "Dispensing..." : "Confirm & Deduct Stock"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
