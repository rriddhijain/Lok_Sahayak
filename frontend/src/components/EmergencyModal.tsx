"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Bed,
  Clock,
  ArrowRight,
  Flame,
  CheckCircle2,
  Send,
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
    { name: "Central Metro Junction", lat: 28.6139, lon: 77.2090 },
    { name: "South Corridor Industrial Zone", lat: 28.5200, lon: 77.1800 },
    { name: "East Highway Expressway", lat: 28.6400, lon: 77.3000 },
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
        incident_type: activate ? "Mass Casualty Incident (Highway Surge)" : "None",
        surge_multiplier: activate ? 2.5 : 1.0,
        incident_location: "Central Zone",
      });
      onRefreshEmergencyStatus();
    } catch (err) {
      alert("Failed to toggle emergency mode.");
    } finally {
      setToggling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl w-full max-w-2xl p-6 space-y-5 border border-slate-200 shadow-2xl animate-scale-in max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Flame className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Emergency Surge Mode & Location Search</h3>
              <p className="text-xs text-slate-500">
                Elevates emergency medicine reserves by 2.5x and locates nearest network hospitals by GPS
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Emergency Surge Toggle Card */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="font-bold text-xs text-slate-900">
              Emergency Surge Protocol Status:{" "}
              <span className={isEmergencyActive ? "text-rose-600 font-extrabold" : "text-slate-600"}>
                {isEmergencyActive ? "ACTIVE (2.5x Multiplier)" : "OFF (Standard Buffers)"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              When activated, trauma safety stock is scaled up 2.5x across all departments.
            </p>
          </div>

          <button
            onClick={() => handleToggleEmergency(!isEmergencyActive)}
            disabled={toggling}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              isEmergencyActive
                ? "bg-slate-900 text-white hover:bg-slate-800"
                : "bg-rose-600 text-white hover:bg-rose-700 shadow-sm"
            }`}
          >
            {toggling ? "Updating..." : isEmergencyActive ? "Turn Off Surge" : "Activate 2.5x Surge"}
          </button>
        </div>

        {/* Proximity Location Search */}
        <div className="space-y-3 pt-1">
          <h4 className="text-xs font-bold text-slate-900">Locate Nearest Hospital by Incident GPS:</h4>

          <div className="flex flex-wrap gap-2 text-xs">
            {presets.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setLat(p.lat);
                  setLon(p.lon);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-[11px]"
              >
                {p.name}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Latitude:
              </label>
              <input
                type="number"
                step="0.0001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Longitude:
              </label>
              <input
                type="number"
                step="0.0001"
                value={lon}
                onChange={(e) => setLon(parseFloat(e.target.value))}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                Required Bed Unit:
              </label>
              <select
                value={bedType}
                onChange={(e) => setBedType(e.target.value)}
                className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-900 focus:outline-none"
              >
                <option value="Trauma">Trauma Unit</option>
                <option value="ICU">Intensive Care (ICU)</option>
                <option value="General">General Ward</option>
                <option value="Oxygen">Oxygen Bed</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSearch}
              disabled={loadingSearch}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-xs"
            >
              {loadingSearch ? "Searching..." : "Search Nearest Facilities"}
            </button>
          </div>
        </div>

        {/* Results List */}
        {searchResults.length > 0 && (
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <div className="text-xs font-bold text-slate-900">
              Ranked Facilities by Distance ({searchResults.length}):
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {searchResults.map((h, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-slate-900">#{idx + 1} {h.name}</span>
                    <div className="text-[11px] text-slate-500 font-medium">
                      {h.distance_km} km away (~{h.estimated_transit_mins} mins travel)
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-emerald-700">
                      {h.matching_beds_available} {bedType} beds open
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      Total free beds: {h.total_available_beds}
                    </span>
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
