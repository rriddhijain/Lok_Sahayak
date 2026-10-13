"use client";

import React from "react";
import { AlertCircle, X, Bell, ShieldAlert } from "lucide-react";

interface AnomalyAlertBannerProps {
  notifications: any[];
  onDismiss: (index: number) => void;
}

export default function AnomalyAlertBanner({
  notifications,
  onDismiss,
}: AnomalyAlertBannerProps) {
  if (!notifications || notifications.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 space-y-2 max-w-md w-full pointer-events-none">
      {notifications.map((n, idx) => (
        <div
          key={idx}
          className="pointer-events-auto p-4 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md flex items-start justify-between gap-3 animate-slide-up"
        >
          <div className="flex items-start gap-2.5">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 mt-0.5 shrink-0">
              <Bell className="w-4 h-4" />
            </div>
            <div className="space-y-0.5 text-xs">
              <span className="font-bold text-white block">{n.title || n.type || "Live Event"}</span>
              <p className="text-slate-300 text-[11px] leading-relaxed">
                {n.message || JSON.stringify(n.payload || n.data)}
              </p>
              <span className="text-[10px] text-slate-500 font-mono block pt-0.5">
                {n.timestamp || "Just now"}
              </span>
            </div>
          </div>

          <button
            onClick={() => onDismiss(idx)}
            className="p-1 rounded text-slate-500 hover:text-white shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
