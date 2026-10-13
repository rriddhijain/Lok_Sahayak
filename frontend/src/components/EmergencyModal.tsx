"use client";

import React, { useState } from "react";
import {
  X,
  Ambulance,
  MapPin,
  Navigation,
  Bed,
  ShieldAlert,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle,
} from "lucide-react";
import { searchEmergencyHospitals, toggleEmergencyMode } from "@/lib/api";

interface EmergencyModalProps {
  isEmergencyActive: boolean;
  onClose: () => void;
  onRefreshEmergencyStatus: () => void;
}

export default function EmergencyModal({
  isEmergencyActive,
  onClose,
  onRefreshEmergencyStatus,
}: EmergencyModalProps) {
  const [lat, setLat] = useState(28.6139);
  const [lon, setLon] = useState(77.2090);
  const [bedType, setBedType] = useState("Trauma");
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [toggling, setToggling] = useState(false);

  const presets = [
    { name: "Central Metro Collision", lat: 28.6139, lon: 77.2090 },
    { name: "South Industrial Zone Surge", lat: 28.5200, lon: 77.1800 },
    { name: "East Highway Express Crash", lat: 28.6400, lon: 77.3000 },
  ];

  const handleSearch = async () => {
    setLoadingSearch(true);
    try {
      const res = await searchEmergencyHospitals({
        incident_latitude: lat,
        incident_longitude: lon,
        required_bed_type: bedType,
        min_available_beds: 1,
        max_radius_km: 60.0,
      });
      setSearchResults(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleToggleEmergency = async (activate: boolean) => {
    setToggling(true);
    try {
      await toggleEmergencyMode({
        enable_emergency_mode: activate,
        incident_type: activate ? "Mass Casualty Incident (MCI-1)" : "Normal Operations",
        surge_multiplier: activate ? 2.5 : 1.0,
        incident_location: `Lat ${lat.toFixed(4)}, Lon ${lon.toFixed(4)}`,
      });
      onRefreshEmergencyStatus();
    } catch (err) {
      console.error(err);
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-slate-950 rounded-2xl shadow-xl border w-full max-w-4xl p-6 space-y-6 max-h-[92vh] overflow-y-auto border-rose-500/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
              <Ambulance className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                Emergency & Spatial Intelligence Command
                {isEmergencyActive && (
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 animate-pulse">
                    SURGE MODE 2.5x
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400">
                Mass-Casualty Spatial Hospital Ranking & Dynamic Surge Inventory Buffer
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Mode Toggle Banner */}
        <div
          className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
            isEmergencyActive
              ? "bg-rose-950/40 border-rose-500/60 shadow-[0_0_20px_rgba(244,63,94,0.2)]"
              : "bg-slate-900 border-slate-800"
          }`}
        >
          <div className="space-y-1">
            <span className="font-bold text-sm text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Dynamic Emergency Surge Mode (2.5x Trauma Stock Thresholds)
            </span>
            <p className="text-xs text-slate-400">
              Elevates safety buffers across IV fluids, trauma laparotomy kits, blood bags, and narcotics to prevent sudden exhaustion.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isEmergencyActive ? (
              <button
                disabled={toggling}
                onClick={() => handleToggleEmergency(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {toggling ? "Updating..." : "Deactivate Emergency Mode"}
              </button>
            ) : (
              <button
                disabled={toggling}
                onClick={() => handleToggleEmergency(true)}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all disabled:opacity-50"
              >
                {toggling ? "Activating..." : "ACTIVATE 2.5x SURGE MODE"}
              </button>
            )}
          </div>
        </div>

        {/* Spatial Search Controls */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Navigation className="w-4 h-4 text-cyan-400" />
              Incident GPS Coordinates & Required Bed Allocation
            </span>
            {/* Presets */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 text-[11px] hidden sm:inline">Presets:</span>
              {presets.map((p) => (
                <button
                  key={p.name}
                  onClick={() => {
                    setLat(p.lat);
                    setLon(p.lon);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[10px] font-mono transition-colors"
                >
                  {p.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">Latitude</label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">Longitude</label>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 font-mono block mb-1">Required Bed Type</label>
              <select
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
              >
                <option value="Trauma">Trauma Emergency Beds</option>
                <option value="ICU">Intensive Care (ICU)</option>
                <option value="General">General Inpatient</option>
                <option value="Pediatric">Pediatric Ward</option>
                <option value="Oxygen">High-Flow Oxygen</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSearch}
            disabled={loadingSearch}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-md transition-all"
          >
            {loadingSearch ? "Running Haversine Spatial Routing..." : "Rank Network Hospitals by Proximity & Live Capacity"}
          </button>
        </div>

        {/* Spatial Search Results */}
        {searchResults.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-bold text-sm text-slate-200">
              Ranked Hospital Triage Destinations ({searchResults.length} within radius)
            </h4>

            <div className="space-y-2.5">
              {searchResults.map((h, i) => (
                <div
                  key={h.hospital_id}
                  className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-cyan-500/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-cyan-950 text-cyan-300 font-mono text-xs flex items-center justify-center font-bold border border-cyan-800">
                        #{i + 1}
                      </span>
                      <span className="font-bold text-sm text-white">{h.name}</span>
                      <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                        {h.trauma_level}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">{h.address}</p>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono">
                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">Distance</span>
                      <span className="font-bold text-cyan-400">{h.distance_km} km</span>
                      <span className="text-[10px] text-slate-400 block">~{h.estimated_transit_minutes} min transit</span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-500 text-[10px] block">{h.bed_type} Beds Free</span>
                      <span className={`font-bold ${h.available_beds <= 2 ? "text-rose-400" : "text-emerald-400"}`}>
                        {h.available_beds}
                        <span className="text-slate-500 font-normal"> / {h.total_capacity}</span>
                      </span>
                      <span className="text-[10px] text-slate-400 block">{h.occupancy_pct}% Occupied</span>
                    </div>

                    <div className="text-right pl-2 border-l border-slate-800">
                      <span className="text-slate-500 text-[10px] block">Readiness</span>
                      <span className="font-extrabold text-amber-400 text-sm">{h.readiness_score}</span>
                      <span className="text-[10px] text-slate-500 block">/100 score</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
