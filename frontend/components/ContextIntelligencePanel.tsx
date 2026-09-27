'use client';

import React from 'react';
import { 
  AlertCircle, 
  MapPin, 
  Building2, 
  TrendingUp, 
  ShieldCheck, 
  Sparkles,
  Info,
  Clock,
  Compass,
  ArrowRight
} from 'lucide-react';
import { RiskOverview, GeminiStructuredExplanation, HotspotZone, InfrastructureRiskAssessment } from '../lib/types';

interface ContextIntelligencePanelProps {
  riskData?: RiskOverview | null;
  aiExplanation?: GeminiStructuredExplanation | null;
  selectedZone?: HotspotZone | null;
  selectedInfra?: InfrastructureRiskAssessment | null;
  onOpenCopilot?: () => void;
  onSelectZone?: (zone: HotspotZone) => void;
}

export const ContextIntelligencePanel: React.FC<ContextIntelligencePanelProps> = ({
  riskData,
  aiExplanation,
  selectedZone,
  selectedInfra,
  onOpenCopilot,
  onSelectZone
}) => {
  const metrics = riskData?.overall_metrics;
  const confidence = riskData?.confidence_breakdown;
  const topZone = selectedZone || riskData?.top_priority_zones[0];

  return (
    <aside className="w-80 md:w-96 bg-[#080d1a] border-l border-[#1e293b] flex flex-col h-full overflow-y-auto select-none p-3.5 gap-3.5 text-xs">
      {/* Event Brief Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-mono tracking-widest text-cyan-400 font-bold uppercase">EVENT BRIEF</span>
          <span className="px-1.5 py-0.5 rounded bg-red-950/60 text-red-400 border border-red-800 text-[10px] font-bold font-mono">
            {metrics?.risk_band || 'SEVERE'} THREAT
          </span>
        </div>

        <div className="flex items-baseline justify-between mb-1">
          <h3 className="font-bold text-sm text-slate-100 font-mono">DEMO CYCLONE ALPHA</h3>
          <span className="text-slate-400 text-[11px]">Category: VSCS</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-[11px] mb-2">
          <Clock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          <span>Threat Window: {metrics?.primary_threat_window ? '12:00Z - 06:00Z' : 'Active'}</span>
        </div>

        <div className="bg-[#080d1a] border border-[#1e293b] rounded p-2 text-[11px] text-slate-300">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-0.5">
            <Compass className="w-3.5 h-3.5 shrink-0" />
            <span>Projected Landfall Zone</span>
          </div>
          <p className="text-slate-400 leading-snug">
            {metrics?.closest_approach_area || 'Puri - Astaranga Coastal Belt'} around {metrics?.closest_approach_time?.slice(11, 16) || '18:00'} UTC
          </p>
        </div>
      </div>

      {/* Selected Feature / Highest Risk Region */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <MapPin className="w-3.5 h-3.5 text-red-400" />
            <span>Highest-Risk Region</span>
          </div>
          {topZone && (
            <span className="font-mono text-xs font-bold text-red-400 bg-red-950/40 px-1.5 py-0.5 rounded border border-red-900/60">
              Risk: {topZone.risk_score}/100
            </span>
          )}
        </div>

        {topZone ? (
          <div>
            <p className="font-bold text-slate-200 text-xs">{topZone.name}</p>
            <p className="text-[11px] text-slate-400 mb-2">{topZone.administrative_area}</p>

            <div className="bg-[#080d1a] p-2 rounded border border-[#1e293b] mb-2 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Hazard Driver:</span>
                <span className="text-slate-300 font-medium truncate max-w-[150px]">{topZone.top_hazard}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Exposed Population:</span>
                <span className="text-slate-300 font-mono font-medium">{topZone.population_estimate.toLocaleString()} persons</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Critical Lifelines:</span>
                <span className="text-slate-300 font-mono font-medium">{topZone.critical_assets_count} facilities</span>
              </div>
            </div>

            <p className="text-[10px] text-amber-300 bg-amber-950/20 border border-amber-900/40 p-2 rounded leading-snug">
              <b>Operational Directive:</b> {topZone.suggested_action}
            </p>
          </div>
        ) : (
          <p className="text-slate-500 italic">Select a hotspot on the map to inspect details.</p>
        )}
      </div>

      {/* Selected Infrastructure Inspection */}
      {selectedInfra && (
        <div className="bg-[#0f172a] border border-cyan-900/60 rounded-md p-3 animate-in fade-in">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
              <Building2 className="w-3.5 h-3.5" />
              <span>Asset Inspection</span>
            </div>
            <span className="font-mono text-xs font-bold text-red-400">{selectedInfra.risk_score}/100</span>
          </div>
          <p className="font-bold text-slate-200">{selectedInfra.name}</p>
          <p className="text-slate-400 text-[11px] capitalize">{selectedInfra.type.replace('_', ' ')}</p>
          <div className="mt-2 text-[11px] text-slate-300 bg-[#080d1a] p-2 rounded border border-[#1e293b] space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-500">Elevation ASL:</span>
              <span>{selectedInfra.elevation_m}m</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Distance to Shore:</span>
              <span>{selectedInfra.distance_to_coast_km}km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Primary Threat:</span>
              <span className="text-red-400 font-medium">{selectedInfra.primary_threat}</span>
            </div>
            {selectedInfra.nearest_shelter_or_backup && (
              <div className="mt-1 pt-1 border-t border-[#1e293b] text-emerald-400 text-[10px]">
                <b>Alternative/Backup:</b> {selectedInfra.nearest_shelter_or_backup}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Data Confidence Indicator */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-md p-3">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Data Confidence Model</span>
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-900/60">
            {confidence?.score || 74}%
          </span>
        </div>

        <div className="w-full bg-[#080d1a] h-1.5 rounded-full overflow-hidden mb-2">
          <div 
            className="bg-emerald-500 h-full rounded-full transition-all" 
            style={{ width: `${confidence?.score || 74}%` }} 
          />
        </div>

        <div className="space-y-1 text-[10px] text-slate-400">
          <p className="font-semibold text-slate-300">Confidence Limiting Factors:</p>
          {confidence?.limiting_factors.slice(0, 3).map((f, i) => (
            <p key={i} className="flex items-start gap-1">
              <span className="text-amber-500 shrink-0">•</span>
              <span className="leading-tight">{f}</span>
            </p>
          ))}
        </div>
      </div>

      {/* AI Intelligence Explanation */}
      <div className="bg-gradient-to-br from-[#0f172a] to-[#0d1e38] border border-cyan-900/50 rounded-md p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Multimodal Brief</span>
          </div>
          <button 
            onClick={onOpenCopilot}
            className="text-[10px] text-cyan-400 hover:text-cyan-200 flex items-center gap-0.5 font-medium transition-colors"
          >
            <span>Ask</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        <p className="text-[11px] text-slate-300 leading-relaxed mb-2.5">
          {aiExplanation?.summary || (
            "CYCLONE-X decision-support synthesis indicates SEVERE risk (82/100) across the Puri-Astaranga-Paradip coastal corridor. " +
            "Landfall expected ~18:00 UTC with sustained winds of 150-165 km/h and scenario surge proxy +2.2m threatening low-elevation wards."
          )}
        </p>

        <div className="flex flex-wrap gap-1">
          {aiExplanation?.primary_drivers.slice(0, 2).map((d, i) => (
            <span key={i} className="text-[9px] bg-cyan-950/80 text-cyan-200 border border-cyan-800 px-1.5 py-0.5 rounded">
              {d}
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
};
