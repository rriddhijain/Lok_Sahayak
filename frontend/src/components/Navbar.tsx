"use client";

import React from "react";
import {
  ShieldAlert,
  Activity,
  UserCheck,
  Package,
  ShoppingCart,
  Bot,
  Radio,
  Ambulance,
  FileSpreadsheet,
} from "lucide-react";

interface NavbarProps {
  currentRole: string;
  onSelectRole: (role: string) => void;
  isEmergencyActive: boolean;
  onOpenEmergencyModal: () => void;
  onOpenHealthModal: () => void;
  onOpenAssistant: () => void;
  sseConnected: boolean;
}

export default function Navbar({
  currentRole,
  onSelectRole,
  isEmergencyActive,
  onOpenEmergencyModal,
  onOpenHealthModal,
  onOpenAssistant,
  sseConnected,
}: NavbarProps) {
  const roles = [
    { id: "Hospital Administrator", label: "Hospital Admin", icon: Activity },
    { id: "Inventory Manager", label: "Inventory Manager", icon: Package },
    { id: "Procurement Staff", label: "Procurement Lead", icon: ShoppingCart },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[rgba(255,255,255,0.08)] bg-[rgba(7,11,20,0.85)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Logo and Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.4)]">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-white">Lok Sahayak</span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                Antigravity Core
              </span>
            </div>
            <p className="text-xs text-slate-400">Smart Hospital Inventory & Decision Support</p>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="hidden md:flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800/80">
          {roles.map((r) => {
            const Icon = r.icon;
            const isActive = currentRole === r.id;
            return (
              <button
                key={r.id}
                onClick={() => onSelectRole(r.id)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-sm font-semibold"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {r.label}
              </button>
            );
          })}
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Real-time Status */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? "bg-emerald-400 shadow-[0_0_8px_#34d399]" : "bg-amber-400"
              }`}
            />
            <span>{sseConnected ? "Live SSE Active" : "Polling Mode"}</span>
          </div>

          {/* Mass-Casualty / Emergency Button */}
          <button
            onClick={onOpenEmergencyModal}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isEmergencyActive
                ? "bg-rose-600/90 hover:bg-rose-600 text-white shadow-[0_0_20px_rgba(244,63,94,0.6)] animate-pulse"
                : "bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-950/40"
            }`}
          >
            <Ambulance className="w-3.5 h-3.5" />
            <span>{isEmergencyActive ? "SURGE ACTIVE (2.5x)" : "Emergency Triage"}</span>
          </button>

          {/* Public Health Feed Button */}
          <button
            onClick={onOpenHealthModal}
            title="Public Health Surveillance & Milvus"
            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
          >
            <Radio className="w-4 h-4" />
          </button>

          {/* AI Assistant Button */}
          <button
            onClick={onOpenAssistant}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs font-medium shadow-[0_0_15px_rgba(99,102,241,0.3)] transition-all"
          >
            <Bot className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Ask Antigravity</span>
          </button>
        </div>
      </div>
    </header>
  );
}
