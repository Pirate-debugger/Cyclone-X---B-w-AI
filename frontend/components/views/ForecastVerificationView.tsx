'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  BarChart3, 
  Target, 
  Award, 
  FileCheck, 
  Clock, 
  AlertTriangle,
  HelpCircle
} from 'lucide-react';
import { getBacktestMetrics } from '@/lib/api';

export const ForecastVerificationView: React.FC = () => {
  const [selectedStormId, setSelectedStormId] = useState('hist-fani-2019');
  const [verificationData, setVerificationData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const storms = [
    { id: 'hist-fani-2019', name: 'Cyclone FANI (May 2019)', basin: 'Bay of Bengal', intensity: 'Category 4 / Extremely Severe', landfall: 'Puri, Odisha' },
    { id: 'hist-amphan-2020', name: 'Cyclone AMPHAN (May 2020)', basin: 'Bay of Bengal', intensity: 'Category 5 / Super Cyclone', landfall: 'West Bengal' },
    { id: 'hist-mocha-2023', name: 'Cyclone MOCHA (May 2023)', basin: 'Bay of Bengal', intensity: 'Category 5 / Super Cyclone', landfall: 'Sittwe, Myanmar' }
  ];

  useEffect(() => {
    async function loadMetrics() {
      setLoading(true);
      try {
        const data = await getBacktestMetrics(selectedStormId);
        setVerificationData(data);
      } catch (err) {
        console.error("Failed to load verification metrics", err);
      } finally {
        setLoading(false);
      }
    }
    loadMetrics();
  }, [selectedStormId]);

  return (
    <div className="w-full h-full p-4 overflow-y-auto bg-[#050914] text-slate-100 space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0f172a] border border-[#1e293b] p-4 rounded-lg shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold font-mono text-slate-100">SCIENTIFIC FORECAST VERIFICATION & BACKTESTING</h2>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                IBTRACS GROUND TRUTH
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical validation against historical best-track archives. Evaluates deterministic errors and probabilistic Brier/CRPS scores.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-slate-400">SELECT BENCHMARK EVENT:</span>
          <select
            value={selectedStormId}
            onChange={(e) => setSelectedStormId(e.target.value)}
            className="bg-[#0b1329] border border-[#334155] rounded px-3 py-1.5 font-mono text-xs text-cyan-300 focus:outline-none focus:border-cyan-500"
          >
            {storms.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      {loading || !verificationData ? (
        <div className="w-full h-64 flex flex-col items-center justify-center text-slate-400 font-mono text-xs">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mb-2"></div>
          <span>Retrieving IBTrACS Best Track Records & Model Outputs...</span>
        </div>
      ) : (
        <>
          {/* Historical Storm Info Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded-lg font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Storm Name</span>
              <div className="text-sm font-bold text-slate-100 mt-1">{verificationData.storm_info?.storm_name}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Year: {verificationData.storm_info?.year}</div>
            </div>

            <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded-lg font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Basin & Location</span>
              <div className="text-sm font-bold text-cyan-400 mt-1">{verificationData.storm_info?.basin}</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Landfall: {verificationData.storm_info?.landfall_location}</div>
            </div>

            <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded-lg font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Observed Peak Wind</span>
              <div className="text-sm font-bold text-amber-400 mt-1">{verificationData.storm_info?.peak_intensity_kmh} km/h</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Category 4/5 Cyclone</div>
            </div>

            <div className="bg-[#0f172a] border border-[#1e293b] p-3 rounded-lg font-mono">
              <span className="text-[10px] text-slate-400 uppercase">Observed Min MSLP</span>
              <div className="text-sm font-bold text-purple-400 mt-1">{verificationData.storm_info?.min_pressure_hpa} hPa</div>
              <div className="text-[10px] text-slate-400 mt-0.5">Barometric Minimum</div>
            </div>
          </div>

          {/* Verification Metrics Comparison Table (Section 35) */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between pb-2 border-b border-[#1e293b]">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-400" />
                <h3 className="font-mono text-xs font-bold text-slate-200">
                  OBJECTIVE METRIC COMPARISON TABLE (VERIFIED AGAINST IBTRACS)
                </h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                SCIENTIFIC CALIBRATION METRICS
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-[#080d1a] text-slate-400 border-b border-[#1e293b]">
                  <tr>
                    <th className="py-3 px-3">MODEL</th>
                    <th className="py-3 px-3">TRACK 24H</th>
                    <th className="py-3 px-3">TRACK 48H</th>
                    <th className="py-3 px-3">TRACK 72H</th>
                    <th className="py-3 px-3">INTENSITY MAE</th>
                    <th className="py-3 px-3">PRESSURE MAE</th>
                    <th className="py-3 px-3">LANDFALL TIME ERR</th>
                    <th className="py-3 px-3">LANDFALL LOC ERR</th>
                    <th className="py-3 px-3">BRIER SCORE</th>
                    <th className="py-3 px-3">CRPS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b] text-slate-300">
                  {verificationData.models_compared.map((m: any, idx: number) => (
                    <tr key={m.model_name} className="hover:bg-[#1e293b]/40">
                      <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-cyan-400' : idx === 1 ? 'bg-red-400' : 'bg-emerald-400'}`}></span>
                        {m.model_name}
                      </td>
                      <td className="py-3 px-3 font-semibold text-cyan-400">{m.track_error_24h_km} km</td>
                      <td className="py-3 px-3 font-bold text-cyan-400">{m.track_error_48h_km} km</td>
                      <td className="py-3 px-3 text-slate-300">{m.track_error_72h_km} km</td>
                      <td className="py-3 px-3 text-amber-400">±{m.intensity_mae_kmh} km/h</td>
                      <td className="py-3 px-3 text-slate-300">±{m.pressure_mae_hpa} hPa</td>
                      <td className="py-3 px-3 text-red-400">{m.landfall_time_error_hrs} hrs</td>
                      <td className="py-3 px-3 text-slate-200">{m.landfall_location_error_km} km</td>
                      <td className="py-3 px-3 font-bold text-emerald-400">{m.brier_score_wind_exceedance}</td>
                      <td className="py-3 px-3 text-slate-300">{m.crps_intensity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[11px] text-slate-400 p-2.5 bg-[#080d1a] border border-[#1e293b] rounded flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>
                <b>Note on Probabilistic Metrics:</b> Lower Brier Score (0 to 1) denotes superior threshold calibration. 
                CRPS (Continuous Ranked Probability Score) measures continuous distribution accuracy against observed wind speed.
              </span>
            </div>
          </div>

          {/* Benchmark Ground-Truth Track vs Model */}
          <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 space-y-3">
            <h3 className="font-mono text-xs font-bold text-slate-200">
              OBSERVED GROUND-TRUTH BEST TRACK (IBTRACS ARCHIVE)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {verificationData.observed_best_track.map((pt: any) => (
                <div key={pt.lead_hours} className="bg-[#080d1a] border border-[#1e293b] rounded p-3 font-mono text-xs">
                  <div className="text-emerald-400 font-bold">+{pt.lead_hours}h VERIFICATION POINT</div>
                  <div className="text-slate-200 mt-1">{pt.lat}°N, {pt.lon}°E</div>
                  <div className="text-amber-400 mt-0.5">Wind: {pt.wind_kmh} km/h</div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded bg-[#0b1329] border border-[#1e293b] text-xs text-slate-300 leading-relaxed font-sans">
              <span className="font-bold text-emerald-400 font-mono">SCIENTIFIC BENCHMARK SUMMARY: </span>
              {verificationData.benchmark_summary}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
