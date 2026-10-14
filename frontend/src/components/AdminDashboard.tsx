"use client";

import React from "react";
import {
  AlertTriangle,
  Bed,
  ShieldCheck,
  TrendingUp,
  Activity,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Sparkles,
  Ambulance,
} from "lucide-react";

interface AdminDashboardProps {
  summary: any;
  hospitals: any[];
  alerts: any[];
  anomalies: any[];
  onOpenExplain: (item: any) => void;
  onOpenEmergency: () => void;
  onSelectItemForecast: (itemId: number) => void;
}

export default function AdminDashboard({
  summary,
  hospitals,
  alerts,
  anomalies,
  onOpenExplain,
  onOpenEmergency,
  onSelectItemForecast,
}: AdminDashboardProps) {
  // Aggregate network bed statistics
  const totalBeds = hospitals.reduce((acc, h) => acc + (h.total_beds || 0), 0);
  const availBeds = hospitals.reduce((acc, h) => acc + (h.available_beds || 0), 0);
  const occBeds = totalBeds - availBeds;
  const overallOccupancy = totalBeds > 0 ? Math.round((occBeds / totalBeds) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Stockout Alerts */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Stockout Risk Alerts</span>
            <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summary ? summary.critical_low_count + summary.out_of_stock_count : 0}
            </span>
            <span className="text-xs text-rose-400 font-medium">Critical Deficit</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {summary?.out_of_stock_count || 0} zero stock, {summary?.critical_low_count || 0} below safety buffer
          </p>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-rose-500/5 rounded-full blur-xl pointer-events-none" />
        </div>

        {/* Metric 2: Network Bed Occupancy */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Regional Bed Occupancy</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Bed className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">{overallOccupancy}%</span>
            <span className="text-xs text-cyan-300 font-medium">
              {availBeds} of {totalBeds} Free
            </span>
          </div>
          {/* Mini progress bar */}
          <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                overallOccupancy > 85 ? "bg-rose-500" : overallOccupancy > 70 ? "bg-amber-400" : "bg-cyan-400"
              }`}
              style={{ width: `${overallOccupancy}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Composite Risk Index */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Composite Risk Index</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              {summary ? summary.network_composite_risk_index : 0}
              <span className="text-base text-slate-400 font-normal">/100</span>
            </span>
            <span className="text-xs text-amber-400 font-medium">Moderate Exposure</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">Weighted stockout, expiry, & lead-time index</p>
        </div>

        {/* Metric 4: Total Inventory Valuation */}
        <div className="glass-panel p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Monitored Stock Valuation</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white">
              ${summary ? summary.total_stock_valuation?.toLocaleString() : "0"}
            </span>
            <span className="text-xs text-emerald-400 font-medium">{summary?.total_catalog_items || 0} SKUs</span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {summary?.batches_expiring_90d || 0} batches expiring in &lt;90 days
          </p>
        </div>
      </div>

      {/* Main Grid: Bed Matrix & Epidemic Surveillance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Hospital Bed Availability Cards */}
        <div className="lg:col-span-2 glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Bed className="w-4 h-4 text-cyan-400" />
                Regional Hospital Bed Readiness & Surge Matrix
              </h2>
              <p className="text-xs text-slate-400">
                Live capacity across Level-1 trauma centres and specialty district hospitals
              </p>
            </div>
            <button
              onClick={onOpenEmergency}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 text-xs font-medium transition-all"
            >
              <Ambulance className="w-3.5 h-3.5" />
              <span>Spatial Triage</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {hospitals.map((h) => {
              const traumaBed = h.beds?.find((b: any) => b.bed_type.toLowerCase() === "trauma");
              const icuBed = h.beds?.find((b: any) => b.bed_type.toLowerCase() === "icu");
              const occPct = h.total_beds > 0 ? Math.round(((h.total_beds - h.available_beds) / h.total_beds) * 100) : 0;

              return (
                <div
                  key={h.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-100">{h.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 border border-slate-700 font-mono">
                          {h.trauma_level}
                        </span>
                        <span className="text-xs text-slate-400">• {h.zone} Zone</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{h.address}</p>
                    </div>

                    <div className="flex items-center gap-4 text-xs font-mono">
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Trauma Beds</span>
                        <span className="font-bold text-rose-400">
                          {traumaBed?.available_beds ?? 0}
                          <span className="text-slate-500 font-normal">/{traumaBed?.total_capacity ?? 0}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Intensive care beds</span>
                        <span className="font-bold text-cyan-400">
                          {icuBed?.available_beds ?? 0}
                          <span className="text-slate-500 font-normal">/{icuBed?.total_capacity ?? 0}</span>
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block text-[10px]">Total Free</span>
                        <span className="font-bold text-emerald-400">
                          {h.available_beds}
                          <span className="text-slate-500 font-normal">/{h.total_beds}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Occupancy bar */}
                  <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          occPct > 85 ? "bg-rose-500" : occPct > 70 ? "bg-amber-400" : "bg-emerald-400"
                        }`}
                        style={{ width: `${occPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] font-mono text-slate-400 min-w-10 text-right">{occPct}% Occ</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* AI Public Health Preparedness Alerts & Surveillance */}
        <div className="glass-panel p-6 space-y-4 flex flex-col">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              Proactive AI Preparedness Alerts
            </h2>
            <p className="text-xs text-slate-400">
              Cross-referenced from Milvus NLP external disease surveillance
            </p>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px]">
            {alerts && alerts.length > 0 ? (
              alerts.map((alt) => (
                <div
                  key={alt.id}
                  className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800/90 space-y-2 hover:border-indigo-500/40 transition-all"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold text-slate-200 leading-snug">{alt.title}</span>
                    <span
                      className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${
                        alt.severity === "CRITICAL"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : "bg-amber-950 text-amber-300 border border-amber-800"
                      }`}
                    >
                      {alt.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed">{alt.recommended_action}</p>

                  <div className="p-2 rounded bg-slate-950/60 border border-slate-800/60 text-[11px] text-slate-400 font-mono">
                    <span className="text-indigo-400 font-medium block">Mathematical Reasoning:</span>
                    {alt.mathematical_reasoning}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                    <span>Source: {alt.data_source}</span>
                    <button
                      onClick={() => onOpenExplain(alt)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                    >
                      Inspect Audit Trail <ArrowUpRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active epidemic advisories. All regional disease signals normal.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Consumption Anomalies Strip */}
      {anomalies && anomalies.length > 0 && (
        <div className="glass-panel p-5 border-amber-500/20 bg-amber-950/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-white">Statistical Consumption Anomalies Flagged for Review</h3>
            </div>
            <span className="text-xs text-amber-300 font-mono">Z-Score Spike Detection</span>
          </div>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {anomalies.map((anom) => (
              <div
                key={anom.id || anom.item_id}
                className="p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-xs space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">{anom.item_name}</span>
                  <span className="font-mono text-amber-400 font-bold">
                    Z={anom.z_score > 0 ? `+${anom.z_score}` : anom.z_score} ({anom.deviation_pct > 0 ? `+${anom.deviation_pct}%` : `${anom.deviation_pct}%`})
                  </span>
                </div>
                <p className="text-slate-400 text-[11px]">{anom.flagged_reason}</p>
                <div className="flex items-center justify-between pt-1 text-[10px] text-slate-500 font-mono">
                  <span>Actual: {anom.consumption_value} | Baseline: {anom.expected_baseline}</span>
                  <button
                    onClick={() => onSelectItemForecast(anom.item_id)}
                    className="text-cyan-400 hover:text-cyan-300"
                  >
                    View Forecast Projection
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
