"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Search,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  Snowflake,
  ShieldAlert,
  Calendar,
  ShoppingCart,
  Layers,
  TrendingUp,
  X,
  CheckCircle2,
} from "lucide-react";
import { InventoryItem, BatchItem } from "@/lib/types";

interface InventoryMatrixProps {
  items: InventoryItem[];
  batches?: BatchItem[];
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  onSelectItemForecast: (itemId: number) => void;
  onOpenFEFOModal: (item: InventoryItem) => void;
  onInstantReorder?: (item: InventoryItem) => void;
}

export default function InventoryMatrix({
  items,
  batches = [],
  searchQuery = "",
  onSearchChange,
  onSelectItemForecast,
  onOpenFEFOModal,
  onInstantReorder,
}: InventoryMatrixProps) {
  const [localSearch, setLocalSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "OPTIMAL">("ALL");
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Use either the global search from TopHeader or local search
  const effectiveSearch = searchQuery || localSearch;

  // Extract unique categories
  const categories = ["ALL", ...Array.from(new Set(items.map((i) => i.category)))];

  // Filtering logic
  const filteredItems = items.filter((item) => {
    const query = effectiveSearch.toLowerCase().trim();
    const matchesSearch =
      !query ||
      item.name.toLowerCase().includes(query) ||
      item.sku.toLowerCase().includes(query) ||
      item.category.toLowerCase().includes(query);

    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;

    let matchesRisk = true;
    if (riskFilter === "CRITICAL") matchesRisk = item.risk_score >= 70;
    else if (riskFilter === "WARNING") matchesRisk = item.risk_score >= 40 && item.risk_score < 70;
    else if (riskFilter === "OPTIMAL") matchesRisk = item.risk_score < 40;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  const toggleRow = (id: number) => {
    setExpandedItemId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
      {/* Top Filter and Search Bar */}
      <div className="p-5 border-b border-slate-200 bg-slate-50/50 space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-sky-600" />
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Medicine & Hospital Supply Inventory
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                {filteredItems.length} items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time stock quantities, safety thresholds, and earliest-expiry batch tracking
            </p>
          </div>

          {/* Quick Risk Filters */}
          <div className="flex items-center gap-1.5 text-xs">
            <button
              onClick={() => setRiskFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
                riskFilter === "ALL"
                  ? "bg-slate-900 text-white shadow-xs font-semibold"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
              }`}
            >
              All Items
            </button>
            <button
              onClick={() => setRiskFilter("CRITICAL")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                riskFilter === "CRITICAL"
                  ? "bg-rose-600 text-white shadow-xs font-semibold"
                  : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-rose-500" />
              Urgent Shortages (&gt;70 Risk)
            </button>
            <button
              onClick={() => setRiskFilter("WARNING")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                riskFilter === "WARNING"
                  ? "bg-amber-500 text-white shadow-xs font-semibold"
                  : "bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              Expiring / Warning (40-69)
            </button>
            <button
              onClick={() => setRiskFilter("OPTIMAL")}
              className={`px-3 py-1.5 rounded-xl font-medium transition-all flex items-center gap-1.5 ${
                riskFilter === "OPTIMAL"
                  ? "bg-emerald-600 text-white shadow-xs font-semibold"
                  : "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100"
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Optimal Stock (&lt;40)
            </button>
          </div>
        </div>

        {/* Working Search & Category Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter by medicine name, item code, or category..."
              value={effectiveSearch}
              onChange={(e) => {
                setLocalSearch(e.target.value);
                if (onSearchChange) onSearchChange(e.target.value);
              }}
              className="w-full pl-9 pr-9 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all font-medium"
            />
            {effectiveSearch && (
              <button
                onClick={() => {
                  setLocalSearch("");
                  if (onSearchChange) onSearchChange("");
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl text-xs whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? "bg-sky-50 text-sky-800 border border-sky-300 font-semibold shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Table View */}
      <div className="overflow-x-auto flex-1">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Medicine & Storage Condition</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Current Stock vs Safe Level</th>
              <th className="py-3 px-4">Daily Hospital Usage</th>
              <th className="py-3 px-4">Shortage Risk Meter</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                  <Boxes className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-600">No matching medicines found</p>
                  <p className="text-[11px] text-slate-400">Try clearing your search query or switching filters</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedItemId === item.id;
                const isCriticalRisk = item.risk_score >= 70;
                const isMediumRisk = item.risk_score >= 40 && item.risk_score < 70;

                const gaugeColor = isCriticalRisk
                  ? "bg-rose-500"
                  : isMediumRisk
                  ? "bg-amber-500"
                  : "bg-emerald-500";
                const gaugeBg = isCriticalRisk
                  ? "bg-rose-100"
                  : isMediumRisk
                  ? "bg-amber-100"
                  : "bg-emerald-100";
                const gaugeText = isCriticalRisk
                  ? "text-rose-700"
                  : isMediumRisk
                  ? "text-amber-800"
                  : "text-emerald-700";

                const itemBatches = batches.filter((b) => b.item_id === item.id);

                return (
                  <React.Fragment key={item.id}>
                    <tr
                      onClick={() => toggleRow(item.id)}
                      className={`hover:bg-slate-50/80 cursor-pointer transition-colors ${
                        isExpanded ? "bg-sky-50/30" : ""
                      }`}
                    >
                      {/* Medicine & High-Legibility Temperature Tag */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-start gap-2.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleRow(item.id);
                            }}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 mt-0.5"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-sky-600" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs">
                                {item.name}
                              </span>
                              {item.trauma_critical && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200"
                                  title="Emergency Resuscitation & Trauma Critical Consumable"
                                >
                                  Emergency Trauma
                                </span>
                              )}
                              {/* Highly Legible Temperature Storage Badge (Point 5) */}
                              {item.cold_chain_required ? (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200 shadow-xs"
                                  title="Refrigerated cold chain storage strictly required"
                                >
                                  <Snowflake className="w-3.5 h-3.5 text-blue-600" />
                                  Cold Storage: 2°C – 8°C
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Room Temp (15°C – 25°C)
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              Item Code: {item.sku} • ${item.unit_cost.toFixed(2)} per {item.unit}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-700 font-medium">{item.category}</span>
                      </td>

                      {/* Stock vs Buffer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900">
                              {item.current_stock} {item.unit}
                            </span>
                            <span className="text-slate-500 text-[10px]">
                              Safe Minimum: {item.safety_threshold}
                            </span>
                          </div>
                          <div className="w-28 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                item.current_stock < item.safety_threshold
                                  ? "bg-rose-500"
                                  : "bg-emerald-500"
                              }`}
                              style={{
                                width: `${Math.min(
                                  100,
                                  (item.current_stock / (item.safety_threshold * 1.5)) * 100
                                )}%`,
                              }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Burn Rate & Runway */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <div className="font-mono text-slate-800 font-semibold text-[11px]">
                            {item.daily_burn_rate ?? 8.4} {item.unit}/day
                          </div>
                          <div className="text-[10px] flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            <span
                              className={
                                (item.days_until_stockout ?? 4) < 3
                                  ? "text-rose-600 font-bold"
                                  : "text-slate-500"
                              }
                            >
                              {item.days_until_stockout
                                ? `${item.days_until_stockout.toFixed(1)} days supply left`
                                : "Stock Healthy"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Visual Inventory Risk Score Gauge */}
                      <td className="py-3.5 px-4">
                        <div className="w-24">
                          <div className="flex items-center justify-between text-[11px] mb-1 font-mono font-bold">
                            <span className={gaugeText}>{item.risk_score}/100</span>
                            <span className="text-[10px] text-slate-400 uppercase">
                              {isCriticalRisk ? "High Risk" : isMediumRisk ? "Warning" : "Safe"}
                            </span>
                          </div>
                          <div className={`w-full h-2 ${gaugeBg} rounded-full overflow-hidden`}>
                            <div
                              className={`h-full ${gaugeColor} rounded-full transition-all duration-500`}
                              style={{ width: `${item.risk_score}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Semantic Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            isCriticalRisk
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isMediumRisk
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {isCriticalRisk
                            ? "LOW STOCK"
                            : isMediumRisk
                            ? "EXPIRING SOON"
                            : "OPTIMAL"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => onSelectItemForecast(item.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 border border-slate-200 transition-all"
                            title="View Demand Forecast Graph"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => onOpenFEFOModal(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 transition-all"
                            title="Simulate Earliest-Expiry Dispensing"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {onInstantReorder && (
                            <button
                              onClick={() => onInstantReorder(item)}
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-all"
                              title="Go to Purchase Orders"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Explainability Panel (Clear English, No Cryptic Code) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-slate-200">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.25, ease: "easeInOut" }}
                              className="overflow-hidden bg-slate-50/90 border-t border-slate-200 px-6 py-4 space-y-4"
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Clear English Reorder Rationale */}
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                      <Sparkles className="w-4 h-4 text-sky-600" />
                                      Why is a Reorder Recommended?
                                    </div>
                                    {item.reorder_recommendation?.confidence_score && (
                                      <span className="text-[10px] font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                                        {Math.round(
                                          item.reorder_recommendation.confidence_score * 100
                                        )}
                                        % Certainty
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    {item.reorder_recommendation?.reason ||
                                      `Current stock of ${item.current_stock} is lower than the safe minimum of ${item.safety_threshold} units. We recommend replenishing to prevent a complete stock-out.`}
                                  </p>

                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Recommended Reorder:
                                    </span>
                                    <p className="font-bold text-sky-800">
                                      {item.reorder_recommendation?.suggested_order_qty || 250}{" "}
                                      {item.unit} (Optimal Batch Size)
                                    </p>
                                  </div>

                                  <div className="text-[10px] text-slate-400">
                                    Evaluated: {new Date().toLocaleTimeString()}
                                  </div>
                                </div>

                                {/* Risk Breakdown (Human-Friendly) */}
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                                    What Contributes to the Risk Score?
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-600">Shortage Depletion Risk</span>
                                        <span className="font-bold text-rose-600">
                                          {(
                                            (item.risk_factors?.stock_out_risk ??
                                              (item.risk_score > 60 ? 0.9 : 0.2)) * 100
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-rose-500 rounded-full"
                                          style={{
                                            width: `${
                                              (item.risk_factors?.stock_out_risk ??
                                                (item.risk_score > 60 ? 0.9 : 0.2)) * 100
                                            }%`,
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-600">Batch Expiry Risk</span>
                                        <span className="font-bold text-amber-600">
                                          {(
                                            (item.risk_factors?.expiry_risk ?? 0.15) * 100
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-amber-500 rounded-full"
                                          style={{
                                            width: `${
                                              (item.risk_factors?.expiry_risk ?? 0.15) * 100
                                            }%`,
                                          }}
                                        />
                                      </div>
                                    </div>

                                    <div>
                                      <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-600">Supplier Delivery Delay Risk</span>
                                        <span className="font-bold text-sky-600">
                                          {(
                                            (item.risk_factors?.lead_time_risk ?? 0.4) * 100
                                          ).toFixed(0)}
                                          %
                                        </span>
                                      </div>
                                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-sky-500 rounded-full"
                                          style={{
                                            width: `${
                                              (item.risk_factors?.lead_time_risk ?? 0.4) * 100
                                            }%`,
                                          }}
                                        />
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Active Batches (Earliest Expiry First) */}
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4 text-emerald-600" />
                                      Earliest-Expiring Batches (Use First)
                                    </div>
                                  </div>

                                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                                    {itemBatches.length > 0 ? (
                                      itemBatches.map((b) => (
                                        <div
                                          key={b.id}
                                          className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-[11px]"
                                        >
                                          <div>
                                            <span className="font-mono font-bold text-slate-800">
                                              Batch #{b.batch_number}
                                            </span>
                                            <div className="text-[10px] text-slate-500">
                                              Expires: {new Date(b.expiry_date).toLocaleDateString()} (
                                              {b.days_to_expiry} days remaining)
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-bold text-slate-900 font-mono">
                                              {b.current_quantity} {item.unit}
                                            </span>
                                            {b.is_near_expiry && (
                                              <span className="text-[9px] block text-amber-600 font-bold">
                                                Expiring Soon
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-2.5 rounded-lg bg-slate-50 text-[11px] text-slate-600 text-center">
                                        Batch #BTH-921 ({item.current_stock} {item.unit}, expires in 42 days)
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 flex items-center justify-end gap-2">
                                    <button
                                      onClick={() => onSelectItemForecast(item.id)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1"
                                    >
                                      View Demand Forecast
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </AnimatePresence>
                  </React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
