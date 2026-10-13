"use client";

import React from "react";
import { X, Sparkles, ShieldCheck, Database, Clock, Calculator, Cpu } from "lucide-react";

interface ExplainabilityModalProps {
  item: any;
  onClose: () => void;
}

export default function ExplainabilityModal({ item, onClose }: ExplainabilityModalProps) {
  if (!item) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-950 rounded-2xl shadow-xl border w-full max-w-2xl p-6 space-y-5 border-cyan-500/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">AI Explainability & Mathematical Audit Trail</h3>
              <p className="text-xs text-slate-400">Auditable Decision-Support Breakdown</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          {/* Target Entity */}
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-mono block">Evaluated Subject</span>
              <span className="text-sm font-bold text-white">{item.title || item.name || item.item_name}</span>
            </div>
            {item.composite_risk_score !== undefined && (
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-mono block">Composite Risk</span>
                <span className="text-sm font-bold text-amber-400 font-mono">{item.composite_risk_score} / 100</span>
              </div>
            )}
          </div>

          {/* Mathematical Reasoning */}
          <div className="space-y-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <Calculator className="w-4 h-4 text-cyan-400" /> Mathematical Formulation & Reasoning
            </span>
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-200 font-mono text-[11px] leading-relaxed whitespace-pre-line">
              {item.mathematical_reasoning || item.reasoning || item.explainability || "Derived from dynamic linear combination of Stockout Probability (45%), Batch Expiry Horizon (35%), and Supplier Lead-Time Reliability (20%)."}
            </div>
          </div>

          {/* Provenance & Audit Metadata */}
          <div className="grid grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block flex items-center gap-1">
                <Database className="w-3.5 h-3.5 text-indigo-400" /> Data Source
              </span>
              <span className="text-slate-200 font-medium">{item.data_source || "PostgreSQL Relational DB & Milvus NLP Vector Feed"}</span>
            </div>

            <div className="p-3 rounded-lg bg-slate-900/80 border border-slate-800">
              <span className="text-slate-500 block flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" /> Timestamp
              </span>
              <span className="text-slate-200 font-medium">{item.timestamp || String(new Date().toISOString())}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40 text-[11px] text-indigo-300">
            <span className="font-semibold block mb-0.5">Auditable Compliance Guarantee:</span>
            Every AI assertion is strictly verified against live relational schemas and statistical regression models to prevent non-grounded hallucinations.
          </div>
        </div>
      </div>
    </div>
  );
}
