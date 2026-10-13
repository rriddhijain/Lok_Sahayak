"use client";

import React, { useState } from "react";
import {
  Package,
  Search,
  Filter,
  AlertTriangle,
  Clock,
  TrendingDown,
  Layers,
  Sparkles,
  ArrowRight,
  PlusCircle,
  MinusCircle,
  Calendar,
} from "lucide-react";

interface InventoryDashboardProps {
  items: any[];
  batches: any[];
  onSelectItemForecast: (itemId: number) => void;
  onOpenFEFOModal: (item: any) => void;
  onOpenAdjustStock: (batch: any) => void;
  onOpenExplain: (item: any) => void;
}

export default function InventoryDashboard({
  items,
  batches,
  onSelectItemForecast,
  onOpenFEFOModal,
  onOpenAdjustStock,
  onOpenExplain,
}: InventoryDashboardProps) {
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [selectedRisk, setSelectedRisk] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"items" | "batches">("items");

  const categories = ["ALL", "Trauma Supplies", "IV Fluids", "Antibiotics", "Analgesics & Narcotics", "Respiratory", "Blood Bank Supplies"];
  const riskLevels = ["ALL", "HIGH", "ELEVATED", "MODERATE", "LOW"];

  const filteredItems = items.filter((it) => {
    const matchCat = selectedCategory === "ALL" || it.category === selectedCategory;
    const matchRisk = selectedRisk === "ALL" || it.risk_level === selectedRisk;
    const matchSearch =
      !searchQuery ||
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.item_code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCat && matchRisk && matchSearch;
  });

  const filteredBatches = batches.filter((b) => {
    const matchSearch =
      !searchQuery ||
      b.batch_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (b.item_name && b.item_name.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      {/* Controls & Search Header */}
      <div className="glass-panel p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Sub tabs: Items vs Batches */}
          <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
            <button
              onClick={() => setActiveTab("items")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "items"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Pharmaceutical & Trauma Items ({items.length})
            </button>
            <button
              onClick={() => setActiveTab("batches")}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "batches"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              FEFO Expiry Tracker ({batches.length} Batches)
            </button>
          </div>

          {/* Search Bar */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by medicine name, code, batch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>
        </div>

        {/* Filter Pills */}
        {activeTab === "items" && (
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-800/60 text-xs">
            <span className="text-slate-400 text-[11px] font-medium mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3 text-cyan-400" /> Category:
            </span>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedCategory(c)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  selectedCategory === c
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40"
                    : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200"
                }`}
              >
                {c}
              </button>
            ))}

            <div className="h-4 w-px bg-slate-800 mx-2 hidden lg:block" />

            <span className="text-slate-400 text-[11px] font-medium mr-1 hidden lg:inline">Risk:</span>
            {riskLevels.map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRisk(r)}
                className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                  selectedRisk === r
                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/40"
                    : "bg-slate-900/80 text-slate-400 border border-slate-800 hover:text-slate-200"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* View 1: Items Inventory Grid */}
      {activeTab === "items" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const stockDeficit = item.current_stock < item.safety_stock_threshold;
            const daysLeft = item.days_of_stock_left || 0;

            // Risk badge styles
            let badgeClass = "badge-safe";
            if (item.risk_level === "HIGH") badgeClass = "badge-critical";
            else if (item.risk_level === "ELEVATED") badgeClass = "badge-warning";
            else if (item.risk_level === "MODERATE") badgeClass = "badge-info";

            return (
              <div
                key={item.id}
                className="glass-panel p-5 space-y-4 hover:border-slate-700 transition-all flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-mono text-cyan-400">{item.item_code}</span>
                      <h3 className="font-bold text-sm text-white leading-snug">{item.name}</h3>
                      <span className="text-xs text-slate-400">{item.category}</span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${badgeClass}`}>
                        {item.risk_level} RISK
                      </span>
                      <span className="block text-xs font-mono font-bold text-slate-300 mt-1">
                        {item.composite_risk_score}
                        <span className="text-[10px] text-slate-500 font-normal">/100</span>
                      </span>
                    </div>
                  </div>

                  {item.is_trauma_critical && (
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/60 border border-rose-800/60 text-[10px] text-rose-300 font-medium">
                      <AlertTriangle className="w-3 h-3 text-rose-400" /> Trauma Critical SKU
                    </div>
                  )}

                  {/* Stock Level Bar */}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-slate-400">Current Stock</span>
                      <span className={`font-bold ${stockDeficit ? "text-rose-400" : "text-emerald-400"}`}>
                        {item.current_stock} {item.unit}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          item.current_stock <= 0
                            ? "bg-rose-600"
                            : stockDeficit
                            ? "bg-amber-400"
                            : "bg-cyan-400"
                        }`}
                        style={{
                          width: `${Math.min(100, (item.current_stock / (item.safety_stock_threshold * 2)) * 100)}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>Safety Buffer: {item.safety_stock_threshold}</span>
                      <span>Runway: ~{daysLeft.toFixed(1)} days</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 text-xs">
                  <button
                    onClick={() => onSelectItemForecast(item.id)}
                    className="flex-1 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-cyan-500/50 text-cyan-300 hover:text-cyan-200 transition-colors text-center font-medium"
                  >
                    AI Forecast
                  </button>

                  <button
                    onClick={() => onOpenFEFOModal(item)}
                    className="flex-1 py-1.5 rounded-lg bg-indigo-600/20 border border-indigo-500/40 hover:bg-indigo-600/30 text-indigo-300 transition-colors text-center font-medium"
                  >
                    FEFO Dispense
                  </button>

                  <button
                    onClick={() => onOpenExplain(item)}
                    title="Audit Risk Formula"
                    className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* View 2: FEFO Expiry Batch Tracker */
        <div className="glass-panel p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-cyan-400" />
                First-Expired, First-Out (FEFO) Batch Pipeline
              </h3>
              <p className="text-xs text-slate-400">
                Sorted by expiry date ascending. Earliest batches must be dispensed first to prevent drug obsolescence.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-mono">
                <tr>
                  <th className="pb-3">Batch Number</th>
                  <th className="pb-3">Item / Consumable</th>
                  <th className="pb-3">Remaining Qty</th>
                  <th className="pb-3">Expiry Date</th>
                  <th className="pb-3">Days Remaining</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {filteredBatches.map((b) => {
                  let badge = "badge-safe";
                  if (b.status === "EXPIRED") badge = "badge-critical";
                  else if (b.status?.includes("<30d")) badge = "badge-critical";
                  else if (b.status?.includes("<90d")) badge = "badge-warning";

                  return (
                    <tr key={b.id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-3 font-semibold text-slate-200">{b.batch_number}</td>
                      <td className="py-3 text-white font-sans font-medium">{b.item_name}</td>
                      <td className="py-3 font-bold text-cyan-300">{b.remaining_quantity} units</td>
                      <td className="py-3 text-slate-400">{b.expiry_date ? String(b.expiry_date).split("T")[0] : ""}</td>
                      <td className="py-3">
                        <span
                          className={`font-bold ${
                            b.days_to_expiry <= 0
                              ? "text-rose-400"
                              : b.days_to_expiry <= 30
                              ? "text-rose-400"
                              : b.days_to_expiry <= 90
                              ? "text-amber-400"
                              : "text-emerald-400"
                          }`}
                        >
                          {b.days_to_expiry <= 0 ? "EXPIRED" : `${b.days_to_expiry} days`}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${badge}`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => onOpenAdjustStock(b)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-sans font-medium transition-colors"
                        >
                          Record Usage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
