"use client";

import React from "react";
import {
  AlertTriangle,
  Flame,
  Search,
  PlusCircle,
  RefreshCw,
  X,
  CheckCircle2,
} from "lucide-react";

interface TopHeaderProps {
  criticalStockCount: number;
  isEmergencyActive: boolean;
  onToggleEmergency: () => void;
  onOpenHealthModal: () => void;
  sseConnected: boolean;
  searchQuery: string;
  onSearchChange: (val: string) => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
  currentRole: string;
}

export default function TopHeader({
  criticalStockCount,
  isEmergencyActive,
  onToggleEmergency,
  onOpenHealthModal,
  sseConnected,
  searchQuery,
  onSearchChange,
  onRefresh,
  isRefreshing = false,
  currentRole,
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        {/* Working Global Search Bar */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search any medicine, item code, category, batch, or hospital..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-200"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Data"
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
          </button>
        </div>

        {/* Clear, Functional Status Controls */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Critical Shortage Warning Banner */}
          {criticalStockCount > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 animate-pulse" />
              <span>{criticalStockCount} Low Stock Shortages</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Stock Buffers Healthy</span>
            </div>
          )}

          {/* Emergency Surge Mode Toggle with Plain-English Description */}
          <button
            onClick={onToggleEmergency}
            title={
              isEmergencyActive
                ? "Click to deactivate emergency surge mode and return to baseline stock levels"
                : "Click to activate emergency surge mode (increases safe stock minimum by 2.5x for disaster preparedness)"
            }
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
              isEmergencyActive
                ? "bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${isEmergencyActive ? "text-white" : "text-amber-500"}`} />
            <span>
              {isEmergencyActive ? "Emergency Surge Active (2.5x)" : "Emergency Surge Mode: Off"}
            </span>
          </button>

          {/* Add Health Alert / Disease Bulletin */}
          <button
            onClick={onOpenHealthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-all"
            title="Log a new disease outbreak or health alert"
          >
            <PlusCircle className="w-3.5 h-3.5 text-sky-600" />
            <span>+ Add Outbreak Alert</span>
          </button>
        </div>
      </div>
    </header>
  );
}
