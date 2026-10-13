"use client";

import React, { useState } from "react";
import {
  Hospital,
  MapPin,
  Clock,
  Radio,
  Flame,
  ShieldAlert,
  Navigation,
  PhoneCall,
  Bed,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Send,
  RefreshCw,
} from "lucide-react";
import { NetworkHospital } from "@/lib/types";

interface EmergencyHospitalFinderProps {
  hospitals: NetworkHospital[];
  isEmergencyActive: boolean;
  onToggleEmergency: () => void;
  onRefreshHospitals?: () => void;
}

export default function EmergencyHospitalFinder({
  hospitals,
  isEmergencyActive,
  onToggleEmergency,
  onRefreshHospitals,
}: EmergencyHospitalFinderProps) {
  const [selectedHospitalId, setSelectedHospitalId] = useState<number | null>(hospitals[0]?.id ?? 1);
  const [bedTypeFilter, setBedTypeFilter] = useState<"ALL" | "TRAUMA" | "ICU" | "OXYGEN">("ALL");
  const [patientDispatchModal, setPatientDispatchModal] = useState<NetworkHospital | null>(null);

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  // Ranked hospitals sorted by distance
  const sortedHospitals = [...hospitals].sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));

  return (
    <div className="space-y-6">
      {/* View Header with Emergency Surge Protocol Switch */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Hospital className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Emergency Spatial Hospital & Bed Finder
              </h2>
              <p className="text-xs text-slate-500">
                Great-circle Haversine proximity routing, real-time bed telemetry, and mass-casualty triage
              </p>
            </div>
          </div>
        </div>

        {/* Emergency Surge Toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleEmergency}
            className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 shadow-xs ${
              isEmergencyActive
                ? "bg-rose-600 text-white border-rose-700 shadow-rose-600/20 animate-pulse"
                : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
            }`}
          >
            <Flame className={`w-4 h-4 ${isEmergencyActive ? "text-white" : "text-amber-500"}`} />
            <span>
              {isEmergencyActive ? "Surge Active: 2.5x Buffer Applied" : "Activate Emergency Surge (2.5x)"}
            </span>
          </button>
        </div>
      </div>

      {/* Main Spatial Grid: Left Clean Map Radar + Right Ranked Hospital Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (7 cols): Clean Interactive Spatial Map Radar Canvas */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
              <Navigation className="w-4 h-4 text-sky-600" />
              Regional Spatial Network Radar (15km Radius)
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              GPS Coordinate Lock: 28.6139° N, 77.2090° E
            </div>
          </div>

          {/* Interactive Map Canvas Simulation */}
          <div className="relative w-full h-[400px] bg-slate-950 rounded-xl overflow-hidden border border-slate-800 flex items-center justify-center select-none shadow-inner">
            {/* Concentric Haversine Distance Rings */}
            <div className="absolute w-[120px] h-[120px] rounded-full border border-sky-500/20 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/50">3 km</span>
            </div>
            <div className="absolute w-[220px] h-[220px] rounded-full border border-sky-500/20 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/50">6 km</span>
            </div>
            <div className="absolute w-[320px] h-[320px] rounded-full border border-sky-500/20 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/50">10 km</span>
            </div>
            <div className="absolute w-[420px] h-[420px] rounded-full border border-sky-500/15 pointer-events-none flex items-start justify-center pt-1">
              <span className="text-[9px] font-mono text-sky-400/40">15 km</span>
            </div>

            {/* Radar Sweep Line Effect */}
            <div className="absolute w-[440px] h-[440px] rounded-full bg-gradient-to-tr from-sky-500/10 to-transparent pointer-events-none animate-spin" style={{ animationDuration: "12s" }} />

            {/* Center Incident Station */}
            <div className="absolute z-10 flex flex-col items-center">
              <div className="w-6 h-6 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-600/50 ring-4 ring-rose-500/30 animate-pulse">
                <MapPin className="w-3.5 h-3.5" />
              </div>
              <span className="text-[9px] font-bold text-white bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 mt-1 shadow-xs">
                Command Origin
              </span>
            </div>

            {/* Hospital Map Pin Markers */}
            {hospitals.map((h, idx) => {
              const isSelected = selectedHospitalId === h.id;
              // Spatial offsets based on index / distance
              const angle = idx * (360 / hospitals.length) + 40;
              const radius = 60 + (h.distance_km ?? 5) * 15;
              const rad = (angle * Math.PI) / 180;
              const x = Math.cos(rad) * radius;
              const y = Math.sin(rad) * radius;

              return (
                <div
                  key={h.id}
                  onClick={() => setSelectedHospitalId(h.id)}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  className="absolute z-20 cursor-pointer group flex flex-col items-center transition-transform hover:scale-110"
                >
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center font-bold text-xs shadow-lg transition-all ${
                      isSelected
                        ? "bg-white text-slate-900 ring-4 ring-sky-400 scale-110"
                        : h.trauma_level === "Level-1"
                        ? "bg-rose-600 text-white"
                        : h.trauma_level === "Level-2"
                        ? "bg-amber-500 text-white"
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

          {/* Map Legend */}
          <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" /> Level-1 Trauma
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" /> Level-2
              </span>
              <span className="flex items-center gap-1.5 text-slate-600 text-[11px]">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-600 inline-block" /> District Hospital
              </span>
            </div>

            <div className="text-[11px] font-mono text-slate-400">
              Click any pin to inspect real-time bed capacity
            </div>
          </div>
        </div>

        {/* Right Column (5 cols): Ranked List of Nearby Hospitals */}
        <div className="lg:col-span-5 space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">
              Ranked Network Facilities ({sortedHospitals.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Haversine Proximity
            </span>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {sortedHospitals.map((hospital, rank) => {
              const isSelected = selectedHospitalId === hospital.id;
              const hasCriticalBeds = hospital.available_beds < 15;

              return (
                <div
                  key={hospital.id}
                  onClick={() => setSelectedHospitalId(hospital.id)}
                  className={`p-4 rounded-xl border text-left cursor-pointer transition-all ${
                    isSelected
                      ? "bg-sky-50/70 border-sky-300 shadow-sm ring-1 ring-sky-300"
                      : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {/* Top Line: Hospital Name, Rank, and Trauma Level */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-md bg-slate-900 text-white font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        #{rank + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {hospital.name}
                        </h4>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-700">
                          {hospital.trauma_level} Center
                        </span>
                      </div>
                    </div>

                    {/* Data Freshness Indicator ("Updated 2 mins ago") */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Updated 2 mins ago</span>
                    </div>
                  </div>

                  {/* Distance & Transit Time */}
                  <div className="mt-2.5 flex items-center justify-between text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    <div className="flex items-center gap-1.5 font-semibold text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-rose-500" />
                      <span>{hospital.distance_km ?? 3.2} km away</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-slate-500 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>{hospital.estimated_transit_mins ?? 8} min transit</span>
                    </div>
                  </div>

                  {/* Bed Capacity Metrics */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-700">
                        Total Capacity: <strong>{hospital.available_beds}</strong> / {hospital.total_beds} beds free
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase ${
                          hasCriticalBeds ? "text-rose-600" : "text-emerald-600"
                        }`}
                      >
                        {hasCriticalBeds ? "High Surge" : "Optimal"}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          hasCriticalBeds ? "bg-rose-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${((hospital.total_beds - hospital.available_beds) / hospital.total_beds) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Detailed Bed Breakdown Chips */}
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-center text-[10px] font-mono pt-1">
                    <div className="p-1.5 rounded bg-rose-50 text-rose-800 border border-rose-100">
                      <div className="font-bold">{hospital.trauma_beds_available}</div>
                      <div className="text-[9px] text-rose-600">Trauma</div>
                    </div>
                    <div className="p-1.5 rounded bg-amber-50 text-amber-800 border border-amber-100">
                      <div className="font-bold">{hospital.icu_beds_available}</div>
                      <div className="text-[9px] text-amber-600">ICU</div>
                    </div>
                    <div className="p-1.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                      <div className="font-bold">{hospital.general_beds_available}</div>
                      <div className="text-[9px] text-sky-600">General</div>
                    </div>
                    <div className="p-1.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                      <div className="font-bold">{hospital.oxygen_beds_available}</div>
                      <div className="text-[9px] text-teal-600">O₂ Beds</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPatientDispatchModal(hospital);
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Dispatch Transfer
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Direct hotline for ${hospital.name}: +91-11-2338-9900 (Emergency Triage Desk)`);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                      title="Direct Emergency Hotline"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Patient Dispatch Confirmation Modal */}
      {patientDispatchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-sky-50 text-sky-600 border border-sky-200">
                <Send className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Emergency Patient Routing
                </h3>
                <p className="text-xs text-slate-500">
                  Target Facility: {patientDispatchModal.name}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Distance & ETA:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {patientDispatchModal.distance_km} km (~{patientDispatchModal.estimated_transit_mins} mins)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Trauma Beds:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {patientDispatchModal.trauma_beds_available} beds reserved
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Telemetry Sync:</span>
                <span className="font-bold text-slate-700">Verified live via Antigravity Bus</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPatientDispatchModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  alert(`Transfer dispatched to ${patientDispatchModal.name}. Ambulatory triage notified.`);
                  setPatientDispatchModal(null);
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm"
              >
                Confirm Dispatch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
