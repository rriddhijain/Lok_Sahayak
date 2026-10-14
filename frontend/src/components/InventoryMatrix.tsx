"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Boxes,
  Search,
  Filter,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Snowflake,
  ShieldAlert,
  Calendar,
  CheckCircle2,
  ExternalLink,
  ShoppingCart,
  Layers,
  ArrowUpRight,
  Info,
} from "lucide-react";
import { arrivalText } from "@/lib/roles";
import { InventoryItem, BatchItem } from "@/lib/types";

interface InventoryMatrixProps {
  allowForecast?: boolean;
  items: InventoryItem[];
  batches?: BatchItem[];
  onSelectItemForecast: (itemId: number) => void;
  onOpenFEFOModal: (item: InventoryItem) => void;
  onInstantReorder?: (item: InventoryItem) => void;
}

export default function InventoryMatrix({
  allowForecast = true,
  items,
  batches = [],
  onSelectItemForecast,
  onOpenFEFOModal,
  onInstantReorder,
}: InventoryMatrixProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState<"ALL" | "CRITICAL" | "WARNING" | "OPTIMAL">("ALL");
  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  // Extract unique categories
  const categories = ["ALL", ...Array.from(new Set(items.map((i) => i.category)))];

  // Filtering logic
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;

    let matchesRisk = true;
    if (riskFilter === "CRITICAL") matchesRisk = item.risk_score >= 70 || item.current_stock < item.safety_threshold;
    else if (riskFilter === "WARNING") matchesRisk = item.risk_score >= 40 && item.risk_score < 70 && item.current_stock >= item.safety_threshold;
    else if (riskFilter === "OPTIMAL") matchesRisk = item.risk_score < 40 && item.current_stock >= item.safety_threshold;

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
                Medicine Inventory
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-semibold">
                {filteredItems.length} items
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              View stock levels, storage temperatures, expiry dates, and reorder needs
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
              Critical Risk (&gt;70)
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
              Warning (40-69)
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
              Optimal (&lt;40)
            </button>
          </div>
        </div>

        {/* Search & Category Pills */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by medicine name, item code, or category..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white border border-slate-200 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-all"
            />
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
              <th className="py-3 px-4">Item & Clinical Profile</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Stock vs Buffer</th>
              <th className="py-3 px-4">Daily Use & Stock Remaining</th>
              <th className="py-3 px-4">Inventory Risk Score</th>
              <th className="py-3 px-4 text-center">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredItems.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400 space-y-2">
                  <Boxes className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
                  <p className="text-xs font-medium text-slate-600">No medical consumables found</p>
                  <p className="text-[11px] text-slate-400">Try adjusting your search query or risk filters</p>
                </td>
              </tr>
            ) : (
              filteredItems.map((item) => {
                const isExpanded = expandedItemId === item.id;
                const isCriticalRisk = item.risk_score >= 70 || item.current_stock < item.safety_threshold;
                const isMediumRisk = item.risk_score >= 40 && item.risk_score < 70;

                // Color tokens for risk gauge
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
                      {/* Item & Clinical Profile */}
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
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {item.name}
                              </span>
                              {item.trauma_critical && (
                                <span
                                  className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200"
                                  title="Level-1 Trauma Critical Resuscitation Item"
                                >
                                  Trauma
                                </span>
                              )}
                              {item.storage_temp_c != null && (
                                <span
                                  className="text-xs font-semibold px-2 py-1 rounded-md bg-sky-50 text-sky-900 border border-sky-200 flex items-center gap-1.5 whitespace-nowrap"
                                  title="Configured storage temperature in degrees Celsius"
                                >
                                  <Snowflake className="w-3.5 h-3.5" /> Store at {item.storage_temp_c} °C
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              {item.sku} • ${item.unit_cost.toFixed(2)}/{item.unit}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3.5 px-4">
                        <span className="text-slate-600 font-medium">{item.category}</span>
                      </td>

                      {/* Stock vs Buffer */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="font-bold text-slate-900">
                              {item.current_stock} {item.unit}
                            </span>
                            <span className="text-slate-400 text-[10px]">
                              Safe: {item.safety_threshold}
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

                      {/* Daily Use & Stock Remaining */}
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
                                ? `${item.days_until_stockout.toFixed(1)} days runway`
                                : "Nominal"}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Visual Inventory Risk Score Gauge */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 w-24">
                            <div className="flex items-center justify-between text-[11px] mb-1 font-mono font-bold">
                              <span className={gaugeText}>{item.risk_score}/100</span>
                              <span className="text-[10px] text-slate-400 uppercase">
                                {isCriticalRisk ? "High" : isMediumRisk ? "Med" : "Low"}
                              </span>
                            </div>
                            <div className={`w-full h-2 ${gaugeBg} rounded-full overflow-hidden`}>
                              <div
                                className={`h-full ${gaugeColor} rounded-full transition-all duration-500`}
                                style={{ width: `${item.risk_score}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Semantic Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            item.incoming_order ? "bg-sky-50 text-sky-800 border-sky-200" : isCriticalRisk
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : isMediumRisk
                              ? "bg-amber-50 text-amber-800 border-amber-200"
                              : "bg-emerald-50 text-emerald-800 border-emerald-200"
                          }`}
                        >
                          {item.incoming_order ? "ORDER APPROVED" : isCriticalRisk
                            ? "LOW STOCK"
                            : isMediumRisk
                            ? "EXPIRING/WARN"
                            : "OPTIMAL"}
                        </span>
                        {item.incoming_order && <div className="mt-2 space-y-1 text-xs normal-case text-sky-800"><p className="font-semibold">{arrivalText(item.incoming_order)}</p><p>{item.incoming_order.quantity} {item.unit} incoming · {new Date(item.incoming_order.expected_arrival_at).toLocaleDateString()}</p>{item.current_stock < item.safety_threshold && <p className="text-amber-700">Current stock remains below the safety level.</p>}</div>}
                      </td>

                      {/* Row Action Buttons */}
                      <td className="py-3.5 px-4 text-right">
                        <div
                          className="flex items-center justify-end gap-1.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {allowForecast && <button
                            onClick={() => onSelectItemForecast(item.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-sky-700 hover:bg-sky-50 border border-slate-200 transition-all"
                            title="View 30-Day ML Demand Forecast"
                          >
                            <TrendingUp className="w-3.5 h-3.5" />
                          </button>}

                          <button
                            onClick={() => onOpenFEFOModal(item)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-teal-700 hover:bg-teal-50 border border-slate-200 transition-all"
                            title="Preview dispensing Pick-List Allocation"
                          >
                            <Layers className="w-3.5 h-3.5" />
                          </button>

                          {onInstantReorder && (
                            <button
                              onClick={() => onInstantReorder(item)}
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-all"
                              title="Generate Purchase Order"
                            >
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* Expandable Explainability Panel (Framer Motion 60fps Micro-interaction) */}
                    <AnimatePresence>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="p-0 border-b border-slate-200">
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.28, ease: "easeInOut" }}
                              className="overflow-hidden bg-slate-50/90 border-t border-slate-200 px-6 py-4 space-y-4"
                            >
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                {/* Explainability Mathematical Formula Card */}
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
                                      <Sparkles className="w-4 h-4 text-sky-600" />
                                      Why stock needs attention
                                    </div>
                                    {item.reorder_recommendation?.confidence_score && (
                                      <span className="text-[10px] font-mono font-bold bg-sky-50 text-sky-700 px-2 py-0.5 rounded border border-sky-200">
                                        {Math.round(
                                          item.reorder_recommendation.confidence_score * 100
                                        )}
                                        % Certainty
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                                    {item.reorder_recommendation?.reason ||
                                      `Current stock: ${item.current_stock}. Safety threshold: ${item.safety_threshold}. Approved incoming orders are shown in the status column; procurement staff manage new purchases.`}
                                  </p>

                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 font-mono text-[11px] text-slate-800 space-y-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                      Formula Execution:
                                    </span>
                                    <code>
                                      {item.reorder_recommendation?.formula_used ||
                                        "Reorder level = delivery-period demand + adjusted safety stock"}
                                    </code>
                                  </div>

                                  <div className="text-[10px] font-mono text-slate-400">
                                    Calculated timestamp:{" "}
                                    {item.reorder_recommendation?.calculated_at
                                      ? new Date(
                                          item.reorder_recommendation.calculated_at
                                        ).toLocaleString()
                                      : new Date().toLocaleString()}
                                  </div>
                                </div>

                                {/* Composite Risk Factor Breakdown */}
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2.5">
                                  <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                                    Stock risk breakdown
                                  </div>

                                  <div className="space-y-2 text-xs">
                                    <div>
                                      <div className="flex justify-between text-[11px] mb-1">
                                        <span className="text-slate-600">Stock shortage risk</span>
                                        <span className="font-mono font-bold text-rose-600">
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
                                        <span className="text-slate-600">Expiry risk</span>
                                        <span className="font-mono font-bold text-amber-600">
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
                                        <span className="text-slate-600">Supplier delivery risk</span>
                                        <span className="font-mono font-bold text-sky-600">
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

                                {/* Active Batches & FEFO Order */}
                                <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-2">
                                  <div className="flex items-center justify-between text-xs font-bold text-slate-900">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4 text-emerald-600" />
                                      Batches by earliest expiry
                                    </div>
                                    <button
                                      onClick={() => onOpenFEFOModal(item)}
                                      className="text-[10px] text-sky-600 hover:underline font-semibold"
                                    >
                                      Preview dispensing
                                    </button>
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
                                              {b.batch_number}
                                            </span>
                                            <div className="text-[10px] text-slate-500">
                                              Exp: {new Date(b.expiry_date).toLocaleDateString()} (
                                              {b.days_to_expiry}d left)
                                            </div>
                                          </div>
                                          <div className="text-right">
                                            <span className="font-bold text-slate-900 font-mono">
                                              {b.current_quantity} {item.unit}
                                            </span>
                                            {b.is_near_expiry && (
                                              <span className="text-[9px] block text-amber-600 font-semibold">
                                                Expiring Soon
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div className="p-2 rounded-lg bg-slate-50 text-[11px] text-slate-500 text-center">
                                        No batches recorded
                                      </div>
                                    )}
                                  </div>

                                  <div className="pt-2 flex items-center justify-end gap-2">
                                    {allowForecast && <button
                                      onClick={() => onSelectItemForecast(item.id)}
                                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1"
                                    >
                                      Forecast View <ArrowUpRight className="w-3 h-3" />
                                    </button>}
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
