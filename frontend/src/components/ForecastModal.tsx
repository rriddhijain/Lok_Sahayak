"use client";

import React, { useState, useEffect } from "react";
import { X, TrendingUp, Calendar, AlertTriangle, CheckCircle, Sparkles, BarChart2 } from "lucide-react";
import { fetchItemForecast } from "@/lib/api";

interface ForecastModalProps {
  itemId: number | null;
  onClose: () => void;
}

export default function ForecastModal({ itemId, onClose }: ForecastModalProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [horizon, setHorizon] = useState(30);

  useEffect(() => {
    if (!itemId) return;
    setLoading(true);
    fetchItemForecast(itemId, horizon)
      .then((res) => setData(res))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [itemId, horizon]);

  if (!itemId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-950 rounded-2xl shadow-xl border w-full max-w-4xl p-6 space-y-5 max-h-[92vh] overflow-y-auto border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white">
                {data ? data.item_name : "Loading AI Demand Forecast..."}
              </h3>
              <p className="text-xs text-slate-400">
                Time-Series Autoregressive Ridge & Seasonality Decomposition Model
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400 text-sm">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Computing out-of-sample forecast and confidence bounds...
          </div>
        ) : data ? (
          <div className="space-y-6">
            {/* KPI Cards: MAE, RMSE, Run Rate, Runway */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block">Out-of-Sample MAE</span>
                <span className="text-xl font-bold text-cyan-400 font-mono">{data.mae}</span>
                <span className="text-[10px] text-slate-500 block">Mean Absolute Error</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block">Model RMSE</span>
                <span className="text-xl font-bold text-indigo-400 font-mono">{data.rmse}</span>
                <span className="text-[10px] text-slate-500 block">Root Mean Squared Error</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block">Daily Run Rate</span>
                <span className="text-xl font-bold text-white font-mono">{data.daily_run_rate}</span>
                <span className="text-[10px] text-slate-500 block">Units consumed / day</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
                <span className="text-[11px] text-slate-400 font-mono block">Stock-Out Runway</span>
                <span className={`text-xl font-bold font-mono ${data.projected_stock_out_days < 7 ? "text-rose-400" : "text-emerald-400"}`}>
                  {data.projected_stock_out_days ? `${data.projected_stock_out_days}d` : "Safe"}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {data.projected_stock_out_date ? `Zero by ${data.projected_stock_out_date}` : "Above safety buffer"}
                </span>
              </div>
            </div>

            {/* Time Series Visualization (SVG Chart) */}
            <div className="p-5 rounded-2xl bg-slate-950/70 border border-slate-800/90 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-200 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-cyan-400" />
                  Historical Consumption vs 30-Day Forward Forecast
                </span>
                <div className="flex items-center gap-4 text-[11px] font-mono">
                  <span className="flex items-center gap-1.5 text-slate-400">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Historical
                  </span>
                  <span className="flex items-center gap-1.5 text-cyan-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Forecast (μ)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-500">
                    <span className="w-2.5 h-2.5 rounded bg-cyan-900/40 border border-cyan-800" /> 95% Confidence Band
                  </span>
                </div>
              </div>

              {/* Render dynamic SVG Polyline Chart */}
              <div className="w-full h-56 pt-2">
                <svg className="w-full h-full" viewBox="0 0 800 200" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="forecastBand" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.02" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal gridlines */}
                  <line x1="0" y1="50" x2="800" y2="50" stroke="#1e293b" strokeDasharray="4 4" />
                  <line x1="0" y1="100" x2="800" y2="100" stroke="#1e293b" strokeDasharray="4 4" />
                  <line x1="0" y1="150" x2="800" y2="150" stroke="#1e293b" strokeDasharray="4 4" />

                  {/* Historical curve (left half) */}
                  {data.historical && data.historical.length > 0 && (() => {
                    const hist = data.historical.slice(-20);
                    const maxVal = Math.max(...hist.map((h: any) => h.actual_consumption), ...data.forecast.map((f: any) => f.confidence_upper), 10);
                    const stepX = 380 / (hist.length - 1 || 1);
                    const points = hist.map((h: any, i: number) => {
                      const x = i * stepX;
                      const y = 180 - (h.actual_consumption / maxVal) * 150;
                      return `${x},${y}`;
                    }).join(" ");

                    return (
                      <>
                        <polyline fill="none" stroke="#3b82f6" strokeWidth="2.5" points={points} />
                        {hist.map((h: any, i: number) => {
                          const x = i * stepX;
                          const y = 180 - (h.actual_consumption / maxVal) * 150;
                          return <circle key={i} cx={x} cy={y} r="3" fill="#60a5fa" />;
                        })}
                      </>
                    );
                  })()}

                  {/* Forecast curve + Confidence band (right half) */}
                  {data.forecast && data.forecast.length > 0 && (() => {
                    const fcast = data.forecast;
                    const maxVal = Math.max(...data.forecast.map((f: any) => f.confidence_upper), 25);
                    const stepX = 400 / (fcast.length - 1 || 1);

                    const predPoints = fcast.map((f: any, i: number) => {
                      const x = 390 + i * stepX;
                      const y = 180 - (f.predicted_demand / maxVal) * 150;
                      return `${x},${y}`;
                    }).join(" ");

                    const upperPoints = fcast.map((f: any, i: number) => {
                      const x = 390 + i * stepX;
                      const y = 180 - (f.confidence_upper / maxVal) * 150;
                      return `${x},${y}`;
                    });

                    const lowerPoints = fcast.slice().reverse().map((f: any, i: number) => {
                      const x = 390 + (fcast.length - 1 - i) * stepX;
                      const y = 180 - (f.confidence_lower / maxVal) * 150;
                      return `${x},${y}`;
                    });

                    const bandPolygon = [...upperPoints, ...lowerPoints].join(" ");

                    return (
                      <>
                        <polygon fill="url(#forecastBand)" points={bandPolygon} />
                        <polyline fill="none" stroke="#06b6d4" strokeWidth="2.5" strokeDasharray="5 3" points={predPoints} />
                      </>
                    );
                  })()}

                  {/* Divider line between past and future */}
                  <line x1="385" y1="10" x2="385" y2="190" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="3 3" />
                  <text x="390" y="25" fill="#f59e0b" fontSize="10" fontFamily="monospace">Forecast T₀</text>
                </svg>
              </div>
            </div>

            {/* Explainability & Mathematical Formula */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-2">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                Auditable Mathematical Specification
              </span>
              <div className="p-2.5 rounded bg-slate-950 text-indigo-300 font-mono text-[11px] overflow-x-auto">
                {data.mathematical_formula}
              </div>
              <p className="text-slate-400 text-[11px] leading-relaxed">
                {data.forecast_summary}
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
