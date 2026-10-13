"use client";

import React from "react";
import {
  DollarSign,
  AlertTriangle,
  Activity,
  TrendingUp,
  Package,
  Hospital,
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
  searchQuery?: string;
  currentRole: string;
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
  searchQuery = "",
  currentRole,
}: CommandCenterViewProps) {
  // Filter items if search query is present
  const filteredItems = searchQuery
    ? items.filter(
        (i) =>
          i.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
          i.sku.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : items;

  const criticalItems = filteredItems.filter((i) => i.risk_score >= 70);
  const totalBeds = hospitals.reduce((sum, h) => sum + h.total_beds, 0);
  const availableBeds = hospitals.reduce((sum, h) => sum + h.available_beds, 0);
  const occupancyRate = totalBeds > 0 ? Math.round(((totalBeds - availableBeds) / totalBeds) * 100) : 76;

  return (
    <div className="space-y-6">
      {/* Active Role Perspective Welcome Banner (Point 9) */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-700 border border-sky-200 flex items-center justify-center font-bold text-sm">
            {currentRole === "Hospital Administrator" ? "HA" : currentRole === "Inventory Manager" ? "IM" : "PO"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                Active Perspective
              </span>
              <h2 className="text-sm font-bold text-slate-900">{currentRole}</h2>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {currentRole === "Hospital Administrator" &&
                "Displaying macro hospital operations, emergency surge preparedness, and regional bed capacities."}
              {currentRole === "Inventory Manager" &&
                "Displaying stock runway alerts, earliest-expiring medicine batches, and consumption spikes."}
              {currentRole === "Procurement Officer" &&
                "Displaying automated replenishment purchase orders, supplier scorecards, and reorder approvals."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentRole !== "Hospital Administrator" && (
            <button
              onClick={() => onNavigateToTab(currentRole === "Inventory Manager" ? "inventory" : "procurement")}
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
            >
              Go to {currentRole === "Inventory Manager" ? "Medicines View" : "Purchase Orders"}
            </button>
          )}
        </div>
      </div>

      {/* Emergency Surge Alert Banner */}
      {isEmergencyActive && (
        <div className="p-4 rounded-2xl border border-rose-300 bg-rose-50 text-rose-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs animate-slide-in">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-rose-600 text-white animate-pulse">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-sm text-rose-900">
                EMERGENCY SURGE MODE ACTIVE (2.5x Stock Buffer Applied)
              </div>
              <p className="text-xs text-slate-600 mt-0.5">
                All trauma, resuscitation, and emergency medicine buffer minimums have been increased 2.5x for disaster preparedness.
              </p>
            </div>
          </div>

          <button
            onClick={() => onNavigateToTab("inventory")}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-rose-300 text-xs font-bold text-rose-900 hover:bg-rose-100 transition-all shadow-xs shrink-0"
          >
            Inspect Trauma Deficits
          </button>
        </div>
      )}

      {/* Primary KPI Grid (Clear, Human-Friendly Numbers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* KPI 1: Total Stock Value */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Total Stock Valuation
            </span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <DollarSign className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            ${(summary?.total_stock_valuation ?? 148520).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-emerald-600 flex items-center">
              <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +4.2%
            </span>
            <span className="text-slate-400">Total hospital inventory value</span>
          </div>
        </div>

        {/* KPI 2: Impending Shortages */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Low Stock Shortages
            </span>
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {criticalItems.length}
            <span className="text-xs font-semibold text-rose-600 ml-2 font-mono">
              Medicines Low
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-rose-600">
              &lt; 3 days supply left
            </span>
            <span className="text-slate-400">• Immediate reorder recommended</span>
          </div>
        </div>

        {/* KPI 3: Active Health Advisories */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Public Health Outbreaks
            </span>
            <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Activity className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {preparednessAlerts.length}
            <span className="text-xs font-semibold text-sky-600 ml-2 font-mono">
              Active Advisories
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <span className="font-bold text-sky-800">Dengue Cluster Reported</span>
            <span className="text-slate-400">• Increase IV fluids</span>
          </div>
        </div>

        {/* KPI 4: Hospital Bed Occupancy */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Network Bed Availability
            </span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <Hospital className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {availableBeds}
            <span className="text-xs font-semibold text-slate-500 ml-2 font-mono">
              of {totalBeds} beds open
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${occupancyRate > 85 ? "bg-rose-500" : "bg-emerald-500"}`}
                style={{ width: `${occupancyRate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Operational Panels & Right Live Alert Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): Shortage Items Table & Bed Capacity Overview */}
        <div className="lg:col-span-8 space-y-6">
          {/* Urgent Medicines Requiring Reorder */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Package className="w-4 h-4 text-rose-600" />
                  Medicines Approaching Stock Depletion
                </h3>
                <p className="text-xs text-slate-500">
                  Calculated based on daily hospital patient usage and supplier delivery lead time
                </p>
              </div>

              <button
                onClick={() => onNavigateToTab("inventory")}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                View All Medicines <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {filteredItems.slice(0, 4).map((item) => (
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
                          <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                            Emergency Trauma
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        Current: <strong className="text-slate-800">{item.current_stock} {item.unit}</strong> • Usage: {item.daily_burn_rate ?? 8.5} {item.unit}/day
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 self-end sm:self-auto">
                    <div className="text-right">
                      <div className="text-xs font-bold text-rose-600">
                        {item.days_until_stockout ? `${item.days_until_stockout.toFixed(1)} days supply left` : "Adequate"}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Safe Level: {item.safety_threshold} {item.unit}
                      </div>
                    </div>

                    <button
                      onClick={() => onSelectItemForecast(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all"
                    >
                      View Forecast
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Regional Hospital Bed Capacity Snapshot */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <Hospital className="w-4 h-4 text-emerald-600" />
                  Regional Hospital Bed Capacity
                </h3>
                <p className="text-xs text-slate-500">
                  Real-time bed availability and travel distance from your command center
                </p>
              </div>

              <button
                onClick={() => onNavigateToTab("emergency")}
                className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1"
              >
                Manage Beds & Transfers <ArrowUpRight className="w-3.5 h-3.5" />
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

                  <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                    <span>
                      {h.available_beds} of {h.total_beds} beds available
                    </span>
                    <span className="text-slate-500 text-[11px]">
                      {h.distance_km ?? 4.2} km (~{h.estimated_transit_mins ?? 10} mins)
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${h.available_beds < 15 ? "bg-rose-500" : "bg-emerald-500"}`}
                      style={{
                        width: `${((h.total_beds - h.available_beds) / h.total_beds) * 100}%`,
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 font-mono">
                    <span>Trauma: {h.trauma_beds_available}</span>
                    <span>ICU: {h.icu_beds_available}</span>
                    <span>Oxygen: {h.oxygen_beds_available}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (4 cols): Live Hospital Alerts Feed */}
        <div className="lg:col-span-4 h-full">
          <AlertFeed
            liveNotifications={liveNotifications}
            preparednessAlerts={preparednessAlerts}
            sseConnected={sseConnected}
            onNavigateToTab={onNavigateToTab}
            onSelectItemForecast={onSelectItemForecast}
          />
        </div>
      </div>
    </div>
  );
}
