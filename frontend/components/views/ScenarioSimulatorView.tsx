'use client';

import React, { useState } from 'react';
import { Sliders, Play, RotateCcw, AlertTriangle, ArrowRight, TrendingUp, Users, Building, ShieldAlert } from 'lucide-react';
import { ScenarioComparison, ScenarioRunRequest } from '../../lib/types';
import { runScenario } from '../../lib/api';

export const ScenarioSimulatorView: React.FC = () => {
  const [windMultiplier, setWindMultiplier] = useState<number>(1.2);
  const [rainMultiplier, setRainMultiplier] = useState<number>(1.3);
  const [surgeScenarioM, setSurgeScenarioM] = useState<number>(2.5);
  const [trackShiftKm, setTrackShiftKm] = useState<number>(15.0);
  const [loading, setLoading] = useState<boolean>(false);
  const [scenarioResult, setScenarioResult] = useState<ScenarioComparison | null>(null);

  const handleRunSimulation = async () => {
    setLoading(true);
    try {
      const payload: ScenarioRunRequest = {
        wind_multiplier: windMultiplier,
        rain_multiplier: rainMultiplier,
        surge_scenario_m: surgeScenarioM,
        track_shift_km: trackShiftKm,
        landfall_shift_hours: 0.0
      };
      const res = await runScenario(payload);
      setScenarioResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setWindMultiplier(1.0);
    setRainMultiplier(1.0);
    setSurgeScenarioM(2.0);
    setTrackShiftKm(0.0);
    setScenarioResult(null);
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">CYCLONE-X WHAT-IF SCENARIO SIMULATOR</h2>
            <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono font-bold">
              STRESS-TEST ENGINE
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Model compound disaster escalation by adjusting cyclone intensity, rainfall, storm surge height, and track shift.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 bg-[#080d1a] hover:bg-[#1e293b] border border-[#1e293b] text-slate-300 px-3 py-1.5 rounded transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Sliders</span>
          </button>
          <button
            onClick={handleRunSimulation}
            disabled={loading}
            className="flex items-center gap-2 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-bold px-4 py-1.5 rounded shadow-lg transition-all disabled:opacity-50"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>{loading ? 'COMPUTING DELTAS...' : 'RUN SCENARIO'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Parameter Controls */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4">
        <span className="font-bold text-slate-200 text-xs uppercase font-mono block mb-3">
          1. ADJUST PHYSICAL SCENARIO DRIVERS
        </span>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Wind Multiplier */}
          <div className="bg-[#080d1a] p-3 rounded border border-[#1e293b]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-semibold">Wind Intensity</span>
              <span className="font-mono text-cyan-400 font-bold">{windMultiplier.toFixed(1)}× ({Math.round(155 * windMultiplier)} km/h)</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={windMultiplier}
              onChange={(e) => setWindMultiplier(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.5× (Depression)</span>
              <span>2.0× (Super Cyclone)</span>
            </div>
          </div>

          {/* Rainfall Multiplier */}
          <div className="bg-[#080d1a] p-3 rounded border border-[#1e293b]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-semibold">Precipitation Volume</span>
              <span className="font-mono text-cyan-400 font-bold">{rainMultiplier.toFixed(1)}× ({Math.round(220 * rainMultiplier)} mm/24h)</span>
            </div>
            <input 
              type="range"
              min="0.5"
              max="2.5"
              step="0.1"
              value={rainMultiplier}
              onChange={(e) => setRainMultiplier(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.5× (Light)</span>
              <span>2.5× (Deluge)</span>
            </div>
          </div>

          {/* Surge Scenario */}
          <div className="bg-[#080d1a] p-3 rounded border border-[#1e293b]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-semibold">Scenario Surge Height</span>
              <span className="font-mono text-cyan-400 font-bold">+{surgeScenarioM.toFixed(1)} m</span>
            </div>
            <input 
              type="range"
              min="0.0"
              max="6.0"
              step="0.2"
              value={surgeScenarioM}
              onChange={(e) => setSurgeScenarioM(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>0.0m (Tide only)</span>
              <span>6.0m (Catastrophic)</span>
            </div>
          </div>

          {/* Track Shift */}
          <div className="bg-[#080d1a] p-3 rounded border border-[#1e293b]">
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-400 font-semibold">Track Lateral Shift</span>
              <span className="font-mono text-cyan-400 font-bold">{trackShiftKm > 0 ? `+${trackShiftKm}km (East)` : `${trackShiftKm}km`}</span>
            </div>
            <input 
              type="range"
              min="-50"
              max="50"
              step="5"
              value={trackShiftKm}
              onChange={(e) => setTrackShiftKm(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>-50km (South)</span>
              <span>+50km (North)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comparison Delta Display (BEFORE vs AFTER) */}
      {scenarioResult ? (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-200 text-xs uppercase font-mono">
              2. SIMULATION IMPACT COMPARISON DELTA ({scenarioResult.scenario_id})
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-900/60 font-mono">
              {scenarioResult.disclaimer}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Overall Risk Delta */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] text-slate-500 uppercase block">Composite Risk Score</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-slate-400 font-mono text-base">{scenarioResult.baseline.overall_risk}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-red-400 font-mono text-xl font-bold">{scenarioResult.simulated.overall_risk}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 mt-1 block">
                +{scenarioResult.delta.overall_risk_delta} pts escalation
              </span>
            </div>

            {/* Severe Hotspots Delta */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] text-slate-500 uppercase block">Severe Risk Hotspots</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-slate-400 font-mono text-base">{scenarioResult.baseline.severe_hotspots_count}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-red-400 font-mono text-xl font-bold">{scenarioResult.simulated.severe_hotspots_count}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 mt-1 block">
                +{scenarioResult.delta.severe_hotspots_delta} additional severe sectors
              </span>
            </div>

            {/* Critical Assets Delta */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] text-slate-500 uppercase block">Critical Lifelines Exposed</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-slate-400 font-mono text-base">{scenarioResult.baseline.critical_assets_at_severe_risk}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-red-400 font-mono text-xl font-bold">{scenarioResult.simulated.critical_assets_at_severe_risk}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 mt-1 block">
                +{scenarioResult.delta.critical_assets_delta} critical assets at risk
              </span>
            </div>

            {/* Population Delta */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] text-slate-500 uppercase block">Population in Severe Threat</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-slate-400 font-mono text-sm">{scenarioResult.baseline.total_population_at_severe_risk.toLocaleString()}</span>
                <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                <span className="text-red-400 font-mono text-lg font-bold">{scenarioResult.simulated.total_population_at_severe_risk.toLocaleString()}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-red-400 mt-1 block">
                +{scenarioResult.delta.population_exposed_pct_change}% population increase
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-8 text-center text-slate-500">
          <Sliders className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-60" />
          <p className="text-xs">Adjust scenario multipliers above and click <b>RUN SCENARIO</b> to compute the before vs after impact delta.</p>
        </div>
      )}
    </div>
  );
};
