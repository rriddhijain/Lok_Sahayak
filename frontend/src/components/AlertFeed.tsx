"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  AlertTriangle,
  Zap,
  ChevronDown,
  ChevronUp,
  Pause,
  Play,
  Clock,
  CheckCircle2,
  ArrowRight,
  Flame,
  Info,
} from "lucide-react";
import { LiveNotification, PreparednessAlert } from "@/lib/types";

interface AlertFeedProps {
  liveNotifications: LiveNotification[];
  preparednessAlerts: PreparednessAlert[];
  sseConnected: boolean;
  onNavigateToTab?: (tab: string) => void;
  onSelectItemForecast?: (id: number) => void;
}

export default function AlertFeed({
  liveNotifications,
  preparednessAlerts,
  sseConnected,
  onNavigateToTab,
  onSelectItemForecast,
}: AlertFeedProps) {
  const [filter, setFilter] = useState<"ALL" | "SHORTAGE" | "SPIKE" | "OUTBREAK">("ALL");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedId, setExpandedId] = useState<string | number | null>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  // Format alerts in clear, plain-English medical terms (Point 10)
  const combinedAlerts = React.useMemo(() => {
    const list: Array<{
      id: string | number;
      category: "SHORTAGE" | "SPIKE" | "OUTBREAK" | "EXPIRY" | "GENERAL";
      badgeLabel: string;
      badgeColor: string;
      title: string;
      message: string;
      severity: "CRITICAL" | "HIGH" | "MEDIUM" | "INFO";
      timestamp: string;
      source: string;
      recommendedAction?: string;
      targetTab?: string;
    }> = [];

    // Live notifications from real-time events
    liveNotifications.forEach((n) => {
      let category: "SHORTAGE" | "SPIKE" | "OUTBREAK" | "EXPIRY" | "GENERAL" = "GENERAL";
      let badgeLabel = "Hospital Update";
      let badgeColor = "bg-sky-600";

      if (n.type === "EMERGENCY") {
        category = "SHORTAGE";
        badgeLabel = "Emergency Surge Alert";
        badgeColor = "bg-rose-600";
      } else if (n.type === "ANOMALY") {
        category = "SPIKE";
        badgeLabel = "Unusual Usage Spike";
        badgeColor = "bg-amber-600";
      } else if (n.type === "NLP_ALERT") {
        category = "OUTBREAK";
        badgeLabel = "Disease Outbreak";
        badgeColor = "bg-rose-600";
      } else if (n.type === "STOCK_MOVE") {
        category = "GENERAL";
        badgeLabel = "Stock Update";
        badgeColor = "bg-emerald-600";
      }

      list.push({
        id: n.id,
        category,
        badgeLabel,
        badgeColor,
        title: n.title,
        message: n.message,
        severity: n.severity === "CRITICAL" ? "CRITICAL" : "HIGH",
        timestamp: n.timestamp,
        source: "Real-time Hospital Monitor",
        recommendedAction: n.meta?.recommended_action,
      });
    });

    // Public health advisories from surveillance
    preparednessAlerts.forEach((a) => {
      list.push({
        id: `nlp-${a.id}`,
        category: "OUTBREAK",
        badgeLabel: "Health Department Advisory",
        badgeColor: "bg-rose-600",
        title: a.title,
        message: a.recommended_action || a.inventory_impact_rationale,
        severity: a.severity as any,
        timestamp: new Date(a.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        source: a.source_bulletin || "National Disease Control",
        recommendedAction: a.recommended_action,
        targetTab: "inventory",
      });
    });

    return list;
  }, [liveNotifications, preparednessAlerts]);

  // Filtered view
  const filteredList = combinedAlerts.filter((item) => {
    if (filter === "ALL") return true;
    if (filter === "SHORTAGE") return item.category === "SHORTAGE" || item.severity === "CRITICAL";
    if (filter === "SPIKE") return item.category === "SPIKE";
    if (filter === "OUTBREAK") return item.category === "OUTBREAK";
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
      {/* Feed Header (Clear & Friendly) */}
      <div className="p-4 border-b border-slate-200 bg-slate-50/60">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
              <Zap className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                Live Hospital Alerts
              </h2>
              <p className="text-[11px] text-slate-500">
                Shortages, sudden usage spikes, and disease advisories
              </p>
            </div>
          </div>

          {/* Auto-scroll toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAutoScroll((prev) => !prev)}
              className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 border transition-all ${
                autoScroll
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
              title={autoScroll ? "Pause live scrolling" : "Resume live scrolling"}
            >
              {autoScroll ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              <span className="text-[10px] hidden sm:inline">
                {autoScroll ? "Live" : "Paused"}
              </span>
            </button>
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                sseConnected ? "bg-emerald-500 animate-pulse" : "bg-emerald-500"
              }`}
              title="Live stream connected"
            />
          </div>
        </div>

        {/* Clear Filter Pills (Point 10) */}
        <div className="flex items-center gap-1.5 mt-3 pt-2 border-t border-slate-200/60 text-xs">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "ALL"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-100"
            }`}
          >
            All Alerts ({combinedAlerts.length})
          </button>
          <button
            onClick={() => setFilter("SHORTAGE")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "SHORTAGE"
                ? "bg-rose-600 text-white shadow-xs"
                : "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
            }`}
          >
            Shortages
          </button>
          <button
            onClick={() => setFilter("SPIKE")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "SPIKE"
                ? "bg-amber-600 text-white shadow-xs"
                : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
            }`}
          >
            Usage Spikes
          </button>
          <button
            onClick={() => setFilter("OUTBREAK")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
              filter === "OUTBREAK"
                ? "bg-sky-600 text-white shadow-xs"
                : "bg-sky-50 text-sky-700 border border-sky-200 hover:bg-sky-100"
            }`}
          >
            Outbreaks
          </button>
        </div>
      </div>

      {/* Feed List Items (Easy to Read) */}
      <div
        ref={feedContainerRef}
        className="flex-1 p-3 space-y-2.5 overflow-y-auto max-h-[640px] divide-y divide-slate-100"
      >
        <AnimatePresence initial={false}>
          {filteredList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto stroke-[1.5]" />
              <p className="text-xs font-medium text-slate-600">
                No active shortage alerts in this category
              </p>
              <p className="text-[11px] text-slate-400">
                Hospital supplies are currently within safety targets
              </p>
            </div>
          ) : (
            filteredList.map((item) => {
              const isExpanded = expandedId === item.id;
              const isCritical = item.severity === "CRITICAL";

              return (
                <div key={item.id} className="pt-2.5 first:pt-0">
                  <div
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      isCritical
                        ? "bg-rose-50/70 border-rose-200 hover:border-rose-300"
                        : "bg-slate-50/80 border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded text-white ${item.badgeColor}`}
                        >
                          {item.badgeLabel}
                        </span>

                        <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {item.timestamp}
                        </span>
                      </div>

                      <div className="text-slate-400">
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

                    {/* Expandable plain-English action recommendation */}
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
                            <div className="text-[11px] text-slate-500">
                              Reported by: <strong className="text-slate-700">{item.source}</strong>
                            </div>
                          )}

                          {item.recommendedAction && (
                            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900">
                              <span className="text-[10px] font-bold uppercase tracking-wider block text-emerald-700">
                                Recommended Action:
                              </span>
                              <span className="text-[11px] font-medium leading-relaxed">
                                {item.recommendedAction}
                              </span>
                            </div>
                          )}

                          {onNavigateToTab && (
                            <div className="pt-1 flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onNavigateToTab("inventory");
                                }}
                                className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 flex items-center gap-1"
                              >
                                Check Medicine Inventory <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
