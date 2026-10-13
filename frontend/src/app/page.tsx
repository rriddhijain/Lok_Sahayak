"use client";

import React, { useState, useEffect, useCallback } from "react";
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
      <p className="text-xs font-mono">Loading demand forecasting models...</p>
    </div>
  ),
});

import {
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
import { Sparkles } from "lucide-react";

export default function SmartHealthDashboard() {
  const [activeTab, setActiveTab] = useState<NavTab>("command-center");
  const [currentRole, setCurrentRole] = useState("Hospital Administrator");
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [summary, setSummary] = useState<any>(null);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [hospitals, setHospitals] = useState<NetworkHospital[]>([]);
  const [reorders, setReorders] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<PreparednessAlert[]>([]);
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const [sseConnected, setSseConnected] = useState(false);
  const [liveNotifications, setLiveNotifications] = useState<LiveNotification[]>([]);

  const [assistantDrawerOpen, setAssistantDrawerOpen] = useState(false);
  const [fefoModalItem, setFefoModalItem] = useState<InventoryItem | null>(null);
  const [healthModalOpen, setHealthModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [selectedForecastItemId, setSelectedForecastItemId] = useState<number | null>(null);

  const loadDashboardData = useCallback(async (quiet = false) => {
    if (!quiet) setIsRefreshing(true);
    try {
      const [sumRes, itemsRes, batchesRes, reordersRes, supRes, hospRes, alertsRes, emergRes] =
        await Promise.all([
          fetchInventorySummary().catch(() => null),
          fetchInventoryItems().catch(() => []),
          fetchBatches().catch(() => []),
          fetchReorders().catch(() => []),
          fetchSuppliers().catch(() => []),
          fetchHospitals().catch(() => []),
          fetchAlerts().catch(() => []),
          fetchEmergencyStatus().catch(() => ({ is_emergency_active: false })),
        ]);

      if (sumRes) setSummary(sumRes);
      if (itemsRes) setItems(itemsRes);
      if (batchesRes) setBatches(batchesRes);
      if (reordersRes) setReorders(reordersRes);
      if (supRes) setSuppliers(supRes);
      if (hospRes) setHospitals(hospRes);
      if (alertsRes) setAlerts(alertsRes);
      if (emergRes) setIsEmergencyActive(emergRes.is_emergency_active);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();

    // Subscribe to SSE for zero-latency telemetry updates
    const unsubscribe = subscribeToSSE((event, data) => {
      setSseConnected(true);
      if (event === "INVENTORY_UPDATE") {
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: "STOCK_MOVE",
            title: `Stock Update: ${data.item_name}`,
            message: `${data.transaction_type === "PURCHASE_ORDER_RECEIPT" ? "Received delivery" : data.transaction_type} of ${Math.abs(data.quantity_changed)} units. New stock: ${data.current_stock}`,
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
            title: data.is_active ? "Emergency Surge Mode Activated (2.5x)" : "Normal Operations Restored",
            message: data.is_active
              ? `Emergency stock buffer increased by ${data.surge_multiplier}x for mass casualty preparedness.`
              : "Emergency surge buffer reset to standard levels.",
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
      } else if (event === "PO_APPROVED") {
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: "PROCUREMENT",
            title: "Purchase Order Confirmed",
            message: `Purchase order for ${data.quantity} units of ${data.item_name} approved ($${data.total_cost}).`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: "INFO",
            meta: data,
          },
          ...prev.slice(0, 19),
        ]);
        loadDashboardData(true);
      } else if (event === "PATIENT_TRANSFER_DISPATCHED") {
        setLiveNotifications((prev) => [
          {
            id: `ntf-${Date.now()}`,
            type: "EMERGENCY",
            title: "Patient Transfer Dispatched",
            message: `Transfer dispatched to ${data.destination_hospital_name} (${data.bed_type} Bed).`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            severity: "INFO",
            meta: data,
          },
          ...prev.slice(0, 19),
        ]);
        loadDashboardData(true);
      }
    });

    return () => unsubscribe();
  }, [loadDashboardData]);

  const handleToggleEmergency = async () => {
    const targetState = !isEmergencyActive;
    await toggleEmergencyMode({
      enable_emergency_mode: targetState,
      surge_multiplier: targetState ? 2.5 : 1.0,
      incident_type: targetState ? "Emergency Surge Protocol" : "Normal Baseline",
    });
    setIsEmergencyActive(targetState);
    loadDashboardData(true);
  };

  const criticalStockCount = items.filter((i) => i.risk_score >= 70).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-row font-sans">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        currentRole={currentRole}
        onSelectRole={(role) => setCurrentRole(role)}
        isEmergencyActive={isEmergencyActive}
        criticalStockCount={criticalStockCount}
        activeAlertsCount={alerts.length}
        sseConnected={sseConnected}
      />

      {/* 2. Main Content Container */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Working Top Header with Search and Clear Statuses */}
        <TopHeader
          criticalStockCount={criticalStockCount}
          isEmergencyActive={isEmergencyActive}
          onToggleEmergency={handleToggleEmergency}
          onOpenHealthModal={() => setHealthModalOpen(true)}
          sseConnected={sseConnected}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onRefresh={() => loadDashboardData()}
          isRefreshing={isRefreshing}
          currentRole={currentRole}
        />

        {/* Primary Page Canvas */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto space-y-6">
          {loading ? (
            <div className="py-36 text-center text-slate-400 space-y-3">
              <div className="w-10 h-10 border-3 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-mono font-semibold text-slate-600">
                Loading hospital decision-support systems...
              </p>
            </div>
          ) : (
            <>
              {/* Tab 1: Overview Dashboard */}
              {activeTab === "command-center" && (
                <CommandCenterView
                  summary={summary}
                  items={items}
                  hospitals={hospitals}
                  liveNotifications={liveNotifications}
                  preparednessAlerts={alerts}
                  isEmergencyActive={isEmergencyActive}
                  onNavigateToTab={(tab) => setActiveTab(tab)}
                  onSelectItemForecast={(id) => {
                    setSelectedForecastItemId(id);
                    setActiveTab("forecast");
                  }}
                  sseConnected={sseConnected}
                  searchQuery={searchQuery}
                  currentRole={currentRole}
                />
              )}

              {/* Tab 2: Medicines & Supplies Inventory */}
              {activeTab === "inventory" && (
                <InventoryMatrix
                  items={items}
                  batches={batches}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onSelectItemForecast={(id) => {
                    setSelectedForecastItemId(id);
                    setActiveTab("forecast");
                  }}
                  onOpenFEFOModal={(item) => setFefoModalItem(item)}
                  onInstantReorder={() => setActiveTab("procurement")}
                />
              )}

              {/* Tab 3: Demand Forecasting & Consumption Modeling */}
              {activeTab === "forecast" && (
                <ForecastingView
                  items={items}
                  selectedItemId={selectedForecastItemId}
                  onSelectItem={(id) => setSelectedForecastItemId(id)}
                />
              )}

              {/* Tab 4: Hospital Beds & Patient Transfers */}
              {activeTab === "emergency" && (
                <EmergencyHospitalFinder
                  hospitals={hospitals}
                  isEmergencyActive={isEmergencyActive}
                  onToggleEmergency={handleToggleEmergency}
                  onRefreshHospitals={() => loadDashboardData(true)}
                />
              )}

              {/* Tab 5: Purchase Orders & Suppliers */}
              {activeTab === "procurement" && (
                <ProcurementView
                  reorders={reorders}
                  suppliers={suppliers}
                  onOrderApproved={() => loadDashboardData(true)}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* 3. Floating Action Button for AI Assistant */}
      <button
        onClick={() => setAssistantDrawerOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-3 rounded-full bg-slate-900 text-white shadow-xl hover:bg-slate-800 transition-all flex items-center gap-2.5 border border-slate-700"
      >
        <Sparkles className="w-4 h-4 text-sky-400" />
        <span className="text-xs font-bold">Ask Hospital AI Assistant</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
      </button>

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
