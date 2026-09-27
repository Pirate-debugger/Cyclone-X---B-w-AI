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
  Sparkles,
  TrendingUp,
  Target,
  Activity,
  CheckCircle2
} from 'lucide-react';
import { CommandHeader } from '../components/CommandHeader';
import { NavigationSidebar, NavTab } from '../components/NavigationSidebar';
import { RiskMetricCard } from '../components/RiskMetricCard';
import { ContextIntelligencePanel } from '../components/ContextIntelligencePanel';
import { PriorityZonesTable } from '../components/PriorityZonesTable';
import { AICopilotDrawer } from '../components/AICopilotDrawer';
import { DataHealthDrawer } from '../components/DataHealthDrawer';

const GoogleMapContainer = dynamic(
  () => import('../components/GoogleMapContainer').then((mod) => mod.GoogleMapContainer),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex flex-col items-center justify-center bg-[#050914] text-slate-500 font-mono text-xs space-y-2">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <span>Initializing Google Maps Platform & Geospatial Layers...</span>
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
import { ForecastEvolutionView } from '../components/views/ForecastEvolutionView';
import { ModelComparisonView } from '../components/views/ModelComparisonView';
import { ForecastVerificationView } from '../components/views/ForecastVerificationView';
import { EarlyActionsView } from '../components/views/EarlyActionsView';
import { GoogleComplianceView } from '../components/views/GoogleComplianceView';
import { RouteRiskView } from '../components/views/RouteRiskView';
import { VoiceCommandModal } from '../components/VoiceCommandModal';

import { 
  CycloneEvent, 
  TrackCollection, 
  RiskOverview, 
  HotspotZone, 
  InfrastructureRiskAssessment,
  GeminiStructuredExplanation,
  EnsembleAggregationResult,
  AssetImpactProbability
} from '../lib/types';
import { 
  getEvents, 
  getTrack, 
  getRiskOverview, 
  getInfrastructureRisk, 
  askGeminiCopilot,
  getDataHealth,
  getEnsembleAggregation,
  getAssetImpacts
} from '../lib/api';

export default function CycloneXApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('command-center');
  const [event, setEvent] = useState<CycloneEvent | null>(null);
  const [trackData, setTrackData] = useState<TrackCollection | null>(null);
  const [riskData, setRiskData] = useState<RiskOverview | null>(null);
  const [infrastructure, setInfrastructure] = useState<InfrastructureRiskAssessment[]>([]);
  const [ensembleData, setEnsembleData] = useState<EnsembleAggregationResult | null>(null);
  const [assetImpacts, setAssetImpacts] = useState<AssetImpactProbability[]>([]);
  const [selectedZone, setSelectedZone] = useState<HotspotZone | null>(null);
  const [selectedInfra, setSelectedInfra] = useState<InfrastructureRiskAssessment | null>(null);
  const [aiExplanation, setAiExplanation] = useState<GeminiStructuredExplanation | null>(null);
  
  // Drawers & Modals
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [dataHealthOpen, setDataHealthOpen] = useState(false);
  const [voiceModalOpen, setVoiceModalOpen] = useState(false);
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

        const [risk, infra, health, ens, impacts] = await Promise.all([
          getRiskOverview(),
          getInfrastructureRisk(),
          getDataHealth(),
          getEnsembleAggregation(),
          getAssetImpacts()
        ]);

        setRiskData(risk);
        if (risk.top_priority_zones.length > 0) {
          setSelectedZone(risk.top_priority_zones[0]);
        }

        setInfrastructure(infra);
        setDataHealthInfo(health);
        setEnsembleData(ens);
        setAssetImpacts(impacts);

        // Grounded AI initial summary
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
    if (c.includes('google') || c.includes('stack') || c.includes('compliance')) {
      setActiveTab('google-stack');
    } else if (c.includes('route') || c.includes('evac') || c.includes('road')) {
      setActiveTab('route-risk');
    } else if (c.includes('voice') || c.includes('speak') || c.includes('listen') || c.includes('mic')) {
      setVoiceModalOpen(true);
    } else if (c.includes('evolution') || c.includes('cycle') || c.includes('shift')) {
      setActiveTab('forecast-evolution');
    } else if (c.includes('model') || c.includes('consensus') || c.includes('compare')) {
      setActiveTab('model-comparison');
    } else if (c.includes('verify') || c.includes('backtest') || c.includes('fani')) {
      setActiveTab('verification');
    } else if (c.includes('early') || c.includes('action') || c.includes('priority')) {
      setActiveTab('early-actions');
    } else if (c.includes('hospital') || c.includes('infra') || c.includes('asset')) {
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
      setCopilotOpen(true);
    }
  };

  const metrics = riskData?.overall_metrics;
  const topSector = ensembleData?.landfall_sectors?.[0];

  return (
    <div className="flex flex-col h-screen w-screen bg-[#080d1a] text-slate-100 overflow-hidden font-sans">
      {/* Top Command Header (Section 43) */}
      <CommandHeader 
        onSearchCommand={handleSearchCommand}
        onOpenDataHealth={() => setDataHealthOpen(true)}
        onOpenCopilot={() => setCopilotOpen(true)}
        onOpenVoice={() => setVoiceModalOpen(true)}
        isDemo={true}
        eventTitle={event?.name || "Cyclone Alpha (Bay of Bengal)"}
        latestRunId="RUN-18Z"
        modelVersion="WeatherNext 3 / Cyclones v2.0"
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
              {/* Section 44: Top Metrics Bar (The 8 Mandatory Scientific Metrics) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-1.5 p-2 bg-[#080d1a] border-b border-[#1e293b] shrink-0 select-none">
                {/* 1. Landfall Probability */}
                <RiskMetricCard 
                  label="Landfall Probability"
                  value={topSector ? `${topSector.probability_pct}%` : "47.0%"}
                  subvalue="Puri - Astaranga Belt"
                  icon={Target}
                  variant="severe"
                  badge="64-MBR"
                />

                {/* 2. Track Spread */}
                <RiskMetricCard 
                  label="Track Spread"
                  value={ensembleData ? `±${ensembleData.cross_track_spread_km}km` : "±28.4km"}
                  subvalue="Cross-track spread @ +48h"
                  icon={TrendingUp}
                  variant="high"
                  badge="SPREAD"
                />

                {/* 3. Peak Wind Probability */}
                <RiskMetricCard 
                  label="Peak Wind Prob."
                  value="84%"
                  subvalue="P(Wind > 100 km/h)"
                  icon={Wind}
                  variant="severe"
                  badge="V10"
                />

                {/* 4. Rainfall Exceedance */}
                <RiskMetricCard 
                  label="Rain Exceedance"
                  value="64%"
                  subvalue="P(24h Rain > 200mm)"
                  icon={Droplets}
                  variant="high"
                  badge="P>200"
                />

                {/* 5. Population Exposure */}
                <RiskMetricCard 
                  label="Population Exposure"
                  value="340k"
                  subvalue="Total affected: 1.28M"
                  icon={Users}
                  variant="severe"
                  badge="WORLDPOP"
                />

                {/* 6. Critical Infra Exposure */}
                <RiskMetricCard 
                  label="Critical Lifelines"
                  value={`${infrastructure.filter(i => i.risk_score >= 75).length}`}
                  subvalue="Hospitals, Ports, Grids"
                  icon={Building2}
                  variant="severe"
                  badge="POSTGIS"
                />

                {/* 7. Impact Probability */}
                <RiskMetricCard 
                  label="Combined Impact P"
                  value="62%"
                  subvalue="District Hospital Puri"
                  icon={AlertOctagon}
                  variant="severe"
                  badge="P(COMB)"
                />

                {/* 8. Forecast Stability */}
                <RiskMetricCard 
                  label="Forecast Stability"
                  value="88%"
                  subvalue="High consensus (3 models)"
                  icon={CheckCircle2}
                  variant="moderate"
                  badge="STABLE"
                />
              </div>

              {/* Map + Right Intelligence Panel Split */}
              <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                {/* Center Geospatial Map with 12 Map Modes */}
                <div className="flex-1 h-full min-h-[350px] relative">
                  <GoogleMapContainer 
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

          {activeTab === 'google-stack' && (
            <GoogleComplianceView />
          )}

          {activeTab === 'route-risk' && (
            <RouteRiskView />
          )}

          {activeTab === 'forecast-evolution' && (
            <ForecastEvolutionView />
          )}

          {activeTab === 'model-comparison' && (
            <ModelComparisonView />
          )}

          {activeTab === 'verification' && (
            <ForecastVerificationView />
          )}

          {activeTab === 'early-actions' && (
            <EarlyActionsView />
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
                  GEMINI 3.7 FLASH ACTIVE
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

      <VoiceCommandModal 
        isOpen={voiceModalOpen}
        onClose={() => setVoiceModalOpen(false)}
        onNavigateTab={(tab) => {
          setActiveTab(tab);
          setVoiceModalOpen(false);
        }}
      />
    </div>
  );
}
