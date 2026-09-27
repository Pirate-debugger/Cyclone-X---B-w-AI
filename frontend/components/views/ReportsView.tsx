'use client';

import React, { useState } from 'react';
import { FileText, Download, FileSpreadsheet, RefreshCw, Printer, AlertTriangle, ShieldCheck } from 'lucide-react';
import { IncidentReport } from '../../lib/types';
import { generateReport, getReportDownloadUrl } from '../../lib/api';

export const ReportsView: React.FC = () => {
  const [report, setReport] = useState<IncidentReport | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const rep = await generateReport('DEMO-TC-2026-ALPHA');
      setReport(rep);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full p-4 overflow-y-auto space-y-4 select-none text-xs">
      {/* Header */}
      <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold font-mono text-slate-100">DISASTER MANAGEMENT INCIDENT BRIEFING REPORT</h2>
            <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800 text-[10px] font-mono font-bold">
              OFFICIAL DISASTER BRIEF
            </span>
          </div>
          <p className="text-slate-400 text-xs">
            Synthesizes current cyclone tracking, physical hazard layers, demographic exposure, and critical lifelines into a publication-ready brief.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold px-3 py-1.5 rounded shadow transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Synthesizing...' : 'Generate New Brief'}</span>
          </button>
        </div>
      </div>

      {/* Action Download Buttons */}
      {report && (
        <div className="flex flex-wrap items-center justify-between bg-[#0f172a] border border-[#1e293b] p-3 rounded-lg gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold text-slate-200">{report.report_id}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Generated: {report.generated_at.slice(0, 16)} UTC</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={getReportDownloadUrl(report.report_id, 'pdf')}
              download
              className="flex items-center gap-1.5 bg-red-950 hover:bg-red-900 border border-red-700 text-red-300 px-3 py-1.5 rounded font-bold transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Publication PDF</span>
            </a>
            <a
              href={getReportDownloadUrl(report.report_id, 'csv')}
              download
              className="flex items-center gap-1.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-700 text-emerald-300 px-3 py-1.5 rounded font-bold transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </a>
          </div>
        </div>
      )}

      {/* Report Document Preview */}
      {report ? (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-6 space-y-6 text-slate-300 font-sans shadow-xl max-w-4xl mx-auto">
          {/* Document Header */}
          <div className="border-b border-[#334155] pb-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold">
                CYCLONE-X PLATFORM • EXECUTIVE INCIDENT BRIEFING
              </span>
              <span className="text-xs font-mono text-slate-500">{report.report_id}</span>
            </div>
            <h1 className="text-xl font-bold text-slate-100 font-mono mt-1">{report.title}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Target Basin: Bay of Bengal • Event: {report.event_id}</p>
          </div>

          {/* Section 1: Executive Situation Overview */}
          <div>
            <h3 className="font-bold text-slate-200 text-xs font-mono uppercase mb-1.5 text-cyan-400">
              1. Executive Situation Overview
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed bg-[#080d1a] p-3 rounded border border-[#1e293b]">
              {report.executive_summary}
            </p>
          </div>

          {/* Section 2: Key Operational Metrics */}
          <div>
            <h3 className="font-bold text-slate-200 text-xs font-mono uppercase mb-2 text-cyan-400">
              2. Key Operational Decision Metrics
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b]">
                <span className="text-[10px] text-slate-500 block">Overall Risk Score</span>
                <span className="font-mono text-lg font-bold text-red-400">{report.overall_risk}/100</span>
              </div>
              <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b]">
                <span className="text-[10px] text-slate-500 block">Combined Hazard</span>
                <span className="font-mono text-lg font-bold text-amber-400">{report.hazard_score}/100</span>
              </div>
              <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b]">
                <span className="text-[10px] text-slate-500 block">Projected Landfall</span>
                <span className="font-mono text-xs font-bold text-slate-200">{report.closest_approach}</span>
              </div>
              <div className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b]">
                <span className="text-[10px] text-slate-500 block">Exposed Population</span>
                <span className="font-mono text-sm font-bold text-slate-200">{report.population_summary.total_exposed.toLocaleString()} persons</span>
              </div>
            </div>
          </div>

          {/* Section 3: Priority Hotspots */}
          <div>
            <h3 className="font-bold text-slate-200 text-xs font-mono uppercase mb-2 text-cyan-400">
              3. Priority Risk Hotspots & Recommended Action
            </h3>
            <div className="overflow-x-auto border border-[#1e293b] rounded">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#080d1a] text-slate-400 font-mono text-[10px]">
                    <th className="p-2">Zone</th>
                    <th className="p-2">Risk</th>
                    <th className="p-2">Primary Threat</th>
                    <th className="p-2">Preparedness Directive</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1e293b]">
                  {report.top_priority_zones.map((h) => (
                    <tr key={h.zone_id} className="text-slate-300">
                      <td className="p-2 font-bold text-slate-200">{h.name}</td>
                      <td className="p-2 font-mono text-red-400 font-bold">{h.risk_score}/100</td>
                      <td className="p-2 text-slate-400">{h.top_hazard}</td>
                      <td className="p-2 text-slate-300">{h.suggested_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 4: Critical Infrastructure */}
          <div>
            <h3 className="font-bold text-slate-200 text-xs font-mono uppercase mb-2 text-cyan-400">
              4. Critical Infrastructure Inventory at Risk
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {report.critical_infrastructure.slice(0, 6).map((infra) => (
                <div key={infra.asset_id} className="bg-[#080d1a] p-2.5 rounded border border-[#1e293b] text-[11px]">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-200">{infra.name}</span>
                    <span className="font-mono text-red-400 font-bold">{infra.risk_score}/100</span>
                  </div>
                  <p className="text-slate-400 text-[10px] mt-0.5">{infra.primary_threat}</p>
                  {infra.nearest_shelter_or_backup && (
                    <p className="text-emerald-400 text-[10px] mt-1">Backup: {infra.nearest_shelter_or_backup}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Provenance & Disclaimer Footer */}
          <div className="pt-4 border-t border-[#334155] space-y-2 text-[10px] text-slate-500">
            <div>
              <b>Data Sources:</b> NOAA IBTrACS, ECMWF IFS via Open-Meteo, NASA NASADEM, Copernicus Sentinel-1 SAR, WorldPop 100m.
            </div>
            <div className="p-2 bg-red-950/20 border border-red-900/40 rounded text-red-400 text-center font-semibold">
              {report.disclaimer}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-12 text-center text-slate-500">
          <FileText className="w-10 h-10 text-slate-600 mx-auto mb-2 opacity-60" />
          <p className="text-xs">Click <b>Generate New Brief</b> to synthesize the current situation into an Incident Report.</p>
        </div>
      )}
    </div>
  );
};
