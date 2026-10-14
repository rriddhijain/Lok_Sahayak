"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  Zap,
  Activity,
  Radio,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  ShieldAlert,
  Flame,
  CheckCircle2,
  Clock,
  Sparkles,
  Filter,
} from "lucide-react";
import { LiveNotification, PreparednessAlert } from "@/lib/types";

interface AlertFeedProps {
  liveNotifications: LiveNotification[];
  preparednessAlerts: PreparednessAlert[];
  onOpenExplain?: (alert: any) => void;
  sseConnected: boolean;
}

export default function AlertFeed({
  liveNotifications,
  preparednessAlerts,
  onOpenExplain,
  sseConnected,
}: AlertFeedProps) {
  const [filter, setFilter] = useState<"ALL" | "EMERGENCY" | "ANOMALY" | "NLP">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Combine and format alerts from both live SSE feed and NLP intelligence database
  const combinedAlerts = React.useMemo(() => {
    const list: Array<{
      id: string | number;
      type: "EMERGENCY" | "ANOMALY" | "NLP" | "STOCK";
      title: string;
      message: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
      timestamp: string;
      source: string;
      rationale?: string;
      confidence?: number;
      action?: string;
    }> = [];

    // Live stream notifications
    liveNotifications.forEach((n) => {
      let mappedType: "EMERGENCY" | "ANOMALY" | "NLP" | "STOCK" = "STOCK";
      if (n.type === "EMERGENCY") mappedType = "EMERGENCY";
      else if (n.type === "ANOMALY") mappedType = "ANOMALY";
      else if (n.type === "NLP_ALERT") mappedType = "NLP";

      list.push({
        id: n.id,
        type: mappedType,
        title: n.title,
        message: n.message,
        severity: n.severity === "CRITICAL" ? "CRITICAL" : n.severity === "WARNING" ? "HIGH" : "INFO",
        timestamp: n.timestamp,
        source: "Live hospital updates",
        action: n.meta?.recommended_action,
      });
    });

    // NLP surveillance signals
    preparednessAlerts.forEach((a) => {
      list.push({
        id: `nlp-${a.id}`,
        type: "NLP",
        title: a.title,
        message: a.inventory_impact_rationale || a.recommended_action,
        severity: a.severity as any,
        timestamp: new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: a.source_bulletin,
        rationale: a.inventory_impact_rationale,
        confidence: a.confidence,
        action: a.recommended_action,
      });
    });

    return list;
  }, [liveNotifications, preparednessAlerts]);

  // Filtered view
  const filteredList = combinedAlerts.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "EMERGENCY") return item.severity === "CRITICAL" || item.type === "EMERGENCY";
    if (filter === "ANOMALY") return item.type === "ANOMALY";
    if (filter === "NLP") return item.type === "NLP";
    return true;
  });

  // Smooth Auto-scroll when new alerts arrive
  useEffect(() => {
    if (autoScroll && feedContainerRef.current) {
      feedContainerRef.current.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  }, [combinedAlerts.length, autoScroll]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <Zap className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Alerts & Recent Activity
              </h2>
              <p className="text-[11px] text-slate-500">
                Stock changes, orders, emergency updates, and health bulletins
              </p>
            </div>
          </div>

          {/* Auto-scroll toggle & connection badge */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                autoScroll
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title={autoScroll ? "Pause auto-scroll" : "Resume auto-scroll"}
            >
              {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="text-[10px] hidden sm:inline">
                {autoScroll ? "Auto-scroll on" : "Auto-scroll off"}
              </span>
            </button>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                sseConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
              }`}
              title={sseConnected ? "Live updates connected" : "Updates disconnected"}
            />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            All ({combinedAlerts.length})
          </button>
          <button
            onClick={() => setFilter("EMERGENCY")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "EMERGENCY"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            Emergencies
          </button>
          <button
            onClick={() => setFilter("ANOMALY")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "ANOMALY"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Unusual usage
          </button>
          <button
            onClick={() => setFilter("NLP")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "NLP"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
            }`}
          >
            Health bulletins
          </button>
        </div>
      </div>

      {/* Feed List Items (Framer Motion 60fps Micro-interactions) */}
      <div
        ref={feedContainerRef}
        className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[640px] divide-y divide-slate-100"
      >
        <AnimatePresence initial={false}>
          {filteredList.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-12 text-center text-slate-400 space-y-2"
            >
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-600">
                No updates match this filter
              </p>
              <p className="text-[11px] text-slate-400">
                Add a health bulletin or record a hospital action to see updates here
              </p>
            </motion.div>
          ) : (
            filteredList.map((item) => {
              const isExpanded = expandedId === item.id;
              const isCritical = item.severity === "CRITICAL";
              const isHigh = item.severity === "HIGH";

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className={`pt-2.5 first:pt-0 group`}
                >
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isCritical
                        ? "bg-rose-50/70 border-rose-200/90 hover:border-rose-300 hover:bg-rose-50"
                        : isHigh
                        ? "bg-amber-50/70 border-amber-200/90 hover:border-amber-300 hover:bg-amber-50"
                        : "bg-slate-50/70 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Status Badge */}
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-1.5 py-0.5 rounded ${
                            isCritical
                              ? "bg-rose-600 text-white"
                              : isHigh
                              ? "bg-amber-500 text-white"
                              : "bg-sky-600 text-white"
                          }`}
                        >
                          {item.type === "NLP" ? "Health bulletin" : item.type === "ANOMALY" ? "Unusual usage" : item.type.toLowerCase()}
                        </span>

                        <span className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.timestamp}
                        </span>

                        {item.confidence && (
                          <span className="text-[10px] font-mono bg-white px-1.5 py-0.2 rounded border border-slate-200 text-slate-600">
                            {Math.round(item.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>

                      <div className="text-slate-400 group-hover:text-slate-600">
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </div>
                    </div>

                    <h3 className="text-xs font-bold text-slate-900 mt-1.5 leading-snug">
                      {item.title}
                    </h3>

                    <p className="text-[11px] text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Expandable explainability drawer */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-2 text-xs"
                        >
                          {item.source && (
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Source:
                              </span>
                              <span className="text-[11px] font-mono text-slate-700">
                                {item.source}
                              </span>
                            </div>
                          )}

                          {item.rationale && (
                            <div>
                              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                                Why this alert was raised:
                              </span>
                              <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200 font-mono">
                                {item.rationale}
                              </p>
                            </div>
                          )}

                          {item.action && (
                            <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                              <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-700">
                                Recommended Action:
                              </span>
                              <span className="text-[11px] font-medium leading-relaxed">
                                {item.action}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
