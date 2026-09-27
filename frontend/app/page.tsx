'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { 
  Wind, 
  Droplets, 
  Waves, 
  Building2, 
  Users, 
  AlertOctagon, 
  Gauge, 
  Compass, 
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { CommandHeader } from '../components/CommandHeader';
import { NavigationSidebar, NavTab } from '../components/NavigationSidebar';
import { RiskMetricCard } from '../components/RiskMetricCard';
import { ContextIntelligencePanel } from '../components/ContextIntelligencePanel';
import { PriorityZonesTable } from '../components/PriorityZonesTable';
import { AICopilotDrawer } from '../components/AICopilotDrawer';
import { DataHealthDrawer } from '../components/DataHealthDrawer';

const MapContainer = dynamic(
  () => import('../components/MapContainer').then((mod) => mod.MapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050914] text-slate-500 font-mono text-xs space-y-2">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Initializing Geospatial Map Engine...</span>
      </div>
    ),
  }
);

// Specialized Views
import { CycloneMonitorView } from '../components/views/CycloneMonitorView';
import { RiskAnalysisView } from '../components/views/RiskAnalysisView';
import { InfrastructureView } from '../components/views/InfrastructureView';
import { ScenarioSimulatorView } from '../components/views/ScenarioSimulatorView';
import { AlertCenterView } from '../components/views/AlertCenterView';
import { ReportsView } from '../components/views/ReportsView';
import { DataSourcesView } from '../components/views/DataSourcesView';
import { SettingsView } from '../components/views/SettingsView';

import { 
  CycloneEvent, 
  TrackCollection, 
  RiskOverview, 
  HotspotZone, 
  InfrastructureRiskAssessment,
  GeminiStructuredExplanation 
} from '../lib/types';
import { 
  getEvents, 
  getTrack, 
  getRiskOverview, 
  getInfrastructureRisk, 
  askGeminiCopilot,
  getDataHealth
} from '../lib/api';

export default function CycloneXApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('command-center');
  const [event, setEvent] = useState<CycloneEvent | null>(null);
  const [trackData, setTrackData] = useState<TrackCollection | null>(null);
  const [riskData, setRiskData] = useState<RiskOverview | null>(null);
  const [infrastructure, setInfrastructure] = useState<InfrastructureRiskAssessment[]>([]);
  const [selectedZone, setSelectedZone] = useState<HotspotZone | null>(null);
  const [selectedInfra, setSelectedInfra] = useState<InfrastructureRiskAssessment | null>(null);
  const [aiExplanation, setAiExplanation] = useState<GeminiStructuredExplanation | null>(null);
  
  // Drawers
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [dataHealthOpen, setDataHealthOpen] = useState(false);
  const [dataHealthInfo, setDataHealthInfo] = useState<any>(null);

  // Initial load
  useEffect(() => {
    async function loadInitialData() {
      try {
        const events = await getEvents();
        if (events.length > 0) {
          const currentEv = events[0];
          setEvent(currentEv);
          
          const track = await getTrack(currentEv.event_id);
          setTrackData(track);
        }

        const risk = await getRiskOverview();
        setRiskData(risk);
        if (risk.top_priority_zones.length > 0) {
          setSelectedZone(risk.top_priority_zones[0]);
        }

        const infra = await getInfrastructureRisk();
        setInfrastructure(infra);

        const health = await getDataHealth();
        setDataHealthInfo(health);

        // Fetch AI synthesis
        const explanation = await askGeminiCopilot("Summarize current threat for Puri coastal zone");
        setAiExplanation(explanation);
      } catch (err) {
        console.warn("Backend connectivity note: using local fallback cache if offline.", err);
      }
    }
    loadInitialData();
  }, []);

  const handleSearchCommand = (cmd: string) => {
    const c = cmd.toLowerCase();
    if (c.includes('hospital') || c.includes('infra') || c.includes('asset')) {
      setActiveTab('infrastructure');
    } else if (c.includes('scenario') || c.includes('stress') || c.includes('simulat')) {
      setActiveTab('scenario-simulator');
    } else if (c.includes('report') || c.includes('brief') || c.includes('pdf')) {
      setActiveTab('reports');
    } else if (c.includes('track') || c.includes('timeline') || c.includes('monitor')) {
      setActiveTab('cyclone-monitor');
    } else if (c.includes('alert') || c.includes('advisory')) {
      setActiveTab('alerts');
    } else {
      // Send directly to AI copilot
      setCopilotOpen(true);
    }
  };

  const metrics = riskData?.overall_metrics;

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
      {/* Top Command Header */}
      <CommandHeader 
        onSearchCommand={handleSearchCommand}
        onOpenDataHealth={() => setDataHealthOpen(true)}
        onOpenCopilot={() => setCopilotOpen(true)}
        isDemo={true}
      />

      {/* Main Operational Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <NavigationSidebar 
          activeTab={activeTab} 
          onSelectTab={setActiveTab} 
        />

        {/* Center Dynamic Workspace */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#050914] overflow-hidden">
          {activeTab === 'command-center' && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              {/* Top Operational Metric Cards Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 p-2 bg-[#080d1a] border-b border-[#1e293b] shrink-0">
                <RiskMetricCard 
                  label="Category"
                  value={event?.category ? "VSCS" : "VSCS"}
                  subvalue="Very Severe Cyclonic"
                  icon={ShieldAlert}
                  variant="severe"
                  badge="IMD"
                />
                <RiskMetricCard 
                  label="Max Sustained Wind"
                  value={`${event?.max_sustained_wind_kmh || 155}`}
                  subvalue="Gusts: 185 km/h"
                  icon={Wind}
                  variant="severe"
                  badge="KM/H"
                />
                <RiskMetricCard 
                  label="24h Precipitation"
                  value="220"
                  subvalue="Peak: 280 mm"
                  icon={Droplets}
                  variant="high"
                  badge="MM"
                />
                <RiskMetricCard 
                  label="Surge Proxy"
                  value="+2.2"
                  subvalue="Inundation: < 5m ASL"
                  icon={Waves}
                  variant="high"
                  badge="METERS"
                />
                <RiskMetricCard 
                  label="Critical Assets"
                  value={`${infrastructure.filter(i => i.risk_score >= 75).length}`}
                  subvalue={`Total: ${infrastructure.length} mapped`}
                  icon={Building2}
                  variant="severe"
                  badge="POSTGIS"
                />
                <RiskMetricCard 
                  label="Pop. in Severe Zone"
                  value="7,845"
                  subvalue="Total affected: 72.6k"
                  icon={Users}
                  variant="severe"
                  badge="WORLDPOP"
                />
                <RiskMetricCard 
                  label="Composite Risk"
                  value={`${metrics?.overall_risk_score || 82}`}
                  subvalue="Confidence: 74%"
                  icon={AlertOctagon}
                  variant="severe"
                  badge="SEVERE"
                />
              </div>

              {/* Map + Right Intelligence Panel Split */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Center Geospatial Map */}
                <div className="flex-1 h-full min-h-[350px] relative">
                  <MapContainer 
                    trackData={trackData}
                    hotspots={riskData?.top_priority_zones}
                    infrastructure={infrastructure}
                    selectedZone={selectedZone}
                    onSelectZone={(z) => setSelectedZone(z)}
                    onSelectInfrastructure={(infra) => setSelectedInfra(infra)}
                  />
                </div>

                {/* Right Context Intelligence Panel */}
                <ContextIntelligencePanel 
                  riskData={riskData}
                  aiExplanation={aiExplanation}
                  selectedZone={selectedZone}
                  selectedInfra={selectedInfra}
                  onOpenCopilot={() => setCopilotOpen(true)}
                  onSelectZone={(z) => setSelectedZone(z)}
                />
              </div>

              {/* Bottom Priority Zones Table */}
              <PriorityZonesTable 
                hotspots={riskData?.top_priority_zones}
                selectedZone={selectedZone}
                onSelectZone={(z) => setSelectedZone(z)}
              />
            </div>
          )}

          {activeTab === 'cyclone-monitor' && (
            <CycloneMonitorView 
              trackData={trackData} 
              event={event} 
            />
          )}

          {activeTab === 'risk-analysis' && (
            <RiskAnalysisView 
              riskData={riskData} 
            />
          )}

          {activeTab === 'infrastructure' && (
            <InfrastructureView 
              infrastructure={infrastructure}
              onSelectAsset={(a) => {
                setSelectedInfra(a);
                setActiveTab('command-center');
              }}
            />
          )}

          {activeTab === 'scenario-simulator' && (
            <ScenarioSimulatorView />
          )}

          {activeTab === 'alerts' && (
            <AlertCenterView />
          )}

          {activeTab === 'ai-copilot' && (
            <div className="w-full h-full p-4 flex flex-col bg-[#050914] overflow-hidden">
              <div className="bg-[#0f172a] border border-[#1e293b] rounded-lg p-3 mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-cyan-400" />
                  <h2 className="text-base font-bold font-mono text-slate-100">AI MULTIMODAL REASONING & EVIDENCE INSPECTOR</h2>
                </div>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  GEMINI ACTIVE
                </span>
              </div>
              <div className="flex-1 relative overflow-hidden rounded-lg border border-[#1e293b]">
                <AICopilotDrawer 
                  isOpen={true} 
                  onClose={() => setActiveTab('command-center')} 
                />
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <ReportsView />
          )}

          {activeTab === 'data-sources' && (
            <DataSourcesView />
          )}

          {activeTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Floating Drawers */}
      <AICopilotDrawer 
        isOpen={copilotOpen} 
        onClose={() => setCopilotOpen(false)} 
        selectedZoneName={selectedZone?.name}
      />

      <DataHealthDrawer 
        isOpen={dataHealthOpen} 
        onClose={() => setDataHealthOpen(false)}
        healthData={dataHealthInfo}
      />
    </div>
  );
}
