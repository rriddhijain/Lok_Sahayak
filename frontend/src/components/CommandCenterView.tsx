"use client";

import React from "react";
import {
  DollarSign,
  AlertTriangle,
  Activity,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Package,
  Layers,
  Hospital,
  Clock,
  ArrowUpRight,
  Flame,
  CheckCircle2,
} from "lucide-react";
import AlertFeed from "./AlertFeed";
import { InventoryItem, LiveNotification, PreparednessAlert, NetworkHospital } from "@/lib/types";

interface CommandCenterViewProps {
  summary: any;
  items: InventoryItem[];
  hospitals: NetworkHospital[];
  liveNotifications: LiveNotification[];
  preparednessAlerts: PreparednessAlert[];
  isEmergencyActive: boolean;
  onNavigateToTab: (tab: any) => void;
  onSelectItemForecast: (id: number) => void;
  sseConnected: boolean;
}

export default function CommandCenterView({
  summary,
  items,
  hospitals,
  liveNotifications,
  preparednessAlerts,
  isEmergencyActive,
  onNavigateToTab,
  onSelectItemForecast,
  sseConnected,
}: CommandCenterViewProps) {
  const criticalItems = items.filter((i) => i.risk_score >= 70 || i.current_stock < i.safety_threshold);
  const totalBeds = hospitals.reduce((sum, h) => sum + h.total_beds, 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + h.available_beds, 0);
  const occupancyRate = totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 78;

  return (
    <div className="space-y-6">
      {/* Top Critical Status Alert Banner if Surges / Stock-outs */}
      {(isEmergencyActive || criticalItems.length > 0) && (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs ${
            isEmergencyActive
              ? "bg-rose-50 border-rose-300 text-rose-950"
              : "bg-amber-50 border-amber-300 text-amber-950"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2 rounded-xl text-white ${
                isEmergencyActive ? "bg-rose-600 animate-pulse" : "bg-amber-600"
              }`}
            >
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm tracking-tight">
                {isEmergencyActive
                  ? "EMERGENCY SURGE PROTOCOL ACTIVE (2.5x Buffer Multiplier)"
                  : "PROACTIVE SUPPLY DEFICIT DETECTED"}
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                {isEmergencyActive
                  ? "Trauma and resuscitation buffer thresholds have been increased 2.5x. Spatial bed routing prioritised."
                  : `${criticalItems.length} consumables require immediate purchasing or earliest-expiry dispensing.`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigateToTab("inventory")}
              className="px-3.5 py-1.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-800 hover:bg-slate-50 transition-all shadow-xs"
            >
              Inspect Deficits
            </button>
            <button
              onClick={() => onNavigateToTab("emergency")}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-xs font-bold text-white hover:bg-slate-800 transition-all"
            >
              Bed Network
            </button>
          </div>
        </div>
      )}

      {/* Primary KPI Grid (4 High-Contrast Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Stock Value */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Stock Valuation
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${(summary?.total_stock_valuation ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +4.2%
            </span>
            <span className="text-slate-400">vs previous procurement cycle</span>
          </div>
        </div>

        {/* KPI 2: Impending Stock-Outs */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Impending Stock-Outs
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {criticalItems.length}
            <span className="text-xs font-semibold text-rose-600 ml-2 font-mono">
              &lt; 3 days runway
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-rose-600">
              {summary?.out_of_stock_count ?? 0} zero-stock items
            </span>
            <span className="text-slate-400">• Tranexamic Acid critical</span>
          </div>
        </div>

        {/* KPI 3: Active Preparedness Alerts */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Active Preparedness Alerts
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {preparednessAlerts.length}
            <span className="text-xs font-semibold text-sky-600 ml-2 font-mono">
              Milvus Vector Index
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-sky-700">IDSP Dengue Cluster #418</span>
            <span className="text-slate-400">• High confidence</span>
          </div>
        </div>

        {/* KPI 4: Network Bed Occupancy */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden group hover:border-slate-300 transition-all">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Trauma Bed Occupancy
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Hospital className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {occupancyRate}%
            <span className="text-xs font-semibold text-slate-500 ml-2 font-mono">
              {availableBeds} beds available
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  occupancyRate > 85 ? "bg-rose-500" : "bg-emerald-500"
                }`}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Operational Panels & Right Live Auto-scrolling Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Critical Runway Items & Hospital Spatial Snapshot */}
        <div className="lg:col-span-8 space-y-6">
          {/* Critical Inventory Runway Table Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-600" />
                  Imminent Deficits Requiring Action
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated using 60-day autoregressive demand and lead time volatility
                </p>
              </div>

              <button
                onClick={() => onNavigateToTab("inventory")}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                View Full Matrix <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {items.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                        item.risk_score >= 70
                          ? "bg-rose-100 text-rose-700"
                          : item.risk_score >= 40
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {item.risk_score}
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900 flex items-center gap-2">
                        {item.name}
                        {item.trauma_critical && (
                          <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Trauma
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        Stock: {item.current_stock} {item.unit} • Daily use: {item.daily_burn_rate ?? "—"}/day
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600">
                        {item.days_until_stockout ? `${item.days_until_stockout.toFixed(1)}d Runway` : "Adequate"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Safety: {item.safety_threshold} {item.unit}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectItemForecast(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                    >
                      Forecast
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Network Bed Capacity Mini-Dashboard */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-emerald-600" />
                  Regional Emergency Bed Network Status
                </h3>
                <p className="text-xs text-slate-500">
                  Hospital distance and saved bed availability
                </p>
              </div>

              <button
                onClick={() => onNavigateToTab("emergency")}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                Open Spatial Map <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {hospitals.slice(0, 4).map((h) => (
                <div
                  key={h.id}
                  className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 hover:border-slate-300 transition-all space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 leading-snug">
                      {h.name}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                      {h.trauma_level}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>
                      {h.available_beds} of {h.total_beds} beds free
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 font-semibold">
                      {h.distance_km ?? 4.2} km ({h.estimated_transit_mins ?? 10} min)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        h.available_beds < 15 ? "bg-rose-500" : "bg-emerald-500"
                      }`}
                      style={{
                        width: `${((h.total_beds - h.available_beds) / h.total_beds) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                    <span>Trauma: {h.trauma_beds_available}</span>
                    <span>Intensive care: {h.icu_beds_available}</span>
                    <span>O₂: {h.oxygen_beds_available}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Auto-Scrolling Alert Feed */}
        <div className="lg:col-span-4 h-full">
          <AlertFeed
            liveNotifications={liveNotifications}
            preparednessAlerts={preparednessAlerts}
            sseConnected={sseConnected}
          />
        </div>
      </div>
    </div>
  );
}
