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
          department: "Automated Clinical Dispensing",
          notes: `FEFO batch allocation protocol run for ${item.name}`,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-xl p-6 space-y-5 border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">First-Expired, First-Out (FEFO) Allocation</h3>
              <p className="text-xs text-slate-400">{item.name} ({item.item_code})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
          <label className="text-xs font-medium text-slate-300 block">
            Requested Dispensation Quantity ({item.unit}):
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              min="1"
              max={item.current_stock}
              value={requestedQty}
              onChange={(e) => setRequestedQty(parseInt(e.target.value) || 1)}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleSimulate}
              disabled={loading}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-semibold hover:from-cyan-500 hover:to-blue-500 transition-all"
            >
              {loading ? "Calculating..." : "Compute FEFO Pick-List"}
            </button>
          </div>
          <span className="text-[11px] text-slate-500">
            Total currently on-hand across all batches: {item.current_stock} {item.unit}
          </span>
        </div>

        {/* Results */}
        {plan && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-300">
                Allocated: <b className="text-cyan-400">{plan.allocated_total}</b> of {plan.requested_quantity} {item.unit}
              </span>
              <span className="text-emerald-400 font-bold">{plan.status}</span>
            </div>

            <div className="space-y-2 max-h-56 overflow-y-auto">
              {plan.allocations.map((alloc: any, idx: number) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-mono font-semibold text-white block">{alloc.batch_number}</span>
                    <span className="text-[11px] text-slate-400">
                      Expires: {alloc.expiry_date} ({alloc.days_to_expiry} days left)
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono font-bold text-cyan-300 text-sm block">
                      +{alloc.allocated_quantity} units
                    </span>
                    {alloc.is_at_risk && (
                      <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 justify-end">
                        <Clock className="w-3 h-3" /> Near Expiry Pick
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={handleExecuteDispense}
              disabled={dispensing || plan.allocated_total <= 0}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
            >
              {dispensing ? "Committing Dispensation..." : "Confirm & Execute FEFO Dispensing"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
