"use client";

import React, { useState, useEffect } from "react";
import {
  TrendingUp,
  Sliders,
  Calendar,
  AlertTriangle,
  Info,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  ChevronDown,
} from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
} from "recharts";
import { InventoryItem, ForecastOverview } from "@/lib/types";
import { fetchItemForecast } from "@/lib/api";

interface ForecastingViewProps {
  items: InventoryItem[];
  selectedItemId?: number | null;
  onSelectItem?: (id: number) => void;
}

export default function ForecastingView({
  items,
  selectedItemId: propSelectedId,
  onSelectItem,
}: ForecastingViewProps) {
  const [selectedId, setSelectedId] = useState<number>(propSelectedId || (items[0]?.id ?? 1));
  const [confidenceLevel, setConfidenceLevel] = useState<"80" | "95">("80");
  const [horizon, setHorizon] = useState<number>(30);
  const [forecastData, setForecastData] = useState<ForecastOverview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (propSelectedId) {
      setSelectedId(propSelectedId);
    }
  }, [propSelectedId]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setForecastData(null); setError("");

    fetchItemForecast(selectedId, horizon)
      .then((data) => {
        if (isMounted) setForecastData(data);
      })
      .catch((err) => {
        if (isMounted) setError(err.message || "Unable to load forecast");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedId, horizon]);

  const selectedItem = items.find((i) => i.id === selectedId) || items[0];

  // Format Recharts data with confidence bounds
  const chartData = forecastData?.series.map((point) => {
    const isHistorical = point.historical_consumption !== undefined;
    const lower = confidenceLevel === "80" ? point.confidence_lower_80 : point.confidence_lower_95;
    const upper = confidenceLevel === "80" ? point.confidence_upper_80 : point.confidence_upper_95;

    return {
      date: point.date.slice(5), // MM-DD
      historical: point.historical_consumption,
      predicted: point.predicted_demand,
      // Confidence band bounds
      confidenceRange: isHistorical ? undefined : [lower, upper],
      lowerBound: lower,
      upperBound: upper,
      isHistorical,
    };
  }) || [];

  return (
    <div className="space-y-6">
      {error && <p role="alert" className="p-4 bg-rose-50 text-rose-800 rounded-xl">{error}</p>}
      <p className="text-xs text-slate-600">Forecast period: {horizon} days · {loading ? "Updating prediction…" : `${forecastData?.series.filter(p => p.historical_consumption === undefined).length ?? 0} predicted daily values`}</p>
      {/* View Header & Item Selector */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
              <TrendingUp className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Medicine Demand Forecast
              </h2>
              <p className="text-xs text-slate-500">
                Use past consumption to estimate future demand and possible variation
              </p>
            </div>
          </div>
        </div>

        {/* Item Selector Dropdown */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 whitespace-nowrap">
            Choose medicine:
          </label>
          <div className="relative min-w-[240px]">
            <select
              value={selectedId}
              onChange={(e) => {
                const id = Number(e.target.value);
                setSelectedId(id);
                if (onSelectItem) onSelectItem(id);
              }}
              className="w-full appearance-none px-4 py-2 text-xs font-bold rounded-xl bg-slate-50 border border-slate-200 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 cursor-pointer pr-9"
            >
              {items.map((it) => (
                <option key={it.id} value={it.id}>
                  {it.name} ({it.category})
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Forecast Intelligence Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Stockout Runway */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
              Estimated stock remaining
            </span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {forecastData?.days_until_depletion != null
              ? `${forecastData.days_until_depletion.toFixed(1)} Days`
              : "—"}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Depletion target:{" "}
            <span className="font-bold text-rose-600 font-mono">
              {forecastData?.projected_stockout_date || "No depletion date available"}
            </span>
          </p>
        </div>

        {/* Metric 2: Mean Daily Demand */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
              Average daily usage
            </span>
            <TrendingUp className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            {forecastData?.daily_demand_mean ?? "—"} {selectedItem?.unit || "units"}/day
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Current buffer:{" "}
            <span className="font-bold text-slate-800 font-mono">
              {selectedItem?.current_stock} {selectedItem?.unit}
            </span>
          </p>
        </div>

        {/* Metric 3: Model Fit & MAE */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
              Average prediction error
            </span>
            <Sparkles className="w-4 h-4 text-teal-500" />
          </div>
          <div className="text-xl font-black text-slate-900">
            ±{forecastData?.mae?.toFixed(2) ?? "—"} {selectedItem?.unit}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Root mean squared error: <span className="font-mono font-bold">±{forecastData?.rmse?.toFixed(2) ?? "—"}</span>
          </p>
        </div>

        {/* Metric 4: R-Squared Model Precision */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
              Model fit (R squared)
            </span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-emerald-600">
            {forecastData?.r2_score?.toFixed(3) ?? "—"}
          </div>
          <p className="text-[11px] text-slate-500 font-medium">
            Status: <span className="font-bold text-emerald-700">Evaluated on held-out history</span>
          </p>
        </div>
      </div>

      {/* Main Interactive Recharts Graph Panel */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        {/* Controls Toolbar: Confidence Interval Toggle & Forecast Horizon */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Demand Forecast Trajectory: {selectedItem?.name}
            </h3>
            <p className="text-xs text-slate-500">
              Solid line: Historical actuals. Dashed line: Projected future consumption with uncertainty interval.
            </p>
          </div>

          <div className="flex items-center flex-wrap gap-2.5">
            {/* Toggle Switches to change confidence intervals (80% vs 95%) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <span className="text-[11px] text-slate-500 px-2">Confidence:</span>
              <button
                onClick={() => setConfidenceLevel("80")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  confidenceLevel === "80"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                80% interval
              </button>
              <button
                onClick={() => setConfidenceLevel("95")}
                className={`px-3 py-1 rounded-lg text-xs transition-all ${
                  confidenceLevel === "95"
                    ? "bg-white text-slate-900 shadow-xs font-bold"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                95% interval
              </button>
            </div>

            {/* Horizon Horizon Selection */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold">
              <span className="text-[11px] text-slate-500 px-2">Forecast period:</span>
              {[14, 30, 60].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-all ${
                    horizon === h
                      ? "bg-white text-slate-900 shadow-xs font-bold"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {h} days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Recharts Canvas */}
        <div className="w-full h-80 pt-2">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-2">
              <div className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-mono">Calculating forecast…</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="confidenceBand" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "#64748b" }}
                  stroke="#cbd5e1"
                  tickLine={false}
                  label={{
                    value: `Units (${selectedItem?.unit || "vials"})`,
                    angle: -90,
                    position: "insideLeft",
                    fontSize: 10,
                    fill: "#94a3b8",
                  }}
                />

                <Tooltip
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-3 rounded-xl shadow-xl text-xs space-y-1.5 border border-slate-800">
                          <div className="font-bold text-slate-300 border-b border-slate-800 pb-1">
                            Date: {label}
                          </div>
                          {data.historical !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-sky-400">Historical Consumption:</span>
                              <span className="font-mono font-bold">{data.historical} {selectedItem?.unit}</span>
                            </div>
                          )}
                          {data.predicted !== undefined && (
                            <div className="flex justify-between gap-4">
                              <span className="text-teal-400">Predicted Demand:</span>
                              <span className="font-mono font-bold">{data.predicted} {selectedItem?.unit}</span>
                            </div>
                          )}
                          {data.lowerBound !== undefined && (
                            <div className="flex justify-between gap-4 text-slate-400 text-[10px]">
                              <span>{confidenceLevel}% Certainty Band:</span>
                              <span className="font-mono">{data.lowerBound} – {data.upperBound}</span>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />

                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: 11, paddingBottom: 10 }}
                />

                {/* Confidence Interval Ribbon Area */}
                <Area
                  type="monotone"
                  dataKey="confidenceRange"
                  stroke="none"
                  fill="url(#confidenceBand)"
                  name={`${confidenceLevel}% Confidence Interval`}
                />

                {/* Historical Actual Consumption (Solid Dark Blue Line) */}
                <Line
                  type="monotone"
                  dataKey="historical"
                  name="Historical Actual Consumption"
                  stroke="#0f172a"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#0f172a" }}
                  activeDot={{ r: 5 }}
                />

                {/* AI Predicted Future Demand (Dashed Teal Line) */}
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="AI Projected Future Demand"
                  stroke="#0284c7"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 3, fill: "#0284c7" }}
                  activeDot={{ r: 5 }}
                />

              </ComposedChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Explanation Note */}
        <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            The model uses weekly patterns and previous daily usage. The shaded band shows the{" "}
            <strong>{confidenceLevel}% prediction interval</strong>. Review purchase recommendations separately before approving an order.
          </p>
        </div>
      </div>
    </div>
  );
}
