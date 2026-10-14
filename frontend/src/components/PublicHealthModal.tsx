"use client";

import React, { useState } from "react";
import { X, Radio, Sparkles, Send, Database, AlertTriangle, CheckCircle, Search } from "lucide-react";
import { ingestHealthSignal } from "@/lib/api";

interface PublicHealthModalProps {
  onClose: () => void;
  onAlertCreated: () => void;
}

export default function PublicHealthModal({ onClose, onAlertCreated }: PublicHealthModalProps) {
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [source, setSource] = useState("National Centre for Disease Control (NCDC)");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const presets = [
    {
      title: "Dengue Surge (South Zone)",
      headline: "Dengue Serotype-2 Epidemic Spike Detected in South Zone Districts",
      content: "Surveillance reports record a 220% spike in platelet demand and acute hemorrhagic cases across South Zone. Hospital networks advised to secure crystalloid IV fluids and platelet preparation consumables immediately.",
    },
    {
      title: "H1N1 Influenza Cluster (North Corridor)",
      headline: "Early Autumn Seasonal Influenza & Respiratory Infection Surge",
      content: "Acute respiratory infection clusters detected in North Corridor primary clinics. Increased admission of elderly and pediatric cases requiring broad-spectrum antibiotics and nebulizer respules.",
    },
    {
      title: "Waterborne Acute Diarrhea Cluster",
      headline: "Gastroenteritis Outbreak Follows Flooding in Eastern Suburban Belt",
      content: "Contaminated municipal water line causes surge of severe dehydration admissions. Urgent requirement for Ringer's Lactate, Normal Saline crystalloids, and Oral Rehydration Salts.",
    },
  ];

  const handleIngest = async () => {
    if (!headline || !content) return;
    setLoading(true);
    try {
      const res = await ingestHealthSignal({
        headline,
        content,
        source_agency: source,
      });
      setResult(res);
      onAlertCreated();
      if (res.preparedness_alert_generated) {
        onAlertCreated();
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Unable to process health bulletin");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div className="bg-slate-950 rounded-2xl shadow-xl border w-full max-w-3xl p-6 space-y-5 max-h-[92vh] overflow-y-auto border-indigo-500/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.3)]">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                Add a Public Health Bulletin
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-800">
                  Health report analysis
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Check a health report against medicine stock and generate a preparedness alert
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets */}
        <div className="space-y-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider font-mono">
            Try an example bulletin:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {presets.map((p) => (
              <button
                key={p.title}
                onClick={() => {
                  setHeadline(p.headline);
                  setContent(p.content);
                }}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-left text-xs transition-all hover:bg-slate-800/60"
              >
                <span className="font-bold text-indigo-300 block mb-1">{p.title}</span>
                <span className="text-[11px] text-slate-400 line-clamp-2">{p.headline}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Ingestion Input Form */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Bulletin Headline</label>
            <input
              type="text"
              placeholder="e.g. Dengue Serotype-2 Spike in South Zone..."
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Report details</label>
            <textarea
              rows={3}
              placeholder="Detailed epidemic bulletin text with clinical observations..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="text-xs text-slate-300 font-medium block mb-1">Source Health Authority</label>
            <input
              type="text"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-300 font-mono"
            />
          </div>

          <button
            onClick={handleIngest}
            disabled={loading || !headline || !content}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {loading ? "Checking report against stock…" : "Analyze bulletin"}
          </button>
        </div>

        {/* Results Preview */}
        {result && (
          <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-indigo-400" /> Health bulletin analyzed
              </span>
              <span className="text-[10px] font-mono text-emerald-400">Inventory checked</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block">Disease detected:</span>
                <span className="text-white font-bold">{result.signal_processed.disease_entity}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Location:</span>
                <span className="text-white font-bold">{result.signal_processed.location}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Severity:</span>
                <span className="text-rose-400 font-bold">{result.signal_processed.severity}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Outbreak Level:</span>
                <span className="text-amber-400 font-bold">{result.signal_processed.outbreak_level}</span>
              </div>
            </div>

            {!result.preparedness_alert_generated && <p className="text-slate-300">Bulletin processed. No matching medicines were found for a stock preparedness alert.</p>}
            {result.preparedness_alert_generated && result.alert && (
              <div className="mt-3 p-3 rounded-lg bg-indigo-950/40 border border-indigo-800/80 space-y-1.5">
                <span className="font-bold text-amber-300 block">🚨 Generated Preparedness Alert:</span>
                <p className="text-slate-200">{result.alert.recommended_action}</p>
                <p className="text-[11px] text-slate-400 font-mono">{result.alert.mathematical_reasoning}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
