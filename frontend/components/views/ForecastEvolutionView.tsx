'use client';

import React, { useState, useEffect } from 'react';
import { 
  History, 
  ArrowRight, 
  TrendingUp, 
  Clock, 
  MapPin, 
  AlertTriangle, 
  Layers, 
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { getForecastEvolution } from '@/lib/api';

export const ForecastEvolutionView: React.FC = () => {
  const [evolutionData, setEvolutionData] = useState<any>(null);
  const [selectedRunId, setSelectedRunId] = useState<string>('RUN-20260926-18Z');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const data = await getForecastEvolution();
        setEvolutionData(data);
        if (data?.latest_run?.run_id) {
          setSelectedRunId(data.latest_run.run_id);
        }
      } catch (err) {
        console.error("Failed to load forecast evolution data", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading || !evolutionData) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050914] text-slate-400 font-mono text-xs">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-2"></div>
        <span>Loading Forecast Run Evolution Timeline...</span>
      </div>
    );
  }

  const { all_runs, latest_run, previous_run, comparison } = evolutionData;
  const currentRun = all_runs.find((r: any) => r.run_id === selectedRunId) || latest_run;

  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-[#050914] text-slate-100 space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] border border-[#1e293b] p-4 rounded-lg shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-purple-950/80 border border-purple-800 text-purple-400">
            <History className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-slate-100">FORECAST RUN EVOLUTION</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                MULTI-CYCLE TRACKER
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Tracks run-to-run spatial track displacement, intensity revisions, and landfall timing acceleration.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <Clock className="w-3.5 h-3.5 text-cyan-400" />
          <span>CYCLES: 00Z → 06Z → 12Z → 18Z</span>
        </div>
      </div>

      {/* Cycle Progression Selector */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {all_runs.map((run: any, idx: number) => {
          const isSelected = run.run_id === selectedRunId;
          const isLatest = run.run_id === latest_run.run_id;

          return (
            <button
              key={run.run_id}
              onClick={() => setSelectedRunId(run.run_id)}
              className={`p-3 rounded-lg border text-left transition-all ${
                isSelected 
                  ? 'bg-purple-950/50 border-purple-500 shadow-lg shadow-purple-950/30' 
                  : 'bg-[#0b1329] border-[#1e293b] hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-xs font-bold text-slate-200">
                  CYCLE {run.cycle}
                </span>
                {isLatest && (
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 font-bold">
                    LATEST
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 font-mono">
                {run.init_time.slice(0, 16).replace('T', ' ')} UTC
              </div>
              <div className="mt-2 text-xs font-semibold text-slate-300">
                {run.landfall_sector}
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] font-mono text-cyan-400">
                <span>{run.peak_wind_kmh} km/h</span>
                <span>{run.central_pressure_hpa} hPa</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Latest Run Evolution Delta Metrics (Section 14) */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-200 font-mono text-xs font-bold">
            <TrendingUp className="w-4 h-4 text-cyan-400" />
            <span>RUN-TO-RUN DELTA: CYCLE 12Z vs 18Z</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            MODEL: WeatherNext Cyclones Deep Learning
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
          <div className="p-3 rounded bg-[#080d1a] border border-[#1e293b]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Track Displacement</div>
            <div className="text-base font-bold font-mono text-cyan-400 mt-1">
              +{comparison.track_shift_km} km
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">{comparison.track_shift_direction}</div>
          </div>

          <div className="p-3 rounded bg-[#080d1a] border border-[#1e293b]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Intensity Revision</div>
            <div className="text-base font-bold font-mono text-amber-400 mt-1">
              +{comparison.intensity_revision_kmh} km/h
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Peak wind upgraded to 180 km/h</div>
          </div>

          <div className="p-3 rounded bg-[#080d1a] border border-[#1e293b]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Landfall Timing Shift</div>
            <div className="text-base font-bold font-mono text-red-400 mt-1">
              {comparison.landfall_time_shift_hours} hrs
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Landfall accelerated by ~90 mins</div>
          </div>

          <div className="p-3 rounded bg-[#080d1a] border border-[#1e293b]">
            <div className="text-[10px] font-mono text-slate-400 uppercase">Severe Risk Area Delta</div>
            <div className="text-base font-bold font-mono text-purple-400 mt-1">
              +{comparison.high_risk_area_change_pct}%
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Corridor expanded northeastward</div>
          </div>
        </div>

        <div className="p-3 rounded bg-[#0b1329] border border-cyan-900/60 text-xs text-slate-300 leading-relaxed font-sans">
          <span className="font-bold text-cyan-400 font-mono">SCIENTIFIC RUN EVOLUTION SUMMARY: </span>
          {comparison.key_changes_summary}
        </div>
      </div>

      {/* Side-by-Side Run Comparison Table */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
        <h3 className="font-mono text-xs font-bold text-slate-200">HISTORICAL CYCLE DRIFT MATRIX</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left">
            <thead className="bg-[#080d1a] text-slate-400 border-b border-[#1e293b]">
              <tr>
                <th className="py-2.5 px-3">CYCLE</th>
                <th className="py-2.5 px-3">INITIALIZATION TIME</th>
                <th className="py-2.5 px-3">PROJECTED LANDFALL</th>
                <th className="py-2.5 px-3">TARGET COORDINATES</th>
                <th className="py-2.5 px-3">PEAK WIND</th>
                <th className="py-2.5 px-3">MSLP</th>
                <th className="py-2.5 px-3">IMPACT AREA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b] text-slate-300">
              {all_runs.map((r: any) => (
                <tr 
                  key={r.run_id} 
                  className={`hover:bg-[#1e293b]/40 ${r.run_id === selectedRunId ? 'bg-purple-950/20' : ''}`}
                >
                  <td className="py-2.5 px-3 font-bold text-purple-400">{r.cycle}</td>
                  <td className="py-2.5 px-3 text-slate-400">{r.init_time}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-semibold">{r.landfall_sector}</td>
                  <td className="py-2.5 px-3 text-cyan-400">{r.landfall_lat.toFixed(2)}°N, {r.landfall_lon.toFixed(2)}°E</td>
                  <td className="py-2.5 px-3 text-amber-400">{r.peak_wind_kmh} km/h</td>
                  <td className="py-2.5 px-3 text-slate-300">{r.central_pressure_hpa} hPa</td>
                  <td className="py-2.5 px-3 text-slate-400">{r.impact_area_sqkm.toLocaleString()} sq km</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
