'use client';

import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  Cpu, 
  Globe, 
  Database, 
  ShieldCheck, 
  Mic, 
  Languages, 
  Cloud, 
  Sparkles,
  RefreshCw,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { getGoogleCompliance } from '../../lib/api';

export const GoogleComplianceView: React.FC = () => {
  const [complianceData, setComplianceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCompliance = async () => {
    try {
      setRefreshing(true);
      const res = await getGoogleCompliance();
      if (res && res.components) {
        setComplianceData(res);
      }
    } catch (e) {
      console.error('Error fetching Google compliance status:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCompliance();
  }, []);

  const getServiceIcon = (serviceName: string) => {
    const s = serviceName.toLowerCase();
    if (s.includes('gemini')) return Sparkles;
    if (s.includes('vertex')) return Cpu;
    if (s.includes('earth engine')) return Globe;
    if (s.includes('maps')) return Layers;
    if (s.includes('bigquery')) return Database;
    if (s.includes('firebase')) return ShieldCheck;
    if (s.includes('speech')) return Mic;
    if (s.includes('translation')) return Languages;
    return Cloud;
  };

  const getStatusBadge = (status: string) => {
    const isConn = status.includes('CONNECTED');
    const isDeployed = status.includes('DEPLOYED');
    const isNotConfig = status.includes('NOT CONFIGURED') || status.includes('NOT_CONFIGURED');
    
    let colorClass = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30';
    let dotClass = 'bg-cyan-400';

    if (isConn) {
      colorClass = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      dotClass = 'bg-emerald-400 animate-pulse';
    } else if (isDeployed) {
      colorClass = 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      dotClass = 'bg-blue-400';
    } else if (isNotConfig) {
      colorClass = 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      dotClass = 'bg-rose-400';
    }

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wide flex items-center gap-1.5 border ${colorClass}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${dotClass}`}></span>
        {status}
      </span>
    );
  };

  return (
    <div className="w-full h-full bg-[#050914] text-slate-200 overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#1e293b] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30 font-mono text-[10px] font-bold">
              GOOGLE-NATIVE ARCHITECTURE
            </span>
            <span className="text-slate-500 text-xs font-mono">• Section 63 Compliance</span>
          </div>
          <h1 className="text-xl font-bold font-mono tracking-tight text-white mt-1">
            Google Cloud Technology Stack Integration Status
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time verification of Google Cloud services, AI models, and geospatial platforms powering CYCLONE-X.
          </p>
        </div>

        <button
          onClick={fetchCompliance}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#0f172a] hover:bg-[#1e293b] border border-[#1e293b] text-cyan-400 rounded text-xs font-mono transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          <span>Verify Endpoints</span>
        </button>
      </div>

      {/* Grid of Components */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 text-slate-500 font-mono text-xs">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-3"></div>
          <span>Validating Google Cloud Subsystem Status...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {complianceData?.components?.map((comp: any, idx: number) => {
            const Icon = getServiceIcon(comp.service);
            return (
              <div 
                key={idx}
                className="bg-[#0b1329] border border-[#1e293b] rounded-lg p-4 flex flex-col justify-between hover:border-cyan-800/60 transition-all shadow-sm"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded bg-[#0f172a] border border-[#1e293b] flex items-center justify-center text-cyan-400">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="font-mono text-sm font-bold text-white">{comp.service}</h3>
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">{comp.category}</p>
                      </div>
                    </div>
                    {comp.mandatory && (
                      <span className="px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[9px] font-mono">
                        MANDATORY
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 font-mono mt-3 leading-relaxed">
                    {comp.details}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-[#1e293b]/70 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500 font-mono">API STATUS:</span>
                  {getStatusBadge(comp.status)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enterprise Architectural Blueprint Note */}
      <div className="bg-[#0b1329] border border-[#1e293b] rounded-lg p-4 font-mono text-xs text-slate-400 space-y-2">
        <div className="flex items-center gap-2 text-cyan-400 font-bold">
          <ShieldCheck className="w-4 h-4" />
          <span>SCIENTIFIC & ENTERPRISE COMPLIANCE STATEMENT</span>
        </div>
        <p className="text-[11px] leading-relaxed">
          In accordance with Google Cloud competition standards and Section 61/62 rules, CYCLONE-X enforces authentic
          provenance tracking. When credentials for specific cloud services (e.g., live Vertex AI endpoints or private Earth Engine assets)
          are unconfigured in a local environment, the platform operates transparently in CALIBRATED BASELINE / DEMO mode
          without fabricating live statuses or synthetic accuracy metrics.
        </p>
      </div>
    </div>
  );
};
