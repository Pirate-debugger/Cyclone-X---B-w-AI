'use client';

import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, AlertTriangle, ExternalLink, ShieldCheck, Server } from 'lucide-react';
import { getDataSources } from '../../lib/api';

export const DataSourcesView: React.FC = () => {
  const [sources, setSources] = useState<any[]>([]);

  useEffect(() => {
    getDataSources().then(res => setSources(res.sources || [])).catch(() => {});
  }, []);

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">DATA SOURCE & ATTRIBUTION REGISTRY</h2>
            <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
              VERIFIED PROVENANCE
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Every layer in CYCLONE-X is rigorously tracked to its originating scientific provider and open data license.
          </p>
        </div>
      </div>

      {/* Registry Table */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#080d1a] text-slate-400 border-b border-[#1e293b] text-[10px] uppercase font-mono">
                <th className="py-2.5 px-3">Dataset Name</th>
                <th className="py-2.5 px-3">Provider & Agency</th>
                <th className="py-2.5 px-3">Resolution & Scale</th>
                <th className="py-2.5 px-3">License & Terms</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Scientific Usage in CYCLONE-X</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e293b]/60">
              {sources.map((src, idx) => (
                <tr key={idx} className="hover:bg-[#1e293b]/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <span className="font-bold text-slate-200">{src.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono block">{src.dataset}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">{src.provider}</td>
                  <td className="py-2.5 px-3 text-slate-300 font-mono">{src.resolution}</td>
                  <td className="py-2.5 px-3 text-slate-400">{src.license}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold">
                      {src.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 max-w-[280px]">
                    {src.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Earth Engine Live Setup Guide */}
      <div className="bg-[#0f172a] border border-cyan-900/60 rounded-lg p-4 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold font-mono text-sm">
          <Server className="w-4 h-4" />
          <span>GOOGLE EARTH ENGINE LIVE AUTHENTICATION INSTRUCTIONS</span>
        </div>
        <p className="text-slate-300 text-xs">
          Google Earth Engine handles server-side computing for Sentinel-1 C-band SAR, NASADEM, Dynamic World, and JRC Surface Water.
        </p>
        <div className="bg-[#080d1a] border border-[#1e293b] rounded p-3 text-slate-400 space-y-1 font-mono text-[11px]">
          <p>1. Register your Google Cloud Project at <span className="text-cyan-300">https://earthengine.google.com/</span></p>
          <p>2. Enable Earth Engine API: <span className="text-slate-200">gcloud services enable earthengine.googleapis.com</span></p>
          <p>3. Set Application Default Credentials: <span className="text-slate-200">gcloud auth application-default login</span></p>
          <p>4. Configure backend environment variable: <span className="text-cyan-300">EARTH_ENGINE_PROJECT=your-project-id</span></p>
        </div>
        <p className="text-[10px] text-slate-500 italic">
          Zero-credential DEMO MODE is always active by default. No services will fail if Earth Engine is unconfigured.
        </p>
      </div>
    </div>
  );
};
