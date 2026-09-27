'use client';

import React, { useState, useEffect } from 'react';
import { 
  GitCompare, 
  Wind, 
  Compass, 
  Gauge, 
  ShieldCheck, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Activity
} from 'lucide-react';
import { getModelComparison } from '@/lib/api';
import { MultiModelConsensus, ModelComparisonEntry } from '@/lib/types';

export const ModelComparisonView: React.FC = () => {
  const [consensus, setConsensus] = useState<MultiModelConsensus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getModelComparison();
        setConsensus(data);
      } catch (err) {
        console.error("Failed to load model comparison data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !consensus) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050914] text-slate-400 font-mono text-xs">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span>Evaluating Multi-Model Consensus & Spread...</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-[#050914] text-slate-100 space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] border border-[#1e293b] p-4 rounded-lg shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-cyan-950/80 border border-cyan-800 text-cyan-400">
            <GitCompare className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-slate-100">MULTI-MODEL FORECAST CONSENSUS</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800">
                SCIENTIFIC INTER-COMPARISON
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Strictly objective model verification. Does not declare an arbitrary single winner; synthesizes multi-model spread.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/80 px-2.5 py-1 rounded border border-emerald-800">
            INTER-MODEL SPREAD: {consensus.inter_model_track_spread_km} KM
          </span>
        </div>
      </div>

      {/* Consensus Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Average Track Spread</div>
          <div className="text-lg font-bold font-mono text-cyan-400">
            {consensus.inter_model_track_spread_km} km
          </div>
          <p className="text-[11px] text-slate-400">
            Mean pairwise track displacement between IMD, WeatherNext, and ECMWF.
          </p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Intensity Spread</div>
          <div className="text-lg font-bold font-mono text-amber-400">
            ±{consensus.inter_model_intensity_spread_kmh} km/h
          </div>
          <p className="text-[11px] text-slate-400">
            Maximum peak wind variance across numerical and AI prediction suites.
          </p>
        </div>

        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3.5 space-y-1">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Consensus Confidence</div>
          <div className="text-lg font-bold font-mono text-emerald-400">
            HIGH (&lt; 25 km through +36h)
          </div>
          <p className="text-[11px] text-slate-400">
            All three models converge tightly on the Puri-Astaranga coastal belt.
          </p>
        </div>
      </div>

      {/* Model Comparison Matrix Table (Section 50) */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3 shadow-xl">
        <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
          <h3 className="font-mono text-xs font-bold text-slate-200">
            MODEL SPECIFICATION & VERIFICATION BENCHMARK TABLE
          </h3>
          <span className="text-[10px] font-mono text-slate-400">
            DATA CLASSIFICATION: MODEL_OUTPUT
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-[#080d1a] text-slate-400 border-b border-[#1e293b]">
              <tr>
                <th className="py-3 px-3">FORECASTING MODEL</th>
                <th className="py-3 px-3">MAX WIND</th>
                <th className="py-3 px-3">PROJECTED LANDFALL WINDOW</th>
                <th className="py-3 px-3">ENSEMBLE SPREAD</th>
                <th className="py-3 px-3">FRESHNESS</th>
                <th className="py-3 px-3">DATA QUALITY</th>
                <th className="py-3 px-3">HIST. 24H ERROR</th>
                <th className="py-3 px-3">HIST. 48H ERROR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-slate-300">
              {consensus.model_entries.map((m: ModelComparisonEntry, idx: number) => (
                <tr key={m.model_name} className="hover:bg-[#1e293b]/40">
                  <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${idx === 1 ? 'bg-cyan-400' : idx === 0 ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                    {m.model_name}
                  </td>
                  <td className="py-3 px-3 font-semibold text-amber-400">{m.intensity_max_kmh} km/h</td>
                  <td className="py-3 px-3 text-slate-200">{m.landfall_window}</td>
                  <td className="py-3 px-3 text-cyan-400">{m.spread_km} km</td>
                  <td className="py-3 px-3 text-slate-400">{m.freshness_minutes}m ago</td>
                  <td className="py-3 px-3 font-bold text-emerald-400">{m.data_quality_pct}%</td>
                  <td className="py-3 px-3 text-slate-300">{m.historical_24h_error_km} km</td>
                  <td className="py-3 px-3 text-slate-300">{m.historical_48h_error_km} km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Model Consensus Centroid Track */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
        <h3 className="font-mono text-xs font-bold text-slate-200">
          COMPOSITE CENTROID TRACK (OBJECTIVE MULTI-MODEL SYNTHESIS)
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {consensus.consensus_track.map((pt: any) => (
            <div key={pt.lead_hours} className="bg-[#080d1a] border border-[#1e293b] rounded p-2.5 font-mono text-xs">
              <div className="text-cyan-400 font-bold">+{pt.lead_hours}h LEAD TIME</div>
              <div className="text-slate-300 mt-1">{pt.lat.toFixed(2)}°N, {pt.lon.toFixed(2)}°E</div>
              <div className="text-amber-400 mt-0.5">{pt.max_wind_kmh} km/h</div>
              <div className="text-slate-400 text-[10px] mt-1">Spread: ±{pt.model_spread_km} km</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded bg-[#0b1329] border border-[#1e293b] text-xs text-slate-300 leading-relaxed font-sans">
          <span className="font-bold text-cyan-400 font-mono">ASSESSMENT: </span>
          {consensus.confidence_assessment}
        </div>
      </div>
    </div>
  );
};
