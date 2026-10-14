"use client";

import React, { useState, useEffect } from "react";
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
import { fetchDispatches, createDispatch, updateDispatch, updateBeds } from "@/lib/api";
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

  const [dispatches, setDispatches] = useState<any[]>([]);
  const [dispatchBeds, setDispatchBeds] = useState("Trauma");
  const [patients, setPatients] = useState(1);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [bedEditor, setBedEditor] = useState<NetworkHospital | null>(null);
  const [editBedType, setEditBedType] = useState("Trauma");
  const [editAvailability, setEditAvailability] = useState(0);
  const [destinations, setDestinations] = useState<Record<number, number>>({});
  const loadDispatches = () => fetchDispatches().then(setDispatches).catch(e => setNotice(e.message));
  useEffect(() => {loadDispatches();}, [hospitals]);
  const perform = async (action: () => Promise<any>, success: string) => {
    setBusy(true); setNotice("");
    try {await action(); await loadDispatches(); onRefreshHospitals?.(); setPatientDispatchModal(null); setBedEditor(null); setNotice(success);}
    catch(e: any) {setNotice(e.message);} finally {setBusy(false);}
  };
  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId) || hospitals[0];

  // Ranked hospitals sorted by distance
  const sortedHospitals = [...hospitals].filter(h => bedTypeFilter === "ALL" || (h.beds || []).some(b => b.bed_type.toUpperCase() === bedTypeFilter && b.available_beds > 0)).sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0));

  return (
    <div className="space-y-6">
      {notice && <p role="status" className="p-4 rounded-xl border border-sky-200 bg-sky-50 text-sky-900 text-sm">{notice}</p>}
      <div className="flex gap-3 items-center text-xs"><label htmlFor="bed-filter">Find available beds:</label><select id="bed-filter" value={bedTypeFilter} onChange={e => setBedTypeFilter(e.target.value as any)} className="p-2 rounded-lg border bg-white"><option value="ALL">All bed types</option><option value="TRAUMA">Trauma</option><option value="ICU">Intensive care</option><option value="OXYGEN">Oxygen support</option></select><button onClick={onRefreshHospitals} className="p-2 border rounded-lg bg-white">Refresh hospitals</button></div>
      {/* View Header with Emergency Surge Protocol Switch */}
      <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200">
              <Hospital className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 tracking-tight">
                Hospital Beds & Patient Dispatch
              </h2>
              <p className="text-xs text-slate-500">
                Find available beds, manage capacity, and record patient transfers
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
              Hospital network overview (illustration)
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Reference location: 28.6139° N, 77.2090° E
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
                Reference location
              </span>
            </div>

            {/* Hospital Map Pin Markers */}
            {sortedHospitals.map((h, idx) => {
              const isSelected = selectedHospitalId === h.id;
              // Spatial offsets based on index / distance
              const angle = idx * (360 / sortedHospitals.length) + 40;
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
              Nearby Hospitals ({sortedHospitals.length})
            </h3>
            <span className="text-[11px] text-slate-400 font-mono">
              Distance from reference location
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

                    {/* Data Freshness Indicator ("Loaded from database") */}
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>Loaded from database</span>
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
                      <div className="text-[9px] text-amber-600">Intensive care</div>
                    </div>
                    <div className="p-1.5 rounded bg-sky-50 text-sky-800 border border-sky-100">
                      <div className="font-bold">{hospital.general_beds_available}</div>
                      <div className="text-[9px] text-sky-600">General</div>
                    </div>
                    <div className="p-1.5 rounded bg-teal-50 text-teal-800 border border-teal-100">
                      <div className="font-bold">{hospital.oxygen_beds_available}</div>
                      <div className="text-[9px] text-teal-600">Oxygen</div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPatientDispatchModal(hospital); setDispatchBeds(hospital.beds?.[0]?.bed_type || "Trauma"); setPatients(1);
                      }}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-all flex items-center gap-1"
                    >
                      <Send className="w-3 h-3" />
                      Dispatch patients
                    </button>

                    <button className="px-2 py-1 border rounded-lg text-xs" onClick={e => {e.stopPropagation(); setBedEditor(hospital); const b = hospital.beds?.[0]; setEditBedType(b?.bed_type || "Trauma"); setEditAvailability(b?.available_beds || 0);}}>Manage beds</button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        alert(`Direct hotline for ${hospital.name}: ${hospital.contact_phone || "No contact number recorded"}`);
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

      <section className="p-5 bg-white rounded-2xl border space-y-3"><h3 className="text-sm font-bold">Patient dispatch history</h3><p className="text-xs text-slate-500">Dispatch reserves beds. Rejecting or completing a dispatch releases them. Changing hospital moves the reservation only if the new hospital has capacity. Complete after the reservation is no longer needed.</p>
      {dispatches.length === 0 && <p className="text-sm text-slate-500">No dispatches recorded.</p>}
      {dispatches.map(d => <div key={d.id} className="border rounded-xl p-3 space-y-2 text-xs"><strong>Dispatch #{d.id}: {d.hospital_name}</strong><p>{d.patients} patients · {d.bed_type === "ICU" ? "Intensive care" : d.bed_type} · {d.status}</p>{d.status === "DISPATCHED" && <div className="flex flex-wrap gap-2"><select aria-label={`New hospital for dispatch ${d.id}`} className="border rounded-lg p-2" value={destinations[d.id] || ""} onChange={e => setDestinations({...destinations,[d.id]:Number(e.target.value)})}><option value="">Choose another hospital</option>{hospitals.filter(h => h.id !== d.hospital_id).map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select><button disabled={busy || !destinations[d.id]} className="border rounded-lg p-2 disabled:opacity-50" onClick={() => perform(() => updateDispatch(d.id,{action:"reassign",hospital_id:destinations[d.id]}),"Destination changed and bed reservation transferred.")}>Change hospital</button><button disabled={busy} className="border rounded-lg p-2 text-rose-700" onClick={() => perform(() => updateDispatch(d.id,{action:"reject"}),"Dispatch rejected and beds released.")}>Reject dispatch</button><button disabled={busy} className="border rounded-lg p-2" onClick={() => perform(() => updateDispatch(d.id,{action:"complete"}),"Dispatch completed and reservation released.")}>Complete dispatch</button></div>}</div>)}
      </section>
      {bedEditor && <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4"><div className="bg-white border rounded-2xl p-6 max-w-md w-full space-y-4"><h3 className="font-bold">Manage beds: {bedEditor.name}</h3><label className="block text-sm">Bed type<select aria-label="Manage bed type" className="w-full border rounded-lg p-2" value={editBedType} onChange={e => {setEditBedType(e.target.value); setEditAvailability(bedEditor.beds?.find(b => b.bed_type === e.target.value)?.available_beds || 0);}}>{bedEditor.beds?.map(b => <option key={b.bed_type} value={b.bed_type}>{b.bed_type === "ICU" ? "Intensive care" : b.bed_type} (capacity {b.total_capacity})</option>)}</select></label><label className="block text-sm">Available beds<input aria-label="Available beds" className="w-full border rounded-lg p-2" type="number" min="0" max={bedEditor.beds?.find(b => b.bed_type === editBedType)?.total_capacity} value={editAvailability} onChange={e => setEditAvailability(Number(e.target.value))}/></label><p className="text-xs text-slate-500">Occupied beds are calculated from total capacity. Active dispatch reservations cannot be overwritten.</p>{notice && <p className="text-rose-700 text-sm">{notice}</p>}<div className="flex gap-2 justify-end"><button disabled={busy} onClick={() => setBedEditor(null)} className="p-2 border rounded-lg">Cancel</button><button disabled={busy} onClick={() => perform(() => updateBeds(bedEditor.id,{bed_type:editBedType,available_beds:editAvailability}),"Bed availability saved.")} className="p-2 bg-slate-900 text-white rounded-lg">{busy ? "Saving…" : "Save beds"}</button></div></div></div>}

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
                  Confirm Patient Dispatch
                </h3>
                <p className="text-xs text-slate-500">
                  Target Facility: {patientDispatchModal.name}
                </p>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Distance & estimated travel:</span>
                <span className="font-bold text-slate-900 font-mono">
                  {patientDispatchModal.distance_km} km (~{patientDispatchModal.estimated_transit_mins} mins)
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Available Trauma Beds:</span>
                <span className="font-bold text-emerald-700 font-mono">
                  {patientDispatchModal.trauma_beds_available} beds available
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reservation:</span>
                <span className="font-bold text-slate-700">Beds are reserved only after confirmation</span>
              </div>
            </div>

            <div className="space-y-3 text-sm"><label className="block">Destination hospital<select aria-label="Destination hospital" className="w-full border rounded-lg p-2 mt-1" value={patientDispatchModal.id} onChange={e => setPatientDispatchModal(hospitals.find(h => h.id === Number(e.target.value)) || null)}>{hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}</select></label>
            <label className="block">Bed type<select aria-label="Dispatch bed type" className="w-full p-2 border rounded-lg" value={dispatchBeds} onChange={e => setDispatchBeds(e.target.value)}>{patientDispatchModal.beds?.map(b => <option key={b.bed_type} value={b.bed_type}>{b.bed_type === "ICU" ? "Intensive care" : b.bed_type} ({b.available_beds} free)</option>)}</select></label>
            <label className="block">Number of patients<input aria-label="Number of patients" className="w-full p-2 border rounded-lg" type="number" min="1" max="100" value={patients} onChange={e => setPatients(Number(e.target.value))}/></label></div>
            {notice && <p role="alert" className="text-sm text-rose-700">{notice}</p>}
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setPatientDispatchModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              <button
                disabled={busy || patients < 1}
                onClick={() => {
                  perform(() => createDispatch({hospital_id:patientDispatchModal.id, bed_type:dispatchBeds, patients}), "Patient dispatch saved and beds reserved.");
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-sm"
              >
                {busy ? "Saving…" : "Confirm dispatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
