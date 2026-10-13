"use client";

import React from "react";
import {
  AlertTriangle,
  Flame,
  Radio,
  Search,
  PlusCircle,
  FileText,
  ShieldCheck,
  Bell,
  RefreshCw,
  Zap,
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
}: TopHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/90 px-6 py-3.5">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: Global Search & Critical Badges */}
        <div className="flex items-center gap-3 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search medicines, SKU codes, categories, batches, or hospitals..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            title="Refresh Telemetry"
            className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all flex items-center justify-center shrink-0"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-sky-600" : ""}`} />
          </button>
        </div>

        {/* Right: Critical Top-Bar Notifications & Actions */}
        <div className="flex items-center flex-wrap gap-2.5">
          {/* Surface Critical Stock-Out Information */}
          <div
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${
              criticalStockCount > 0
                ? "bg-rose-50 border-rose-200 text-rose-800 shadow-xs"
                : "bg-emerald-50 border-emerald-200 text-emerald-800"
            }`}
          >
            <AlertTriangle
              className={`w-3.5 h-3.5 ${
                criticalStockCount > 0 ? "text-rose-600 animate-pulse" : "text-emerald-600"
              }`}
            />
            <span>
              {criticalStockCount > 0
                ? `${criticalStockCount} Critical Deficits Impending`
                : "All Safety Buffers Nominal"}
            </span>
          </div>

          {/* Emergency Surge Mode Status & Toggle */}
          <button
            onClick={onToggleEmergency}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isEmergencyActive
                ? "bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-600/20 animate-pulse"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <Flame
              className={`w-3.5 h-3.5 ${
                isEmergencyActive ? "text-white" : "text-amber-500"
              }`}
            />
            <span>
              {isEmergencyActive ? "Emergency Surge: 2.5x Buffers" : "Toggle Surge Buffer"}
            </span>
          </button>

          {/* Ingest Public Health Bulletin (NLP Pipeline) */}
          <button
            onClick={onOpenHealthModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 text-xs font-semibold transition-all"
          >
            <FileText className="w-3.5 h-3.5 text-sky-600" />
            <span>+ Ingest Health Signal</span>
          </button>

          {/* Real-time SSE / WS Status Pill */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] font-medium text-slate-600">
            <Radio
              className={`w-3.5 h-3.5 ${
                sseConnected ? "text-emerald-500 animate-pulse" : "text-amber-500"
              }`}
            />
            <span className="hidden sm:inline">
              {sseConnected ? "SSE Zero-Latency Live" : "Stream Connecting"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
