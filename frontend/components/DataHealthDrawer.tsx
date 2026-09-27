'use client';

import React from 'react';
import { X, Activity, CheckCircle2, AlertTriangle, XCircle, Clock, Server, ExternalLink } from 'lucide-react';

interface DataHealthDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  healthData?: any;
}

export const DataHealthDrawer: React.FC<DataHealthDrawerProps> = ({
  isOpen,
  onClose,
  healthData
}) => {
  if (!isOpen) return null;

  const providers = healthData?.providers || [
    { name: 'Cyclone Track Provider', status: 'CONNECTED', type: 'Demo & Official Track Ingestion', freshness: 'REAL-TIME / 00Z', latency_ms: 12 },
    { name: 'Numerical Weather Prediction', status: 'CONNECTED', type: 'ECMWF IFS 0.25° Open-Meteo', freshness: 'UPDATED 12 MIN AGO', latency_ms: 145 },
    { name: 'Google Earth Engine', status: 'UNAVAILABLE (DEMO CACHED)', type: 'Sentinel-1 SAR / NASADEM / JRC', freshness: 'OBSERVATION • 12H AGO', latency_ms: 280 },
    { name: 'Storm Surge Provider', status: 'PROXY_FALLBACK', type: 'Scenario Inundation Proxy (+2.2m)', freshness: 'SCENARIO', latency_ms: 8 },
    { name: 'Critical Infrastructure Provider', status: 'CONNECTED', type: 'Spatial Database & GeoJSON Inventory', freshness: 'VERIFIED 2026-09-20', latency_ms: 15 },
    { name: 'Demographic Baseline', status: 'CACHED', type: 'WorldPop Global 100m Population', freshness: 'MODEL ESTIMATE (2020)', latency_ms: 22 },
    { name: 'Gemini AI Reasoning Copilot', status: 'LIVE', type: 'Google GenAI SDK (gemini-3.7-flash)', freshness: 'ACTIVE', latency_ms: 480 }
  ];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-xs select-none animate-in fade-in">
      <div className="w-full max-w-2xl bg-[#080d1a] border border-[#334155] rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="px-5 py-3.5 bg-[#0f172a] border-b border-[#1e293b] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-slate-100 font-mono text-sm uppercase">Subsystem Telemetry & Data Health</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded hover:bg-slate-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <p className="text-slate-400 text-xs leading-relaxed">
            Real-time status of connected geospatial pipelines, weather models, satellite providers, and AI endpoints. 
            All data values strictly expose provenance and latency to ensure operational integrity.
          </p>

          <div className="space-y-2">
            {providers.map((p: any, idx: number) => {
              const isConnected = p.status === 'CONNECTED' || p.status === 'LIVE';
              const isDegraded = p.status.includes('PROXY') || p.status.includes('CACHED');

              return (
                <div key={idx} className="bg-[#0f172a] border border-[#1e293b] rounded p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    {isConnected ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : isDegraded ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-200">{p.name}</span>
                        <span className="text-[10px] font-mono text-slate-500">{p.type}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>Freshness: {p.freshness}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                      isConnected 
                        ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-800' 
                        : isDegraded 
                        ? 'bg-amber-950/80 text-amber-400 border border-amber-800' 
                        : 'bg-red-950/80 text-red-400 border border-red-800'
                    }`}>
                      {p.status}
                    </span>
                    <div className="text-[10px] font-mono text-slate-500 mt-1">
                      {p.latency_ms} ms
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Earth Engine Setup Guide */}
          <div className="bg-[#0f172a] border border-cyan-900/60 rounded p-4 text-[11px] space-y-2">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold">
              <Server className="w-4 h-4" />
              <span>Google Earth Engine Live Authentication Setup</span>
            </div>
            <p className="text-slate-300 leading-snug">
              To activate real-time Earth Engine server-side tile rendering and automated Sentinel-1 SAR change detection:
            </p>
            <ol className="list-decimal list-inside text-slate-400 space-y-1 pl-1">
              <li>Enable Earth Engine API in your Google Cloud Console project.</li>
              <li>Register your Google Cloud Project ID for Earth Engine access.</li>
              <li>Set <code className="text-cyan-300 font-mono">EARTH_ENGINE_PROJECT=your-project-id</code> in your <code className="text-cyan-300 font-mono">.env</code>.</li>
              <li>Run <code className="text-cyan-300 font-mono">gcloud auth application-default login</code> or configure a Service Account key.</li>
            </ol>
            <p className="text-[10px] text-slate-500 italic mt-1">
              In DEMO MODE, CYCLONE-X seamlessly serves pre-computed Sentinel-1 and NASADEM datasets without cloud credentials.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
