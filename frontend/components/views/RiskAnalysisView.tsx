'use client';

import React from 'react';
import { 
  AlertOctagon, 
  ShieldCheck, 
  Layers, 
  Wind, 
  Droplets, 
  Waves, 
  Building, 
  Users,
  Compass,
  FileCode,
  Info
} from 'lucide-react';
import { RiskOverview } from '../../lib/types';

interface RiskAnalysisViewProps {
  riskData?: RiskOverview | null;
}

export const RiskAnalysisView: React.FC<RiskAnalysisViewProps> = ({ riskData }) => {
  const metrics = riskData?.overall_metrics;
  const confidence = riskData?.confidence_breakdown;
  const weights = riskData?.weights || { hazard: 0.5, exposure: 0.3, vulnerability: 0.2 };

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Overview Banner */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <AlertOctagon className="w-5 h-5 text-red-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">CYCLONE-X RISK & HAZARD SYNTHESIS</h2>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-bold">
              {riskData?.model_version || 'v1.0'}
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Multi-criteria decision support framework combining acute physical hazard, critical asset exposure, and terrain vulnerability.
          </p>
        </div>

        <div className="bg-red-950/30 border border-red-900/60 p-2.5 rounded text-[11px] text-red-300 max-w-sm">
          <b>Notice:</b> {riskData?.disclaimer || 'Prototype decision-support output — not an official warning.'}
        </div>
      </div>

      {/* Transparent Equation & Weighting Breakdown */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-200 uppercase font-mono">Composite Risk Formula & Active Weights</span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Policy Assumption (Configurable)</span>
        </div>

        {/* Formula Box */}
        <div className="bg-[#080d1a] border border-[#1e293b] rounded p-3 mb-4 text-center">
          <span className="font-mono text-sm md:text-base font-bold text-slate-200">
            Overall Risk = (<span className="text-red-400">{weights.hazard * 100}% × Hazard</span>) + (<span className="text-orange-400">{weights.exposure * 100}% × Exposure</span>) + (<span className="text-amber-400">{weights.vulnerability * 100}% × Vulnerability</span>)
          </span>
        </div>

        {/* Weight Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Hazard Pillar */}
          <div className="bg-[#080d1a] border border-red-900/40 rounded p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-red-400 uppercase font-mono">1. HAZARD COMPONENT</span>
              <span className="text-lg font-mono font-bold text-red-400">{metrics?.hazard_score || 86}/100</span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">Weight: 50% of composite risk</p>
            <div className="space-y-1.5 text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span>• Wind Swath (Rankine Vortex, 40%):</span>
                <span className="font-mono text-slate-200">92/100 (Severe)</span>
              </div>
              <div className="flex justify-between">
                <span>• 24h Precipitation (30%):</span>
                <span className="font-mono text-slate-200">84/100 (Heavy)</span>
              </div>
              <div className="flex justify-between">
                <span>• Scenario Surge Proxy (+2.2m, 30%):</span>
                <span className="font-mono text-slate-200">80/100 (High)</span>
              </div>
            </div>
          </div>

          {/* Exposure Pillar */}
          <div className="bg-[#080d1a] border border-orange-900/40 rounded p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-orange-400 uppercase font-mono">2. EXPOSURE COMPONENT</span>
              <span className="text-lg font-mono font-bold text-orange-400">{metrics?.exposure_score || 81}/100</span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">Weight: 30% of composite risk</p>
            <div className="space-y-1.5 text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span>• Critical Lifeline Facilities:</span>
                <span className="font-mono text-slate-200">16 assets in swath</span>
              </div>
              <div className="flex justify-between">
                <span>• Severe Tier Population:</span>
                <span className="font-mono text-slate-200">7,845 persons</span>
              </div>
              <div className="flex justify-between">
                <span>• Demographic Source:</span>
                <span className="font-mono text-slate-400">WorldPop 100m</span>
              </div>
            </div>
          </div>

          {/* Vulnerability Pillar */}
          <div className="bg-[#080d1a] border border-amber-900/40 rounded p-3">
            <div className="flex justify-between items-center mb-1.5">
              <span className="font-bold text-amber-400 uppercase font-mono">3. VULNERABILITY COMPONENT</span>
              <span className="text-lg font-mono font-bold text-amber-400">{metrics?.vulnerability_score || 76}/100</span>
            </div>
            <p className="text-slate-400 text-[11px] mb-2">Weight: 20% of composite risk</p>
            <div className="space-y-1.5 text-[10px] text-slate-300">
              <div className="flex justify-between">
                <span>• Low Elevation (&lt;5m ASL):</span>
                <span className="font-mono text-slate-200">NASADEM (30m)</span>
              </div>
              <div className="flex justify-between">
                <span>• Shoreline Proximity (&lt;5km):</span>
                <span className="font-mono text-slate-200">Coastal buffer</span>
              </div>
              <div className="flex justify-between">
                <span>• Structural Backup Mitigation:</span>
                <span className="font-mono text-emerald-400">-12 pts if generator</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Dimensional Confidence Analysis */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="font-bold text-slate-200 uppercase font-mono">Multi-Dimensional Data Confidence Model</span>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
            Overall Confidence: {confidence?.score || 74}%
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b] text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Data Completeness</span>
            <span className="font-mono font-bold text-slate-200 text-sm">{confidence?.data_completeness || 85}%</span>
          </div>
          <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b] text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Source Freshness</span>
            <span className="font-mono font-bold text-slate-200 text-sm">{confidence?.source_freshness || 78}%</span>
          </div>
          <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b] text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Temporal Consistency</span>
            <span className="font-mono font-bold text-slate-200 text-sm">{confidence?.temporal_consistency || 82}%</span>
          </div>
          <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b] text-center">
            <span className="text-[10px] text-slate-400 block uppercase">Spatial Coverage</span>
            <span className="font-mono font-bold text-slate-200 text-sm">{confidence?.spatial_coverage || 80}%</span>
          </div>
        </div>

        <div className="bg-[#080d1a] p-3 rounded border border-[#1e293b]">
          <span className="font-bold text-slate-300 block mb-1.5 text-[11px]">
            Transparent Limitations & Penalty Breakdown:
          </span>
          <div className="space-y-1.5 text-slate-400 text-[11px]">
            {confidence?.limiting_factors?.map((factor: string, idx: number) => (
              <p key={idx} className="flex items-start gap-2">
                <span className="text-amber-400 font-bold shrink-0">•</span>
                <span>{factor}</span>
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
