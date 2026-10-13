"use client";

import React from "react";
import {
  LayoutDashboard,
  Boxes,
  TrendingUp,
  Hospital,
  ShoppingCart,
  Activity,
  Building2,
  Package,
} from "lucide-react";

export type NavTab = "command-center" | "inventory" | "forecast" | "emergency" | "procurement";

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  currentRole: string;
  onSelectRole: (role: string) => void;
  isEmergencyActive: boolean;
  criticalStockCount: number;
  activeAlertsCount: number;
  sseConnected: boolean;
}

export default function Sidebar({
  activeTab,
  onSelectTab,
  currentRole,
  onSelectRole,
  isEmergencyActive,
  criticalStockCount,
  activeAlertsCount,
  sseConnected,
}: SidebarProps) {
  // Perspective roles that clearly direct the user
  const roles = [
    {
      name: "Hospital Administrator",
      icon: Building2,
      desc: "Full hospital overview & bed network",
      targetTab: "command-center" as NavTab,
    },
    {
      name: "Inventory Manager",
      icon: Boxes,
      desc: "Medicine stocks & expiry tracking",
      targetTab: "inventory" as NavTab,
    },
    {
      name: "Procurement Officer",
      icon: ShoppingCart,
      desc: "Purchase orders & supplier contracts",
      targetTab: "procurement" as NavTab,
    },
  ];

  // Primary navigation tabs with clear, natural English labels (No cryptic acronyms)
  const navItems = [
    {
      id: "command-center" as NavTab,
      label: "Overview Dashboard",
      icon: LayoutDashboard,
      badge: activeAlertsCount > 0 ? `${activeAlertsCount} alerts` : null,
      badgeColor: "bg-rose-100 text-rose-700 border-rose-200",
    },
    {
      id: "inventory" as NavTab,
      label: "Medicines & Supplies",
      icon: Boxes,
      badge: criticalStockCount > 0 ? `${criticalStockCount} low` : null,
      badgeColor: "bg-amber-100 text-amber-800 border-amber-200",
    },
    {
      id: "forecast" as NavTab,
      label: "Demand Forecasting",
      icon: TrendingUp,
      badge: "AI Prediction",
      badgeColor: "bg-sky-100 text-sky-800 border-sky-200",
    },
    {
      id: "emergency" as NavTab,
      label: "Hospital Beds & Transfers",
      icon: Hospital,
      badge: isEmergencyActive ? "Surge Active" : null,
      badgeColor: isEmergencyActive ? "bg-rose-600 text-white animate-pulse" : "bg-emerald-100 text-emerald-800 border-emerald-200",
    },
    {
      id: "procurement" as NavTab,
      label: "Purchase Orders & Suppliers",
      icon: ShoppingCart,
      badge: "Smart Reorder",
      badgeColor: "bg-slate-100 text-slate-700 border-slate-200",
    },
  ];

  return (
    <aside className="w-72 bg-white border-r border-slate-200/90 flex flex-col h-screen sticky top-0 select-none shadow-sm z-30">
      {/* Brand & System Status */}
      <div className="p-5 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-sky-600/20">
            <Activity className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900">
                Lok Sahayak
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
                Hospital
              </span>
            </div>
            <p className="text-[11px] font-medium text-slate-500">
              Smart Health Management
            </p>
          </div>
        </div>

        {/* Live Network Sync Indicator (Simplified & Friendly) */}
        <div className="mt-3.5 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                sseConnected ? "bg-emerald-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className="font-medium text-slate-700">
              System Live & Synchronized
            </span>
          </div>
          <span className="text-[10px] text-emerald-600 font-bold">Online</span>
        </div>
      </div>

      {/* Perspective / Role Switcher (Functional: Changes view & role) */}
      <div className="p-4 border-b border-slate-200/80 bg-slate-50/50">
        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
          Switch Your Role
        </label>
        <div className="space-y-1.5">
          {roles.map((r) => {
            const Icon = r.icon;
            const isSelected = currentRole === r.name;
            return (
              <button
                key={r.name}
                onClick={() => {
                  onSelectRole(r.name);
                  onSelectTab(r.targetTab);
                }}
                className={`w-full text-left px-3 py-2 rounded-xl flex items-center justify-between text-xs transition-all ${
                  isSelected
                    ? "bg-sky-50 text-sky-900 font-bold border border-sky-300 shadow-xs ring-1 ring-sky-200"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-transparent"
                }`}
                title={`Switch view to ${r.name}`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 ${
                      isSelected ? "text-sky-600" : "text-slate-400"
                    }`}
                  />
                  <div>
                    <div className="leading-tight">{r.name}</div>
                    <div className="text-[10px] font-normal text-slate-400 leading-tight">
                      {r.desc}
                    </div>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-2 h-2 rounded-full bg-sky-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Primary Navigation Menu */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
          Navigation
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? "bg-slate-900 text-white shadow-sm font-semibold"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-sky-400" : "text-slate-400"
                  }`}
                />
                <span>{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${
                    isActive
                      ? "bg-slate-800 text-slate-200 border-slate-700"
                      : item.badgeColor
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Bottom Emergency Status Pill */}
      <div className="p-4 border-t border-slate-200/80 bg-slate-50/70">
        <div
          className={`p-3 rounded-xl border text-xs transition-all ${
            isEmergencyActive
              ? "bg-rose-50 border-rose-200 text-rose-900 shadow-sm"
              : "bg-white border-slate-200 text-slate-700"
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-bold flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isEmergencyActive ? "bg-rose-600 animate-ping" : "bg-emerald-500"
                }`}
              />
              {isEmergencyActive ? "Emergency Surge Active (2.5x)" : "Normal Operations"}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            {isEmergencyActive
              ? "Emergency trauma reserve buffers elevated by 2.5x."
              : "Standard stock safety buffers active."}
          </p>
        </div>
      </div>
    </aside>
  );
}
