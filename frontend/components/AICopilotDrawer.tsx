'use client';

import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  ShieldCheck, 
  Layers, 
  AlertTriangle,
  FileSearch,
  ScanEye
} from 'lucide-react';
import { GeminiStructuredExplanation } from '../lib/types';
import { askGeminiCopilot, analyzeSatelliteImage } from '../lib/api';

interface AICopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedZoneName?: string;
}

export const AICopilotDrawer: React.FC<AICopilotDrawerProps> = ({
  isOpen,
  onClose,
  selectedZoneName
}) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [explanation, setExplanation] = useState<GeminiStructuredExplanation | null>(null);
  const [imageAnalysis, setImageAnalysis] = useState<any | null>(null);

  if (!isOpen) return null;

  const promptChips = [
    "Why is Puri South evaluated as severe risk?",
    "Which hospitals & lifelines are most exposed?",
    "What changed in the +2.5m surge scenario?",
    "Summarize situation for State Disaster Commissioner",
    "Identify main uncertainties in current forecast cycle"
  ];

  const handleAsk = async (text: string) => {
    setLoading(true);
    setImageAnalysis(null);
    try {
      const res = await askGeminiCopilot(text);
      setExplanation(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSatellite = async () => {
    setLoading(true);
    try {
      const res = await analyzeSatelliteImage('Sentinel-1 SAR GRD');
      setImageAnalysis(res);
      setExplanation(null);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-[#080d1a] border-l border-[#1e293b] shadow-2xl z-50 flex flex-col text-xs select-none animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="px-4 py-3 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-600 to-blue-600 flex items-center justify-center text-white">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 font-mono text-sm">CYCLONE-X AI COPILOT</h3>
            <p className="text-[10px] text-cyan-400 font-mono">Grounded Multimodal Reasoning Engine</p>
          </div>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Suggested Prompt Chips */}
      <div className="p-3 bg-[#0a1122] border-b border-[#1e293b]">
        <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block mb-1.5">
          SUGGESTED OPERATIONAL INQUIRIES
        </span>
        <div className="flex flex-wrap gap-1.5">
          {promptChips.map((chip, idx) => (
            <button
              key={idx}
              onClick={() => {
                setQuery(chip);
                handleAsk(chip);
              }}
              className="text-[11px] bg-[#0f172a] hover:bg-cyan-950/60 border border-[#1e293b] hover:border-cyan-800 text-slate-300 px-2 py-1 rounded transition-colors text-left"
            >
              {chip}
            </button>
          ))}
          <button
            onClick={handleAnalyzeSatellite}
            className="text-[11px] bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-700/60 text-indigo-300 px-2.5 py-1 rounded font-semibold flex items-center gap-1 transition-colors"
          >
            <ScanEye className="w-3.5 h-3.5 text-indigo-400" />
            <span>Analyze Sentinel-1 SAR Image</span>
          </button>
        </div>
      </div>

      {/* Body Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading && (
          <div className="p-6 text-center text-slate-400 space-y-2">
            <Bot className="w-8 h-8 text-cyan-400 animate-bounce mx-auto" />
            <p className="font-mono text-xs">Injecting structured geospatial evidence into reasoning model...</p>
          </div>
        )}

        {/* Regular Structured Explanation Response */}
        {explanation && !loading && (
          <div className="space-y-3">
            <div className="bg-[#0f172a] border border-cyan-900/60 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase font-bold">REASONING SUMMARY</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-red-950 text-red-400 border border-red-800">
                  {explanation.risk_level} • {explanation.risk_score}/100
                </span>
              </div>
              <p className="text-slate-200 text-xs leading-relaxed font-sans">{explanation.summary}</p>
            </div>

            {/* Primary Drivers */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1.5">
                PRIMARY RISK DRIVERS (EVIDENCE)
              </span>
              <ul className="space-y-1 text-slate-300 text-[11px]">
                {explanation.primary_drivers.map((d, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-cyan-400 shrink-0 font-bold">•</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Affected Assets & Recommendations */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1.5">
                EXPOSED LIFELINES & ACTIONS
              </span>
              <div className="flex flex-wrap gap-1 mb-2">
                {explanation.affected_assets.map((a, i) => (
                  <span key={i} className="bg-[#080d1a] border border-slate-700 text-slate-300 px-2 py-0.5 rounded text-[10px]">
                    {a}
                  </span>
                ))}
              </div>
              <div className="space-y-1 text-[11px] text-amber-300 bg-amber-950/20 p-2 rounded border border-amber-900/40">
                <b>Suggested Operational Directives:</b>
                {explanation.recommended_actions.map((act, i) => (
                  <p key={i}>• {act}</p>
                ))}
              </div>
            </div>

            {/* Uncertainties & Sources */}
            <div className="bg-[#0f172a] border border-[#1e293b] rounded p-3 text-[10px] space-y-1">
              <div className="flex items-center gap-1 text-slate-400 font-semibold mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>Critical Uncertainties to Consider:</span>
              </div>
              {explanation.uncertainties.map((u, i) => (
                <p key={i} className="text-slate-400">• {u}</p>
              ))}

              <div className="pt-2 border-t border-[#1e293b] mt-2 flex items-center justify-between text-slate-500">
                <span>Confidence: <b className="text-emerald-400">{explanation.confidence}%</b></span>
                <span className="font-mono">{explanation.ai_status}</span>
              </div>
            </div>
          </div>
        )}

        {/* Satellite Image Analysis Result */}
        {imageAnalysis && !loading && (
          <div className="space-y-3">
            <div className="bg-[#0f172a] border border-indigo-900/60 rounded p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-mono text-indigo-400 font-bold uppercase">SATELLITE IMAGE ANALYSIS</span>
                <span className="text-[10px] font-mono text-slate-400">{imageAnalysis.dataset}</span>
              </div>

              {/* Observed */}
              <div className="mb-2">
                <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block mb-1">OBSERVED FEATURES</span>
                {imageAnalysis.observed_features.map((f: string, i: number) => (
                  <p key={i} className="text-[11px] text-slate-200 mb-0.5">• {f}</p>
                ))}
              </div>

              {/* Possible */}
              <div className="mb-2">
                <span className="text-[10px] font-mono font-bold text-amber-400 uppercase block mb-1">POSSIBLE INUNDATION ZONES</span>
                {imageAnalysis.possible_inundation_zones.map((f: string, i: number) => (
                  <p key={i} className="text-[11px] text-slate-300 mb-0.5">• {f}</p>
                ))}
              </div>

              {/* Unknown */}
              <div className="mb-2">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase block mb-1">UNKNOWN / CLOUD OBSCURED</span>
                {imageAnalysis.unknown_or_cloud_obscured.map((f: string, i: number) => (
                  <p key={i} className="text-[11px] text-slate-400 mb-0.5">• {f}</p>
                ))}
              </div>

              <div className="pt-2 border-t border-[#1e293b] text-[10px] text-slate-400 italic">
                {imageAnalysis.confidence_assessment}
              </div>
            </div>
          </div>
        )}

        {!explanation && !imageAnalysis && !loading && (
          <div className="p-6 text-center text-slate-500">
            <Bot className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-60" />
            <p className="text-xs">Ask any question or click a prompt above to generate grounded decision-support reasoning.</p>
          </div>
        )}
      </div>

      {/* Input Bar */}
      <div className="p-3 bg-[#0f172a] border-t border-[#1e293b]">
        <div className="relative flex items-center">
          <input 
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                handleAsk(query.trim());
              }
            }}
            placeholder="Ask Copilot: e.g. Why did this zone become severe?..."
            className="w-full bg-[#080d1a] border border-[#1e293b] rounded pl-3 pr-10 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
          <button
            onClick={() => query.trim() && handleAsk(query.trim())}
            disabled={loading || !query.trim()}
            className="absolute right-2 text-cyan-400 hover:text-cyan-200 disabled:text-slate-600"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
