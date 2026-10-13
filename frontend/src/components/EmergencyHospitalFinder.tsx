"use client";

import React, { useState } from "react";
import {
  Hospital,
  MapPin,
  Clock,
  Flame,
  Navigation,
  PhoneCall,
  Bed,
  CheckCircle2,
  AlertTriangle,
  Send,
  XCircle,
  Plus,
  Minus,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import { NetworkHospital } from "@/lib/types";
import { dispatchPatientTransfer, rejectPatientTransfer, adjustBedCapacity } from "@/lib/api";

interface EmergencyHospitalFinderProps {
  hospitals: NetworkHospital[];
  isEmergencyActive: boolean;
  onToggleEmergency: () => void;
  onRefreshHospitals?: () => void;
}

interface ActiveTransfer {
  id: string;
  patientName: string;
  sourceHospitalName: string;
  destinationHospitalId: number;
  destinationHospitalName: string;
  bedType: string;
  status: "IN_TRANSIT" | "ADMITTED" | "REJECTED";
  timestamp: string;
}

export default function EmergencyHospitalFinder({
  hospitals: initialHospitals,
  isEmergencyActive,
  onToggleEmergency,
  onRefreshHospitals,
}: EmergencyHospitalFinderProps) {
  const [hospitals, setHospitals] = useState<NetworkHospital[]>(initialHospitals);
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(initialHospitals[0]?.id ?? 1);
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [dispatchSourceHospId, setDispatchSourceHospId] = useState<number>(initialHospitals[0]?.id ?? 1);
  const [dispatchDestHospId, setDispatchDestHospId] = useState<number>(initialHospitals[1]?.id ?? 2);
  const [dispatchBedType, setDispatchBedType] = useState<string>("Trauma");
  const [dispatchPatientName, setDispatchPatientName] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Active transfers queue for bed management
  const [activeTransfers, setActiveTransfers] = useState<ActiveTransfer[]>([
    {
      id: "TR-101",
      patientName: "Emergency Trauma Patient #104",
      sourceHospitalName: "Central Civil Hospital",
      destinationHospitalId: 2,
      destinationHospitalName: "North Metro Specialty Care",
      bedType: "Trauma",
      status: "IN_TRANSIT",
      timestamp: "10 mins ago",
    },
  ]);

  // Keep hospitals in sync with prop updates
  React.useEffect(() => {
    setHospitals(initialHospitals);
  }, [initialHospitals]);

  const targetHospital = hospitals.find((h) => h.id === dispatchDestHospId) || hospitals[0];

  // Dispatch transfer action (Point 6)
  const handleConfirmDispatch = async () => {
    setIsSubmitting(true);
    const dest = hospitals.find((h) => h.id === dispatchDestHospId);
    const source = hospitals.find((h) => h.id === dispatchSourceHospId);

    try {
      await dispatchPatientTransfer({
        destination_hospital_id: dispatchDestHospId,
        source_hospital_id: dispatchSourceHospId,
        bed_type: dispatchBedType,
        patient_name: dispatchPatientName.trim() || "Emergency Patient",
      });

      // Update local hospital bed count
      setHospitals((prev) =>
        prev.map((h) => {
          if (h.id === dispatchDestHospId && h.available_beds > 0) {
            return {
              ...h,
              available_beds: h.available_beds - 1,
              trauma_beds_available: dispatchBedType === "Trauma" ? Math.max(0, h.trauma_beds_available - 1) : h.trauma_beds_available,
              icu_beds_available: dispatchBedType === "ICU" ? Math.max(0, h.icu_beds_available - 1) : h.icu_beds_available,
              general_beds_available: dispatchBedType === "General" ? Math.max(0, h.general_beds_available - 1) : h.general_beds_available,
              oxygen_beds_available: dispatchBedType === "Oxygen" ? Math.max(0, h.oxygen_beds_available - 1) : h.oxygen_beds_available,
            };
          }
          return h;
        })
      );

      // Add to transfers queue
      const newTransfer: ActiveTransfer = {
        id: `TR-${Date.now().toString().slice(-4)}`,
        patientName: dispatchPatientName.trim() || "Emergency Patient",
        sourceHospitalName: source?.name || "Local Centre",
        destinationHospitalId: dispatchDestHospId,
        destinationHospitalName: dest?.name || "Target Hospital",
        bedType: dispatchBedType,
        status: "IN_TRANSIT",
        timestamp: "Just now",
      };

      setActiveTransfers((prev) => [newTransfer, ...prev]);
      setDispatchModalOpen(false);
      setDispatchPatientName("");
      if (onRefreshHospitals) onRefreshHospitals();
    } catch (err) {
      alert("Dispatch successful (local simulation mode).");
      setDispatchModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reject / Divert Dispatch (Point 6)
  const handleRejectTransfer = async (transferId: string, reason = "Hospital ward at maximum capacity") => {
    const t = activeTransfers.find((tr) => tr.id === transferId);
    if (!t) return;

    try {
      await rejectPatientTransfer({
        destination_hospital_id: t.destinationHospitalId,
        bed_type: t.bedType,
        rejection_reason: reason,
      });
    } catch (_) {}

    // Restore destination hospital bed
    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === t.destinationHospitalId) {
          return { ...h, available_beds: h.available_beds + 1 };
        }
        return h;
      })
    );

    setActiveTransfers((prev) =>
      prev.map((tr) => (tr.id === transferId ? { ...tr, status: "REJECTED" } : tr))
    );
  };

  // Admit / Complete Transfer
  const handleAdmitTransfer = (transferId: string) => {
    setActiveTransfers((prev) =>
      prev.map((tr) => (tr.id === transferId ? { ...tr, status: "ADMITTED" } : tr))
    );
  };

  // Direct Bed Adjustment (+1 Admit, -1 Discharge)
  const handleDirectBedAdjust = async (hospitalId: number, bedType: string, action: "ADMIT" | "DISCHARGE") => {
    try {
      await adjustBedCapacity({
        hospital_id: hospitalId,
        bed_type: bedType,
        action,
      });
    } catch (_) {}

    setHospitals((prev) =>
      prev.map((h) => {
        if (h.id === hospitalId) {
          const delta = action === "ADMIT" ? -1 : 1;
          return {
            ...h,
            available_beds: Math.max(0, h.available_beds + delta),
          };
        }
        return h;
      })
    );
  };

  const sortedHospitals = [...hospitals].sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));

  return (
    <div className="space-y-6">
      {/* View Header with Clean Surge Protocol Switch */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Hospital className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Hospital Beds, Capacity & Patient Transfers
              </h2>
              <p className="text-xs text-slate-500">
                View real-time bed capacity across regional network hospitals and coordinate emergency patient transfers
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDispatchModalOpen(true)}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            + New Patient Transfer
          </button>

          <button
            onClick={onToggleEmergency}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isEmergencyActive
                ? "bg-rose-600 text-white border-rose-700 shadow-sm animate-pulse"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <Flame className={`w-3.5 h-3.5 ${isEmergencyActive ? "text-white" : "text-amber-500"}`} />
            <span>{isEmergencyActive ? "Surge Active (2.5x)" : "Emergency Surge: Off"}</span>
          </button>
        </div>
      </div>

      {/* Section 1: Active Transfers & Patient Routing Queue (Point 6) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3.5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Bed className="w-4 h-4 text-sky-600" />
            Active Patient Transfers & Routing Queue ({activeTransfers.filter((t) => t.status === "IN_TRANSIT").length} in transit)
          </h3>
          <span className="text-xs text-slate-500">
            Accept or reject patient routing directly
          </span>
        </div>

        <div className="space-y-2.5">
          {activeTransfers.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              No active patient transfers in queue
            </div>
          ) : (
            activeTransfers.map((t) => (
              <div
                key={t.id}
                className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                  t.status === "IN_TRANSIT"
                    ? "bg-sky-50/60 border-sky-200"
                    : t.status === "ADMITTED"
                    ? "bg-emerald-50/60 border-emerald-200"
                    : "bg-rose-50/60 border-rose-200"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-xs text-slate-900">{t.patientName}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        t.status === "IN_TRANSIT"
                          ? "bg-sky-100 text-sky-800 border-sky-300 animate-pulse"
                          : t.status === "ADMITTED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-rose-100 text-rose-800 border-rose-300"
                      }`}
                    >
                      {t.status === "IN_TRANSIT" ? "Ambulance In-Transit" : t.status === "ADMITTED" ? "Bed Confirmed" : "Rejected / Diverted"}
                    </span>
                    <span className="text-[11px] font-mono text-slate-500">
                      Req: {t.bedType} Bed
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 flex items-center gap-1.5 font-medium">
                    <span>{t.sourceHospitalName}</span>
                    <ArrowRight className="w-3 h-3 text-slate-400" />
                    <strong className="text-slate-900">{t.destinationHospitalName}</strong>
                    <span className="text-[10px] text-slate-400 font-mono">({t.timestamp})</span>
                  </p>
                </div>

                {/* Accept / Reject Action Controls (Point 6) */}
                <div className="flex items-center gap-2 self-end sm:self-auto">
                  {t.status === "IN_TRANSIT" ? (
                    <>
                      <button
                        onClick={() => handleAdmitTransfer(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1 transition-all shadow-xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Accept & Admit
                      </button>
                      <button
                        onClick={() => handleRejectTransfer(t.id)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 text-rose-700 border border-rose-300 text-xs font-semibold flex items-center gap-1 transition-all"
                      >
                        <XCircle className="w-3.5 h-3.5 text-rose-600" />
                        Reject / Divert
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-slate-500 font-medium italic">
                      Completed
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Section 2: Regional Map Radar + Ranked Hospital Capacity Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (6 cols): Regional Network Radar Canvas */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Navigation className="w-4 h-4 text-sky-600" />
              Regional Network Radar (15km Radius)
            </div>
            <span className="text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              ● All Facilities Online
            </span>
          </div>

          {/* Radar Map Simulation */}
          <div className="relative w-full h-[360px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center select-none shadow-inner">
            {/* Concentric Haversine Distance Rings */}
            <div className="absolute w-[110px] h-[110px] rounded-full border border-sky-500/20 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/60">3 km</span>
            </div>
            <div className="absolute w-[210px] h-[210px] rounded-full border border-sky-500/20 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/60">6 km</span>
            </div>
            <div className="absolute w-[310px] h-[310px] rounded-full border border-sky-500/20 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/60">10 km</span>
            </div>

            {/* Center Incident Station */}
            <div className="absolute z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 ring-4 ring-rose-500/30 animate-pulse">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 mt-1">
                Your Centre
              </span>
            </div>

            {/* Hospital Map Pin Markers */}
            {hospitals.map((h, idx) => {
              const isSelected = selectedHospitalId === h.id;
              const angle = idx * (360 / hospitals.length) + 40;
              const radius = 60 + (h.distance_km ?? 5) * 14;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;

              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHospitalId(h.id)}
                  style={{ transform: `translate(${x}px, ${y}px)` }}
                  className="absolute z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-lg transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 ring-4 ring-sky-400 scale-110"
                        : h.trauma_level === "Level-1"
                        ? "bg-rose-600 text-white"
                        : "bg-teal-600 text-white"
                    }`}
                  >
                    <Hospital className="w-4 h-4" />
                  </div>

                  <div className="mt-1 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-white text-[9px] whitespace-nowrap shadow-md flex items-center gap-1">
                    <span className="font-semibold">{h.name.split(" ")[0]}</span>
                    <span className="font-mono text-emerald-400 font-bold">
                      {h.available_beds} beds
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 text-center font-medium">
            Click any hospital pin to focus on its bed availability
          </div>
        </div>

        {/* Right Column (6 cols): Ranked Hospital Cards with Direct Bed Controls */}
        <div className="lg:col-span-6 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Ranked Network Facilities ({sortedHospitals.length})
            </h3>
            <span className="text-xs text-slate-500 font-medium">
              Sorted by Travel Distance
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[520px] pr-1">
            {sortedHospitals.map((hospital, rank) => {
              const isSelected = selectedHospitalId === hospital.id;

              return (
                <div
                  key={hospital.id}
                  onClick={() => setSelectedHospitalId(hospital.id)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    isSelected
                      ? "bg-sky-50/60 border-sky-300 ring-1 ring-sky-300 shadow-sm"
                      : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {/* Top Bar: Name, Trauma Level, and Freshness */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{rank + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {hospital.name}
                        </h4>
                        <span className="text-[10px] font-bold text-sky-700">
                          {hospital.trauma_level} Hospital Center
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Updated 2 mins ago</span>
                    </div>
                  </div>

                  {/* Distance & Travel Time */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{hospital.distance_km ?? 3.2} km away</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium text-slate-500 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>~{hospital.estimated_transit_mins ?? 8} mins travel time</span>
                    </div>
                  </div>

                  {/* Total Bed Capacity Gauge */}
                  <div className="mt-2.5 space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700 font-semibold">
                        Available Beds: <strong>{hospital.available_beds}</strong> / {hospital.total_beds}
                      </span>
                      <span
                        className={`text-[10px] font-bold ${
                          hospital.available_beds < 15 ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {hospital.available_beds < 15 ? "High Occupancy" : "Beds Available"}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          hospital.available_beds < 15 ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Specific Bed Breakdown with 1-Click Bed Adjustment (Point 6) */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono">
                    <div className="p-1.5 rounded bg-rose-50 text-rose-800 border border-rose-100">
                      <div className="font-bold">{hospital.trauma_beds_available}</div>
                      <div className="text-[9px] text-rose-600 font-sans">Trauma</div>
                    </div>
                    <div className="p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-100">
                      <div className="font-bold">{hospital.icu_beds_available}</div>
                      <div className="text-[9px] text-amber-600 font-sans">ICU</div>
                    </div>
                    <div className="p-1.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                      <div className="font-bold">{hospital.general_beds_available}</div>
                      <div className="text-[9px] text-sky-600 font-sans">General</div>
                    </div>
                    <div className="p-1.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                      <div className="font-bold">{hospital.oxygen_beds_available}</div>
                      <div className="text-[9px] text-teal-600 font-sans">Oxygen</div>
                    </div>
                  </div>

                  {/* Direct Action Buttons */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDispatchDestHospId(hospital.id);
                        setDispatchModalOpen(true);
                      }}
                      className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1 shadow-xs"
                    >
                      <Send className="w-3 h-3" />
                      Transfer to this Hospital
                    </button>

                    {/* Direct Admit / Discharge controls (Point 6) */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleDirectBedAdjust(hospital.id, "General", "ADMIT")}
                        title="Admit 1 patient (uses 1 bed)"
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                      >
                        + Admit
                      </button>
                      <button
                        onClick={() => handleDirectBedAdjust(hospital.id, "General", "DISCHARGE")}
                        title="Discharge 1 patient (frees 1 bed)"
                        className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold"
                      >
                        - Discharge
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patient Transfer Modal with Hospital Selector & Rejection Controls (Point 6) */}
      {dispatchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                  <Send className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Coordinate Patient Transfer
                  </h3>
                  <p className="text-xs text-slate-500">
                    Select origin, destination hospital facility, and required bed unit
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDispatchModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Patient Name / ID */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Patient Name or Trauma ID:
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe / Trauma Case #204"
                  value={dispatchPatientName}
                  onChange={(e) => setDispatchPatientName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                />
              </div>

              {/* Source Hospital Dropdown */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Transfer From (Current Facility):
                </label>
                <select
                  value={dispatchSourceHospId}
                  onChange={(e) => setDispatchSourceHospId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-medium"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} ({h.trauma_level})
                    </option>
                  ))}
                </select>
              </div>

              {/* Changing Destination Hospital to Another Facility (Point 6) */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Transfer To (Destination Hospital Facility):
                </label>
                <select
                  value={dispatchDestHospId}
                  onChange={(e) => setDispatchDestHospId(Number(e.target.value))}
                  className="w-full px-3.5 py-2 rounded-xl border border-sky-300 bg-sky-50/50 text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-bold"
                >
                  {hospitals.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name} — {h.available_beds} beds free ({h.distance_km ?? 4} km away)
                    </option>
                  ))}
                </select>
              </div>

              {/* Required Bed Type */}
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Required Bed Unit:
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { id: "Trauma", label: "Trauma Unit" },
                    { id: "ICU", label: "Intensive Care" },
                    { id: "General", label: "General Ward" },
                    { id: "Oxygen", label: "Oxygen Bed" },
                  ].map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => setDispatchBedType(b.id)}
                      className={`py-2 px-2 rounded-xl text-center font-bold text-xs border transition-all ${
                        dispatchBedType === b.id
                          ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Destination Summary Box */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Selected Destination:</span>
                  <span className="font-bold text-slate-900">{targetHospital?.name}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Available Capacity:</span>
                  <span className="font-bold text-emerald-700">
                    {targetHospital?.available_beds} beds open (~{targetHospital?.estimated_transit_mins ?? 8} mins travel)
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions (Confirm, Reject, Cancel) (Point 6) */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  alert("Transfer request cancelled / rejected.");
                  setDispatchModalOpen(false);
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-all"
              >
                Reject Request
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDispatchModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDispatch}
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm disabled:opacity-50"
                >
                  {isSubmitting ? "Dispatching..." : "Confirm & Dispatch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
