"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Sidebar, { NavTab } from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import CommandCenterView from "@/components/CommandCenterView";
import InventoryMatrix from "@/components/InventoryMatrix";
import EmergencyHospitalFinder from "@/components/EmergencyHospitalFinder";
import ProcurementView from "@/components/ProcurementView";
import AIAssistantDrawer from "@/components/AIAssistantDrawer";
import FEFOModal from "@/components/FEFOModal";
import PublicHealthModal from "@/components/PublicHealthModal";
import EmergencyModal from "@/components/EmergencyModal";

const ForecastingView = dynamic(() => import("@/components/ForecastingView"), {
  ssr: false,
  loading: () => (
    <div className="py-24 text-center text-slate-400 space-y-2">
      <div className="w-8 h-8 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
      <p className="text-xs font-mono">Loading forecast…</p>
    </div>
  ),
});

import {
  setApiRole,
  fetchInventorySummary,
  fetchInventoryItems,
  fetchBatches,
  fetchReorders,
  fetchSuppliers,
  fetchHospitals,
  fetchAlerts,
  fetchEmergencyStatus,
  toggleEmergencyMode,
  subscribeToSSE,
} from "@/lib/api";
import {
  InventoryItem,
  BatchItem,
  NetworkHospital,
  PreparednessAlert,
  LiveNotification,
} from "@/lib/types";
import { Sparkles, Bot } from "lucide-react";

import { ADMIN, INVENTORY, PROCUREMENT, canAccessTab, homeTab, allowedTabs } from "@/lib/roles";

export default function SmartHealthDashboard() {
  // Navigation & Role states
  const [activeTab, setActiveTab] = useState<NavTab>("command-center");
  const [currentRole, setCurrentRole] = useState("Hospital Administrator");
  const loadVersion = useRef(0);
  const [roleReady, setRoleReady] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("lok-sahayak-role");
    const role = stored && allowedTabs[stored] ? stored : ADMIN;
    setApiRole(role); setCurrentRole(role); setActiveTab(homeTab(role) as NavTab); setRoleReady(true);
  }, []);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Core Data states
  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [hospitals, setHospitals] = useState<NetworkHospital[]>([]);
  const [reorders, setReorders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<PreparednessAlert[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [reserveDisease, setReserveDisease] = useState("Trauma / Mass Casualty");
  const [reserveStatus, setReserveStatus] = useState<any>(null);
  const [reserveBusy, setReserveBusy] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");

  // Real-Time SSE Live Stream states
  const [sseConnected, setSseConnected] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);

  // Modals & Drawers state
  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [fefoModalItem, setFefoModalItem] = useState<InventoryItem | null>(null);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedForecastItemId, setSelectedForecastItemId] = useState<number | null>(null);

  // Data Loading Function
  const loadDashboardData = useCallback(async (quiet = false) => {
    if (!roleReady) return;
    const version = ++loadVersion.current;
    const isAdmin = currentRole === ADMIN;
    const hasInventory = isAdmin || currentRole === INVENTORY;
    const hasPurchasing = isAdmin || currentRole === PROCUREMENT;
    if (!quiet) setIsRefreshing(true);
    try {
      const [sumRes, itemsRes, batchesRes, reordersRes, supRes, hospRes, alertsRes, emergRes] =
        await Promise.all([
          hasInventory ? fetchInventorySummary() : Promise.resolve(null),
          hasInventory ? fetchInventoryItems() : Promise.resolve([]),
          hasInventory ? fetchBatches() : Promise.resolve([]),
          hasPurchasing ? fetchReorders() : Promise.resolve([]),
          hasPurchasing ? fetchSuppliers() : Promise.resolve([]),
          isAdmin ? fetchHospitals() : Promise.resolve([]),
          isAdmin ? fetchAlerts() : Promise.resolve([]),
          isAdmin ? fetchEmergencyStatus() : Promise.resolve({ is_emergency_active: false }),
        ]);

      if (version !== loadVersion.current) return;
      setLoadError("");
      if (sumRes) setSummary(sumRes);
      if (itemsRes) setItems(itemsRes);
      if (batchesRes) setBatches(batchesRes);
      if (reordersRes) setReorders(reordersRes);
      if (supRes) setSuppliers(supRes);
      if (hospRes) setHospitals(hospRes);
      if (alertsRes) setAlerts(alertsRes);
      if (emergRes) {setIsEmergencyActive(emergRes.is_emergency_active); setReserveStatus(emergRes); if (emergRes.is_emergency_active) setReserveDisease(emergRes.reserve_disease);}
    } catch (err) {
      if (version !== loadVersion.current) return;
      setLoadError("Unable to load live data. Check that the backend is running, then click Refresh.");
    } finally {
      if (version === loadVersion.current) {setLoading(false); setIsRefreshing(false);}
    }
  }, [currentRole, roleReady]);

  // Initial Load & SSE Stream Setup
  useEffect(() => {
    if (!roleReady) return;
    setApiRole(currentRole);
    loadDashboardData();

    // Subscribe to SSE stream for zero-latency updates
    const unsubscribe = subscribeToSSE((event, data) => {
      if (event === "CONNECTION_STATE") {setSseConnected(data.connected); return;}
      setSseConnected(true);

      if (event === "INVENTORY_UPDATE") {
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: data.has_anomaly ? "ANOMALY" : "STOCK_MOVE",
            title: `${data.has_anomaly ? "Unusual usage" : "Stock movement"}: ${data.item_name}`,
            message: `${data.transaction_type} of ${Math.abs(data.quantity_changed)} units. New stock: ${data.current_stock}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: "INFO",
            meta: data,
          },
          ...prev.slice(0, 19),
        ]);
        loadDashboardData(true);
      } else if (event === "EMERGENCY_MODE_STATE") {
        setIsEmergencyActive(data.is_active);
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: "EMERGENCY",
            title: data.is_active ? "EMERGENCY SURGE PROTOCOL ACTIVATED" : "Normal Standby Mode Restored",
            message: data.is_active
              ? `Surge buffer multiplier ${data.surge_multiplier}x applied. Deficits flagged.`
              : "Emergency surge buffer reset to baseline.",
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: data.is_active ? "CRITICAL" : "INFO",
            meta: data,
          },
          ...prev.slice(0, 19),
        ]);
        loadDashboardData(true);
      } else if (event === "AI_PREPAREDNESS_ALERT") {
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: "NLP_ALERT",
            title: data.title,
            message: data.recommended_action || data.inventory_impact_rationale,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: data.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
            meta: data,
          },
          ...prev.slice(0, 19),
        ]);
        loadDashboardData(true);
      } else if (["BED_UPDATE", "DISPATCH_UPDATE", "ORDER_UPDATED"].includes(event)) {
        setLiveNotifications(prev => [{id:`ntf-${Date.now()}`, type:"STOCK_MOVE", title:data.message || "Hospital or order updated", message:data.message || "The latest saved data is now available.", timestamp:new Date().toLocaleTimeString(), severity:"INFO", meta:data}, ...prev.slice(0,19)]);
        loadDashboardData(true);
      } else if (event === "PO_APPROVED") {
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: "PROCUREMENT",
            title: "Purchase Order Approved",
            message: `PO for ${data.quantity} units of ${data.item_name} confirmed ($${data.total_cost}).`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: "INFO",
            meta: data,
          },
          ...prev.slice(0, 19),
        ]);
        loadDashboardData(true);
      }
    });

    return () => {loadVersion.current++; unsubscribe();};
  }, [loadDashboardData]);

  // Handle Emergency Surge Toggle
  const handleToggleEmergency = async () => {
    if (reserveBusy) return;
    const targetState = !isEmergencyActive;
    setReserveBusy(true);
    try {
      await toggleEmergencyMode({
        enable_emergency_mode: targetState,
        incident_type: targetState ? reserveDisease : "None",
        reserve_disease: reserveDisease,
        surge_multiplier: targetState ? 2.5 : 1.0,
        incident_location: "Sector 14 Corridor",
      });
      setIsEmergencyActive(targetState);
      loadDashboardData(true);
    } catch (err) {
      alert("Failed to toggle emergency mode.");
    } finally {setReserveBusy(false);}
  };

  // Switch to forecast view when an item is clicked
  const handleSelectItemForecast = (itemId: number) => {
    if (!canAccessTab(currentRole, "forecast")) return;
    setSelectedForecastItemId(itemId);
    setActiveTab("forecast");
  };

  const query = searchQuery.trim().toLowerCase();
  const matches = (values: unknown[]) => values.some(v => String(v ?? "").toLowerCase().includes(query));
  const matchingBatchIds = new Set(batches.filter(b => matches([b.batch_number])).map(b => b.item_id));
  const visibleItems = items.filter(i => matches([i.name,i.sku,i.category]) || matchingBatchIds.has(i.id));
  const visibleHospitals = hospitals.filter(h => matches([h.name,h.trauma_level]));
  const visibleSuppliers = suppliers.filter(s => matches([s.name,s.category,s.location_city]));
  const visibleReorders = reorders.filter(o => matches([o.item_name,o.sku,o.category,o.supplier_name]));
  const criticalStockCount = items.filter((i) => i.risk_score >= 70 || i.current_stock < i.safety_threshold).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row font-sans selection:bg-sky-100 selection:text-sky-900">
      {/* 1. Left Clinical Modern Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => {if (canAccessTab(currentRole, tab)) setActiveTab(tab);}}
        currentRole={currentRole}
        onSelectRole={(role) => {if (role === currentRole) return; loadVersion.current++; setApiRole(role); setCurrentRole(role); localStorage.setItem("lok-sahayak-role", role); setSearchQuery(""); setLoading(true); setAssistantDrawerOpen(false); setFefoModalItem(null); setHealthModalOpen(false); setEmergencyModalOpen(false); setLiveNotifications([]); setActiveTab(homeTab(role) as NavTab);}}
        isEmergencyActive={isEmergencyActive}
        criticalStockCount={criticalStockCount}
        activeAlertsCount={alerts.length}
        sseConnected={sseConnected}
      />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top Header with Critical Surfaced Information */}
        <TopHeader
          currentRole={currentRole}
          criticalStockCount={criticalStockCount}
          isEmergencyActive={isEmergencyActive}
          onToggleEmergency={handleToggleEmergency}
          reserveDisease={reserveDisease}
          onReserveDiseaseChange={setReserveDisease}
          reserveBusy={reserveBusy}
          onOpenHealthModal={() => setHealthModalOpen(true)}
          sseConnected={sseConnected}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => loadDashboardData()}
          isRefreshing={isRefreshing}
        />

        {/* Primary Page Canvas */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {isEmergencyActive && reserveStatus && currentRole === ADMIN && <section aria-label="Emergency reserve impact" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-900 space-y-2">
            <strong>Emergency reserve: {reserveStatus.reserve_disease} · {reserveStatus.surge_multiplier}x safe stock</strong>
            <p>{reserveStatus.total_emergency_items_monitored} medicines/supplies monitored · {reserveStatus.items_in_deficit} below the reserve limit. Inventory limits and purchase recommendations now include this reserve.</p>
            {reserveStatus.critical_trauma_items?.map((i: any) => <p key={i.item_id}>{i.name}: safe limit {i.baseline_safety_stock} → {i.emergency_surge_threshold} units · current stock {i.current_stock} · deficit {i.deficit}</p>)}
          </section>}
          {loadError && <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800">{loadError}</div>}
          {query && <div className="p-4 bg-white border rounded-xl text-sm space-y-2"><p>{currentRole === ADMIN ? `Search results: ${visibleItems.length} medicines, ${visibleHospitals.length} hospitals, ${visibleReorders.length} purchase recommendations.` : currentRole === INVENTORY ? `Search results: ${visibleItems.length} medicines.` : `Search results: ${visibleReorders.length} purchase recommendations.`}</p><div className="flex gap-3">{canAccessTab(currentRole,"inventory") && <button onClick={() => setActiveTab("inventory")} className="text-sky-700">View medicines</button>}{currentRole === ADMIN && <button onClick={() => setActiveTab("emergency")} className="text-sky-700">View hospitals</button>}<button onClick={() => setSearchQuery("")} className="text-slate-600">Clear search</button></div></div>}
          {loading ? (
            <div className="py-36 text-center text-slate-400 space-y-3">
              <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono font-semibold text-slate-600">
                Loading hospital data…
              </p>
            </div>
          ) : (
            <>
              {/* Tab 1: The Command Center (Role-Based Dashboard) */}
              {activeTab === "command-center" && canAccessTab(currentRole, "command-center") && (
                <CommandCenterView
                  summary={summary}
                  items={query ? visibleItems : items}
                  hospitals={query ? visibleHospitals : hospitals}
                  liveNotifications={liveNotifications}
                  preparednessAlerts={alerts}
                  isEmergencyActive={isEmergencyActive}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onSelectItemForecast={handleSelectItemForecast}
                  sseConnected={sseConnected}
                />
              )}

              {/* Tab 2: Medicine Inventory */}
              {activeTab === "inventory" && canAccessTab(currentRole, "inventory") && (
                <InventoryMatrix
                  items={query ? visibleItems : items}
                  batches={batches}
                  onSelectItemForecast={handleSelectItemForecast}
                  allowForecast={currentRole === ADMIN}
                  onOpenFEFOModal={(item) => setFefoModalItem(item)}
                  onInstantReorder={currentRole === ADMIN ? () => setActiveTab("procurement") : undefined}
                />
              )}

              {/* Tab 3: Demand Forecasting & Analytics View */}
              {activeTab === "forecast" && canAccessTab(currentRole, "forecast") && (
                <ForecastingView
                  items={query ? visibleItems : items}
                  selectedItemId={selectedForecastItemId}
                  onSelectItem={(id) => setSelectedForecastItemId(id)}
                />
              )}

              {/* Tab 4: Emergency Hospital & Bed Finder */}
              {activeTab === "emergency" && canAccessTab(currentRole, "emergency") && (
                <EmergencyHospitalFinder
                  hospitals={query ? visibleHospitals : hospitals}
                  isEmergencyActive={isEmergencyActive}
                  onToggleEmergency={handleToggleEmergency}
                  onRefreshHospitals={() => loadDashboardData(true)}
                />
              )}

              {/* Tab 5: Dynamic Procurement & Supplier Scorecards */}
              {activeTab === "procurement" && canAccessTab(currentRole, "procurement") && (
                <ProcurementView
                  reorders={query ? visibleReorders : reorders}
                  suppliers={query ? visibleSuppliers : suppliers}
                  onOrderApproved={() => loadDashboardData(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Floating Action Button (FAB) for Natural Language AI Assistant */}
      {currentRole === ADMIN && <button
        onClick={() => setAssistantDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all flex items-center gap-2.5 border border-slate-700 group"
      >
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-teal-400 flex items-center justify-center text-white shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
        </div>
        <span className="text-xs font-bold tracking-tight pr-1">
          Ask AI Assistant
        </span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

      }
      {/* 4. Natural Language AI Assistant (Slide-out Panel) */}
      <AIAssistantDrawer
        isOpen={assistantDrawerOpen}
        onClose={() => setAssistantDrawerOpen(false)}
        currentRole={currentRole}
      />

      {/* 5. Modals */}
      {fefoModalItem && (
        <FEFOModal
          item={fefoModalItem}
          onClose={() => setFefoModalItem(null)}
          onSuccess={() => loadDashboardData(true)}
        />
      )}

      {healthModalOpen && (
        <PublicHealthModal
          onClose={() => setHealthModalOpen(false)}
          onAlertCreated={() => loadDashboardData(true)}
        />
      )}

      {emergencyModalOpen && (
        <EmergencyModal
          isEmergencyActive={isEmergencyActive}
          onClose={() => setEmergencyModalOpen(false)}
          onRefreshEmergencyStatus={() => loadDashboardData(true)}
        />
      )}
    </div>
  );
}
